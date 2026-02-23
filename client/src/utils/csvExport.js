export const generateCSV = (entries, date) => {
    if (!entries || entries.length === 0) {
        throw new Error('No entries to export');
    }

    // Create CSV header
    const headers = [
        'Date',
        'Project Name',
        'Location',
        'Supervisor',
        'Contractor Name',
        'Planned Labour',
        'Actual Labour'
    ];

    // Create CSV rows
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

    // Convert to CSV format
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Daily_Labour_Deployment_${date || new Date().toISOString().split('T')[0]}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    // Cleanup
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);
};
