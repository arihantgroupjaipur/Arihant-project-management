import { format } from 'date-fns';

export const exportMaterialVerificationCsv = (pos) => {
    const rows = [];

    // Header row
    rows.push([
        'PO Number', 'Date', 'Vendor Name', 'Vendor Contact',
        'Vendor Address', 'GST', 'Task Ref', 'Indent Ref',
        'Status', 'S.No', 'Material Description', 'Unit', 'Ordered Qty', 'Received Qty'
    ]);

    pos.forEach((po) => {
        const items = po.items || [];
        if (items.length === 0) {
            rows.push([
                po.poNumber || '',
                po.date ? format(new Date(po.date), 'dd/MM/yyyy') : '',
                po.vendorName || '',
                po.vendorContactNo || '',
                po.vendorAddress || '',
                po.vendorGst || '',
                po.taskReference || '',
                po.indentReferences?.map(i => i?.indentNumber).join(', ') || '',
                po.materialVerificationStatus || 'Pending',
                '', '', '', '', ''
            ]);
        } else {
            items.forEach((item, idx) => {
                rows.push([
                    po.poNumber || '',
                    po.date ? format(new Date(po.date), 'dd/MM/yyyy') : '',
                    po.vendorName || '',
                    po.vendorContactNo || '',
                    po.vendorAddress || '',
                    po.vendorGst || '',
                    po.taskReference || '',
                    po.indentReferences?.map(i => i?.indentNumber).join(', ') || '',
                    po.materialVerificationStatus || 'Pending',
                    idx + 1,
                    item.materialDescription || '',
                    item.unit || '',
                    item.quantity || 0,
                    item.receivedQuantity || 0,
                ]);
            });
        }

        if (po.receipts && po.receipts.length > 0) {
            rows.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '']); // empty row
            rows.push(['Delivery Receipts History', '', '', '', '', '', '', '', '', '', '', '', '', '']);
            rows.push(['Delivery #', 'Date', 'Received By', 'Description', 'Qty Received', '', '', '', '', '', '', '', '', '']);
            po.receipts.forEach((receipt, rIdx) => {
                const rDate = receipt.date ? format(new Date(receipt.date), 'dd/MM/yyyy') : 'N/A';
                (receipt.items || []).forEach((rItem, iIdx) => {
                    rows.push([
                        iIdx === 0 ? rIdx + 1 : '',
                        iIdx === 0 ? rDate : '',
                        iIdx === 0 ? (receipt.receivedBy || '') : '',
                        rItem.materialDescription || '',
                        rItem.quantityReceived || 0,
                        '', '', '', '', '', '', '', '', ''
                    ]);
                });
            });
            rows.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '']); // empty row
        }
    });

    const csvContent = rows.map(row =>
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    const fileName = pos.length === 1
        ? `Material_Verification_${pos[0].poNumber}.csv`
        : `Material_Verifications_${format(new Date(), 'yyyy-MM-dd')}.csv`;

    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
