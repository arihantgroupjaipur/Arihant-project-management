export const generateWorkOrderCSV = (workOrder) => {
    if (!workOrder) {
        throw new Error('No work order to export');
    }

    // Helper function to escape CSV values
    const escapeCSV = (value) => {
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
    };

    // Build CSV content
    const rows = [];

    // Header information
    rows.push(['Arihant Dream Infra Projects Ltd. Jaipur']);
    rows.push(['2nd Floor, Class Of Pearl, Income Tax Colony, Tonk Road, Durgapura, Jaipur, Rajasthan, 302018']);
    rows.push(['CIN No. U7010RJ2011PLC035322']);
    rows.push([]);
    rows.push(['WORK ORDER']);
    rows.push([]);
    rows.push(['Work Order Number:', workOrder.workOrderNumber]);
    rows.push(['Date:', new Date(workOrder.date).toLocaleDateString('en-GB')]);
    rows.push(['Main Work Order Reference:', workOrder.mainWorkOrderReference || '']);
    rows.push(['Address/Location:', workOrder.addressLocation || '']);
    rows.push(['Contact Person Name:', workOrder.contactPersonName || '']);
    rows.push(['Work Location Name:', workOrder.workLocationName || '']);
    rows.push(['Store Keeper & Supervisor Name:', workOrder.storeKeeperSupervisorName || '']);
    rows.push([]);

    // Work items table
    rows.push(['Work Description', 'No Of Planned Labour', 'Work Start Date', 'Work Finish Date', 'Work Area', 'Rate', 'Total Amount']);

    if (workOrder.workItems && workOrder.workItems.length > 0) {
        workOrder.workItems.forEach(item => {
            rows.push([
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
    rows.push([]);
    rows.push(['Additional Notes:']);
    rows.push(['1. It is mandatory to attach a copy of the Work Order while submitting the bill.']);
    rows.push(['2. The contractor is responsible for any errors in the work and must carry out corrections.']);
    rows.push(['3. The work must be carried out according to the quality standards as per the Work Order.']);
    rows.push(['4. Housekeeping and cleaning work must be done.']);

    // Convert to CSV string
    const csvContent = rows.map(row => row.map(escapeCSV).join(',')).join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Work_Order_${workOrder.workOrderNumber}_${new Date().toISOString().split('T')[0]}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    // Cleanup
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);
};
