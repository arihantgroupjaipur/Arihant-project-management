export const generateWorkCompletionCSV = (completion) => {
    if (!completion) {
        throw new Error('No work completion to export');
    }

    const rows = [];

    // Header
    rows.push(['WORK COMPLETION & QC CERTIFICATION FORM']);
    rows.push(['Arihant Dream Infra Projects Ltd. Jaipur']);
    rows.push([]);

    // Basic Information
    rows.push(['Date', new Date(completion.date).toLocaleDateString('en-GB')]);
    rows.push(['Work Order No.', completion.workOrderNumber]);
    rows.push(['Block / Tower', completion.blockTower]);
    rows.push(['Floor / Zone / Unit', completion.floorZoneUnit]);
    rows.push(['Work Trade', completion.workTrade]);
    rows.push(['Specific Activity', completion.specificActivity]);
    rows.push(['Contractor Name', completion.contractorName]);
    rows.push(['Bill No.', completion.billNo || '']);
    rows.push(['Engineer Name', completion.engineerName]);
    rows.push(['Work Start Date', completion.workStartDate ? new Date(completion.workStartDate).toLocaleDateString('en-GB') : '']);
    rows.push(['Work End Date', completion.workEndDate ? new Date(completion.workEndDate).toLocaleDateString('en-GB') : '']);
    rows.push(['Total Work Duration', completion.totalWorkDuration || '']);
    rows.push([]);

    // Work Execution Summary
    rows.push(['WORK EXECUTION SUMMARY']);
    rows.push(['Summary', 'Start Date', 'End Date', 'Time Delay', 'Actual', 'Completion %']);

    if (completion.workExecutionRows && completion.workExecutionRows.length > 0) {
        completion.workExecutionRows.forEach(row => {
            rows.push([
                row.summary || '',
                row.startDate ? new Date(row.startDate).toLocaleDateString('en-GB') : '',
                row.endDate ? new Date(row.endDate).toLocaleDateString('en-GB') : '',
                row.timeDelay || '',
                row.actual || '',
                row.completionPercent || ''
            ]);
        });
    }
    rows.push([]);

    // Pre-Work Checklist
    rows.push(['PRE-WORK CHECKLIST']);
    rows.push(['Materials Checked & Approved', completion.preWorkChecklist?.materialsChecked ? 'Yes' : 'No']);
    rows.push(['Lines, Levels & Markings Done', completion.preWorkChecklist?.linesLevelsMarkings ? 'Yes' : 'No']);
    rows.push(['Services Coordinated', completion.preWorkChecklist?.servicesCoordinated ? 'Yes' : 'No']);
    rows.push(['Surface Prepared', completion.preWorkChecklist?.surfacePrepared ? 'Yes' : 'No']);
    rows.push([]);

    // During Work Checklist
    rows.push(['DURING WORK CHECKLIST']);
    rows.push(['Workmanship Quality Maintained', completion.duringWorkChecklist?.workmanshipQuality ? 'Yes' : 'No']);
    rows.push(['Approved Material Ratio Used', completion.duringWorkChecklist?.approvedMaterialRatio ? 'Yes' : 'No']);
    rows.push(['Alignment & Level Verified', completion.duringWorkChecklist?.alignmentLevel ? 'Yes' : 'No']);
    rows.push(['Safety & Housekeeping Followed', completion.duringWorkChecklist?.safetyHousekeeping ? 'Yes' : 'No']);
    rows.push([]);

    // Post-Work Checklist
    rows.push(['POST-WORK CHECKLIST']);
    rows.push(['Finishing Quality Checked', completion.postWorkChecklist?.finishingQuality ? 'Yes' : 'No']);
    rows.push(['No Cracks / Leakage / Unevenness', completion.postWorkChecklist?.noCracksLeakage ? 'Yes' : 'No']);
    rows.push(['Curing Done', completion.postWorkChecklist?.curingDone ? 'Yes' : 'No']);
    rows.push(['Debris Cleared', completion.postWorkChecklist?.debrisCleared ? 'Yes' : 'No']);
    rows.push(['Final Photos Attached', completion.postWorkChecklist?.finalPhotos ? 'Yes' : 'No']);
    rows.push([]);

    // QC Remarks
    rows.push(['QC REMARKS']);
    rows.push([completion.qcRemarks || '']);
    rows.push([]);

    // Confirmation
    rows.push(['Contractor Confirmation']);
    rows.push(['Confirmation Date', completion.confirmationDate ? new Date(completion.confirmationDate).toLocaleDateString('en-GB') : '']);

    // Convert to CSV string
    const csvContent = rows.map(row =>
        row.map(cell => {
            // Escape quotes and wrap in quotes if contains comma, quote, or newline
            const cellStr = String(cell || '');
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
        }).join(',')
    ).join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const fileName = `Work_Completion_${completion.workOrderNumber}_${new Date().toISOString().split('T')[0]}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    // Cleanup
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);
};
