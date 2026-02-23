// Placeholder for Excel export functionality
// TODO: Install xlsx library for full Excel support
// For now, export as CSV with .xls extension

export const generateExcel = (entries, date) => {
    if (!entries || entries.length === 0) {
        throw new Error('No entries to export');
    }

    // Create tab-separated values (TSV) for basic Excel compatibility
    const headers = [
        'Date',
        'Project Name',
        'Location',
        'Supervisor',
        'Contractor Name',
        'Planned Labour',
        'Actual Labour'
    ];

    const rows = [];
    entries.forEach(entry => {
        if (entry.labourDetails && entry.labourDetails.length > 0) {
            entry.labourDetails.forEach(detail => {
                rows.push([
                    entry.date || '',
                    entry.projectName || '',
                    entry.location || '',
                    entry.supervisor || '',
                    detail.contractorName || '',
                    detail.plannedLabour || 0,
                    detail.actualLabour || 0
                ]);
            });
        } else {
            rows.push([
                entry.date || '',
                entry.projectName || '',
                entry.location || '',
                entry.supervisor || '',
                'No labour details',
                0,
                0
            ]);
        }
    });

    // Convert to TSV format
    const tsvContent = [
        headers.join('\t'),
        ...rows.map(row => row.join('\t'))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([tsvContent], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Daily_Labour_Deployment_${date || new Date().toISOString().split('T')[0]}.xls`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    // Cleanup
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);
};
