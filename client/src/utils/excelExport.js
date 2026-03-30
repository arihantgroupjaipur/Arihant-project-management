import * as XLSX from 'xlsx';

const fmtTs = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt)) return '';
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
    if (isNaN(na) || isNaN(nb)) return '';
    return parseFloat((na - nb).toFixed(4));
};

export const generateExcel = (entries, date) => {
    if (!entries || entries.length === 0) throw new Error('No entries to export');

    const wb = XLSX.utils.book_new();

    // ── Sheet 1: Summary ─────────────────────────────────────────
    const summaryData = [
        ['Date', 'Site / Project', 'Location', 'Supervisor', 'Total Workers'],
        ...entries.map(e => [
            fmtTs(e.createdAt || e.date),
            e.projectName || '',
            e.location || '',
            e.supervisor || '',
            e.workerCount || 0,
        ]),
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet['!cols'] = [{ wch: 14 }, { wch: 28 }, { wch: 22 }, { wch: 22 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

    // ── Sheet 2: Daily Progress Reports ──────────────────────────
    const progressData = [
        ['Date', 'Site', 'Contractor Name', 'Work Order No', 'Planned Labour', 'Actual Labour', 'Planned Work', 'Actual Work', 'Status'],
    ];
    entries.forEach(e => {
        const rows = (e.dailyProgressReports || []).filter(r => r.contractorName);
        if (rows.length > 0) {
            rows.forEach(r => {
                progressData.push([
                    fmtTs(e.createdAt || e.date),
                    e.projectName || '',
                    r.contractorName || '',
                    r.workOrderNo || '',
                    r.plannedLabour ?? 0,
                    r.actualLabour ?? 0,
                    r.plannedWork || '',
                    r.actualWork || '',
                    r.status || '',
                ]);
            });
        } else {
            progressData.push([fmtTs(e.createdAt || e.date), e.projectName || '', 'No data', '', '', '', '', '', '']);
        }
    });
    const progressSheet = XLSX.utils.aoa_to_sheet(progressData);
    progressSheet['!cols'] = [
        { wch: 14 }, { wch: 24 }, { wch: 24 }, { wch: 18 },
        { wch: 14 }, { wch: 14 }, { wch: 30 }, { wch: 30 }, { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, progressSheet, 'Daily Progress');

    // ── Sheet 3: Material Consumption ────────────────────────────
    const matData = [
        ['Date', 'Site', 'Material Name', 'Total Qty', 'Used Total Qty', 'Diff of Qty', 'Unit', 'Planned Work Area', 'Actual Work Area', 'Diff in Work Area'],
    ];
    entries.forEach(e => {
        const materials = (e.materialConsumption || []).filter(m => m.materialName);
        if (materials.length > 0) {
            materials.forEach(m => {
                const diffQty = calcDiff(m.usedTotalQty, m.totalQuantity);
                const diffArea = calcDiff(m.actualWorkArea, m.plannedWorkArea);
                matData.push([
                    fmtTs(e.createdAt || e.date),
                    e.projectName || '',
                    m.materialName || '',
                    m.totalQuantity ?? 0,
                    m.usedTotalQty ?? 0,
                    diffQty !== '' ? (diffQty > 0 ? `+${diffQty}` : diffQty) : '',
                    m.unit || '',
                    m.plannedWorkArea ?? 0,
                    m.actualWorkArea ?? 0,
                    diffArea !== '' ? (diffArea > 0 ? `+${diffArea}` : diffArea) : '',
                ]);
            });
        } else {
            matData.push([fmtTs(e.createdAt || e.date), e.projectName || '', 'No data', '', '', '', '', '', '', '']);
        }
    });
    const matSheet = XLSX.utils.aoa_to_sheet(matData);
    matSheet['!cols'] = [
        { wch: 14 }, { wch: 24 }, { wch: 30 }, { wch: 12 }, { wch: 14 },
        { wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 16 }, { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(wb, matSheet, 'Material Consumption');

    // Download
    const fileName = `Daily_Progress_Report_${date || new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
};
