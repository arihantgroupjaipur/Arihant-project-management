import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const fmtDate = (d) => {
    if (!d) return '—';
    // If already formatted (dd.mm.yyyy or dd/mm/yyyy) return as-is
    if (/^\d{2}[.\-/]\d{2}[.\-/]\d{4}$/.test(d)) return d.replace(/-/g, '.').replace(/\//g, '.');
    try {
        const dt = new Date(d);
        if (isNaN(dt)) return d;
        const dd = String(dt.getDate()).padStart(2, '0');
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const yyyy = dt.getFullYear();
        return `${dd}.${mm}.${yyyy}`;
    } catch { return d; }
};

export const generatePaymentVoucherPDF = (voucher) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const PW = doc.internal.pageSize.getWidth();   // 210
    const ML = 20, MR = 20;
    const USABLE_W = PW - ML - MR;                 // 170

    // ── Computed values ──────────────────────────────────────────────────────
    const items = voucher.items || [];
    const subTotal = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.rate) || 0), 0);
    const gstPct = Number(voucher.gstPercentage) || 0;
    const gstAmt = +(subTotal * gstPct / 100).toFixed(2);
    const total  = +(subTotal + gstAmt).toFixed(2);

    const fmt = (n) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // ── Outer border ─────────────────────────────────────────────────────────
    doc.setDrawColor(0); doc.setLineWidth(0.6);
    doc.rect(ML - 4, 10, USABLE_W + 8, 272);

    // ── Title rows ───────────────────────────────────────────────────────────
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
    doc.text('Payment Voucher', PW / 2, 20, { align: 'center' });

    doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    doc.text(voucher.partyName || '—', PW / 2, 28, { align: 'center' });

    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text(voucher.siteName || '', PW / 2, 35, { align: 'center' });

    // Divider under header
    doc.setLineWidth(0.4);
    doc.line(ML - 4, 38, PW - MR + 4, 38);

    // ── Voucher No. + Date ───────────────────────────────────────────────────
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(`Voucher No.  ${voucher.voucherNumber || ''}`, ML, 45);
    doc.setFont('helvetica', 'bold');
    doc.text(`Date:-  ${fmtDate(voucher.date)}`, PW - MR, 45, { align: 'right' });

    // ── Site Name ────────────────────────────────────────────────────────────
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text(`Site Name - ${voucher.siteName || ''}`, ML, 53);

    // Divider
    doc.setLineWidth(0.3);
    doc.line(ML - 4, 57, PW - MR + 4, 57);

    // ── Items table ──────────────────────────────────────────────────────────
    const tableBody = items.map((it, i) => {
        const amt = (Number(it.qty) || 0) * (Number(it.rate) || 0);
        return [
            String(i + 1),
            it.description || '',
            it.unit || '',
            it.qty != null ? String(it.qty) : '',
            it.rate != null ? fmt(Number(it.rate)) : '',
            fmt(amt),
        ];
    });

    // Ensure at least 3 rows for a proper form appearance
    while (tableBody.length < 3) tableBody.push(['', '', '', '', '', '']);

    // GST row
    if (gstPct > 0) {
        tableBody.push(['', `GST ${gstPct}%`, '', '', '', fmt(gstAmt)]);
    }

    // Total row
    tableBody.push(['', '', '', 'Total Amount', '', fmt(total)]);

    autoTable(doc, {
        startY: 60,
        head: [['Sr. No.', 'Description', 'Unit', 'Qty.', 'Rate', 'Amount']],
        body: tableBody,
        theme: 'grid',
        headStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            fontSize: 9,
            halign: 'center',
            lineWidth: 0.4,
            lineColor: [0, 0, 0],
            cellPadding: 3,
        },
        bodyStyles: {
            textColor: [0, 0, 0],
            fontSize: 9,
            cellPadding: 3,
            lineWidth: 0.4,
            lineColor: [0, 0, 0],
        },
        columnStyles: {
            0: { cellWidth: 16,  halign: 'center' },
            1: { cellWidth: 72 },
            2: { cellWidth: 18,  halign: 'center' },
            3: { cellWidth: 18,  halign: 'center' },
            4: { cellWidth: 22,  halign: 'right'  },
            5: { cellWidth: 24,  halign: 'right'  },
        },
        // Bold the Total row
        didParseCell: (data) => {
            const lastRow = tableBody.length - 1;
            const gstRow  = gstPct > 0 ? tableBody.length - 2 : -1;
            if (data.row.index === lastRow || data.row.index === gstRow) {
                data.cell.styles.fontStyle = 'bold';
            }
        },
        margin: { left: ML - 4, right: MR - 4 },
    });

    let yPos = doc.lastAutoTable.finalY + 8;

    // ── Payment Terms ────────────────────────────────────────────────────────
    if (voucher.paymentTerms) {
        doc.setFontSize(9); doc.setFont('helvetica', 'bold');
        doc.text(`Payment Terms - ${voucher.paymentTerms}`, ML, yPos);
        yPos += 8;
    }

    // ── Remarks ───────────────────────────────────────────────────────────────
    if (voucher.remarks) {
        doc.setFont('helvetica', 'normal');
        doc.text(`Remarks: ${voucher.remarks}`, ML, yPos);
        yPos += 8;
    }

    // ── Signature section ────────────────────────────────────────────────────
    const sigY = Math.max(yPos + 10, 245);
    const colW = USABLE_W / 3;

    const sigs = [
        { label: 'Prepared By :-',      value: voucher.preparedBy      || '' },
        { label: 'Authorised By :-',    value: voucher.authorisedBy    || '' },
        { label: 'Accounts Officer :-', value: voucher.accountsOfficer || '' },
    ];

    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    sigs.forEach((s, i) => {
        const x = ML + i * colW;
        // Signature box
        doc.setDrawColor(0); doc.setLineWidth(0.3);
        doc.rect(x - (i === 0 ? 0 : 2), sigY, colW - 2, 18);
        // Value inside box (name if filled)
        if (s.value) {
            doc.setFont('helvetica', 'normal');
            doc.text(s.value, x + colW / 2 - 2, sigY + 10, { align: 'center' });
        }
        // Label below box
        doc.setFont('helvetica', 'bold');
        doc.text(s.label, x - (i === 0 ? 0 : 2), sigY + 23);
    });

    // ── Download ─────────────────────────────────────────────────────────────
    const fileName = `Payment_Voucher_${voucher.voucherNumber || 'export'}_${new Date().toISOString().split('T')[0]}.pdf`;
    const url  = URL.createObjectURL(doc.output('blob'));
    const link = Object.assign(document.createElement('a'), {
        href: url, download: fileName, style: 'display:none',
    });
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(url); }, 100);
};
