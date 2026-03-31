import * as XLSX from 'xlsx';

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

export const generatePurchaseOrderExcel = (purchaseOrders) => {
    if (!purchaseOrders || purchaseOrders.length === 0) {
        throw new Error('No Purchase Orders to export');
    }

    const exportData = [];

    purchaseOrders.forEach(po => {
        const indentNum = po.indentReferences?.map(i => i?.indentNumber || i).join(', ') || '';

        if (po.items && po.items.length > 0) {
            po.items.forEach(item => {
                exportData.push({
                    'PO Number': po.poNumber || '',
                    'Date': fmtTs(po.createdAt || po.date),
                    'Status': po.status || '',
                    'Indent Reference': indentNum,
                    'Task Reference': po.taskReference || '',
                    'Vendor Name': po.vendorName || '',
                    'Vendor Address': po.vendorAddress || '',
                    'Vendor GST': po.vendorGst || '',
                    'Vendor Contact': po.vendorContactNo || '',
                    'Ship To Company': po.shipToCompanyName || '',
                    'Ship To Address': po.shipToAddress || '',
                    'Ship To Person': po.shipToContactPerson || '',
                    'Ship To Contact': po.shipToContactNo || '',
                    'Subtotal (₹)': po.subTotal || 0,
                    'Round off (₹)': po.freight || 0,
                    'Grand Total (₹)': po.totalAmount || 0,
                    'Comments': po.comments || '',
                    'Prepared By': po.preparedBy || '',
                    'Requisitioned By': po.requisitionedBy || '',
                    'Verified By': po.verifiedBy || '',
                    'Authorized By': po.authorizedBy || '',
                    'Item Description': item.materialDescription || '',
                    'Unit': item.unit || '',
                    'QTY': item.quantity || 0,
                    'Rate (₹)': item.rate || 0,
                    'Base (₹)': item.baseAmount || 0,
                    'Tax (₹)': item.taxAmount || 0,
                    'Amount (₹)': item.amount || 0
                });
            });
        }
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Purchase Orders');

    const fileName = `Purchase_Orders_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
};
