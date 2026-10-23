import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const fmt = (n) => (n == null ? '—' : `Rs. ${Number(n).toLocaleString('en-IN')}`);

const slotLabel = (slot) => (slot ? slot.replace('quotation', 'Quotation ') : '—');

// { poNumber, vendorName, items: [{materialDescription, unit, quantity, rate, amount, bestSource, bestVendorName}],
//   optimalTotal, singleVendorTotals: {quotation1: number|null, ...}, estimatedSavings, reasoning }
export const generateQuotationOptimizerPDF = ({ poNumber, vendorName, items, optimalTotal, singleVendorTotals, estimatedSavings, reasoning }) => {
    const doc = new jsPDF();
    const PW = doc.internal.pageSize.getWidth();
    const ML = 15;
    const MR = 15;

    doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
    doc.text('Arihant Dream Infra Projects Ltd.', PW / 2, 18, { align: 'center' });

    doc.setFontSize(12);
    doc.text('AI-Optimized Quotation', PW / 2, 27, { align: 'center' });

    doc.setDrawColor(180); doc.setLineWidth(0.4);
    doc.line(ML, 32, PW - MR, 32);

    let yPos = 40;
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(60);
    if (poNumber) { doc.text(`PO Number: ${poNumber}`, ML, yPos); yPos += 6; }
    if (vendorName) { doc.text(`Vendor: ${vendorName}`, ML, yPos); yPos += 6; }
    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
    doc.text(`Generated: ${today}`, ML, yPos);
    yPos += 8;

    const rows = (items || []).map((item) => [
        item.materialDescription || '—',
        item.unit || '—',
        item.quantity ?? '—',
        item.rate != null ? `Rs. ${Number(item.rate).toLocaleString('en-IN')}` : '—',
        item.amount != null ? `Rs. ${Number(item.amount).toLocaleString('en-IN')}` : '—',
        `${slotLabel(item.bestSource)}${item.bestVendorName ? ` - ${item.bestVendorName}` : ''}`,
    ]);

    autoTable(doc, {
        startY: yPos,
        head: [['Material', 'Unit', 'Qty', 'Rate', 'Amount', 'Best Source']],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: { 0: { cellWidth: 55 }, 5: { cellWidth: 55 } },
    });

    let afterTableY = doc.lastAutoTable.finalY + 10;

    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
    doc.text(`Optimal Total: ${fmt(optimalTotal)}`, ML, afterTableY);
    afterTableY += 6;
    if (estimatedSavings > 0) {
        doc.setTextColor(22, 101, 52);
        doc.text(`Estimated Savings vs. single vendor: ${fmt(estimatedSavings)}`, ML, afterTableY);
        afterTableY += 6;
        doc.setTextColor(0);
    }

    const singleVendorEntries = Object.entries(singleVendorTotals || {}).filter(([, v]) => v != null);
    if (singleVendorEntries.length > 0) {
        afterTableY += 4;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(0);
        doc.text('If Bought From a Single Vendor', ML, afterTableY);
        afterTableY += 6;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(60);
        for (const [slot, total] of singleVendorEntries) {
            doc.text(`${slotLabel(slot)}: ${fmt(total)}`, ML, afterTableY);
            afterTableY += 5.5;
        }
    }

    if (reasoning) {
        afterTableY += 4;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(0);
        doc.text('AI Reasoning', ML, afterTableY);
        afterTableY += 6;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(60);
        const reasoningLines = doc.splitTextToSize(reasoning, PW - ML - MR);
        doc.text(reasoningLines, ML, afterTableY);
    }

    const fileName = `AI_Optimized_Quotation_${poNumber || new Date().toISOString().split('T')[0]}.pdf`;
    const url = URL.createObjectURL(doc.output('blob'));
    const link = Object.assign(document.createElement('a'), {
        href: url, download: fileName, style: 'display:none',
    });
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(url); }, 100);
};

export default generateQuotationOptimizerPDF;
