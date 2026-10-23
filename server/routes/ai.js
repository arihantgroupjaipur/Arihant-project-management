import express from 'express';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import s3 from '../config/s3.js';
import claude from '../config/claude.js';
import authMiddleware from '../middleware/authMiddleware.js';
import adminMiddleware from '../middleware/adminMiddleware.js';
import { checkAndSendVendorDelayReminders } from '../utils/vendorDelayCheck.js';
import { buildProgressReport } from '../utils/progressReportAggregator.js';
import ProgressAnalysis from '../models/ProgressAnalysis.js';
import ScheduledCeoReport from '../models/ScheduledCeoReport.js';
import { sendCeoAudioReport } from '../utils/ceoReportEmail.js';

const router = express.Router();

const MODEL = 'claude-sonnet-5';

async function s3ObjectToBase64(key) {
    const command = new GetObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: key });
    const response = await s3.send(command);
    const chunks = [];
    for await (const chunk of response.Body) {
        chunks.push(chunk);
    }
    return {
        base64: Buffer.concat(chunks).toString('base64'),
        contentType: response.ContentType || 'application/octet-stream',
    };
}

// Fetch an S3 key and build the Claude content block (document or image) for it
async function s3KeyToContentBlock(key) {
    const { base64, contentType } = await s3ObjectToBase64(key);
    const isPdf = contentType.includes('pdf');
    const isImage = contentType.startsWith('image/');
    if (!isPdf && !isImage) {
        throw new Error(`Unsupported file type: ${contentType}`);
    }
    return isPdf
        ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
        : { type: 'image', source: { type: 'base64', media_type: contentType, data: base64 } };
}

// Best-effort parse of a JSON object out of a model response, tolerating ```json fences
function parseJsonResponse(text) {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const raw = fenced ? fenced[1] : text;
    return JSON.parse(raw.trim());
}

// POST /api/ai/chat — { message, history? } -> { reply }
router.post('/chat', authMiddleware, async (req, res) => {
    try {
        const { message, history } = req.body;
        if (!message) {
            return res.status(400).json({ message: 'message is required' });
        }

        const messages = Array.isArray(history) ? [...history] : [];
        messages.push({ role: 'user', content: message });

        const response = await claude.messages.create({
            model: MODEL,
            max_tokens: 4096,
            system: 'You are a helpful assistant embedded in Arihant Dream Infra Projects\' project management app. Answer concisely and relevantly to construction project management, purchase orders, bills, and site work when applicable.',
            messages,
        });

        const textBlock = response.content.find((b) => b.type === 'text');
        res.json({ reply: textBlock?.text ?? '' });
    } catch (error) {
        console.error('AI chat error:', error);
        res.status(500).json({ message: 'AI chat failed', error: error.message });
    }
});

// POST /api/ai/extract-document — { key, prompt? } -> { result }
// key: S3 key of an already-uploaded file (e.g. from /api/upload)
router.post('/extract-document', authMiddleware, async (req, res) => {
    try {
        const { key, prompt } = req.body;
        if (!key) {
            return res.status(400).json({ message: 'key is required' });
        }

        const fileBlock = await s3KeyToContentBlock(key);

        const response = await claude.messages.create({
            model: MODEL,
            max_tokens: 4096,
            messages: [
                {
                    role: 'user',
                    content: [
                        fileBlock,
                        { type: 'text', text: prompt || 'Summarize this document and extract any key fields (amounts, dates, parties, item lines) as a clear structured list.' },
                    ],
                },
            ],
        });

        const textBlock = response.content.find((b) => b.type === 'text');
        res.json({ result: textBlock?.text ?? '' });
    } catch (error) {
        console.error('AI document extraction error:', error);
        res.status(500).json({ message: 'AI document extraction failed', error: error.message });
    }
});

// POST /api/ai/compare-quotations — { quotation1Url?, quotation2Url?, quotation3Url? }
// -> { quotations: { quotation1: {...}, ... }, cheapest: 'quotation1'|'quotation2'|'quotation3'|null, reasoning: string }
router.post('/compare-quotations', authMiddleware, async (req, res) => {
    try {
        const slots = ['quotation1', 'quotation2', 'quotation3'];
        const present = slots.filter((slot) => req.body[`${slot}Url`]);

        if (present.length < 2) {
            return res.status(400).json({ message: 'At least 2 quotations are required to compare' });
        }

        const content = [];
        for (const slot of present) {
            const fileBlock = await s3KeyToContentBlock(req.body[`${slot}Url`]);
            content.push({ type: 'text', text: `--- ${slot} ---` });
            content.push(fileBlock);
        }
        content.push({
            type: 'text',
            text: `You are comparing ${present.length} vendor quotations for the same purchase order (labeled ${present.join(', ')}). ` +
                'For each one, extract the vendor/party name and the total quoted amount (final payable amount, in the document\'s currency). ' +
                'Then determine which quotation is the cheapest (lowest total amount) — if amounts are otherwise comparable in scope, terms, and item coverage. ' +
                'Respond with ONLY a raw JSON object (no markdown fences, no commentary) in exactly this shape: ' +
                `{"quotations": {${present.map((s) => `"${s}": {"vendorName": string|null, "totalAmount": number|null}`).join(', ')}}, ` +
                '"cheapest": one of ' + JSON.stringify(present) + ' or null if it cannot be determined, ' +
                '"reasoning": a short one-sentence explanation}',
        });

        const response = await claude.messages.create({
            model: MODEL,
            max_tokens: 1024,
            messages: [{ role: 'user', content }],
        });

        const textBlock = response.content.find((b) => b.type === 'text');
        let parsed;
        try {
            parsed = parseJsonResponse(textBlock?.text ?? '');
        } catch (parseError) {
            console.error('Failed to parse AI comparison response:', textBlock?.text);
            return res.status(500).json({ message: 'AI returned an unparseable response, please try again' });
        }

        res.json(parsed);
    } catch (error) {
        console.error('AI quotation comparison error:', error);
        res.status(500).json({ message: 'AI quotation comparison failed', error: error.message });
    }
});

// POST /api/ai/optimize-quotations — { urls: string[] } (2+ S3 keys, any count)
// Reads every line item across all given quotations and builds one combined "optimal quotation"
// by picking the cheapest available price for each material — not just the cheapest quotation overall.
router.post('/optimize-quotations', authMiddleware, async (req, res) => {
    try {
        const urls = Array.isArray(req.body.urls) ? req.body.urls.filter(Boolean) : [];

        if (urls.length < 2) {
            return res.status(400).json({ message: 'At least 2 quotations are required to optimize' });
        }
        if (urls.length > 8) {
            return res.status(400).json({ message: 'At most 8 quotations can be compared at once' });
        }

        const present = urls.map((_, i) => `quotation${i + 1}`);

        const content = [];
        for (let i = 0; i < urls.length; i++) {
            const fileBlock = await s3KeyToContentBlock(urls[i]);
            content.push({ type: 'text', text: `--- ${present[i]} ---` });
            content.push(fileBlock);
        }
        content.push({
            type: 'text',
            text: `You are building one combined, cost-optimal purchase quotation from ${present.length} vendor quotations (labeled ${present.join(', ')}) for the same material requirement.

For each quotation, extract every line item: material description, unit, quantity, and rate (per-unit price). Match the same material across quotations even if the wording differs slightly (e.g. "OPC Cement 50kg" and "Cement Bag" are the same item if they clearly refer to the same material) — use your judgment, never invent an item that isn't in any quotation.

For every distinct material found across all quotations, pick the SINGLE CHEAPEST per-unit rate available for it among the quotations that include it, and use that quotation's quantity for that item (if quantities differ across quotations for the same item, use the quantity from the quotation whose rate was picked as cheapest). Compute amount = quantity × rate for each item.

Also compute, for comparison, what the total would be if everything were instead bought entirely from a single quotation (for each quotation that has ALL the distinct items; use null if a quotation is missing some items and so can't fully cover the order alone).

Respond with ONLY raw JSON (no markdown fences, no commentary) in exactly this shape:
{
  "items": [{"materialDescription": string, "unit": string, "quantity": number, "rate": number, "amount": number, "bestSource": one of ${JSON.stringify(present)}, "bestVendorName": string|null}],
  "optimalTotal": number,
  "singleVendorTotals": {${present.map((s) => `"${s}": number|null`).join(', ')}},
  "estimatedSavings": number,
  "reasoning": "1-2 sentence summary of how much is saved and why"
}`,
        });

        const response = await claude.messages.create({
            model: MODEL,
            max_tokens: 4096,
            messages: [{ role: 'user', content }],
        });

        const textBlock = response.content.find((b) => b.type === 'text');
        let parsed;
        try {
            parsed = parseJsonResponse(textBlock?.text ?? '');
        } catch (parseError) {
            console.error('Failed to parse AI optimization response:', textBlock?.text);
            return res.status(500).json({ message: 'AI returned an unparseable response, please try again' });
        }

        res.json(parsed);
    } catch (error) {
        console.error('AI quotation optimization error:', error);
        res.status(500).json({ message: 'AI quotation optimization failed', error: error.message });
    }
});

// POST /api/ai/check-vendor-delays — admin-only manual trigger (the same check runs automatically every day at 9 AM IST)
router.post('/check-vendor-delays', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const results = await checkAndSendVendorDelayReminders();
        res.json({ checked: results.length, results });
    } catch (error) {
        console.error('Manual vendor delay check error:', error);
        res.status(500).json({ message: 'Vendor delay check failed', error: error.message });
    }
});

// POST /api/ai/progress-analysis — { period, site?, from?, to? }
// Re-aggregates the progress report server-side, then asks Claude to apply civil-engineering
// judgment to flag underperformers and material/work discrepancies, with next-step recommendations.
router.post('/progress-analysis', authMiddleware, async (req, res) => {
    try {
        const { period = 'daily', site, from, to } = req.body;
        const report = await buildProgressReport({ period, site, from, to });

        if (report.entryCount === 0) {
            return res.json({
                summary: 'No daily progress entries were found for this period/site — nothing to analyze yet.',
                underperformers: [],
                discrepancies: [],
                recommendations: [],
            });
        }

        const response = await claude.messages.create({
            model: MODEL,
            max_tokens: 4096,
            system: 'You are a senior civil engineering project auditor reviewing site progress data for a construction company. ' +
                'You know standard material consumption norms (e.g. cement bags per sqm of plaster/brickwork/concrete, typical labour productivity rates) ' +
                'and use them to judge whether material usage is consistent with the work actually completed. Be specific and numeric where the data allows it. ' +
                'Never invent names or numbers that are not in the data given to you.',
            messages: [
                {
                    role: 'user',
                    content: `Analyze this ${report.period} construction progress report (site: ${report.site || 'all sites'}, ${report.from} to ${report.to}, ${report.entryCount} daily entries).

Contractor performance (planned vs actual labour/work, in the given units):
${JSON.stringify(report.contractors, null, 2)}

Site engineer / supervisor performance (labour mobilization and material planned-vs-used on their sites):
${JSON.stringify(report.engineers, null, 2)}

Time series totals per period bucket:
${JSON.stringify(report.timeSeries, null, 2)}

Material loss / wastage signals — these are pre-computed by cross-referencing the site's actual recorded
material consumption against what the BOQ/BOM Google Sheet says that much completed work should require
(expectedQty = BOQ quantity-per-unit × actual work done). These are NOT estimates you need to derive —
treat each entry below as a confirmed overuse finding and explain the likely cause (wastage, pilferage,
over-issuance, poor storage, incorrect BOQ) and its cost/risk impact:
${JSON.stringify(report.materialLossSignals, null, 2)}

Respond with ONLY raw JSON (no markdown fences) in exactly this shape:
{
  "summary": "2-3 sentence executive summary of overall progress health, mentioning material loss if any was found",
  "underperformers": [{"name": string, "role": "contractor"|"site engineer", "issue": string, "evidence": string}],
  "discrepancies": [{"area": string, "expected": string, "actual": string, "note": string}],
  "recommendations": [{"priority": "high"|"medium"|"low", "action": string}]
}
Include every material loss signal above as its own entry in "discrepancies" (area should name the material and task, e.g. "Cement overuse — Tiling 1 floor"), in addition to any other underperformers/discrepancies the data supports. If everything looks healthy, return empty arrays and say so in the summary.`,
                },
            ],
        });

        const textBlock = response.content.find((b) => b.type === 'text');
        let parsed;
        try {
            parsed = parseJsonResponse(textBlock?.text ?? '');
        } catch (parseError) {
            console.error('Failed to parse AI progress analysis response:', textBlock?.text);
            return res.status(500).json({ message: 'AI returned an unparseable response, please try again' });
        }

        const saved = await ProgressAnalysis.create({
            period: report.period,
            site: report.site,
            from: report.from,
            to: report.to,
            entryCount: report.entryCount,
            summary: parsed.summary,
            underperformers: parsed.underperformers || [],
            discrepancies: parsed.discrepancies || [],
            recommendations: parsed.recommendations || [],
            generatedBy: req.user?.id,
        });

        res.json({
            ...parsed,
            _id: saved._id,
            createdAt: saved.createdAt,
            period: report.period,
            site: report.site,
            from: report.from,
            to: report.to,
        });
    } catch (error) {
        console.error('AI progress analysis error:', error);
        res.status(500).json({ message: 'AI progress analysis failed', error: error.message });
    }
});

// POST /api/ai/ceo-report — { period, site?, ceoEmail, scheduledFor? }
// Sends immediately, or — if scheduledFor is a future ISO datetime — queues it for the cron to pick up.
router.post('/ceo-report', authMiddleware, async (req, res) => {
    try {
        const { period = 'daily', site, ceoEmail, scheduledFor } = req.body;
        if (!ceoEmail) {
            return res.status(400).json({ message: 'ceoEmail is required' });
        }

        const scheduledDate = scheduledFor ? new Date(scheduledFor) : null;
        const isFutureSchedule = scheduledDate && scheduledDate.getTime() > Date.now() + 60000; // more than 1 min out

        if (isFutureSchedule) {
            const scheduled = await ScheduledCeoReport.create({
                period, site: site || null, ceoEmail, scheduledFor: scheduledDate, createdBy: req.user?.id,
            });
            return res.json({ scheduled: true, report: scheduled });
        }

        const result = await sendCeoAudioReport({ period, site, ceoEmail });
        res.json({ scheduled: false, sent: true, ...result });
    } catch (error) {
        console.error('CEO report error:', error);
        res.status(500).json({ message: 'Failed to send CEO report', error: error.message });
    }
});

// GET /api/ai/ceo-report/schedule — list scheduled/sent CEO reports, newest first
router.get('/ceo-report/schedule', authMiddleware, async (req, res) => {
    try {
        const history = await ScheduledCeoReport.find().sort({ createdAt: -1 }).limit(50).lean();
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch scheduled reports', error: error.message });
    }
});

export default router;
