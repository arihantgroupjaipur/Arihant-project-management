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

export const generatePurchaseOrderCSV = (purchaseOrders) => {
    if (!purchaseOrders || purchaseOrders.length === 0) {
        throw new Error('No Purchase Orders to export');
    }

    const escapeCsvRef = (field) => {
        if (field === null || field === undefined) return '';
        const stringField = String(field);
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
            return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
    };

    // Collect all unique custom auth field labels across all POs
    const customAuthLabels = [];
    purchaseOrders.forEach(po => {
        (po.customAuthFields || []).forEach(f => {
            if (f.label && !customAuthLabels.includes(f.label)) customAuthLabels.push(f.label);
        });
    });

    const headers = [
        'PO Number', 'Date', 'Status', 'Indent Reference', 'Task Reference',
        'Vendor Name', 'Vendor Address', 'Vendor GST', 'Vendor Contact',
        'Ship To Company', 'Ship To Address', 'Ship To Person', 'Ship To Contact',
        'Subtotal', 'Round off', 'Grand Total', 'Comments',
        'Prepared By', 'Requisitioned By', 'Verified By', 'Approved By', 'Authorized By',
        ...customAuthLabels,
        'Item Description', 'Unit', 'QTY', 'Rate', 'Base', 'Tax', 'Amount'
    ];

    let csvContent = headers.join(',') + '\n';

    purchaseOrders.forEach(po => {
        const indentNum = po.indentReferences?.map(i => i?.indentNumber || i).join(', ') || '';
        const customAuthMap = {};
        (po.customAuthFields || []).forEach(f => { if (f.label) customAuthMap[f.label] = f.value || ''; });

        const baseRow = [
            escapeCsvRef(po.poNumber),
            escapeCsvRef(fmtTs(po.createdAt || po.date)),
            escapeCsvRef(po.status),
            escapeCsvRef(indentNum),
            escapeCsvRef(po.taskReference),
            escapeCsvRef(po.vendorName),
            escapeCsvRef(po.vendorAddress),
            escapeCsvRef(po.vendorGst),
            escapeCsvRef(po.vendorContactNo),
            escapeCsvRef(po.shipToCompanyName),
            escapeCsvRef(po.shipToAddress),
            escapeCsvRef(po.shipToContactPerson),
            escapeCsvRef(po.shipToContactNo),
            escapeCsvRef(po.subTotal),
            escapeCsvRef(po.freight),
            escapeCsvRef(po.totalAmount),
            escapeCsvRef(po.comments),
            escapeCsvRef(po.preparedBy),
            escapeCsvRef(po.requisitionedBy),
            escapeCsvRef(po.verifiedBy),
            escapeCsvRef(po.approvedBy),
            escapeCsvRef(po.authorizedBy),
            ...customAuthLabels.map(label => escapeCsvRef(customAuthMap[label] || ''))
        ];

        if (po.items && po.items.length > 0) {
            po.items.forEach(item => {
                const row = [
                    ...baseRow,
                    escapeCsvRef(item.materialDescription),
                    escapeCsvRef(item.unit),
                    escapeCsvRef(item.quantity),
                    escapeCsvRef(item.rate),
                    escapeCsvRef(item.baseAmount),
                    escapeCsvRef(item.taxAmount),
                    escapeCsvRef(item.amount)
                ];
                csvContent += row.join(',') + '\n';
            });
        }
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (navigator.msSaveBlob) {
        navigator.msSaveBlob(blob, 'Purchase_Orders.csv');
    } else {
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute('download', `Purchase_Orders_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
};
