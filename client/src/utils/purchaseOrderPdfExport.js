import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const fmtTs = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    if (isNaN(dt)) return '—';
    const dd = String(dt.getDate()).padStart(2,'0');
    const mm = String(dt.getMonth()+1).padStart(2,'0');
    const yyyy = dt.getFullYear();
    const hh = String(dt.getHours()).padStart(2,'0');
    const min = String(dt.getMinutes()).padStart(2,'0');
    const ss = String(dt.getSeconds()).padStart(2,'0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
};

export const generatePurchaseOrderPDF = async (purchaseOrders) => {
    if (!purchaseOrders || purchaseOrders.length === 0) {
        throw new Error('No purchase orders to export');
    }

    const doc  = new jsPDF();
    const PW   = doc.internal.pageSize.getWidth();   // 210 mm
    const PH   = doc.internal.pageSize.getHeight();  // 297 mm

    // ── Layout constants ──────────────────────────────────────────────────────
    const ML          = 15;
    const MR          = 15;
    const USABLE_W    = PW - ML - MR;
    const SAFE_BOTTOM = PH - 22;   // content must not exceed this
    const FOOTER_Y    = PH - 10;
    const CONT_TOP    = 25;        // yPos on continuation pages

    // ── Load logo ─────────────────────────────────────────────────────────────
    let logoData = null;
    try {
        const res  = await fetch('/arihantlogo.png');
        const blob = await res.blob();
        logoData   = await new Promise(resolve => {
            const r = new FileReader();
            r.onloadend = () => resolve(r.result);
            r.readAsDataURL(blob);
        });
    } catch { /* logo optional */ }

    // ── Per-PO rendering ──────────────────────────────────────────────────────
    purchaseOrders.forEach((po, entryIndex) => {
        if (entryIndex > 0) doc.addPage();

        const isRqube = po.shipToCompanyName === 'RQUBE BUILDCON PRIVATE LIMITED';

        // ── First-page header ─────────────────────────────────────────────────
        if (logoData && !isRqube) {
            try { doc.addImage(logoData, 'PNG', ML, 10, 25, 25); } catch { /* skip */ }
        }

        const today = new Date().toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        });
        doc.setFontSize(9); doc.setTextColor(100);
        doc.text(today, PW - MR, 15, { align: 'right' });

        const companyName = isRqube
            ? 'RQUBE BUILDCON PRIVATE LIMITED'
            : 'Arihant Dream Infra Projects Ltd.';

        doc.setFontSize(18); doc.setTextColor(0); doc.setFont('helvetica', 'bold');
        doc.text(companyName, PW / 2, 24, { align: 'center' });

        doc.setFontSize(12);
        doc.text('PURCHASE ORDER', PW / 2, 33, { align: 'center' });

        // Address
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(80);
        const gst = isRqube ? '08AANCR4854R1ZB' : '08AAJCA5226A1Z3';
        const addr = [
            'K-48,206, Class of Pearls, Income Tax Colony, Jaipur',
            'Phone: 0141-2940606, 9785219777  |  E-mail: accounts@arihantgroupjaipur.com',
            `CIN: U7010RJ2011PLC035322  |  GST: ${gst}`,
        ];
        addr.forEach((line, i) => doc.text(line, PW / 2, 40 + i * 4.5, { align: 'center' }));

        // Divider
        doc.setDrawColor(180); doc.setLineWidth(0.4);
        doc.line(ML, 52, PW - MR, 52);
        doc.setTextColor(0);

        let yPos = 58;  // content starts here

        // ── Helpers ───────────────────────────────────────────────────────────
        const LINE_H  = 5;
        const ROW_GAP = 3;

        const printContHeader = () => {
            doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(120);
            doc.text(`PO No:  ${po.poNumber || '—'}  (continued)`, ML, 14);
            doc.setDrawColor(180); doc.setLineWidth(0.3);
            doc.line(ML, 17, PW - MR, 17);
            doc.setFont('helvetica', 'normal'); doc.setTextColor(0);
        };

        const checkBreak = (needed = 10) => {
            if (yPos + needed > SAFE_BOTTOM) {
                doc.addPage();
                printContHeader();
                yPos = CONT_TOP;
            }
        };

        // Print bold label + normal value, wrapping to maxW; returns line count
        const printLV = (label, val, x, maxW) => {
            const sep   = ':  ';
            const lines = doc.splitTextToSize(`${label}${sep}${val || 'N/A'}`, maxW);
            lines.forEach((line, i) => {
                if (i === 0) {
                    const cut   = label.length + sep.length;
                    const lp    = line.slice(0, Math.min(cut, line.length));
                    const vp    = line.slice(lp.length);
                    doc.setFont('helvetica', 'bold');
                    const bw    = doc.getTextWidth(lp);
                    doc.text(lp, x, yPos + i * LINE_H);
                    if (vp) { doc.setFont('helvetica', 'normal'); doc.text(vp, x + bw, yPos + i * LINE_H); }
                } else {
                    doc.setFont('helvetica', 'normal');
                    doc.text('    ' + line, x, yPos + i * LINE_H);
                }
            });
            return lines.length;
        };

        // Bold label + " " + normal value for box fields; returns line count
        const printBoxField = (label, val, x, baseY, maxW) => {
            const sep   = ': ';
            const lines = doc.splitTextToSize(`${label}${sep}${val || '—'}`, maxW);
            lines.forEach((line, i) => {
                if (i === 0) {
                    const lp = `${label}${sep}`;
                    const vp = line.slice(lp.length);
                    doc.setFont('helvetica', 'bold');
                    const bw = doc.getTextWidth(lp);
                    doc.text(lp, x, baseY + i * LINE_SM);
                    if (vp) { doc.setFont('helvetica', 'normal'); doc.text(vp, x + bw, baseY + i * LINE_SM); }
                } else {
                    doc.setFont('helvetica', 'normal');
                    doc.text('  ' + line, x, baseY + i * LINE_SM);
                }
            });
            doc.setFont('helvetica', 'normal');
            return lines.length;
        };

        // 2-column or 3-column row
        const addRow = (...cols) => {
            // cols: [ [label, val, x, maxW], ... ]
            doc.setFontSize(9.5);
            const heights = cols.map(([l, v, x, w]) => printLV(l, v, x, w));
            yPos += Math.max(...heights) * LINE_H + ROW_GAP;
        };

        // ── PO header fields ──────────────────────────────────────────────────
        const COL1 = ML + 2;
        const COL2 = ML + USABLE_W * 0.36;
        const COL3 = ML + USABLE_W * 0.68;
        const W1   = COL2 - COL1 - 4;
        const W2   = COL3 - COL2 - 4;
        const W3   = PW - MR - COL3 - 2;

        const indentNum = po.indentReferences?.map(i => i?.indentNumber || i).filter(Boolean).join(', ') || 'N/A';

        checkBreak(12);
        addRow(
            ['PO No',   po.poNumber, COL1, W1],
            ['Date',    fmtTs(po.createdAt || po.date), COL2, W2],
            ['Indent',  indentNum, COL3, W3],
        );

        checkBreak(10);
        addRow(
            ['Task Ref', po.taskReference, COL1, W1],
            ['Status',   po.status,        COL2, W2],
        );

        // ── Vendor + Ship-To boxes ─────────────────────────────────────────────
        yPos += 3;
        const BOX_W     = (USABLE_W - 8) / 2;
        const vndX      = ML;
        const shpX      = ML + BOX_W + 8;
        const boxInnerW = BOX_W - 6;
        const LINE_SM   = 4.5;

        // Pre-calculate line counts for dynamic box height
        doc.setFontSize(8.5);
        const vndNameL = doc.splitTextToSize(po.vendorName    || '—', boxInnerW).length;
        const vndAdrL  = doc.splitTextToSize(po.vendorAddress || '—', boxInnerW).length;
        const vndGstL  = doc.splitTextToSize(`GST: ${po.vendorGst || '—'}`, boxInnerW).length;
        const vndPhL   = doc.splitTextToSize(`Ph: ${po.vendorContactNo || '—'}`, boxInnerW).length;
        const shpNameL = doc.splitTextToSize(po.shipToCompanyName    || '—', boxInnerW).length;
        const shpAdrL  = doc.splitTextToSize(po.shipToAddress        || '—', boxInnerW).length;
        const shpAttnL = doc.splitTextToSize(`Attn: ${po.shipToContactPerson || '—'}`, boxInnerW).length;
        const shpPhL   = doc.splitTextToSize(`Ph: ${po.shipToContactNo || '—'}`, boxInnerW).length;

        const vndContentH = 7 + (vndNameL + vndAdrL + vndGstL + vndPhL) * LINE_SM;
        const shpContentH = 7 + (shpNameL + shpAdrL + shpAttnL + shpPhL) * LINE_SM;
        const boxH = Math.max(vndContentH, shpContentH, 28) + 4;

        checkBreak(boxH + 4);

        doc.setDrawColor(180); doc.setLineWidth(0.3);
        doc.rect(vndX, yPos, BOX_W, boxH);
        doc.rect(shpX, yPos, BOX_W, boxH);

        // Vendor
        let vY = yPos + 5;
        doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
        doc.text('Vendor Details', vndX + 4, vY);
        vY += LINE_SM + 1;
        doc.setFontSize(8.5); doc.setFont('helvetica', 'normal');
        const vnLines = doc.splitTextToSize(po.vendorName || '—', boxInnerW);
        doc.text(vnLines, vndX + 4, vY);
        vY += vnLines.length * LINE_SM;
        const vaLines = doc.splitTextToSize(po.vendorAddress || '—', boxInnerW);
        doc.text(vaLines, vndX + 4, vY);
        vY += vaLines.length * LINE_SM;
        vY += printBoxField('GST',  po.vendorGst       || '—', vndX + 4, vY, boxInnerW) * LINE_SM;
        printBoxField('Ph',  po.vendorContactNo || '—', vndX + 4, vY, boxInnerW);

        // Ship To
        let sY = yPos + 5;
        doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
        doc.text('Ship To Details', shpX + 4, sY);
        sY += LINE_SM + 1;
        doc.setFontSize(8.5); doc.setFont('helvetica', 'normal');
        const snLines = doc.splitTextToSize(po.shipToCompanyName || '—', boxInnerW);
        doc.text(snLines, shpX + 4, sY);
        sY += snLines.length * LINE_SM;
        const saLines = doc.splitTextToSize(po.shipToAddress || '—', boxInnerW);
        doc.text(saLines, shpX + 4, sY);
        sY += saLines.length * LINE_SM;
        sY += printBoxField('Attn', po.shipToContactPerson || '—', shpX + 4, sY, boxInnerW) * LINE_SM;
        printBoxField('Ph',  po.shipToContactNo    || '—', shpX + 4, sY, boxInnerW);

        yPos += boxH + 6;

        // ── Items table ───────────────────────────────────────────────────────
        checkBreak(20);
        const tableData = po.items?.length
            ? po.items.map((item, idx) => {
                const base = Number(item.quantity || 0) * Number(item.rate || 0);
                return [
                    idx + 1,
                    item.materialDescription || '',
                    item.unit || '—',
                    item.quantity || 0,
                    Number(item.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
                    base.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
                    Number(item.taxAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
                    Number(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
                ];
            })
            : [['-', 'No items listed', '', '', '', '', '', '']];

        autoTable(doc, {
            startY: yPos,
            head: [['S.No', 'Description', 'Unit', 'Qty', 'Rate (₹)', 'Total w/o Tax', 'Tax (₹)', 'Amount (₹)']],
            body: tableData,
            theme: 'grid',
            headStyles: {
                fillColor: [230, 230, 230], textColor: [0, 0, 0],
                fontStyle: 'bold', halign: 'center', fontSize: 7.5, cellPadding: 3,
            },
            bodyStyles: { textColor: [0, 0, 0], fontSize: 8, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center' },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 13, halign: 'center' },
                3: { cellWidth: 12, halign: 'center' },
                4: { cellWidth: 22, halign: 'right' },
                5: { cellWidth: 24, halign: 'right' },
                6: { cellWidth: 18, halign: 'right' },
                7: { cellWidth: 24, halign: 'right' },
            },
            margin: { left: ML, right: MR, bottom: 22 },
        });

        yPos = doc.lastAutoTable.finalY + 5;

        // ── Summary block ─────────────────────────────────────────────────────
        const SUMMARY_H = 22;
        checkBreak(SUMMARY_H);

        const rX         = PW - MR;          // right edge for amounts
        const sumLabelX  = rX - 90;          // left edge of label column
        const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

        doc.setFontSize(9.5); doc.setFont('helvetica', 'normal');
        doc.text('Subtotal :', sumLabelX, yPos);
        doc.text(fmt(po.subTotal), rX, yPos, { align: 'right' });
        yPos += 7;

        doc.text('Round off :', sumLabelX, yPos);
        doc.text(fmt(po.freight), rX, yPos, { align: 'right' });
        yPos += 7;

        doc.setFont('helvetica', 'bold');
        doc.text('Grand Total :', sumLabelX, yPos);
        doc.text(fmt(po.totalAmount), rX, yPos, { align: 'right' });
        yPos += 12;

        // ── Comments ──────────────────────────────────────────────────────────
        if (po.comments) {
            const commentLines = doc.splitTextToSize(po.comments, USABLE_W);
            checkBreak(LINE_H + commentLines.length * LINE_H + 6);
            doc.setFontSize(9); doc.setFont('helvetica', 'bold');
            doc.text('Comments & Instructions:', ML, yPos);
            yPos += LINE_H;
            doc.setFont('helvetica', 'normal');
            doc.text(commentLines, ML, yPos);
            yPos += commentLines.length * LINE_H + 6;
        }

        // ── Terms & Conditions ────────────────────────────────────────────────
        if (po.termsAndConditions) {
            const termLines = doc.splitTextToSize(po.termsAndConditions, USABLE_W);
            checkBreak(LINE_H + termLines.length * LINE_H + 6);
            doc.setFontSize(9); doc.setFont('helvetica', 'bold');
            doc.text('Terms & Conditions:', ML, yPos);
            yPos += LINE_H;
            doc.setFont('helvetica', 'normal');
            doc.text(termLines, ML, yPos);
            yPos += termLines.length * LINE_H + 8;
        }

        // ── Authorization section ─────────────────────────────────────────────
        const AUTH_H = 22;
        checkBreak(AUTH_H);

        const authCols = [
            { label: 'Prepared By',   name: po.preparedBy   || '—' },
            { label: 'Verified By',   name: po.verifiedBy   || '—' },
            { label: 'Authorized By', name: po.authorizedBy || '—' },
        ];
        const colW = USABLE_W / 3;

        authCols.forEach((col, i) => {
            const cx = ML + i * colW;
            const cMid = cx + colW / 2;

            // Top line
            doc.setDrawColor(150); doc.setLineWidth(0.4);
            doc.line(cx + 4, yPos, cx + colW - 4, yPos);

            // Role label (bold, centred)
            doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(40);
            doc.text(col.label.toUpperCase(), cMid, yPos + 5, { align: 'center' });

            // Name (wrapped, normal)
            doc.setFont('helvetica', 'normal'); doc.setTextColor(70);
            const nameLines = doc.splitTextToSize(col.name, colW - 8);
            nameLines.forEach((line, j) =>
                doc.text(line, cMid, yPos + 10 + j * 4.5, { align: 'center' })
            );
        });
        doc.setTextColor(0);
    });

    // ── Two-pass: add "Page X of N" + separator to every page ─────────────────
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setDrawColor(200); doc.setLineWidth(0.2);
        doc.line(ML, FOOTER_Y - 4, PW - MR, FOOTER_Y - 4);
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(150);
        doc.text(
            `Page ${p} of ${totalPages}  ·  Generated ${new Date().toLocaleString()}`,
            PW / 2, FOOTER_Y, { align: 'center' }
        );
    }

    // ── Download ──────────────────────────────────────────────────────────────
    const fileName = `Purchase_Order_${new Date().toISOString().split('T')[0]}.pdf`;
    const url  = URL.createObjectURL(doc.output('blob'));
    const link = Object.assign(document.createElement('a'), {
        href: url, download: fileName, style: 'display:none',
    });
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(url); }, 100);
};
