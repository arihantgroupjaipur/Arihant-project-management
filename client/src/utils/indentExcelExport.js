import * as XLSX from 'xlsx';

export const generateIndentExcel = (indents) => {
    if (!indents || indents.length === 0) {
        throw new Error('No indents to export');
    }

    const exportData = [];

    indents.forEach(indent => {
        if (indent.items && indent.items.length > 0) {
            indent.items.forEach(item => {
                exportData.push({
                    'Indent Number': indent.indentNumber || '',
                    'Date': indent.date ? new Date(indent.date).toLocaleDateString('en-GB') : '',
                    'Site Name': indent.siteName || '',
                    'Material Group': indent.materialGroup || '',
                    'Priority': indent.priority || '',
                    'Lead Time': indent.leadTime || '',
                    'Task Reference': indent.taskReference || '',
                    'Work Description': indent.workDescription || '',
                    'Block/Floor/Work': indent.blockFloorWork || '',
                    'Site Engineer Name': indent.siteEngineerName || '',
                    'Store Manager Name': indent.storeManagerName || '',
                    'Item Description': item.materialDescription || '',
                    'Unit': item.unit || '',
                    'Required Quantity': item.requiredQuantity || 0,
                    'Order Quantity': item.orderQuantity || 0
                });
            });
        }
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Indent Requirements');

    const fileName = `Indent_Requirements_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
};
