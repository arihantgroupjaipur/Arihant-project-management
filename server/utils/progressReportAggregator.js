import Entry from '../models/Entry.js';
import { getBomForTask } from './procurementLookup.js';

const LACKING_WORK_EFFICIENCY = 0.7; // actualWork/plannedWork below this => contractor flagged
const LACKING_LABOUR_EFFICIENCY = 0.7; // actualLabour/plannedLabour below this => engineer flagged
const MATERIAL_OVERUSE_THRESHOLD = 0.2; // 20% more material used than planned => flagged
const STALLED_STATUS = ['Pending', 'On Hold'];

const num = (v) => {
    const n = typeof v === 'number' ? v : parseFloat(v);
    return Number.isFinite(n) ? n : 0;
};

const bucketKey = (dateStr, period) => {
    const d = new Date(dateStr);
    if (isNaN(d)) return 'unknown';
    if (period === 'daily') {
        return d.toISOString().split('T')[0];
    }
    if (period === 'monthly') {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    // weekly — ISO week label "YYYY-Www"
    const target = new Date(d.valueOf());
    const dayNr = (d.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = new Date(target.getFullYear(), 0, 4);
    const week = 1 + Math.round(((target - firstThursday) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
    return `${target.getFullYear()}-W${String(week).padStart(2, '0')}`;
};

const MATERIAL_LOSS_THRESHOLD = 0.15; // >15% more used than the BOQ says the completed work should need

// Strips the trailing "-<itemCode>" from a BOQ item name (e.g. "Cement-Bul-1001" + "Bul-1001" -> "Cement")
const coreItemName = (itemName, itemCode) => {
    const name = String(itemName ?? '');
    const code = String(itemCode ?? '');
    return code && name.endsWith(`-${code}`) ? name.slice(0, -(code.length + 1)).trim() : name.trim();
};

const namesMatch = (a, b) => {
    const na = String(a ?? '').toLowerCase().trim();
    const nb = String(b ?? '').toLowerCase().trim();
    if (!na || !nb) return false;
    return na.includes(nb) || nb.includes(na);
};

// Cross-references each logged task's actual material consumption against what the BOQ/BOM sheet
// says that much completed work should consume — a real engineering-grounded loss/wastage signal,
// not just "planned vs actual" figures a site engineer typed in. Best-effort: skips anything it can't match.
async function computeMaterialLossSignals(entries) {
    const bomCache = new Map();
    const signals = [];

    for (const entry of entries) {
        for (const row of entry.dailyProgressReports || []) {
            const workName = (row.workName || '').trim();
            const actualWork = num(row.actualWork);
            if (!workName || actualWork <= 0) continue;

            if (!bomCache.has(workName)) {
                try {
                    bomCache.set(workName, await getBomForTask(workName));
                } catch (err) {
                    bomCache.set(workName, { matched: false, bomItems: [] });
                }
            }
            const bom = bomCache.get(workName);
            if (!bom.matched) continue;

            for (const bomItem of bom.bomItems) {
                const requiredPerUnit = num(bomItem.requiredQtyPerUnit);
                if (requiredPerUnit <= 0) continue;
                const coreName = coreItemName(bomItem.itemName, bomItem.itemCode);

                const consumedRow = (entry.materialConsumption || []).find((m) => namesMatch(m.materialName, coreName));
                if (!consumedRow) continue;

                const expectedQty = requiredPerUnit * actualWork;
                const actualQty = num(consumedRow.usedTotalQty);
                if (expectedQty <= 0 || actualQty <= 0) continue;

                const overusePct = (actualQty - expectedQty) / expectedQty;
                if (overusePct > MATERIAL_LOSS_THRESHOLD) {
                    signals.push({
                        material: coreName,
                        task: workName,
                        site: entry.projectName,
                        date: entry.date,
                        unit: consumedRow.unit || bomItem.unit,
                        expectedQty: Math.round(expectedQty * 100) / 100,
                        actualQty,
                        overusePct: Math.round(overusePct * 100) / 100,
                    });
                }
            }
        }
    }
    return signals;
}

const defaultRange = (period) => {
    const to = new Date();
    const from = new Date();
    if (period === 'daily') from.setDate(from.getDate() - 30);
    else if (period === 'weekly') from.setDate(from.getDate() - 7 * 12);
    else from.setMonth(from.getMonth() - 12);
    return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] };
};

// Builds the full progress report used both by the charts UI and the AI analysis prompt
export async function buildProgressReport({ period = 'daily', site, from, to } = {}) {
    const range = (from && to) ? { from, to } : defaultRange(period);

    const query = { date: { $gte: range.from, $lte: range.to } };
    if (site) query.projectName = site;

    const entries = await Entry.find(query).sort({ date: 1 }).lean();

    // ---- Time series (chart data) ----
    const buckets = new Map();
    for (const entry of entries) {
        const key = bucketKey(entry.date, period);
        if (!buckets.has(key)) {
            buckets.set(key, { bucket: key, plannedLabour: 0, actualLabour: 0, plannedWork: 0, actualWork: 0, materialPlanned: 0, materialUsed: 0 });
        }
        const b = buckets.get(key);
        for (const row of entry.dailyProgressReports || []) {
            b.plannedLabour += num(row.plannedLabour);
            b.actualLabour += num(row.actualLabour);
            b.plannedWork += num(row.plannedWork);
            b.actualWork += num(row.actualWork);
        }
        for (const mat of entry.materialConsumption || []) {
            b.materialPlanned += num(mat.totalQuantity);
            b.materialUsed += num(mat.usedTotalQty);
        }
    }
    const timeSeries = [...buckets.values()].sort((a, b) => a.bucket.localeCompare(b.bucket));

    // ---- Contractor performance (from dailyProgressReports rows) ----
    const contractorMap = new Map();
    for (const entry of entries) {
        for (const row of entry.dailyProgressReports || []) {
            const name = (row.contractorName || 'Unknown').trim() || 'Unknown';
            if (!contractorMap.has(name)) {
                contractorMap.set(name, { name, plannedLabour: 0, actualLabour: 0, plannedWork: 0, actualWork: 0, rows: 0, stalled: 0 });
            }
            const c = contractorMap.get(name);
            c.plannedLabour += num(row.plannedLabour);
            c.actualLabour += num(row.actualLabour);
            c.plannedWork += num(row.plannedWork);
            c.actualWork += num(row.actualWork);
            c.rows += 1;
            if (STALLED_STATUS.includes(row.status)) c.stalled += 1;
        }
    }
    const contractors = [...contractorMap.values()].map((c) => {
        const workEfficiency = c.plannedWork > 0 ? c.actualWork / c.plannedWork : null;
        const labourEfficiency = c.plannedLabour > 0 ? c.actualLabour / c.plannedLabour : null;
        const stalledRatio = c.rows > 0 ? c.stalled / c.rows : 0;
        const reasons = [];
        if (workEfficiency !== null && workEfficiency < LACKING_WORK_EFFICIENCY) {
            reasons.push(`Only completed ${(workEfficiency * 100).toFixed(0)}% of planned work output`);
        }
        if (stalledRatio > 0.4) {
            reasons.push(`${c.stalled}/${c.rows} entries stuck in Pending/On Hold`);
        }
        return { ...c, workEfficiency, labourEfficiency, stalledRatio, lacking: reasons.length > 0, reasons };
    }).sort((a, b) => (a.workEfficiency ?? 1) - (b.workEfficiency ?? 1));

    // ---- Site engineer / supervisor performance ----
    const engineerMap = new Map();
    for (const entry of entries) {
        const name = (entry.supervisor || 'Unknown').trim() || 'Unknown';
        if (!engineerMap.has(name)) {
            engineerMap.set(name, { name, plannedLabour: 0, actualLabour: 0, materialPlanned: 0, materialUsed: 0, entryCount: 0, sites: new Set() });
        }
        const e = engineerMap.get(name);
        e.entryCount += 1;
        e.sites.add(entry.projectName);
        for (const row of entry.dailyProgressReports || []) {
            e.plannedLabour += num(row.plannedLabour);
            e.actualLabour += num(row.actualLabour);
        }
        for (const mat of entry.materialConsumption || []) {
            e.materialPlanned += num(mat.totalQuantity);
            e.materialUsed += num(mat.usedTotalQty);
        }
    }
    const engineers = [...engineerMap.values()].map((e) => {
        const labourEfficiency = e.plannedLabour > 0 ? e.actualLabour / e.plannedLabour : null;
        const materialVariancePct = e.materialPlanned > 0 ? (e.materialUsed - e.materialPlanned) / e.materialPlanned : 0;
        const reasons = [];
        if (labourEfficiency !== null && labourEfficiency < LACKING_LABOUR_EFFICIENCY) {
            reasons.push(`Only mobilized ${(labourEfficiency * 100).toFixed(0)}% of planned labour`);
        }
        if (materialVariancePct > MATERIAL_OVERUSE_THRESHOLD) {
            reasons.push(`Material overuse of ${(materialVariancePct * 100).toFixed(0)}% vs. plan on their site(s)`);
        }
        return {
            name: e.name,
            plannedLabour: e.plannedLabour,
            actualLabour: e.actualLabour,
            materialPlanned: e.materialPlanned,
            materialUsed: e.materialUsed,
            entryCount: e.entryCount,
            sites: [...e.sites],
            labourEfficiency,
            materialVariancePct,
            lacking: reasons.length > 0,
            reasons,
        };
    }).sort((a, b) => (a.labourEfficiency ?? 1) - (b.labourEfficiency ?? 1));

    let materialLossSignals = [];
    try {
        materialLossSignals = await computeMaterialLossSignals(entries);
    } catch (err) {
        console.warn('[progressReportAggregator] Material loss check skipped:', err.message);
    }

    return {
        period,
        site: site || null,
        from: range.from,
        to: range.to,
        entryCount: entries.length,
        timeSeries,
        contractors,
        engineers,
        materialLossSignals,
    };
}

export async function listSites() {
    return Entry.distinct('projectName');
}
