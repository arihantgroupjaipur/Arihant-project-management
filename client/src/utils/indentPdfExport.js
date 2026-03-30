import jsPDF from 'jspdf';
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

export const generateIndentPDF = async (indents) => {
    if (!indents || indents.length === 0) {
        throw new Error('No indents to export');
    }

    const doc = new jsPDF();
    const pageWidth  = doc.internal.pageSize.getWidth();   // 210 mm
    const pageHeight = doc.internal.pageSize.getHeight();  // 297 mm

    // ── Constants ─────────────────────────────────────────────────────────────
    const ML = 15;                        // left margin
    const MR = 15;                        // right margin
    const USABLE_W  = pageWidth - ML - MR;
    const FOOTER_Y  = pageHeight - 10;   // page number line
    const SAFE_BOTTOM = pageHeight - 22; // content must not go below here
    const CONT_TOP  = 25;                // yPos after continuation header

    // Signature block dimensions
    const SIG_BOX_H   = 35;
    const SIG_LABEL_H = 16;   // title + name rows
    const SIG_TOTAL_H = 12 + SIG_BOX_H + SIG_LABEL_H; // gap + box + labels

    // ── Load logo ─────────────────────────────────────────────────────────────
    let logoData = null;
    try {
        const resp = await fetch('/arihantlogo.png');
        const blob = await resp.blob();
        logoData = await new Promise(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    } catch { /* logo optional */ }

    // ── Per-indent rendering ──────────────────────────────────────────────────
    indents.forEach((indent, entryIndex) => {
        if (entryIndex > 0) doc.addPage();

        // ── First-page header ────────────────────────────────────────────────
        if (logoData) {
            try { doc.addImage(logoData, 'PNG', ML, 10, 25, 25); } catch { /* skip */ }
        }

        const today = new Date().toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        });
        doc.setFontSize(9); doc.setTextColor(100);
        doc.text(today, pageWidth - MR, 15, { align: 'right' });

        doc.setFontSize(18); doc.setTextColor(0); doc.setFont('helvetica', 'bold');
        doc.text('Arihant Dream Infra Projects Ltd.', pageWidth / 2, 24, { align: 'center' });

        doc.setFontSize(12);
        doc.text('MATERIAL INDENT / SITE REQUIREMENT', pageWidth / 2, 33, { align: 'center' });

        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(80);
        const addr = [
            'K-48,206, Class of Pearls',
            'Income Tax Colony, Jaipur',
            'Phone: 0141-2940606, 9785219777',
            'E-mail: accounts@arihantgroupjaipur.com',
            'CIN: U7010RJ2011PLC035322  |  GST: 08AAJCA5226A1Z3',
        ];
        addr.forEach((line, i) => doc.text(line, ML, 40 + i * 4));

        // Divider
        doc.setDrawColor(180); doc.setLineWidth(0.4);
        doc.line(ML, 61, pageWidth - MR, 61);

        doc.setTextColor(0);
        let yPos = 68; // content starts here on page 1

        // ── Helpers ──────────────────────────────────────────────────────────
        const LINE_H = 5;
        const ROW_GAP = 3;
        const LEFT_X  = ML + 2;
        const RIGHT_X = pageWidth / 2 + 5;
        const LEFT_W  = RIGHT_X - LEFT_X - 6;
        const RIGHT_W = pageWidth - MR - RIGHT_X - 2;

        // Print continuation header on new pages mid-indent
        const printContHeader = () => {
            doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(120);
            doc.text(
                `Indent No:  ${indent.indentNumber || '—'}  (continued)`,
                ML, 14
            );
            doc.setDrawColor(180); doc.setLineWidth(0.3);
            doc.line(ML, 17, pageWidth - MR, 17);
            doc.setFont('helvetica', 'normal'); doc.setTextColor(0);
        };

        // Check remaining space; break to new page if needed
        const checkBreak = (needed = 10) => {
            if (yPos + needed > SAFE_BOTTOM) {
                doc.addPage();
                printContHeader();
                yPos = CONT_TOP;
            }
        };

        // Print one label (bold) + value (normal) block; returns line count
        const printLV = (label, val, x, maxW) => {
            const sep  = ':  ';
            const full = `${label}${sep}${val || 'N/A'}`;
            const lines = doc.splitTextToSize(full, maxW);
            doc.setFontSize(9.5);
            lines.forEach((line, i) => {
                if (i === 0) {
                    const cut   = label.length + sep.length;
                    const lPart = line.slice(0, Math.min(cut, line.length));
                    const vPart = line.slice(lPart.length);
                    doc.setFont('helvetica', 'bold');
                    const bw = doc.getTextWidth(lPart);
                    doc.text(lPart, x, yPos + i * LINE_H);
                    if (vPart) {
                        doc.setFont('helvetica', 'normal');
                        doc.text(vPart, x + bw, yPos + i * LINE_H);
                    }
                } else {
                    doc.setFont('helvetica', 'normal');
                    doc.text('    ' + line, x, yPos + i * LINE_H);
                }
            });
            return lines.length;
        };

        // Two-column field row
        const addRow = (lLabel, lVal, rLabel, rVal) => {
            const lh = printLV(lLabel, lVal, LEFT_X,  LEFT_W);
            const rh = rLabel ? printLV(rLabel, rVal, RIGHT_X, RIGHT_W) : 0;
            yPos += Math.max(lh, rh) * LINE_H + ROW_GAP;
        };

        // ── Field rows ───────────────────────────────────────────────────────
        checkBreak(10);
        addRow('Indent No',     indent.indentNumber,
               'Date',          fmtTs(indent.createdAt || indent.date));

        checkBreak(10);
        addRow('Site Name',     indent.siteName,
               'Task Ref',      indent.taskReference);

        checkBreak(10);
        addRow('Material Group', indent.materialGroup,
               'Priority',       indent.priority);

        checkBreak(10);
        addRow('Lead Time',       indent.leadTime ? `${indent.leadTime} days` : 'N/A',
               'Block/Floor/Work', indent.blockFloorWork);

        checkBreak(10);
        addRow('Site Engineer',   indent.siteEngineerName,
               'Store Manager',   indent.storeManagerName);

        // ── Work Description ─────────────────────────────────────────────────
        yPos += 2;
        const wdLines = doc.splitTextToSize(indent.workDescription || 'N/A', USABLE_W);
        const wdH = LINE_H + wdLines.length * LINE_H + ROW_GAP;
        checkBreak(wdH);

        doc.setFontSize(9.5); doc.setFont('helvetica', 'bold');
        doc.text('Work Description:', LEFT_X, yPos);
        yPos += LINE_H;
        doc.setFont('helvetica', 'normal');
        doc.text(wdLines, LEFT_X, yPos);
        yPos += wdLines.length * LINE_H + ROW_GAP + 2;

        // ── Verification status ───────────────────────────────────────────────
        checkBreak(12);
        doc.setFontSize(9);
        if (indent.verifiedByPurchaseManager) {
            doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 130, 0);
            doc.text(
                `✓  Verified by Purchase Manager${indent.verifiedBy?.fullName ? ':  ' + indent.verifiedBy.fullName : ''}`,
                LEFT_X, yPos
            );
        } else {
            doc.setFont('helvetica', 'bold'); doc.setTextColor(160, 110, 0);
            doc.text('Verification Status:  Pending', LEFT_X, yPos);
        }
        doc.setTextColor(0);
        yPos += 7;

        // ── Material Requirements heading ─────────────────────────────────────
        checkBreak(20);
        doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
        doc.text('Material Requirements List', LEFT_X, yPos);
        yPos += 5;

        // ── Items table ───────────────────────────────────────────────────────
        const tableData = indent.items?.length
            ? indent.items.map((item, idx) => [
                idx + 1,
                item.materialDescription || '',
                item.unit || '—',
                item.requiredQuantity ?? 0,
                item.orderQuantity || '—',
                item.remark || '—',
            ])
            : [['-', 'No items listed', '', '', '', '']];

        autoTable(doc, {
            startY: yPos,
            head: [['#', 'Material Description', 'Unit', 'Req. Qty', 'Order Qty', 'Remark']],
            body: tableData,
            theme: 'grid',
            headStyles: {
                fillColor: [230, 230, 230], textColor: [0, 0, 0],
                fontStyle: 'bold', halign: 'center', fontSize: 8, cellPadding: 3,
            },
            bodyStyles: { textColor: [0, 0, 0], fontSize: 8, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center' },
                1: { cellWidth: 68 },
                2: { cellWidth: 18, halign: 'center' },
                3: { cellWidth: 20, halign: 'center' },
                4: { cellWidth: 22, halign: 'center' },
                5: { cellWidth: 32 },
            },
            margin: { left: ML, right: MR, bottom: 22 }, // keep 22 mm above footer on every auto-page
        });

        // ── Signature section ─────────────────────────────────────────────────
        const tableEndY = doc.lastAutoTable.finalY;

        // If signature block won't fit, move to a fresh page
        const sigStartY = tableEndY + 12;
        const needsPage = sigStartY + SIG_TOTAL_H > SAFE_BOTTOM;
        if (needsPage) {
            doc.addPage();
            printContHeader();
        }
        const sigBoxTop = needsPage ? CONT_TOP + 4 : sigStartY;

        const SIG_COL_W = USABLE_W / 3;
        const col1X = ML;
        const col2X = ML + SIG_COL_W;
        const col3X = ML + SIG_COL_W * 2;

        // Boxes
        doc.setDrawColor(160); doc.setLineWidth(0.4);
        [col1X, col2X, col3X].forEach(x => doc.rect(x, sigBoxTop, SIG_COL_W, SIG_BOX_H));

        // Signatures
        const getImgFmt = d =>
            d.startsWith('data:image/jpeg') || d.startsWith('data:image/jpg') ? 'JPEG'
            : d.startsWith('data:image/webp') ? 'WEBP' : 'PNG';

        const SIG_IMG_W = SIG_COL_W - 10;
        const SIG_IMG_H = SIG_BOX_H - 8;

        if (indent.storeManagerSignature?.startsWith('data:image')) {
            try {
                doc.addImage(
                    indent.storeManagerSignature, getImgFmt(indent.storeManagerSignature),
                    col1X + 5, sigBoxTop + 3, SIG_IMG_W, SIG_IMG_H
                );
            } catch { /* skip */ }
        }
        if (indent.siteEngineerSignature?.startsWith('data:image')) {
            try {
                doc.addImage(
                    indent.siteEngineerSignature, getImgFmt(indent.siteEngineerSignature),
                    col3X + 5, sigBoxTop + 3, SIG_IMG_W, SIG_IMG_H
                );
            } catch { /* skip */ }
        }

        // Helper: centred wrapped text within a column
        const centreWrapped = (text, colX, colWid, startY, fSize = 8, lh = 4.5) => {
            if (!text) return;
            const lines = doc.splitTextToSize(text, colWid - 6);
            doc.setFontSize(fSize);
            lines.forEach((line, i) =>
                doc.text(line, colX + colWid / 2, startY + i * lh, { align: 'center' })
            );
        };

        const titleY = sigBoxTop + SIG_BOX_H + 5;
        const nameY  = titleY + 5;

        doc.setFont('helvetica', 'bold'); doc.setTextColor(40);
        centreWrapped('Store Manager',    col1X, SIG_COL_W, titleY, 8.5);
        centreWrapped('Purchase Manager', col2X, SIG_COL_W, titleY, 8.5);
        centreWrapped('Site Engineer',    col3X, SIG_COL_W, titleY, 8.5);

        doc.setFont('helvetica', 'normal'); doc.setTextColor(80);
        centreWrapped(indent.storeManagerName || '', col1X, SIG_COL_W, nameY);
        centreWrapped(indent.siteEngineerName || '', col3X, SIG_COL_W, nameY);

        doc.setTextColor(0);
    });

    // ── Two-pass page numbering (add "Page X of N" to every page) ────────────
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150);
        // Thin separator above footer
        doc.setDrawColor(200); doc.setLineWidth(0.2);
        doc.line(ML, FOOTER_Y - 4, pageWidth - MR, FOOTER_Y - 4);
        doc.text(`Page ${p} of ${totalPages}`, pageWidth / 2, FOOTER_Y, { align: 'center' });
    }

    // ── Download ──────────────────────────────────────────────────────────────
    const fileName = `Indent_${new Date().toISOString().split('T')[0]}.pdf`;
    const url  = URL.createObjectURL(doc.output('blob'));
    const link = Object.assign(document.createElement('a'), {
        href: url, download: fileName, style: 'display:none',
    });
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(url); }, 100);
};
