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

export const generateWorkOrderExcel = (workOrder) => {
    if (!workOrder) {
        throw new Error('No work order to export');
    }

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Header information
    const headerData = [
        ['Arihant Dream Infra Projects Ltd. Jaipur'],
        ['2nd Floor, Class Of Pearl, Income Tax Colony, Tonk Road, Durgapura, Jaipur, Rajasthan, 302018'],
        ['CIN No. U7010RJ2011PLC035322'],
        [''],
        ['WORK ORDER'],
        [''],
        ['Work Order Number:', workOrder.workOrderNumber],
        ['Date:', fmtTs(workOrder.createdAt || workOrder.date)],
        ['Main Work Order Reference:', workOrder.mainWorkOrderReference || ''],
        ['Address/Location:', workOrder.addressLocation || ''],
        ['Contact Person Name:', workOrder.contactPersonName || ''],
        ['Work Location Name:', workOrder.workLocationName || ''],
        ['Store Keeper & Supervisor Name:', workOrder.storeKeeperSupervisorName || ''],
        ['']
    ];

    // Work items table headers
    const workItemHeaders = [
        ['Work Description', 'No Of Planned Labour', 'Work Start Date', 'Work Finish Date', 'Work Area', 'Rate', 'Total Amount']
    ];

    // Work items data
    const workItemsData = [];
    if (workOrder.workItems && workOrder.workItems.length > 0) {
        workOrder.workItems.forEach(item => {
            workItemsData.push([
                item.workDescription || '',
                item.plannedLabour || '',
                item.workStartDate ? new Date(item.workStartDate).toLocaleDateString('en-GB') : '',
                item.workFinishDate ? new Date(item.workFinishDate).toLocaleDateString('en-GB') : '',
                item.workArea || '',
                item.rate || '',
                item.totalAmount || ''
            ]);
        });
    }

    // Notes
    const notesData = [
        [''],
        ['Additional Notes:'],
        ['1. It is mandatory to attach a copy of the Work Order while submitting the bill.'],
        ['2. The contractor is responsible for any errors in the work and must carry out corrections.'],
        ['3. The work must be carried out according to the quality standards as per the Work Order.'],
        ['4. Housekeeping and cleaning work must be done.']
    ];

    // Combine all data
    const finalData = [
        ...headerData,
        ...workItemHeaders,
        ...workItemsData,
        ...notesData
    ];

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(finalData);

    // Set column widths
    ws['!cols'] = [
        { wch: 50 },  // Work Description
        { wch: 20 },  // Planned Labour
        { wch: 15 },  // Start Date
        { wch: 15 },  // Finish Date
        { wch: 15 },  // Work Area
        { wch: 15 },  // Rate
        { wch: 15 }   // Total Amount
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Work Order');

    // Generate file
    const fileName = `Work_Order_${workOrder.workOrderNumber}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
};
