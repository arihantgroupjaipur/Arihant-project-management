import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generatePDF = async (entries) => {
    if (!entries || entries.length === 0) {
        throw new Error('No entries to export');
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Load logo
    let logoData = null;
    try {
        const response = await fetch('/arihantlogo.png');
        const blob = await response.blob();
        logoData = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.warn('Logo could not be loaded:', error);
    }

    const drawHeading = (doc, text, yPos) => {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(60, 60, 60);
        doc.text(text.toUpperCase(), 20, yPos);
        doc.setDrawColor(200, 200, 200);
        doc.line(20, yPos + 1, pageWidth - 20, yPos + 1);
        doc.setTextColor(0, 0, 0);
        return yPos + 7;
    };

    const checkPageBreak = (doc, yPos, needed = 30) => {
        if (yPos + needed > pageHeight - 20) {
            doc.addPage();
            return 20;
        }
        return yPos;
    };

    entries.forEach((entry, entryIndex) => {
        if (entryIndex > 0) doc.addPage();

        // Logo
        if (logoData) {
            try { doc.addImage(logoData, 'PNG', 15, 10, 25, 25); } catch (_) { }
        }

        // Print date top-right
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, pageWidth - 15, 15, { align: 'right' });

        // Title
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        doc.text('Daily Labour Deployment Report', pageWidth / 2, 30, { align: 'center' });

        // Thin line
        doc.setDrawColor(180, 180, 180);
        doc.line(15, 34, pageWidth - 15, 34);

        let yPos = 44;

        // ── BASIC INFO ──────────────────────────────────────────────
        const info = [
            ['Date', entry.date || '—'],
            ['Site / Work Order', entry.projectName || '—'],
            ['Location', entry.location || '—'],
            ['Supervisor', entry.supervisor || '—'],
            ['Total Workers', String(entry.workerCount || 0)],
        ];

        doc.setFontSize(9);
        info.forEach(([label, value]) => {
            doc.setFont('helvetica', 'bold');
            doc.text(label + ':', 20, yPos);
            doc.setFont('helvetica', 'normal');
            doc.text(value, 80, yPos);
            yPos += 7;
        });

        yPos += 5;

        // ── LABOUR BREAKDOWN ────────────────────────────────────────
        yPos = checkPageBreak(doc, yPos, 40);
        yPos = drawHeading(doc, 'Labour Breakdown', yPos);

        const labourData = (entry.labourDetails || []).map(d => [
            d.contractorName || '—',
            String(d.plannedLabour ?? 0),
            String(d.actualLabour ?? 0),
        ]);
        if (labourData.length === 0) labourData.push(['No labour details', '—', '—']);

        autoTable(doc, {
            startY: yPos,
            head: [['Contractor Name', 'Planned Labour', 'Actual Labour']],
            body: labourData,
            theme: 'grid',
            headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', fontSize: 8 },
            bodyStyles: { textColor: [0, 0, 0], fontSize: 8 },
            columnStyles: {
                0: { cellWidth: 100 },
                1: { cellWidth: 38, halign: 'center' },
                2: { cellWidth: 38, halign: 'center' },
            },
            margin: { left: 20, right: 20 },
        });
        yPos = (doc.lastAutoTable?.finalY || yPos) + 10;

        // ── DAILY PROGRESS REPORTS ──────────────────────────────────
        const progressRows = (entry.dailyProgressReports || []).filter(r => r.contractorName);
        if (progressRows.length > 0) {
            yPos = checkPageBreak(doc, yPos, 40);
            yPos = drawHeading(doc, 'Daily Progress Reports', yPos);

            const progressData = progressRows.map(r => [
                r.contractorName || '—',
                r.workOrderNo || '—',
                String(r.plannedLabour ?? 0),
                String(r.actualLabour ?? 0),
                r.plannedWork || '—',
                r.actualWork || '—',
                r.status || '—',
            ]);

            autoTable(doc, {
                startY: yPos,
                head: [['Contractor', 'Work Order', 'Pl. Labour', 'Act. Labour', 'Planned Work', 'Actual Work', 'Status']],
                body: progressData,
                theme: 'grid',
                headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', fontSize: 7 },
                bodyStyles: { textColor: [0, 0, 0], fontSize: 7 },
                columnStyles: {
                    0: { cellWidth: 28 },
                    1: { cellWidth: 24 },
                    2: { cellWidth: 16, halign: 'center' },
                    3: { cellWidth: 16, halign: 'center' },
                    4: { cellWidth: 32 },
                    5: { cellWidth: 32 },
                    6: { cellWidth: 22, halign: 'center' },
                },
                margin: { left: 20, right: 20 },
            });
            yPos = (doc.lastAutoTable?.finalY || yPos) + 10;
        }

        // ── MATERIAL CONSUMPTION ────────────────────────────────────
        const materials = (entry.materialConsumption || []).filter(m => m.materialName);
        if (materials.length > 0) {
            yPos = checkPageBreak(doc, yPos, 40);
            yPos = drawHeading(doc, 'Material Consumption', yPos);

            const matData = materials.map(m => [
                m.materialName || '—',
                String(m.totalQuantity ?? 0),
                m.unit || '—',
                m.workOrderReference || '—',
            ]);

            autoTable(doc, {
                startY: yPos,
                head: [['Material Name', 'Quantity', 'Unit', 'Work Order Reference']],
                body: matData,
                theme: 'grid',
                headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', fontSize: 8 },
                bodyStyles: { textColor: [0, 0, 0], fontSize: 8 },
                columnStyles: {
                    0: { cellWidth: 70 },
                    1: { cellWidth: 28, halign: 'center' },
                    2: { cellWidth: 24, halign: 'center' },
                    3: { cellWidth: 54 },
                },
                margin: { left: 20, right: 20 },
            });
            yPos = (doc.lastAutoTable?.finalY || yPos) + 10;
        }

        // ── SIGNATURE ───────────────────────────────────────────────
        yPos = checkPageBreak(doc, yPos, 25);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0);
        doc.text('Supervisor Signature: _________________________', 20, yPos + 10);
        doc.text('Date: ____________', pageWidth - 80, yPos + 10);

        // ── FOOTER ──────────────────────────────────────────────────
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
            `Page ${entryIndex + 1} of ${entries.length} | Arihant Daily Deployment`,
            pageWidth / 2,
            pageHeight - 8,
            { align: 'center' }
        );
    });

    // Save
    const fileName = `Daily_Deployment_${new Date().toISOString().split('T')[0]}.pdf`;
    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);
};
