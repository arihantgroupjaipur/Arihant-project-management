import { readSheetAsObjects } from './googleSheetsService.js';

const norm = (s) => String(s ?? '').trim().toLowerCase();

// "work"/"floor" are too generic in this dataset (nearly every task name contains one) to count as a real signal
const STOPWORDS = new Set(['the', 'of', 'a', 'an', 'and', 'for', 'to', 'in', 'on', 'at', 'with', 'work', 'floor']);

// Splits into meaningful words, dropping stopwords/punctuation, for loose matching
const words = (s) => norm(s).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w && !STOPWORDS.has(w));

// Word-overlap similarity (0-1): how much of the shorter word set is covered by the longer one
function similarity(a, b) {
    const wa = new Set(words(a));
    const wb = new Set(words(b));
    if (wa.size === 0 || wb.size === 0) return 0;
    let shared = 0;
    for (const w of wa) if (wb.has(w)) shared++;
    return shared / Math.min(wa.size, wb.size);
}

const FUZZY_MATCH_THRESHOLD = 0.45;

// Finds the FG row whose "Work" name best matches the given task name — exact match first,
// then substring, then word-overlap similarity — so slightly different wording still resolves.
function findBestFgMatch(fgRows, workParticulars) {
    const target = norm(workParticulars);
    if (!target) return null;

    const exact = fgRows.find((r) => norm(r.Work) === target);
    if (exact) return exact;

    const substring = fgRows.find((r) => {
        const w = norm(r.Work);
        return w && (w.includes(target) || target.includes(w));
    });
    if (substring) return substring;

    let best = null;
    let bestScore = 0;
    for (const r of fgRows) {
        const score = similarity(r.Work, workParticulars);
        if (score > bestScore) { bestScore = score; best = r; }
    }
    return bestScore >= FUZZY_MATCH_THRESHOLD ? best : null;
}

// Resolves a Task's work name (Task.workParticulars) → FG/SKU (via the "FG" tab) → BOM line items
// (via the "Raw" tab), then joins each line item's current stock from the IMS sheet's "IMS" tab.
export async function getBomForTask(workParticulars) {
    const fgRows = await readSheetAsObjects('google_sheet_id_boq', 'FG');
    const match = findBestFgMatch(fgRows, workParticulars);

    if (!match) {
        return { matched: false, fgCode: null, bomItems: [] };
    }

    const fgSku = match.SKU;
    const rawRows = await readSheetAsObjects('google_sheet_id_boq', 'Raw');
    const bomRows = rawRows.filter((r) => r['FG Code'] === fgSku || norm(r['Used In FG']) === norm(match.Work));

    let stockBySku = {};
    try {
        const imsRows = await readSheetAsObjects('google_sheet_id_ims', 'IMS');
        imsRows.forEach((r) => { stockBySku[r['SKU Code']] = r['Closing Stock']; });
    } catch (err) {
        // IMS sheet not configured/shared yet — still return BOM without stock info
        console.warn('[procurementLookup] IMS lookup skipped:', err.message);
    }

    return {
        matched: true,
        fgCode: fgSku,
        matchedWorkName: match.Work,
        bomItems: bomRows.map((r) => ({
            itemName: r['Item Name'],
            itemCode: r['Item Code'],
            unit: r['Unit'],
            requiredQtyPerUnit: r['Quantity'],
            currentStock: Object.prototype.hasOwnProperty.call(stockBySku, r['Item Code']) ? stockBySku[r['Item Code']] : null,
        })),
    };
}
