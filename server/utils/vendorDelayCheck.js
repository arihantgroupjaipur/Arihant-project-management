import PurchaseOrder from '../models/PurchaseOrder.js';
import claude from '../config/claude.js';
import { sendEmail, getEmailTemplate } from './emailService.js';

const MODEL = 'claude-sonnet-5';

// Builds a per-item received vs. remaining breakdown from the PO's items[] (quantity vs. receivedQuantity)
function buildItemBreakdown(po) {
    return (po.items || []).map((i) => {
        const ordered = Number(i.quantity) || 0;
        const received = Number(i.receivedQuantity) || 0;
        const remaining = Math.max(0, ordered - received);
        return { materialDescription: i.materialDescription, unit: i.unit, ordered, received, remaining };
    });
}

// Ask Claude to draft a polite-but-firm delay-reminder email body for one overdue PO —
// aware of what's already been received so it thanks the vendor for that and chases only the rest.
async function draftDelayEmail(po, daysLate) {
    const breakdown = buildItemBreakdown(po);
    const receivedItems = breakdown.filter((i) => i.received > 0);
    const remainingItems = breakdown.filter((i) => i.remaining > 0);

    const fmtLine = (i) => `- ${i.materialDescription}: ordered ${i.ordered} ${i.unit}, received ${i.received} ${i.unit}, remaining ${i.remaining} ${i.unit}`;
    const itemsList = breakdown.map(fmtLine).join('\n');

    const response = await claude.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: 'You write short, professional, firm-but-polite business emails on behalf of a construction procurement team, reminding vendors about delayed deliveries. Never invent facts not given to you.',
        messages: [
            {
                role: 'user',
                content: `Write a delivery-delay reminder email to send to a vendor. Respond with ONLY raw JSON (no markdown fences) in exactly this shape: {"subject": string, "body": string}. "body" should be plain text (a few short paragraphs, no markdown), ready to drop into an HTML email template.

Details:
- Purchase Order Number: ${po.poNumber}
- Vendor: ${po.vendorName}
- Expected delivery date: ${po.expectedDeliveryDate.toDateString()}
- Days overdue: ${daysLate}
- Material verification status: ${po.materialVerificationStatus}
- Per-item status (ordered / received / remaining):
${itemsList || '(item list unavailable)'}

${receivedItems.length > 0
                        ? 'Some items have ALREADY been partially or fully received — explicitly acknowledge and thank the vendor for exactly which items/quantities have arrived, then clearly ask for the remaining items (list them with their remaining quantities) to be dispatched urgently.'
                        : 'Nothing has been received yet — this is a full delivery delay. Ask for an updated delivery timeline for all items.'}

Tone: professional, firm but respectful.`,
            },
        ],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    const fenced = (textBlock?.text ?? '').match(/```(?:json)?\s*([\s\S]*?)```/i);
    return JSON.parse((fenced ? fenced[1] : textBlock.text).trim());
}

const REMINDER_REPEAT_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000; // re-send every 3 days until delivery is verified

// Finds POs whose expected delivery date has passed and delivery isn't fully verified yet —
// drafts a fresh AI email and sends it, repeating every 3 days until the PO is verified.
export async function checkAndSendVendorDelayReminders() {
    const repeatCutoff = new Date(Date.now() - REMINDER_REPEAT_INTERVAL_MS);

    const overduePOs = await PurchaseOrder.find({
        expectedDeliveryDate: { $lt: new Date() },
        materialVerificationStatus: { $ne: 'Verified' },
        vendorEmail: { $exists: true, $ne: '' },
        $or: [
            { delayReminderSentAt: null },
            { delayReminderSentAt: { $lt: repeatCutoff } },
        ],
    });

    const results = [];
    for (const po of overduePOs) {
        try {
            const daysLate = Math.ceil((Date.now() - po.expectedDeliveryDate.getTime()) / (1000 * 60 * 60 * 24));
            const { subject, body } = await draftDelayEmail(po, daysLate);
            const html = getEmailTemplate(subject, body.replace(/\n/g, '<br/>'));

            await sendEmail(po.vendorEmail, subject, html);

            const sentAt = new Date();
            po.delayReminderSentAt = sentAt;
            po.delayReminderLog.push({ sentAt, daysLate, subject, body });
            await po.save();

            results.push({ poNumber: po.poNumber, vendorEmail: po.vendorEmail, sentAt, sent: true });
            console.log(`Delay reminder sent for PO ${po.poNumber} to ${po.vendorEmail}`);
        } catch (error) {
            console.error(`Failed to send delay reminder for PO ${po.poNumber}:`, error);
            results.push({ poNumber: po.poNumber, sent: false, error: error.message });
        }
    }

    return results;
}
