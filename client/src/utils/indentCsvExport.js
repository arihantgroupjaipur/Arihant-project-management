export const generateIndentCSV = (indents) => {
    if (!indents || indents.length === 0) {
        throw new Error('No indents to export');
    }

    const headers = [
        'Indent Number',
        'Date',
        'Site Name',
        'Material Group',
        'Priority',
        'Lead Time',
        'Task Reference',
        'Work Description',
        'Block/Floor/Work',
        'Site Engineer Name',
        'Store Manager Name',
        'Item Description',
        'Unit',
        'Required Quantity',
        'Order Quantity'
    ];

    const escapeCsvRef = (field) => {
        if (field === null || field === undefined) return '';
        const stringField = String(field);
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
            return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
    };

    let csvContent = headers.join(',') + '\n';

    indents.forEach(indent => {
        const baseRow = [
            escapeCsvRef(indent.indentNumber),
            escapeCsvRef(indent.date ? new Date(indent.date).toLocaleDateString('en-GB') : ''),
            escapeCsvRef(indent.siteName),
            escapeCsvRef(indent.materialGroup),
            escapeCsvRef(indent.priority),
            escapeCsvRef(indent.leadTime),
            escapeCsvRef(indent.taskReference),
            escapeCsvRef(indent.workDescription),
            escapeCsvRef(indent.blockFloorWork),
            escapeCsvRef(indent.siteEngineerName),
            escapeCsvRef(indent.storeManagerName)
        ];

        if (indent.items && indent.items.length > 0) {
            indent.items.forEach(item => {
                const row = [
                    ...baseRow,
                    escapeCsvRef(item.materialDescription),
                    escapeCsvRef(item.unit),
                    escapeCsvRef(item.requiredQuantity),
                    escapeCsvRef(item.orderQuantity)
                ];
                csvContent += row.join(',') + '\n';
            });
        }
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (navigator.msSaveBlob) { // IE 10+
        navigator.msSaveBlob(blob, 'Indent_Requirements.csv');
    } else {
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute('download', `Indent_Requirements_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
};
