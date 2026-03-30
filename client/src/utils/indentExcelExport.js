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

export const generateIndentExcel = (indents) => {
    if (!indents || indents.length === 0) throw new Error('No indents to export');

    const exportData = [];

    indents.forEach(indent => {
        const base = {
            'Indent Number': indent.indentNumber || '',
            'Date': fmtTs(indent.createdAt || indent.date),
            'Task Reference': indent.taskReference || '',
            'Site Name': indent.siteName || '',
            'Site Engineer Name': indent.siteEngineerName || '',
            'Material Group': indent.materialGroup || '',
            'Priority': indent.priority || '',
            'Lead Time (Days)': indent.leadTime || '',
            'Block/Floor/Work': indent.blockFloorWork || '',
            'Work Description': indent.workDescription || '',
            'Store Manager Name': indent.storeManagerName || '',
            'Verification Status': indent.verifiedByPurchaseManager ? 'Verified' : 'Pending',
            'Verified By': indent.verifiedBy?.fullName || indent.verifiedBy?.email || '',
            'Created By': indent.createdBy?.fullName || indent.createdBy?.email || '',
        };

        if (indent.items && indent.items.length > 0) {
            indent.items.forEach(item => {
                exportData.push({
                    ...base,
                    'Item Description': item.materialDescription || '',
                    'Unit': item.unit || '',
                    'Required Quantity': item.requiredQuantity ?? 0,
                    'Order Quantity': item.orderQuantity || '',
                    'Remark': item.remark || '',
                });
            });
        } else {
            exportData.push({ ...base, 'Item Description': '', 'Unit': '', 'Required Quantity': '', 'Order Quantity': '', 'Remark': '' });
        }
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Column widths
    worksheet['!cols'] = [
        { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 22 }, { wch: 22 },
        { wch: 18 }, { wch: 12 }, { wch: 16 }, { wch: 20 }, { wch: 30 },
        { wch: 20 }, { wch: 18 }, { wch: 20 }, { wch: 20 },
        { wch: 30 }, { wch: 10 }, { wch: 16 }, { wch: 14 }, { wch: 25 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Indent Requirements');
    XLSX.writeFile(workbook, `Indent_Requirements_${new Date().toISOString().split('T')[0]}.xlsx`);
};
