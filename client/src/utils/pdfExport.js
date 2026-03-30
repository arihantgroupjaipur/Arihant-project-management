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

const calcDiff = (a, b) => {
    const na = parseFloat(a); const nb = parseFloat(b);
    if (isNaN(na) || isNaN(nb)) return null;
    return parseFloat((na - nb).toFixed(4));
};

export const generatePDF = async (entries) => {
    if (!entries || entries.length === 0) throw new Error('No entries to export');

    // Landscape A4
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const PW = doc.internal.pageSize.getWidth();    // 297 mm
    const PH = doc.internal.pageSize.getHeight();   // 210 mm

    // ── Layout constants ──────────────────────────────────────────────────────
    const ML          = 15;
    const MR          = 15;
    const USABLE_W    = PW - ML - MR;               // 267 mm
    const SAFE_BOTTOM = PH - 20;                    // content limit
    const FOOTER_Y    = PH - 8;
    const CONT_TOP    = 22;                         // yPos on continuation pages
    const LINE_H      = 5;
    const ROW_GAP     = 2;

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

    // ── Per-entry rendering ───────────────────────────────────────────────────
    entries.forEach((entry, entryIndex) => {
        if (entryIndex > 0) doc.addPage();

        // ── First-page header ─────────────────────────────────────────────────
        if (logoData) {
            try { doc.addImage(logoData, 'PNG', ML, 8, 20, 20); } catch { /* skip */ }
        }

        doc.setFontSize(8); doc.setTextColor(120);
        doc.text(
            `Generated: ${new Date().toLocaleDateString('en-IN')}`,
            PW - MR, 12, { align: 'right' }
        );

        doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
        doc.text('Daily Progress Report', PW / 2, 20, { align: 'center' });

        doc.setDrawColor(160); doc.setLineWidth(0.4);
        doc.line(ML, 24, PW - MR, 24);

        let yPos = 32;

        // ── Helpers ───────────────────────────────────────────────────────────
        const printContHeader = (dateStr) => {
            doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(120);
            doc.text(
                `Daily Progress Report  —  ${dateStr || ''}  (continued)`,
                PW / 2, 12, { align: 'center' }
            );
            doc.setDrawColor(180); doc.setLineWidth(0.3);
            doc.line(ML, 15, PW - MR, 15);
            doc.setFont('helvetica', 'normal'); doc.setTextColor(0);
        };

        const checkBreak = (needed = 10) => {
            if (yPos + needed > SAFE_BOTTOM) {
                doc.addPage();
                printContHeader(entry.date);
                yPos = CONT_TOP;
            }
        };

        // Bold label + normal value, wrapped within maxW; returns line count
        const printLV = (label, val, x, maxW) => {
            const sep   = ':  ';
            const lines = doc.splitTextToSize(`${label}${sep}${val || '—'}`, maxW);
            lines.forEach((line, i) => {
                if (i === 0) {
                    const cut = label.length + sep.length;
                    const lp  = line.slice(0, Math.min(cut, line.length));
                    const vp  = line.slice(lp.length);
                    doc.setFont('helvetica', 'bold');
                    const bw  = doc.getTextWidth(lp);
                    doc.text(lp, x, yPos + i * LINE_H);
                    if (vp) { doc.setFont('helvetica', 'normal'); doc.text(vp, x + bw, yPos + i * LINE_H); }
                } else {
                    doc.setFont('helvetica', 'normal');
                    doc.text('    ' + line, x, yPos + i * LINE_H);
                }
            });
            return lines.length;
        };

        // Two-column row — each column gets ~half usable width
        const HALF = USABLE_W / 2 - 6;
        const LEFT_X  = ML + 2;
        const RIGHT_X = PW / 2 + 8;

        const addRow = (lLabel, lVal, rLabel, rVal) => {
            doc.setFontSize(8.5);
            const lh = printLV(lLabel, lVal, LEFT_X,  HALF);
            const rh = rLabel ? printLV(rLabel, rVal, RIGHT_X, HALF) : 0;
            yPos += Math.max(lh, rh) * LINE_H + ROW_GAP;
        };

        // Section heading with underline
        const drawHeading = (text) => {
            checkBreak(14);
            doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 60, 120);
            doc.text(text.toUpperCase(), ML, yPos);
            doc.setDrawColor(180); doc.setLineWidth(0.3);
            doc.line(ML, yPos + 1.5, PW - MR, yPos + 1.5);
            doc.setTextColor(0);
            yPos += 7;
        };

        // ── Basic Information ─────────────────────────────────────────────────
        drawHeading('Basic Information');
        doc.setFontSize(8.5);
        addRow('Date',          fmtTs(entry.createdAt || entry.date),
               'Supervisor',    entry.supervisor || '—');
        addRow('Site / Project', entry.projectName || '—',
               'Total Workers', String(entry.workerCount || 0));
        checkBreak(LINE_H * 2);
        const locLines = doc.splitTextToSize(entry.location || '—', USABLE_W);
        doc.setFontSize(8.5);
        printLV('Location', entry.location || '—', LEFT_X, USABLE_W - 4);
        yPos += locLines.length * LINE_H + ROW_GAP + 2;

        // ── Daily Progress Reports table ──────────────────────────────────────
        const progressRows = (entry.dailyProgressReports || []).filter(r => r.contractorName);
        drawHeading('Daily Progress Reports');

        if (progressRows.length > 0) {
            const progressData = progressRows.map(r => [
                r.contractorName || '—',
                r.workOrderNo    || '—',
                r.workName       || '—',
                r.plannedLabour  ?? 0,
                r.actualLabour   ?? 0,
                r.plannedWork    || '—',
                r.actualWork     || '—',
                r.status         || '—',
            ]);

            // Column widths sum = USABLE_W (267)
            const cw = [45, 33, 35, 18, 18, 45, 45, 28];

            autoTable(doc, {
                startY: yPos,
                head: [['Contractor Name', 'Work Order No', 'Work Name', 'Pl. Labour', 'Act. Labour', 'Planned Work', 'Actual Work', 'Status']],
                body: progressData,
                theme: 'grid',
                headStyles: {
                    fillColor: [50, 80, 140], textColor: [255, 255, 255],
                    fontStyle: 'bold', halign: 'center', fontSize: 7.5, cellPadding: 2.5,
                },
                bodyStyles: { textColor: [0, 0, 0], fontSize: 7.5, cellPadding: 2.5 },
                alternateRowStyles: { fillColor: [245, 247, 252] },
                columnStyles: {
                    0: { cellWidth: cw[0] },
                    1: { cellWidth: cw[1] },
                    2: { cellWidth: cw[2] },
                    3: { cellWidth: cw[3], halign: 'center' },
                    4: { cellWidth: cw[4], halign: 'center' },
                    5: { cellWidth: cw[5] },
                    6: { cellWidth: cw[6] },
                    7: { cellWidth: cw[7], halign: 'center' },
                },
                margin: { left: ML, right: MR, bottom: 20 },
                tableWidth: USABLE_W,
            });
            yPos = (doc.lastAutoTable?.finalY || yPos) + 8;
        } else {
            doc.setFontSize(8); doc.setTextColor(120);
            doc.text('No daily progress report data.', LEFT_X, yPos);
            doc.setTextColor(0);
            yPos += 8;
        }

        // ── Material Consumption table ────────────────────────────────────────
        const materials = (entry.materialConsumption || []).filter(m => m.materialName);
        drawHeading('Material Consumption');

        if (materials.length > 0) {
            const matData = materials.map(m => {
                const diffQty  = calcDiff(m.usedTotalQty,   m.totalQuantity);
                const diffArea = calcDiff(m.actualWorkArea, m.plannedWorkArea);
                return [
                    m.materialName    || '—',
                    m.totalQuantity   ?? 0,
                    m.usedTotalQty    ?? 0,
                    diffQty  !== null ? (diffQty  > 0 ? `+${diffQty}`  : String(diffQty))  : '—',
                    m.unit            || '—',
                    m.plannedWorkArea ?? 0,
                    m.actualWorkArea  ?? 0,
                    diffArea !== null ? (diffArea > 0 ? `+${diffArea}` : String(diffArea)) : '—',
                ];
            });

            // Column widths sum = USABLE_W (267)
            const mw = [62, 24, 24, 24, 18, 28, 28, 29];

            autoTable(doc, {
                startY: yPos,
                head: [['Material Name', 'Total Qty', 'Used Total Qty', 'Diff of Qty', 'Unit', 'Planned Work Area', 'Actual Work Area', 'Diff in Work Area']],
                body: matData,
                theme: 'grid',
                headStyles: {
                    fillColor: [50, 80, 140], textColor: [255, 255, 255],
                    fontStyle: 'bold', halign: 'center', fontSize: 7.5, cellPadding: 2.5,
                },
                bodyStyles: { textColor: [0, 0, 0], fontSize: 7.5, cellPadding: 2.5 },
                alternateRowStyles: { fillColor: [245, 247, 252] },
                columnStyles: {
                    0: { cellWidth: mw[0] },
                    1: { cellWidth: mw[1], halign: 'center' },
                    2: { cellWidth: mw[2], halign: 'center' },
                    3: { cellWidth: mw[3], halign: 'center' },
                    4: { cellWidth: mw[4], halign: 'center' },
                    5: { cellWidth: mw[5], halign: 'center' },
                    6: { cellWidth: mw[6], halign: 'center' },
                    7: { cellWidth: mw[7], halign: 'center' },
                },
                didParseCell: (data) => {
                    if (data.section === 'body' && (data.column.index === 3 || data.column.index === 7)) {
                        const val = String(data.cell.raw);
                        if (val.startsWith('+'))          data.cell.styles.textColor = [200, 0, 0];
                        else if (val === '0' || val === '0.0') data.cell.styles.textColor = [0, 150, 0];
                        else if (val !== '—')             data.cell.styles.textColor = [160, 110, 0];
                    }
                },
                margin: { left: ML, right: MR, bottom: 20 },
                tableWidth: USABLE_W,
            });
            yPos = (doc.lastAutoTable?.finalY || yPos) + 8;
        } else {
            doc.setFontSize(8); doc.setTextColor(120);
            doc.text('No material consumption data.', LEFT_X, yPos);
            doc.setTextColor(0);
            yPos += 8;
        }

        // ── Signature line ────────────────────────────────────────────────────
        checkBreak(18);
        doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(0);
        doc.text('Supervisor Signature : _________________________', ML, yPos + 8);
        doc.text('Date : ____________', PW - MR - 55, yPos + 8);
    });

    // ── Two-pass: stamp "Page X of N" on every page ───────────────────────────
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setDrawColor(200); doc.setLineWidth(0.2);
        doc.line(ML, FOOTER_Y - 3, PW - MR, FOOTER_Y - 3);
        doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(150);
        doc.text(
            `Page ${p} of ${totalPages}  |  Arihant Daily Progress Report`,
            PW / 2, FOOTER_Y, { align: 'center' }
        );
    }

    // ── Download ──────────────────────────────────────────────────────────────
    const fileName = `Daily_Progress_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    const url  = URL.createObjectURL(doc.output('blob'));
    const link = Object.assign(document.createElement('a'), {
        href: url, download: fileName, style: 'display:none',
    });
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(url); }, 100);
};
