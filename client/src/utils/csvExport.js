const fmtTs = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt)) return '';
    const ist = new Date(dt.getTime() + 5.5 * 60 * 60 * 1000);
    const dd = String(ist.getUTCDate()).padStart(2,'0');
    const mm = String(ist.getUTCMonth()+1).padStart(2,'0');
    const yyyy = ist.getUTCFullYear();
    const hh = String(ist.getUTCHours()).padStart(2,'0');
    const min = String(ist.getUTCMinutes()).padStart(2,'0');
    const ss = String(ist.getUTCSeconds()).padStart(2,'0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
};

const calcDiff = (a, b) => {
    const na = parseFloat(a); const nb = parseFloat(b);
    if (isNaN(na) || isNaN(nb)) return '';
    return parseFloat((na - nb).toFixed(4));
};

const esc = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;

export const generateCSV = (entries, date) => {
    if (!entries || entries.length === 0) throw new Error('No entries to export');

    const lines = [];

    entries.forEach((entry, i) => {
        if (i > 0) lines.push('', '');

        // Basic Info
        lines.push('=== BASIC INFORMATION ===');
        lines.push(`Date,${esc(fmtTs(entry.createdAt || entry.date))}`);
        lines.push(`Site / Project,${esc(entry.projectName || '')}`);
        lines.push(`Location,${esc(entry.location || '')}`);
        lines.push(`Supervisor,${esc(entry.supervisor || '')}`);
        lines.push(`Total Workers,${entry.workerCount || 0}`);
        lines.push('');

        // Daily Progress Reports
        lines.push('=== DAILY PROGRESS REPORTS ===');
        lines.push([
            'Contractor Name', 'Work Order No', 'Planned Labour', 'Actual Labour',
            'Planned Work', 'Actual Work', 'Status'
        ].map(esc).join(','));

        const progressRows = (entry.dailyProgressReports || []).filter(r => r.contractorName);
        if (progressRows.length > 0) {
            progressRows.forEach(r => {
                lines.push([
                    r.contractorName || '',
                    r.workOrderNo || '',
                    r.plannedLabour ?? 0,
                    r.actualLabour ?? 0,
                    r.plannedWork || '',
                    r.actualWork || '',
                    r.status || '',
                ].map(esc).join(','));
            });
        } else {
            lines.push(esc('No progress report data'));
        }
        lines.push('');

        // Material Consumption
        lines.push('=== MATERIAL CONSUMPTION ===');
        lines.push([
            'Material Name', 'Total Qty', 'Used Total Qty', 'Diff of Qty',
            'Unit', 'Planned Work Area', 'Actual Work Area', 'Diff in Work Area'
        ].map(esc).join(','));

        const materials = (entry.materialConsumption || []).filter(m => m.materialName);
        if (materials.length > 0) {
            materials.forEach(m => {
                const diffQty = calcDiff(m.usedTotalQty, m.totalQuantity);
                const diffArea = calcDiff(m.actualWorkArea, m.plannedWorkArea);
                lines.push([
                    m.materialName || '',
                    m.totalQuantity ?? 0,
                    m.usedTotalQty ?? 0,
                    diffQty !== '' ? (diffQty > 0 ? `+${diffQty}` : diffQty) : '',
                    m.unit || '',
                    m.plannedWorkArea ?? 0,
                    m.actualWorkArea ?? 0,
                    diffArea !== '' ? (diffArea > 0 ? `+${diffArea}` : diffArea) : '',
                ].map(esc).join(','));
            });
        } else {
            lines.push(esc('No material consumption data'));
        }
    });

    const csvContent = lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Daily_Progress_Report_${date || new Date().toISOString().split('T')[0]}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(url); }, 100);
};
