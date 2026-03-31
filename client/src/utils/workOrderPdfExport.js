import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const fmtTs = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    if (isNaN(dt)) return '—';
    const ist = new Date(dt.getTime() + 5.5 * 60 * 60 * 1000);
    const dd = String(ist.getUTCDate()).padStart(2,'0');
    const mm = String(ist.getUTCMonth()+1).padStart(2,'0');
    const yyyy = ist.getUTCFullYear();
    const hh = String(ist.getUTCHours()).padStart(2,'0');
    const min = String(ist.getUTCMinutes()).padStart(2,'0');
    const ss = String(ist.getUTCSeconds()).padStart(2,'0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
};

export const generateWorkOrderPDF = async (workOrder) => {
    if (!workOrder) throw new Error('No work order to export');

    const doc = new jsPDF();
    const PW  = doc.internal.pageSize.getWidth();   // 210 mm
    const PH  = doc.internal.pageSize.getHeight();  // 297 mm

    // ── Layout constants ──────────────────────────────────────────────────────
    const ML          = 15;
    const MR          = 15;
    const USABLE_W    = PW - ML - MR;
    const SAFE_BOTTOM = PH - 22;
    const FOOTER_Y    = PH - 10;
    const CONT_TOP    = 22;
    const LINE_SM     = 4.5;   // small line height for field text

    const isRqube =
        workOrder.shipToCompanyName  === 'RQUBE BUILDCON PRIVATE LIMITED' ||
        workOrder.contactPersonName  === 'RQUBE BUILDCON PRIVATE LIMITED' ||
        workOrder.addressLocation    === 'RQUBE';

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

    // ── First-page header ─────────────────────────────────────────────────────
    if (logoData && !isRqube) {
        try { doc.addImage(logoData, 'PNG', ML, 8, 20, 20); } catch { /* skip */ }
    }

    const companyName = isRqube
        ? 'RQUBE BUILDCON PRIVATE LIMITED'
        : 'Arihant Dream Infra Projects Ltd. Jaipur';

    doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
    doc.text(companyName, PW / 2, 16, { align: 'center' });

    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(60);
    doc.text(
        '2nd Floor, Class Of Pearl, Income Tax Colony, Tonk Road, Durgapura, Jaipur, Rajasthan, 302018  (Pan - AAJCA5226A)',
        PW / 2, 21, { align: 'center' }
    );
    doc.text('CIN No. U7010RJ2011PLC035322', PW / 2, 25, { align: 'center' });

    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
    doc.text('Work Order', PW / 2, 32, { align: 'center' });

    // Website / email row  +  Date / WO number row
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(60);
    doc.text('Website : www.arihantgroupjaipur.com', ML, 39);
    doc.text('Email : info@arihantgroupjaipur.com', ML, 44);

    const woDate = fmtTs(workOrder.createdAt || workOrder.date);

    doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
    doc.text('Date :', PW - MR - 55, 39);
    doc.setFont('helvetica', 'normal');
    doc.text(woDate, PW - MR - 55 + doc.getTextWidth('Date :  '), 39);

    doc.setFont('helvetica', 'bold');
    doc.text('Work Order No :', PW - MR - 55, 44);
    doc.setFont('helvetica', 'normal');
    const woNumLines = doc.splitTextToSize(workOrder.workOrderNumber || '—', 45);
    doc.text(woNumLines, PW - MR - 55 + doc.getTextWidth('Work Order No :  '), 44);

    // Divider
    doc.setDrawColor(160); doc.setLineWidth(0.4);
    doc.line(ML, 48, PW - MR, 48);
    doc.setTextColor(0);

    let yPos = 53;

    // ── Helpers ───────────────────────────────────────────────────────────────
    const printContHeader = () => {
        doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(120);
        doc.text(`Work Order No:  ${workOrder.workOrderNumber || '—'}  (continued)`, ML, 14);
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

    // Draw a labelled field box with dynamic height based on wrapped value
    const LABEL_W  = 58;   // reserved width for label
    const VAL_MAX_W = USABLE_W - LABEL_W - 4;

    const drawField = (label, value) => {
        doc.setFontSize(8.5);
        const valLines = doc.splitTextToSize(value || '—', VAL_MAX_W);
        const boxH = Math.max(8, valLines.length * LINE_SM + 4);

        checkBreak(boxH + 1);

        doc.setDrawColor(180); doc.setLineWidth(0.3);
        doc.rect(ML, yPos, USABLE_W, boxH);

        // Label (bold)
        doc.setFont('helvetica', 'bold'); doc.setTextColor(40);
        doc.text(label, ML + 2, yPos + LINE_SM);

        // Value (normal, wrapped)
        doc.setFont('helvetica', 'normal'); doc.setTextColor(0);
        valLines.forEach((line, i) =>
            doc.text(line, ML + LABEL_W, yPos + LINE_SM + i * LINE_SM)
        );

        yPos += boxH;
    };

    // ── Field rows ────────────────────────────────────────────────────────────
    drawField('Main WO Reference',       workOrder.mainWorkOrderReference    || '');
    drawField('Task No',                 workOrder.taskReference             || '');
    drawField('Address / Location',      workOrder.addressLocation           || '');
    drawField('Contact Person Name',     workOrder.contactPersonName         || '');
    drawField('Work Location Name',      workOrder.workLocationName          || '');
    drawField('Store Keeper / Supervisor', workOrder.storeKeeperSupervisorName || '');
    drawField('Comments / Special Instr.', workOrder.comments               || '');

    yPos += 5;

    // ── Work Items table ──────────────────────────────────────────────────────
    checkBreak(20);
    const tableData = (workOrder.workItems || []).map(item => [
        item.workDescription || '',
        item.plannedLabour   || '',
        item.workStartDate  ? new Date(item.workStartDate).toLocaleDateString('en-IN',  { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '',
        item.workFinishDate ? new Date(item.workFinishDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '',
        item.workArea       || '',
        item.rate           || '',
        item.totalAmount    || '',
    ]);

    // Minimum 3 rows for form look
    while (tableData.length < 3) tableData.push(['', '', '', '', '', '', '']);

    autoTable(doc, {
        startY: yPos,
        head: [[
            'Work Description', 'No of Planned Labour',
            'Work Start Date', 'Work Finish Date',
            'Work Area', 'Rate', 'Total Amount',
        ]],
        body: tableData,
        theme: 'grid',
        headStyles: {
            fillColor: [255, 255, 255], textColor: [0, 0, 0],
            fontStyle: 'bold', fontSize: 8, halign: 'center',
            lineWidth: 0.4, lineColor: [0, 0, 0], cellPadding: 3,
        },
        bodyStyles: {
            textColor: [0, 0, 0], fontSize: 8,
            cellPadding: 3, lineWidth: 0.4, lineColor: [0, 0, 0],
        },
        columnStyles: {
            0: { cellWidth: 48 },
            1: { cellWidth: 22, halign: 'center' },
            2: { cellWidth: 22, halign: 'center' },
            3: { cellWidth: 22, halign: 'center' },
            4: { cellWidth: 20, halign: 'center' },
            5: { cellWidth: 18, halign: 'right'  },
            6: { cellWidth: 28, halign: 'right'  },
        },
        margin: { left: ML, right: MR, bottom: 22 },
    });

    yPos = doc.lastAutoTable.finalY + 5;

    // ── Hindi notes (canvas → image) ──────────────────────────────────────────
    const HINDI_H = 20;
    checkBreak(HINDI_H + 4);

    try {
        const canvas = document.createElement('canvas');
        canvas.width  = 1200;
        canvas.height = 130;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
        ctx.fillStyle = 'black';
        ctx.font = 'bold 20px Arial, sans-serif';
        ctx.fillText('अतिरिक्त नोट :', 10, 28);
        ctx.font = '17px Arial, sans-serif';
        ctx.fillText('1. बिल जमा करते समय कार्य आदेश (Work Order) की प्रति संलग्न करना आवश्यक है।', 10, 54);
        ctx.fillText('2. कार्य में किसी भी प्रकार की त्रुटि का दायित्व ठेकेदार का है और सुधार का कार्य करना है।', 10, 76);
        ctx.fillText('3. कार्य का वर्क आर्डर के अनुसार गुणवत्ता मानक के अनुसार करना है।', 10, 98);
        ctx.fillText('4. हाउसकीपिंग और सफाई का कार्य करना है।', 10, 120);
        doc.addImage(canvas.toDataURL('image/png'), 'PNG', ML, yPos, USABLE_W, HINDI_H);
    } catch { /* skip if canvas fails */ }

    yPos += HINDI_H + 6;

    // ── Signature section ─────────────────────────────────────────────────────
    const SIG_BOX_H   = 30;
    const SIG_LABEL_H = 8;
    const SIG_TOTAL   = SIG_BOX_H + SIG_LABEL_H + 6;

    checkBreak(SIG_TOTAL);

    const colW  = (USABLE_W - 10) / 3;
    const col1X = ML;
    const col2X = ML + colW + 5;
    const col3X = ML + (colW + 5) * 2;

    const sigBoxes = [
        { label: 'Signature Of Contractor',     sig: workOrder.signatures?.contractor, x: col1X },
        { label: 'Signature Of Site Engineer',  sig: workOrder.signatures?.engineer,   x: col2X },
        { label: 'Signature Of Site Supervisor', sig: workOrder.signatures?.supervisor, x: col3X },
    ];

    doc.setDrawColor(150); doc.setLineWidth(0.4);
    sigBoxes.forEach(({ label, sig, x }) => {
        doc.rect(x, yPos, colW, SIG_BOX_H);
        if (sig) {
            try { doc.addImage(sig, 'PNG', x + 2, yPos + 2, colW - 4, SIG_BOX_H - 4); } catch { /* skip */ }
        }
        doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(40);
        doc.text(label, x + colW / 2, yPos + SIG_BOX_H + 5, { align: 'center' });
    });
    doc.setTextColor(0);

    // ── Two-pass: "Page X of N" on every page ─────────────────────────────────
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setDrawColor(200); doc.setLineWidth(0.2);
        doc.line(ML, FOOTER_Y - 4, PW - MR, FOOTER_Y - 4);
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(150);
        doc.text(
            `Page ${p} of ${totalPages}  ·  Work Order ${workOrder.workOrderNumber || ''}`,
            PW / 2, FOOTER_Y, { align: 'center' }
        );
    }

    // ── Download ──────────────────────────────────────────────────────────────
    const fileName = `Work_Order_${workOrder.workOrderNumber || 'export'}_${new Date().toISOString().split('T')[0]}.pdf`;
    const url  = URL.createObjectURL(doc.output('blob'));
    const link = Object.assign(document.createElement('a'), {
        href: url, download: fileName, style: 'display:none',
    });
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(url); }, 100);
};
