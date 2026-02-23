import * as XLSX from 'xlsx';

export const generateWorkCompletionExcel = (completion) => {
    if (!completion) {
        throw new Error('No work completion to export');
    }

    // Create a new workbook
    const wb = XLSX.utils.book_new();

    // Prepare basic info data
    const basicInfoData = [
        ['WORK COMPLETION & QC CERTIFICATION FORM'],
        ['Arihant Dream Infra Projects Ltd. Jaipur'],
        [],
        ['Date', new Date(completion.date).toLocaleDateString('en-GB')],
        ['Work Order No.', completion.workOrderNumber],
        [],
        ['Block / Tower', completion.blockTower],
        ['Floor / Zone / Unit', completion.floorZoneUnit],
        ['Work Trade', completion.workTrade],
        ['Specific Activity', completion.specificActivity],
        ['Contractor Name', completion.contractorName],
        ['Bill No.', completion.billNo || ''],
        ['Engineer Name', completion.engineerName],
        ['Work Start Date', completion.workStartDate ? new Date(completion.workStartDate).toLocaleDateString('en-GB') : ''],
        ['Work End Date', completion.workEndDate ? new Date(completion.workEndDate).toLocaleDateString('en-GB') : ''],
        ['Total Work Duration', completion.totalWorkDuration || ''],
        []
    ];

    // Work Execution Summary
    basicInfoData.push(['WORK EXECUTION SUMMARY']);
    basicInfoData.push(['Summary', 'Start Date', 'End Date', 'Time Delay', 'Actual', 'Completion %']);

    if (completion.workExecutionRows && completion.workExecutionRows.length > 0) {
        completion.workExecutionRows.forEach(row => {
            basicInfoData.push([
                row.summary || '',
                row.startDate ? new Date(row.startDate).toLocaleDateString('en-GB') : '',
                row.endDate ? new Date(row.endDate).toLocaleDateString('en-GB') : '',
                row.timeDelay || '',
                row.actual || '',
                row.completionPercent || ''
            ]);
        });
    }

    basicInfoData.push([]);

    // Pre-Work Checklist
    basicInfoData.push(['PRE-WORK CHECKLIST']);
    basicInfoData.push(['Materials Checked & Approved', completion.preWorkChecklist?.materialsChecked ? 'Yes' : 'No']);
    basicInfoData.push(['Lines, Levels & Markings Done', completion.preWorkChecklist?.linesLevelsMarkings ? 'Yes' : 'No']);
    basicInfoData.push(['Services Coordinated', completion.preWorkChecklist?.servicesCoordinated ? 'Yes' : 'No']);
    basicInfoData.push(['Surface Prepared', completion.preWorkChecklist?.surfacePrepared ? 'Yes' : 'No']);
    basicInfoData.push([]);

    // During Work Checklist
    basicInfoData.push(['DURING WORK CHECKLIST']);
    basicInfoData.push(['Workmanship Quality Maintained', completion.duringWorkChecklist?.workmanshipQuality ? 'Yes' : 'No']);
    basicInfoData.push(['Approved Material Ratio Used', completion.duringWorkChecklist?.approvedMaterialRatio ? 'Yes' : 'No']);
    basicInfoData.push(['Alignment & Level Verified', completion.duringWorkChecklist?.alignmentLevel ? 'Yes' : 'No']);
    basicInfoData.push(['Safety & Housekeeping Followed', completion.duringWorkChecklist?.safetyHousekeeping ? 'Yes' : 'No']);
    basicInfoData.push([]);

    // Post-Work Checklist
    basicInfoData.push(['POST-WORK CHECKLIST']);
    basicInfoData.push(['Finishing Quality Checked', completion.postWorkChecklist?.finishingQuality ? 'Yes' : 'No']);
    basicInfoData.push(['No Cracks / Leakage / Unevenness', completion.postWorkChecklist?.noCracksLeakage ? 'Yes' : 'No']);
    basicInfoData.push(['Curing Done', completion.postWorkChecklist?.curingDone ? 'Yes' : 'No']);
    basicInfoData.push(['Debris Cleared', completion.postWorkChecklist?.debrisCleared ? 'Yes' : 'No']);
    basicInfoData.push(['Final Photos Attached', completion.postWorkChecklist?.finalPhotos ? 'Yes' : 'No']);
    basicInfoData.push([]);

    // QC Remarks
    basicInfoData.push(['QC REMARKS']);
    basicInfoData.push([completion.qcRemarks || '']);
    basicInfoData.push([]);

    // Confirmation
    basicInfoData.push(['Contractor Confirmation']);
    basicInfoData.push(['Confirmation Date', completion.confirmationDate ? new Date(completion.confirmationDate).toLocaleDateString('en-GB') : '']);

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(basicInfoData);

    // Set column widths
    ws['!cols'] = [
        { wch: 35 },
        { wch: 20 },
        { wch: 20 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 }
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Work Completion');

    // Generate file name
    const fileName = `Work_Completion_${completion.workOrderNumber}_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Write file
    XLSX.writeFile(wb, fileName);
};
