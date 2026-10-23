import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const fmtDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    if (isNaN(dt)) return String(d);
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
};

// analysis: { summary, underperformers, discrepancies, recommendations, period, site, from, to, createdAt }
export const generateProgressAnalysisPDF = (analysis) => {
    const doc = new jsPDF();
    const PW = doc.internal.pageSize.getWidth();
    const PH = doc.internal.pageSize.getHeight();
    const ML = 15;
    const MR = 15;
    const SAFE_BOTTOM = PH - 20;

    doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
    doc.text('Arihant Dream Infra Projects Ltd.', PW / 2, 18, { align: 'center' });

    doc.setFontSize(12);
    doc.text('AI Progress Analysis Report', PW / 2, 27, { align: 'center' });

    doc.setDrawColor(180); doc.setLineWidth(0.4);
    doc.line(ML, 32, PW - MR, 32);

    let y = 40;
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(60);
    doc.text(`Period: ${analysis.period?.toUpperCase() || '—'}    Site: ${analysis.site || 'All Sites'}`, ML, y); y += 6;
    doc.text(`Range: ${analysis.from || '—'} to ${analysis.to || '—'}`, ML, y); y += 6;
    doc.text(`Generated: ${fmtDate(analysis.createdAt || new Date())}`, ML, y); y += 10;

    const ensureSpace = (needed) => {
        if (y + needed > SAFE_BOTTOM) {
            doc.addPage();
            y = 20;
        }
    };

    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
    doc.text('Executive Summary', ML, y); y += 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(60);
    const summaryLines = doc.splitTextToSize(analysis.summary || 'No summary available.', PW - ML - MR);
    ensureSpace(summaryLines.length * 4.5 + 6);
    doc.text(summaryLines, ML, y);
    y += summaryLines.length * 4.5 + 8;

    if (analysis.underperformers?.length > 0) {
        ensureSpace(15);
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
        doc.text("Who's Lacking", ML, y); y += 5;
        autoTable(doc, {
            startY: y,
            head: [["Name", "Role", "Issue", "Evidence"]],
            body: analysis.underperformers.map((u) => [u.name, u.role, u.issue, u.evidence]),
            theme: 'grid',
            headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 2.5 },
            margin: { left: ML, right: MR },
        });
        y = doc.lastAutoTable.finalY + 8;
    }

    if (analysis.discrepancies?.length > 0) {
        ensureSpace(15);
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
        doc.text('Material / Work Discrepancies', ML, y); y += 5;
        autoTable(doc, {
            startY: y,
            head: [["Area", "Expected", "Actual", "Note"]],
            body: analysis.discrepancies.map((d) => [d.area, d.expected, d.actual, d.note]),
            theme: 'grid',
            headStyles: { fillColor: [202, 138, 4], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 2.5 },
            margin: { left: ML, right: MR },
        });
        y = doc.lastAutoTable.finalY + 8;
    }

    if (analysis.recommendations?.length > 0) {
        ensureSpace(15);
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
        doc.text('What To Do Next', ML, y); y += 5;
        autoTable(doc, {
            startY: y,
            head: [["Priority", "Recommended Action"]],
            body: analysis.recommendations.map((r) => [r.priority?.toUpperCase(), r.action]),
            theme: 'grid',
            headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 2.5 },
            columnStyles: { 0: { cellWidth: 25 } },
            margin: { left: ML, right: MR },
        });
        y = doc.lastAutoTable.finalY + 8;
    }

    const fileName = `Progress_Analysis_${analysis.period || 'report'}_${(analysis.to || new Date().toISOString().split('T')[0])}.pdf`;
    const url = URL.createObjectURL(doc.output('blob'));
    const link = Object.assign(document.createElement('a'), { href: url, download: fileName, style: 'display:none' });
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(url); }, 100);
};

export default generateProgressAnalysisPDF;
