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

export const generateIndentCSV = (indents) => {
    if (!indents || indents.length === 0) throw new Error('No indents to export');

    const headers = [
        'Indent Number', 'Date', 'Task Reference', 'Site Name', 'Site Engineer Name',
        'Material Group', 'Priority', 'Lead Time (Days)', 'Block/Floor/Work',
        'Work Description', 'Store Manager Name', 'Verification Status', 'Verified By',
        'Created By', 'Item Description', 'Unit', 'Required Quantity', 'Order Quantity', 'Remark'
    ];

    const esc = (field) => {
        if (field === null || field === undefined) return '';
        const s = String(field);
        return (s.includes(',') || s.includes('"') || s.includes('\n')) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    let csvContent = headers.join(',') + '\n';

    indents.forEach(indent => {
        const baseRow = [
            esc(indent.indentNumber),
            esc(fmtTs(indent.createdAt || indent.date)),
            esc(indent.taskReference),
            esc(indent.siteName),
            esc(indent.siteEngineerName),
            esc(indent.materialGroup),
            esc(indent.priority),
            esc(indent.leadTime),
            esc(indent.blockFloorWork),
            esc(indent.workDescription),
            esc(indent.storeManagerName),
            esc(indent.verifiedByPurchaseManager ? 'Verified' : 'Pending'),
            esc(indent.verifiedBy?.fullName || indent.verifiedBy?.email || ''),
            esc(indent.createdBy?.fullName || indent.createdBy?.email || ''),
        ];

        if (indent.items && indent.items.length > 0) {
            indent.items.forEach(item => {
                csvContent += [
                    ...baseRow,
                    esc(item.materialDescription),
                    esc(item.unit),
                    esc(item.requiredQuantity),
                    esc(item.orderQuantity),
                    esc(item.remark),
                ].join(',') + '\n';
            });
        } else {
            csvContent += [...baseRow, '', '', '', '', ''].join(',') + '\n';
        }
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Indent_Requirements_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
