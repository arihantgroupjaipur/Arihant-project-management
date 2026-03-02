import * as XLSX from 'xlsx';
import { format } from 'date-fns';

export const exportMaterialVerificationXlsx = (pos) => {
    const wb = XLSX.utils.book_new();

    pos.forEach((po) => {
        const rows = [];

        // Header info
        rows.push(['Arihant Dream Infra Projects Ltd.']);
        rows.push(['Material Verification Certificate']);
        rows.push([]);
        rows.push(['PO Number', po.poNumber || 'N/A', 'Date', po.date ? format(new Date(po.date), 'dd/MM/yyyy') : 'N/A']);
        rows.push(['Vendor Name', po.vendorName || 'N/A', 'Contact', po.vendorContactNo || 'N/A']);
        rows.push(['Address', po.vendorAddress || 'N/A', 'GST', po.vendorGst || 'N/A']);
        rows.push(['Task Ref', po.taskReference || 'N/A', 'Status', po.materialVerificationStatus || 'Pending']);
        rows.push(['Indent Ref', po.indentReferences?.map(i => i?.indentNumber).join(', ') || 'N/A']);
        rows.push([]);

        // Items table header
        rows.push(['S.No', 'Material Description', 'Unit', 'Ordered Qty', 'Received Qty']);

        // Items
        (po.items || []).forEach((item, idx) => {
            rows.push([
                idx + 1,
                item.materialDescription || '',
                item.unit || '',
                item.quantity || 0,
                item.receivedQuantity || 0,
            ]);
        });

        // Receipts
        if (po.receipts && po.receipts.length > 0) {
            rows.push([]);
            rows.push(['Delivery Receipts History']);
            rows.push(['Delivery #', 'Date', 'Received By', 'Description', 'Qty Received']);
            po.receipts.forEach((receipt, rIdx) => {
                const rDate = receipt.date ? format(new Date(receipt.date), 'dd/MM/yyyy') : 'N/A';
                (receipt.items || []).forEach((rItem, iIdx) => {
                    rows.push([
                        iIdx === 0 ? rIdx + 1 : '',
                        iIdx === 0 ? rDate : '',
                        iIdx === 0 ? (receipt.receivedBy || '') : '',
                        rItem.materialDescription || '',
                        rItem.quantityReceived || 0
                    ]);
                });
            });
        }

        const sheetName = (po.poNumber || `PO-${pos.indexOf(po) + 1}`).slice(0, 31);
        const ws = XLSX.utils.aoa_to_sheet(rows);

        // Column widths
        ws['!cols'] = [{ wch: 6 }, { wch: 35 }, { wch: 10 }, { wch: 14 }, { wch: 14 }];

        XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    const fileName = pos.length === 1
        ? `Material_Verification_${pos[0].poNumber}.xlsx`
        : `Material_Verifications_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;

    XLSX.writeFile(wb, fileName);
};
