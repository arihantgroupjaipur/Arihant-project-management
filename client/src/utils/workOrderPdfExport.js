import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const fmtDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt)) return '';
    const ist = new Date(dt.getTime() + 5.5 * 60 * 60 * 1000);
    const dd = String(ist.getUTCDate()).padStart(2, '0');
    const mm = String(ist.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = ist.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
};

export const generateWorkOrderPDF = async (workOrder) => {
    if (!workOrder) throw new Error('No work order to export');

    const doc = new jsPDF();
    const PW = doc.internal.pageSize.getWidth();   // 210 mm
    const PH = doc.internal.pageSize.getHeight();  // 297 mm

    const ML = 15;
    const MR = 15;
    const USABLE_W = PW - ML - MR;
    const FOOTER_Y = PH - 10;

    const isRqube =
        workOrder.shipToCompanyName === 'RQUBE BUILDCON PRIVATE LIMITED' ||
        workOrder.issuedTo === 'RQUBE BUILDCON PRIVATE LIMITED';

    // ── Load logo ────────────────────────────────────────────────────────────
    let logoData = null;
    try {
        const res = await fetch('/arihantlogo.png');
        const blob = await res.blob();
        logoData = await new Promise((resolve) => {
            const r = new FileReader();
            r.onloadend = () => resolve(r.result);
            r.readAsDataURL(blob);
        });
    } catch { /* logo optional */ }

    // ── Letterhead ───────────────────────────────────────────────────────────
    if (logoData && !isRqube) {
        try { doc.addImage(logoData, 'PNG', ML, 8, 16, 16); } catch { /* skip */ }
    }

    const companyName = isRqube ? 'RQUBE BUILDCON PRIVATE LIMITED' : 'Arihant Dream Infra Projects Ltd. Jaipur';

    doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
    doc.text(companyName, PW / 2, 14, { align: 'center' });

    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(60);
    doc.text('2nd Floor, Class Of Pearl, Income Tax Colony, Tonk Road, Durgapura, Jaipur, Rajasthan, 302018', PW / 2, 19, { align: 'center' });

    doc.setFontSize(7.5);
    doc.text('Pan No. : AAJCA5226A', ML, 25);
    doc.text('CIN No. U7010RJ2011PLC035322', PW - MR, 25, { align: 'right' });
    doc.text('Website: www.arihantgroupjaipur.com', ML, 29);
    doc.text('Email: info@arihantgroupjaipur.com', PW - MR, 29, { align: 'right' });

    doc.setDrawColor(0); doc.setLineWidth(0.3);
    doc.line(ML, 32, PW - MR, 32);

    doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
    doc.text('WORK ORDER', PW / 2, 39, { align: 'center' });

    let yPos = 44;

    // ── Helpers ──────────────────────────────────────────────────────────────
    const printContHeader = () => {
        doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(120);
        doc.text(`Work Order No: ${workOrder.workOrderNumber || '—'}  (continued)`, ML, 14);
        doc.setDrawColor(180); doc.setLineWidth(0.3);
        doc.line(ML, 17, PW - MR, 17);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(0);
    };

    const checkBreak = (needed = 10) => {
        if (yPos + needed > FOOTER_Y - 6) {
            doc.addPage();
            printContHeader();
            yPos = 22;
        }
    };

    const sectionHeading = (text) => {
        checkBreak(8);
        doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
        doc.text(text, ML, yPos);
        yPos += 5;
    };

    // Two label/value pairs per row, drawn as a bordered grid (matches the printed form's header block)
    const twoColGrid = (rows) => {
        const rowH = 8;
        const colLabelW = 38;
        const colValW = USABLE_W / 2 - colLabelW;
        checkBreak(rows.length * rowH);
        doc.setDrawColor(0); doc.setLineWidth(0.25);
        rows.forEach(([l1, v1, l2, v2]) => {
            const y = yPos;
            doc.rect(ML, y, colLabelW, rowH);
            doc.rect(ML + colLabelW, y, colValW, rowH);
            doc.rect(ML + colLabelW + colValW, y, colLabelW, rowH);
            doc.rect(ML + 2 * colLabelW + colValW, y, colValW, rowH);

            doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
            doc.text(l1, ML + 2, y + 5.3);
            doc.text(l2, ML + colLabelW + colValW + 2, y + 5.3);

            doc.setFont('helvetica', 'normal');
            doc.text(doc.splitTextToSize(v1 || '', colValW - 4), ML + colLabelW + 2, y + 5.3);
            doc.text(doc.splitTextToSize(v2 || '', colValW - 4), ML + 2 * colLabelW + colValW + 2, y + 5.3);

            yPos += rowH;
        });
    };

    // ── Header info grid ─────────────────────────────────────────────────────
    twoColGrid([
        ['Work Order No.', workOrder.workOrderNumber, 'Date Issued', fmtDate(workOrder.date)],
        ['Project Name', workOrder.projectName, 'Site Location', workOrder.siteLocation],
        ['Issued By', workOrder.issuedBy, 'Issued To', workOrder.issuedTo],
        ['Contract', workOrder.contractType, 'Block', workOrder.block],
        ['Start Date', fmtDate(workOrder.startDate), 'Valid Till', fmtDate(workOrder.validTill)],
    ]);

    yPos += 6;

    // ── 1. Scope of Work ─────────────────────────────────────────────────────
    sectionHeading('1. SCOPE OF WORK');

    const scopeRows = (workOrder.workItems || []).map((item, i) => [
        String(i + 1),
        item.workDescription || '',
        item.floor || '',
        fmtDate(item.workStartDate),
        fmtDate(item.workFinishDate),
        fmtDate(item.revisedDate),
    ]);
    while (scopeRows.length < 3) scopeRows.push([String(scopeRows.length + 1), '', '', '', '', '']);

    autoTable(doc, {
        startY: yPos,
        head: [['S.No', 'Description of Work', 'Floor', 'Start Date', 'Original End Date', 'Revised Date']],
        body: scopeRows,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8, halign: 'center', lineWidth: 0.3, lineColor: [0, 0, 0] },
        bodyStyles: { textColor: [0, 0, 0], fontSize: 8, lineWidth: 0.3, lineColor: [0, 0, 0] },
        columnStyles: {
            0: { cellWidth: 12, halign: 'center' },
            1: { cellWidth: 62 },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 24, halign: 'center' },
            4: { cellWidth: 28, halign: 'center' },
            5: { cellWidth: 24, halign: 'center' },
        },
        margin: { left: ML, right: MR, bottom: 20 },
    });
    yPos = doc.lastAutoTable.finalY + 6;

    // ── 2. Reference Drawings / Specifications ───────────────────────────────
    checkBreak(14);
    sectionHeading('2. REFERENCE DRAWINGS / SPECIFICATIONS');

    const refRows = (workOrder.referenceDrawings || []).map((r, i) => [
        String(i + 1), r.revisionDate || '', r.specification || '', r.attached || '',
    ]);
    while (refRows.length < 2) refRows.push([String(refRows.length + 1), '', '', '']);

    autoTable(doc, {
        startY: yPos,
        head: [['S.No', 'Revision / Date', 'Specification / Standard', 'Attached (Y/N)']],
        body: refRows,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8, halign: 'center', lineWidth: 0.3, lineColor: [0, 0, 0] },
        bodyStyles: { textColor: [0, 0, 0], fontSize: 8, lineWidth: 0.3, lineColor: [0, 0, 0], halign: 'center' },
        columnStyles: {
            0: { cellWidth: 14 },
            1: { cellWidth: 40 },
            2: { cellWidth: 92, halign: 'left' },
            3: { cellWidth: 24 },
        },
        margin: { left: ML, right: MR, bottom: 20 },
    });
    yPos = doc.lastAutoTable.finalY + 6;

    // ── 3. Resources to be Deployed ──────────────────────────────────────────
    checkBreak(30);
    sectionHeading('3. RESOURCES TO BE DEPLOYED');

    const res = workOrder.resources || {};
    twoColGrid([
        ['Labour (Mason)', res.labourMason, 'Labour (beldar/cull)', res.labourBeldarCull],
        ['Supervisor / Foreman', res.supervisorForeman, 'Engineer InCharge', res.engineerInCharge],
        ['Equipment / Machinery', res.equipmentMachinery, 'Material Issued', res.materialIssued],
    ]);

    yPos += 8;

    // ── Signature footer ─────────────────────────────────────────────────────
    const SIG_ROW_H = 7;
    const SIG_BLOCK_H = SIG_ROW_H * 3 + 8;
    checkBreak(SIG_BLOCK_H);

    const colW = USABLE_W / 3;
    const sig = workOrder.signatures || {};
    const blocks = [
        { title: 'Prepared & Verified By', data: sig.preparedVerifiedBy },
        { title: 'Accepted By', data: sig.acceptedBy },
        { title: 'Authorized By', data: sig.authorizedBy },
    ];

    doc.setDrawColor(0); doc.setLineWidth(0.25);
    blocks.forEach((b, i) => {
        const x = ML + i * colW;
        doc.setFillColor(0); doc.rect(x, yPos, colW, 7, 'F');
        doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
        doc.text(b.title, x + colW / 2, yPos + 5, { align: 'center' });
        doc.setTextColor(0);

        const rowY = yPos + 7;
        doc.rect(x, rowY, colW, SIG_ROW_H);
        doc.rect(x, rowY + SIG_ROW_H, colW, SIG_ROW_H);
        doc.rect(x, rowY + SIG_ROW_H * 2, colW, SIG_ROW_H);

        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
        doc.text(`Name: ${b.data?.name || ''}`, x + 2, rowY + 4.8);
        doc.text('Sign:', x + 2, rowY + SIG_ROW_H + 4.8);
        if (b.data?.signature) {
            try { doc.addImage(b.data.signature, 'PNG', x + 14, rowY + SIG_ROW_H + 0.8, colW - 18, SIG_ROW_H - 2); } catch { /* skip */ }
        }
        doc.text(`Date: ${fmtDate(b.data?.date)}`, x + 2, rowY + SIG_ROW_H * 2 + 4.8);
    });

    // ── Page numbers ─────────────────────────────────────────────────────────
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setDrawColor(200); doc.setLineWidth(0.2);
        doc.line(ML, FOOTER_Y - 4, PW - MR, FOOTER_Y - 4);
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(150);
        doc.text(`Page ${p} of ${totalPages}  ·  Work Order ${workOrder.workOrderNumber || ''}`, PW / 2, FOOTER_Y, { align: 'center' });
    }

    // ── Download ─────────────────────────────────────────────────────────────
    const fileName = `Work_Order_${workOrder.workOrderNumber || 'export'}_${new Date().toISOString().split('T')[0]}.pdf`;
    const url = URL.createObjectURL(doc.output('blob'));
    const link = Object.assign(document.createElement('a'), { href: url, download: fileName, style: 'display:none' });
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(url); }, 100);
};
