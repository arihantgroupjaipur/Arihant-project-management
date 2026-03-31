import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const COLS = 6; // A–F

const fmtDate = (d) => {
    if (!d) return '—';
    if (/^\d{2}[.\-/]\d{2}[.\-/]\d{4}$/.test(d))
        return d.replace(/-/g, '.').replace(/\//g, '.');
    try {
        const dt = new Date(d);
        if (isNaN(dt)) return d;
        return `${String(dt.getDate()).padStart(2,'0')}.${String(dt.getMonth()+1).padStart(2,'0')}.${dt.getFullYear()}`;
    } catch { return d; }
};

const fmtTs = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt)) return '';
    const ist = new Date(dt.getTime() + 5.5 * 60 * 60 * 1000);
    const dd = String(ist.getUTCDate()).padStart(2,'0');
    const mm = String(ist.getUTCMonth()+1).padStart(2,'0');
    const yyyy = ist.getUTCFullYear();
    const hh = String(ist.getUTCHours()).padStart(2,'0');
    const min = String(ist.getUTCMinutes()).padStart(2,'0');
    const ss = String(ist.getUTCSeconds()).padStart(2,'0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
};

const computeTotals = (items, gstPct) => {
    const sub = (items || []).reduce((s, it) => s + (Number(it.qty)||0) * (Number(it.rate)||0), 0);
    const gst = +(sub * (Number(gstPct)||0) / 100).toFixed(2);
    return { subTotal: sub, gstAmount: gst, totalAmount: +(sub + gst).toFixed(2) };
};

// ── Style helpers ────────────────────────────────────────────────────────────

const THIN = { style: 'thin', color: { argb: 'FF000000' } };
const THICK = { style: 'medium', color: { argb: 'FF000000' } };

const border = (top, right, bottom, left) => ({ top, right, bottom, left });
const allThin  = () => border(THIN, THIN, THIN, THIN);
const allThick = () => border(THICK, THICK, THICK, THICK);
const topThick = () => border(THICK, THIN, THIN, THIN);
const btmThick = () => border(THIN, THIN, THICK, THIN);
const outerBorder = (cell) => {
    cell.border = allThick();
};

function applyHeaderStyle(cell, fontSize = 11, bold = true, align = 'center') {
    cell.font  = { name: 'Arial', bold, size: fontSize };
    cell.alignment = { vertical: 'middle', horizontal: align, wrapText: true };
}

function applyTableHeader(cell) {
    cell.font   = { name: 'Arial', bold: true, size: 9 };
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
    cell.border = allThin();
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
}

function applyBodyCell(cell, align = 'left', bold = false) {
    cell.font   = { name: 'Arial', bold, size: 9 };
    cell.border = allThin();
    cell.alignment = { vertical: 'middle', horizontal: align, wrapText: true };
}

// ── Single voucher export ────────────────────────────────────────────────────

export const exportSingleVoucherExcel = async (voucher) => {
    if (!voucher) throw new Error('No voucher to export');

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Arihant Dream Infra Projects Ltd.';
    const ws = wb.addWorksheet('Payment Voucher');

    // Column widths  A    B     C     D     E     F
    ws.columns = [
        { width: 10 },  // A – Sr. No.
        { width: 38 },  // B – Description
        { width: 10 },  // C – Unit
        { width: 10 },  // D – Qty
        { width: 14 },  // E – Rate
        { width: 16 },  // F – Amount
    ];

    const { subTotal, gstAmount, totalAmount } = computeTotals(voucher.items, voucher.gstPercentage);
    const gstPct = Number(voucher.gstPercentage) || 0;

    let r = 1; // current row index

    // ── Helper: merge A–F of current row ─────────────────────────────────────
    const mergeRow = (rowIdx) => ws.mergeCells(rowIdx, 1, rowIdx, COLS);

    // ── Row 1: "Payment Voucher" title ────────────────────────────────────────
    ws.getRow(r).height = 22;
    const titleCell = ws.getCell(r, 1);
    titleCell.value = 'Payment Voucher';
    applyHeaderStyle(titleCell, 13, true, 'center');
    titleCell.border = border(THICK, THICK, THIN, THICK);
    mergeRow(r); r++;

    // ── Row 2: Party name ─────────────────────────────────────────────────────
    ws.getRow(r).height = 26;
    const partyCell = ws.getCell(r, 1);
    partyCell.value = voucher.partyName || '';
    applyHeaderStyle(partyCell, 15, true, 'center');
    partyCell.border = border(THIN, THICK, THIN, THICK);
    mergeRow(r); r++;

    // ── Row 3: Site name ──────────────────────────────────────────────────────
    ws.getRow(r).height = 18;
    const siteHeaderCell = ws.getCell(r, 1);
    siteHeaderCell.value = voucher.siteName || '';
    applyHeaderStyle(siteHeaderCell, 10, false, 'center');
    siteHeaderCell.border = border(THIN, THICK, THIN, THICK);
    mergeRow(r); r++;

    // ── Row 4: Voucher No. + Date (split row) ─────────────────────────────────
    ws.getRow(r).height = 16;
    // Merge A–C for voucher no.
    ws.mergeCells(r, 1, r, 3);
    const vnCell = ws.getCell(r, 1);
    vnCell.value = `Voucher No.  ${voucher.voucherNumber || ''}`;
    vnCell.font  = { name: 'Arial', size: 9 };
    vnCell.alignment = { vertical: 'middle', horizontal: 'left' };
    vnCell.border = border(THIN, THIN, THIN, THICK);

    // Merge D–F for date
    ws.mergeCells(r, 4, r, COLS);
    const dateCell = ws.getCell(r, 4);
    dateCell.value = `Date:-  ${fmtDate(voucher.date)}`;
    dateCell.font  = { name: 'Arial', bold: true, size: 9 };
    dateCell.alignment = { vertical: 'middle', horizontal: 'right' };
    dateCell.border = border(THIN, THICK, THIN, THIN);
    r++;

    // ── Row 5: Site Name label ─────────────────────────────────────────────────
    ws.getRow(r).height = 16;
    const siteCell = ws.getCell(r, 1);
    siteCell.value = `Site Name - ${voucher.siteName || ''}`;
    siteCell.font  = { name: 'Arial', size: 9 };
    siteCell.alignment = { vertical: 'middle', horizontal: 'left' };
    siteCell.border = border(THIN, THICK, THIN, THICK);
    mergeRow(r); r++;

    // ── Spacer row ────────────────────────────────────────────────────────────
    ws.getRow(r).height = 6;
    mergeRow(r);
    ws.getCell(r, 1).border = border(THIN, THICK, THIN, THICK);
    r++;

    // ── Table header ──────────────────────────────────────────────────────────
    ws.getRow(r).height = 20;
    ['Sr. No.', 'Description', 'Unit', 'Qty.', 'Rate', 'Amount'].forEach((h, i) => {
        const c = ws.getCell(r, i + 1);
        c.value = h;
        applyTableHeader(c);
        if (i === 0) c.border = { ...c.border, left: THICK };
        if (i === COLS - 1) c.border = { ...c.border, right: THICK };
    });
    r++;

    // ── Item rows ─────────────────────────────────────────────────────────────
    const items = voucher.items?.length ? voucher.items : [{}];
    items.forEach((it, i) => {
        ws.getRow(r).height = 18;
        const amt = (Number(it.qty)||0) * (Number(it.rate)||0);

        const cells = [
            { v: i + 1,           align: 'center' },
            { v: it.description || '', align: 'left'   },
            { v: it.unit        || '', align: 'center' },
            { v: it.qty  != null ? Number(it.qty)  : '', align: 'center' },
            { v: it.rate != null ? Number(it.rate) : '', align: 'right'  },
            { v: amt > 0 ? amt : '',                     align: 'right'  },
        ];
        cells.forEach(({ v, align }, ci) => {
            const c = ws.getCell(r, ci + 1);
            c.value = v;
            applyBodyCell(c, align);
            if (ci === 0)        c.border = { ...c.border, left: THICK };
            if (ci === COLS - 1) c.border = { ...c.border, right: THICK };
        });
        r++;
    });

    // ── GST row ───────────────────────────────────────────────────────────────
    if (gstPct > 0) {
        ws.getRow(r).height = 18;
        ws.mergeCells(r, 1, r, COLS - 1);
        const gc = ws.getCell(r, 1);
        gc.value = `GST ${gstPct}%`;
        applyBodyCell(gc, 'left', true);
        gc.border = border(THIN, THIN, THIN, THICK);

        const ga = ws.getCell(r, COLS);
        ga.value = gstAmount;
        applyBodyCell(ga, 'right', true);
        ga.border = border(THIN, THICK, THIN, THIN);
        r++;
    }

    // ── Total row ─────────────────────────────────────────────────────────────
    ws.getRow(r).height = 20;
    ws.mergeCells(r, 1, r, COLS - 1);
    const tc = ws.getCell(r, 1);
    tc.value = 'Total Amount';
    applyBodyCell(tc, 'right', true);
    tc.font  = { name: 'Arial', bold: true, size: 10 };
    tc.border = border(THIN, THIN, THICK, THICK);

    const ta = ws.getCell(r, COLS);
    ta.value = totalAmount;
    applyBodyCell(ta, 'right', true);
    ta.font  = { name: 'Arial', bold: true, size: 10 };
    ta.border = border(THIN, THICK, THICK, THIN);
    r++;

    // ── Spacer ────────────────────────────────────────────────────────────────
    ws.getRow(r).height = 10; r++;

    // ── Payment Terms ─────────────────────────────────────────────────────────
    if (voucher.paymentTerms) {
        ws.getRow(r).height = 16;
        const ptc = ws.getCell(r, 1);
        ptc.value = `Payment Terms - ${voucher.paymentTerms}`;
        ptc.font  = { name: 'Arial', bold: true, size: 9 };
        ptc.alignment = { vertical: 'middle', horizontal: 'left' };
        mergeRow(r); r++;
    }

    // ── Remarks ───────────────────────────────────────────────────────────────
    if (voucher.remarks) {
        ws.getRow(r).height = 16;
        const rc = ws.getCell(r, 1);
        rc.value = `Remarks: ${voucher.remarks}`;
        rc.font  = { name: 'Arial', size: 9 };
        rc.alignment = { vertical: 'middle', horizontal: 'left' };
        mergeRow(r); r++;
    }

    // ── Spacer before signatures ──────────────────────────────────────────────
    ws.getRow(r).height = 30; r++;

    // ── Signature boxes ───────────────────────────────────────────────────────
    // Name row (boxes)
    ws.getRow(r).height = 36;
    const sigData = [
        { name: voucher.preparedBy      || '', cols: [1, 2] },
        { name: voucher.authorisedBy    || '', cols: [3, 4] },
        { name: voucher.accountsOfficer || '', cols: [5, 6] },
    ];
    sigData.forEach(({ name, cols }) => {
        ws.mergeCells(r, cols[0], r, cols[1]);
        const c = ws.getCell(r, cols[0]);
        c.value = name;
        c.font  = { name: 'Arial', size: 9 };
        c.alignment = { vertical: 'bottom', horizontal: 'center' };
        c.border = allThin();
    });
    r++;

    // Label row
    ws.getRow(r).height = 16;
    const sigLabels = ['Prepared By :-', 'Authorised By :-', 'Accounts Officer :-'];
    sigLabels.forEach((label, i) => {
        const colPairs = [[1,2],[3,4],[5,6]];
        ws.mergeCells(r, colPairs[i][0], r, colPairs[i][1]);
        const c = ws.getCell(r, colPairs[i][0]);
        c.value = label;
        c.font  = { name: 'Arial', bold: true, size: 9 };
        c.alignment = { vertical: 'middle', horizontal: 'left' };
    });

    // ── Write file ────────────────────────────────────────────────────────────
    const buf  = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Payment_Voucher_${voucher.voucherNumber || 'export'}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// ── Export all vouchers as flat list ─────────────────────────────────────────

export const exportAllVouchersExcel = async (vouchers) => {
    if (!vouchers?.length) throw new Error('No vouchers to export');

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Payment Vouchers');

    ws.columns = [
        { header: 'Voucher No.',      key: 'voucherNumber',  width: 14 },
        { header: 'Date',             key: 'date',           width: 12 },
        { header: 'Party Name',       key: 'partyName',      width: 24 },
        { header: 'Site Name',        key: 'siteName',       width: 20 },
        { header: 'Sr. No.',          key: 'srNo',           width: 8  },
        { header: 'Description',      key: 'description',    width: 32 },
        { header: 'Unit',             key: 'unit',           width: 10 },
        { header: 'Qty.',             key: 'qty',            width: 10 },
        { header: 'Rate (₹)',         key: 'rate',           width: 14 },
        { header: 'Amount (₹)',       key: 'amount',         width: 16 },
        { header: 'GST %',            key: 'gstPct',         width: 8  },
        { header: 'GST Amount (₹)',   key: 'gstAmount',      width: 16 },
        { header: 'Total Amount (₹)', key: 'totalAmount',    width: 16 },
        { header: 'Payment Terms',    key: 'paymentTerms',   width: 18 },
        { header: 'Status',           key: 'status',         width: 12 },
        { header: 'Prepared By',      key: 'preparedBy',     width: 18 },
        { header: 'Authorised By',    key: 'authorisedBy',   width: 18 },
        { header: 'Accounts Officer', key: 'accountsOfficer',width: 18 },
        { header: 'Remarks',          key: 'remarks',        width: 24 },
        { header: 'Created At',       key: 'createdAt',      width: 22 },
    ];

    // Style header row
    ws.getRow(1).eachCell((cell) => {
        cell.font   = { name: 'Arial', bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
        cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D3748' } };
        cell.border = allThin();
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    });
    ws.getRow(1).height = 20;

    vouchers.forEach((v) => {
        const { gstAmount, totalAmount } = computeTotals(v.items, v.gstPercentage);
        const base = {
            voucherNumber:  v.voucherNumber || '',
            date:           v.date          || '',
            partyName:      v.partyName     || '',
            siteName:       v.siteName      || '',
            gstPct:         v.gstPercentage ?? '',
            gstAmount,
            totalAmount,
            paymentTerms:   v.paymentTerms  || '',
            status:         v.status        || '',
            preparedBy:     v.preparedBy    || '',
            authorisedBy:   v.authorisedBy  || '',
            accountsOfficer:v.accountsOfficer || '',
            remarks:        v.remarks       || '',
            createdAt:      fmtTs(v.createdAt),
        };

        const itemRows = v.items?.length ? v.items : [{}];
        itemRows.forEach((it, i) => {
            const amt = (Number(it.qty)||0) * (Number(it.rate)||0);
            const row = ws.addRow({
                ...base,
                srNo:        i + 1,
                description: it.description || '',
                unit:        it.unit        || '',
                qty:         it.qty  != null ? Number(it.qty)  : '',
                rate:        it.rate != null ? Number(it.rate) : '',
                amount:      amt > 0 ? amt : '',
            });
            row.height = 16;
            row.eachCell({ includeEmpty: true }, (cell) => {
                cell.font   = { name: 'Arial', size: 9 };
                cell.border = allThin();
                cell.alignment = { vertical: 'middle', wrapText: true };
            });
            // Right-align numbers
            ['rate','amount','qty','gstAmount','totalAmount'].forEach(k => {
                const col = ws.getColumn(k);
                if (col) row.getCell(col.number).alignment = { horizontal: 'right', vertical: 'middle' };
            });
        });
    });

    const buf  = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Payment_Vouchers_All_${new Date().toISOString().split('T')[0]}.xlsx`);
};
