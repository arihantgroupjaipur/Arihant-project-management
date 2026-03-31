import { google } from 'googleapis';
import Task from '../models/Task.js';
import Indent from '../models/Indent.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import WorkOrder from '../models/WorkOrder.js';
import WorkCompletion from '../models/WorkCompletion.js';
import Entry from '../models/Entry.js';
import Bill from '../models/Bill.js';
import Setting from '../models/Setting.js';
import dotenv from 'dotenv';
dotenv.config();

// Build a permanent file view URL using the server's public redirect endpoint
function permanentFileUrl(key) {
    if (!key) return '';
    const base = (process.env.SERVER_URL || '').replace(/\/$/, '');
    if (!base) return key; // fallback: return raw key if SERVER_URL not configured
    return `${base}/api/upload/view?key=${encodeURIComponent(key)}`;
}

const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');

function formatDate(value) {
    if (!value) return '—';
    try {
        const dt = new Date(value);
        if (isNaN(dt)) return String(value);
        // Convert to IST (UTC+5:30)
        const ist = new Date(dt.getTime() + 5.5 * 60 * 60 * 1000);
        const dd  = String(ist.getUTCDate()).padStart(2, '0');
        const mm  = String(ist.getUTCMonth() + 1).padStart(2, '0');
        const yyyy = ist.getUTCFullYear();
        const hh  = String(ist.getUTCHours()).padStart(2, '0');
        const min = String(ist.getUTCMinutes()).padStart(2, '0');
        const ss  = String(ist.getUTCSeconds()).padStart(2, '0');
        return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
    } catch {
        return String(value);
    }
}

async function getSheetsConfigForKey(settingKey) {
    const settingObj = await Setting.findOne({ key: settingKey });
    let sheetIds = [];
    if (settingObj?.value) {
        if (Array.isArray(settingObj.value)) {
            sheetIds = settingObj.value;
        } else if (typeof settingObj.value === 'string') {
            sheetIds = settingObj.value.split(',').map(s => s.trim()).filter(Boolean);
        }
    }
    if (sheetIds.length === 0) throw new Error(`No sheet IDs configured for: ${settingKey}`);
    if (!CLIENT_EMAIL || !PRIVATE_KEY) throw new Error('Google Sheets credentials missing in .env');

    const auth = new google.auth.GoogleAuth({
        credentials: { client_email: CLIENT_EMAIL, private_key: PRIVATE_KEY },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    return { sheets: google.sheets({ version: 'v4', auth }), sheetIds };
}

async function ensureTabExists(sheets, spreadsheetId, tabName) {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const exists = meta.data.sheets.some(s => s.properties.title === tabName);
    if (!exists) {
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: [{ addSheet: { properties: { title: tabName } } }],
            },
        });
    }
}

async function syncRowsToSheets(settingKey, rows, tabName = 'Sheet1') {
    try {
        const { sheets, sheetIds } = await getSheetsConfigForKey(settingKey);
        await Promise.allSettled(sheetIds.map(async (sheetId) => {
            try {
                await ensureTabExists(sheets, sheetId, tabName);
                await sheets.spreadsheets.values.clear({ spreadsheetId: sheetId, range: tabName });
                await sheets.spreadsheets.values.update({
                    spreadsheetId: sheetId,
                    range: `${tabName}!A1`,
                    valueInputOption: 'RAW',
                    requestBody: { values: rows },
                });
                console.log(`[GoogleSheets] Synced ${rows.length - 1} rows → ${tabName} → ${sheetId}`);
            } catch (err) {
                console.error(`[GoogleSheets] Failed for sheet ${sheetId} (${tabName}):`, err.message);
            }
        }));
    } catch (err) {
        console.error(`[GoogleSheets] ${settingKey} sync error:`, err.message);
    }
}

// ── TASKS ─────────────────────────────────────────────────────────────────────
export async function syncAllTasksToSheet() {
    try {
        const tasks = await Task.find()
            .populate('contractor', 'name')
            .populate('projectManager', 'fullName')
            .sort({ createdAt: -1 });

        const rows = [
            ['Task ID', 'Work Particulars', 'Contractor', 'Planned Start', 'Planned Finish', 'Duration (Days)', 'Status', 'Project Manager', 'Created At'],
            ...tasks.map(t => [
                t.taskId || '—',
                t.workParticulars || '—',
                t.contractor?.name || t.contractorName || '—',
                formatDate(t.plannedStartDate),
                formatDate(t.plannedFinishDate),
                t.duration != null ? t.duration : '—',
                t.status || '—',
                t.projectManager?.fullName || '—',
                formatDate(t.createdAt),
            ]),
        ];
        await syncRowsToSheets('google_sheet_id', rows, 'Tasks');
    } catch (err) {
        console.error('[GoogleSheets] Tasks sync failed:', err.message);
    }
}

// ── INDENTS ───────────────────────────────────────────────────────────────────
export async function syncAllIndentsToSheet() {
    try {
        const indents = await Indent.find()
            .populate('createdBy', 'fullName')
            .populate('verifiedBy', 'fullName')
            .sort({ createdAt: -1 });

        const rows = [
            ['Indent No', 'Date', 'Task Reference', 'Site Engineer', 'Material Group', 'Site Name', 'Work Description', 'Block/Floor', 'Lead Time (Days)', 'Priority', 'Status', 'Items Count', 'Items Summary', 'Verified', 'Verified By', 'Verified PDF', 'Created By', 'Created At'],
            ...indents.map(i => [
                i.indentNumber || '—',
                formatDate(i.createdAt || i.date),
                i.taskReference || '—',
                i.siteEngineerName || '—',
                i.materialGroup || '—',
                i.siteName || '—',
                i.workDescription || '—',
                i.blockFloorWork || '—',
                i.leadTime ?? '—',
                i.priority || '—',
                i.status || '—',
                (i.items || []).length,
                (i.items || []).map(item => `${item.materialDescription} (${item.requiredQuantity} ${item.unit})`).join(' | ') || '—',
                i.verifiedByPurchaseManager ? 'Yes' : 'No',
                i.verifiedBy?.fullName || '—',
                permanentFileUrl(i.verifiedPdfUrl) || '—',
                i.createdBy?.fullName || '—',
                formatDate(i.createdAt),
            ]),
        ];
        await syncRowsToSheets('google_sheet_id_indents', rows, 'Indents');
    } catch (err) {
        console.error('[GoogleSheets] Indents sync failed:', err.message);
    }
}

// ── PURCHASE ORDERS ───────────────────────────────────────────────────────────
export async function syncAllPurchaseOrdersToSheet() {
    try {
        const pos = await PurchaseOrder.find().populate('indentReferences').sort({ createdAt: -1 });

        const rows = [
            ['PO Number', 'Date', 'Indent References', 'Task Reference', 'Vendor Name', 'Vendor Address', 'Vendor GST', 'Vendor Contact', 'Items Count', 'Items Summary', 'Sub Total', 'Freight', 'Total Amount', 'Status', 'Verification Status', 'Prepared By', 'Uploaded PDF', 'Quotation 1', 'Quotation 2', 'Quotation 3', 'Approved Quotation', 'Created At'],
            ...pos.map(po => [
                po.poNumber || '—',
                formatDate(po.createdAt || po.date),
                (po.indentReferences || []).map(i => i?.indentNumber).filter(Boolean).join(', ') || '—',
                po.taskReference || '—',
                po.vendorName || '—',
                po.vendorAddress || '—',
                po.vendorGst || '—',
                po.vendorContactNo || '—',
                (po.items || []).length,
                (po.items || []).map(item => `${item.materialDescription} (${item.quantity} ${item.unit} @ ₹${item.rate})`).join(' | ') || '—',
                po.subTotal ?? 0,
                po.freight ?? 0,
                po.totalAmount ?? 0,
                po.status || '—',
                po.materialVerificationStatus || '—',
                po.preparedBy || '—',
                permanentFileUrl(po.uploadedPdf) || '—',
                permanentFileUrl(po.quotation1Url) || '—',
                permanentFileUrl(po.quotation2Url) || '—',
                permanentFileUrl(po.quotation3Url) || '—',
                po.approvedQuotation && po.approvedQuotation !== 'none' ? po.approvedQuotation : '—',
                formatDate(po.createdAt),
            ]),
        ];
        await syncRowsToSheets('google_sheet_id_purchase_orders', rows, 'Purchase Orders');
    } catch (err) {
        console.error('[GoogleSheets] Purchase Orders sync failed:', err.message);
    }
}

// ── WORK ORDERS ───────────────────────────────────────────────────────────────
export async function syncAllWorkOrdersToSheet() {
    try {
        const workOrders = await WorkOrder.find().populate('createdBy', 'fullName').sort({ createdAt: -1 });

        const rows = [
            ['WO Number', 'Date', 'Main WO Reference', 'Task Reference', 'Work Location', 'Address Location', 'Contact Person', 'Store Keeper / Supervisor', 'Sr.', 'Work Description', 'Planned Labour', 'Work Start Date', 'Work Finish Date', 'Work Area', 'Rate (₹)', 'Item Amount (₹)', 'WO Total Amount (₹)', 'Comments', 'Uploaded PDF', 'Created By', 'Created At'],
            ...workOrders.flatMap(wo => {
                const woTotal = (wo.workItems || []).reduce((sum, wi) => sum + (wi.totalAmount || 0), 0);
                const base = [
                    wo.workOrderNumber || '—',
                    formatDate(wo.createdAt || wo.date),
                    wo.mainWorkOrderReference || '—',
                    wo.taskReference || '—',
                    wo.workLocationName || '—',
                    wo.addressLocation || '—',
                    wo.contactPersonName || '—',
                    wo.storeKeeperSupervisorName || '—',
                ];
                const items = wo.workItems?.length ? wo.workItems : [{}];
                return items.map((wi, idx) => [
                    ...base,
                    idx + 1,
                    wi.workDescription || '—',
                    wi.plannedLabour ?? '—',
                    wi.workStartDate ? formatDate(wi.workStartDate) : '—',
                    wi.workFinishDate ? formatDate(wi.workFinishDate) : '—',
                    wi.workArea ?? '—',
                    wi.rate ?? '—',
                    wi.totalAmount ?? '—',
                    idx === 0 ? woTotal : '',
                    idx === 0 ? (wo.comments || '—') : '',
                    idx === 0 ? (permanentFileUrl(wo.uploadedPdf) || '—') : '',
                    idx === 0 ? (wo.createdBy?.fullName || '—') : '',
                    idx === 0 ? formatDate(wo.createdAt) : '',
                ]);
            }),
        ];
        await syncRowsToSheets('google_sheet_id_work_orders', rows, 'Work Orders');
    } catch (err) {
        console.error('[GoogleSheets] Work Orders sync failed:', err.message);
    }
}

// ── WORK COMPLETIONS ──────────────────────────────────────────────────────────
export async function syncAllWorkCompletionsToSheet() {
    try {
        const completions = await WorkCompletion.find().populate('createdBy', 'fullName').sort({ createdAt: -1 });

        const rows = [
            ['WO Number', 'Date', 'Block/Tower', 'Floor/Zone', 'Work Trade', 'Specific Activity', 'Contractor', 'Bill No', 'Engineer', 'Start Date', 'End Date', 'Duration', 'QC Remarks', 'Materials Count', 'Materials Summary', 'Pre-Work Checks', 'During-Work Checks', 'Post-Work Checks', 'Uploaded PDF', 'Created By', 'Created At'],
            ...completions.map(c => {
                const preWork = Object.entries(c.preWorkChecklist || {}).filter(([, v]) => v).map(([k]) => k).join(', ') || '—';
                const duringWork = Object.entries(c.duringWorkChecklist || {}).filter(([, v]) => v).map(([k]) => k).join(', ') || '—';
                const postWork = Object.entries(c.postWorkChecklist || {}).filter(([, v]) => v).map(([k]) => k).join(', ') || '—';
                return [
                    c.workOrderNumber || '—',
                    formatDate(c.createdAt || c.date),
                    c.blockTower || '—',
                    c.floorZoneUnit || '—',
                    c.workTrade || '—',
                    c.specificActivity || '—',
                    c.contractorName || '—',
                    c.billNo || '—',
                    c.engineerName || '—',
                    formatDate(c.workStartDate),
                    formatDate(c.workEndDate),
                    c.totalWorkDuration || '—',
                    c.qcRemarks || '—',
                    (c.materialsConsumed || []).length,
                    (c.materialsConsumed || []).map(m => `${m.materialName} (${m.quantity} ${m.unit})`).join(' | ') || '—',
                    preWork,
                    duringWork,
                    postWork,
                    permanentFileUrl(c.uploadedPdf) || '—',
                    c.createdBy?.fullName || '—',
                    formatDate(c.createdAt),
                ];
            }),
        ];
        await syncRowsToSheets('google_sheet_id_work_completions', rows, 'Work Completions');
    } catch (err) {
        console.error('[GoogleSheets] Work Completions sync failed:', err.message);
    }
}

// ── DAILY PROGRESS REPORTS (ENTRIES) ─────────────────────────────────────────
export async function syncAllEntriesToSheet() {
    try {
        const entries = await Entry.find().sort({ createdAt: -1 });

        const rows = [
            ['Date', 'Site / Project', 'Location', 'Supervisor', 'Total Workers', 'Contractors', 'Progress Reports Count', 'Material Items Count', 'Material Summary', 'Created At'],
            ...entries.map(e => [
                formatDate(e.createdAt || e.date),
                e.projectName || '—',
                e.location || '—',
                e.supervisor || '—',
                e.workerCount ?? 0,
                (e.labourDetails || []).map(l => `${l.contractorName} (${l.actualLabour})`).join(', ') || '—',
                (e.dailyProgressReports || []).filter(r => r.contractorName).length,
                (e.materialConsumption || []).filter(m => m.materialName).length,
                (e.materialConsumption || []).filter(m => m.materialName)
                    .map(m => `${m.materialName} (used: ${m.usedTotalQty}/${m.totalQuantity} ${m.unit})`).join(' | ') || '—',
                formatDate(e.createdAt),
            ]),
        ];
        await syncRowsToSheets('google_sheet_id_entries', rows, 'Daily Progress');
    } catch (err) {
        console.error('[GoogleSheets] Entries sync failed:', err.message);
    }
}

// ── BILLS ─────────────────────────────────────────────────────────────────────
export async function syncAllBillsToSheet() {
    try {
        const bills = await Bill.find().populate('createdBy', 'fullName').sort({ createdAt: -1 });

        const rows = [
            ['Bill No.', 'Date', 'Contractor Name', 'WO/PO Number', 'Description', 'Amount (₹)', 'Status', 'Remarks', 'Uploaded Files', 'Created By', 'Created At'],
            ...bills.map(b => [
                b.billNumber || '—',
                formatDate(b.createdAt || b.date),
                b.contractorName || '—',
                b.workOrderNumber || '—',
                b.description || '—',
                b.amount ?? 0,
                b.status || '—',
                b.remarks || '—',
                (b.attachments || []).length > 0
                    ? b.attachments.map(a => permanentFileUrl(a.key) || a.key).join('\n')
                    : '—',
                b.createdBy?.fullName || '—',
                formatDate(b.createdAt),
            ]),
        ];
        await syncRowsToSheets('google_sheet_id_bills', rows, 'Bills');
    } catch (err) {
        console.error('[GoogleSheets] Bills sync failed:', err.message);
    }
}
