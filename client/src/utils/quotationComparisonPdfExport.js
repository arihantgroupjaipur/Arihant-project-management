import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const fmt = (n) => (n == null ? '—' : `Rs. ${Number(n).toLocaleString('en-IN')}`);

const slotLabel = (slot) => slot.replace('quotation', 'Quotation ');

// { poNumber, vendorName, quotations: {quotation1: {vendorName, totalAmount}, ...}, cheapest, reasoning }
export const generateQuotationComparisonPDF = ({ poNumber, vendorName, quotations, cheapest, reasoning }) => {
    const doc = new jsPDF();
    const PW = doc.internal.pageSize.getWidth();
    const ML = 15;
    const MR = 15;

    doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
    doc.text('Arihant Dream Infra Projects Ltd.', PW / 2, 18, { align: 'center' });

    doc.setFontSize(12);
    doc.text('AI Quotation Comparison Report', PW / 2, 27, { align: 'center' });

    doc.setDrawColor(180); doc.setLineWidth(0.4);
    doc.line(ML, 32, PW - MR, 32);

    let yPos = 40;
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(60);
    if (poNumber) { doc.text(`PO Number: ${poNumber}`, ML, yPos); yPos += 6; }
    if (vendorName) { doc.text(`Vendor: ${vendorName}`, ML, yPos); yPos += 6; }
    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
    doc.text(`Generated: ${today}`, ML, yPos);
    yPos += 8;

    const slots = Object.keys(quotations || {});
    const rows = slots.map((slot) => [
        slotLabel(slot),
        quotations[slot]?.vendorName || '—',
        fmt(quotations[slot]?.totalAmount),
        slot === cheapest ? 'Cheapest (AI Recommended)' : '',
    ]);

    autoTable(doc, {
        startY: yPos,
        head: [['Quotation', 'Vendor Name', 'Total Amount', 'Verdict']],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 3 },
        didParseCell: (data) => {
            if (data.section === 'body' && slots[data.row.index] === cheapest) {
                data.cell.styles.fillColor = [220, 252, 231];
                data.cell.styles.textColor = [22, 101, 52];
                data.cell.styles.fontStyle = 'bold';
            }
        },
    });

    let afterTableY = doc.lastAutoTable.finalY + 12;
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
    doc.text('AI Reasoning', ML, afterTableY);
    afterTableY += 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(60);
    const reasoningLines = doc.splitTextToSize(reasoning || 'No reasoning provided.', PW - ML - MR);
    doc.text(reasoningLines, ML, afterTableY);

    const fileName = `Quotation_Comparison_${poNumber || new Date().toISOString().split('T')[0]}.pdf`;
    const url = URL.createObjectURL(doc.output('blob'));
    const link = Object.assign(document.createElement('a'), {
        href: url, download: fileName, style: 'display:none',
    });
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(url); }, 100);
};

export default generateQuotationComparisonPDF;
