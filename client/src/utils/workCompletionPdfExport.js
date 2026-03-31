import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const fmtTs = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    if (isNaN(dt)) return '—';
    const ist = new Date(dt.getTime() + 5.5 * 60 * 60 * 1000);
    const dd = String(ist.getUTCDate()).padStart(2,'0');
    const mm = String(ist.getUTCMonth()+1).padStart(2,'0');
    const yyyy = ist.getUTCFullYear();
    const hh = String(ist.getUTCHours()).padStart(2,'0');
    const min = String(ist.getUTCMinutes()).padStart(2,'0');
    const ss = String(ist.getUTCSeconds()).padStart(2,'0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
};

export const generateWorkCompletionPDF = async (completion) => {
    if (!completion) {
        throw new Error('No work completion to export');
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Load logo image
    let logoData = null;
    try {
        const logoPath = '/arihantlogo.png';
        const response = await fetch(logoPath);
        const blob = await response.blob();
        logoData = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.warn('Logo could not be loaded:', error);
    }

    let yPos = 10;

    // Add logo at top left
    if (logoData) {
        try {
            doc.addImage(logoData, 'PNG', 12, yPos, 18, 18);
        } catch (error) {
            console.warn('Logo could not be added to PDF:', error);
        }
    }

    // Company Header - Title (centered)
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Arihant Dream Infra Projects Ltd. Jaipur', pageWidth / 2, yPos + 6, { align: 'center' });

    // Company Address
    yPos += 12;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    const addressLine1 = '2nd Floor, Class Of Pearl, Income Tax Colony, Tonk Road, Durgapura, Jaipur, Rajasthan, 302018 (Pan - AAJCA5226A)';
    doc.text(addressLine1, pageWidth / 2, yPos, { align: 'center' });

    yPos += 4;
    const addressLine2 = 'CIN No. U7010RJ2011PLC035322';
    doc.text(addressLine2, pageWidth / 2, yPos, { align: 'center' });

    // Form Title
    yPos += 8;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('WORK COMPLETION & QC CERTIFICATION FORM', pageWidth / 2, yPos, { align: 'center' });

    // Website and Email info
    yPos += 8;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Website: www.arihantgroupjaipur.com', 15, yPos);

    // Date (right side)
    doc.setFont('helvetica', 'bold');
    doc.text('Date', pageWidth - 60, yPos);
    doc.setFont('helvetica', 'normal');
    const formattedDate = fmtTs(completion.createdAt || completion.date);
    doc.text(`: ${formattedDate}`, pageWidth - 45, yPos);

    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.text('Email : info@arihantgroupjaipur.com - Legacy@arihantgroupjaipur.com', 15, yPos);

    // Work Order Number (right side)
    doc.setFont('helvetica', 'bold');
    doc.text('Work Order No.', pageWidth - 60, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(`: ${completion.workOrderNumber}`, pageWidth - 35, yPos);

    // Form fields section
    yPos += 8;
    const leftMargin = 15;
    const fieldWidth = pageWidth - 30;

    // Helper function to draw a row with 3 fields
    const drawRow3 = (fields, y, height = 8) => {
        const colWidth = fieldWidth / 3;
        fields.forEach((field, idx) => {
            const x = leftMargin + (idx * colWidth);
            doc.rect(x, y, colWidth, height);

            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text(field.label, x + 2, y + 3.5);

            doc.setFont('helvetica', 'normal');
            const valueText = field.value || '';
            doc.text(valueText, x + 2, y + 6.5);
        });
        return y + height;
    };

    // Row 1: Block/Tower, Floor/Zone/Unit, Work Trade
    yPos = drawRow3([
        { label: 'Block / Tower', value: completion.blockTower },
        { label: 'Floor / Zone / Unit', value: completion.floorZoneUnit },
        { label: 'Work Trade', value: completion.workTrade }
    ], yPos);

    // Row 2: Specific Activity, Contractor Name, Bill No
    yPos = drawRow3([
        { label: 'Specific Activity', value: completion.specificActivity },
        { label: 'Contractor Name', value: completion.contractorName },
        { label: 'Bill No.', value: completion.billNo }
    ], yPos);

    // Row 3: Engineer Name, Work Start Date, Work End Date
    yPos = drawRow3([
        { label: 'Engineer Name', value: completion.engineerName },
        { label: 'Work Start Date', value: completion.workStartDate ? new Date(completion.workStartDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '' },
        { label: 'Work End Date', value: completion.workEndDate ? new Date(completion.workEndDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '' }
    ], yPos);

    // Row 4: Total Work Duration (spans 2 cols)
    const colWidth = fieldWidth / 3;
    doc.rect(leftMargin, yPos, colWidth * 2, 8);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Total Work Duration', leftMargin + 2, yPos + 3.5);
    doc.setFont('helvetica', 'normal');
    doc.text(completion.totalWorkDuration || '', leftMargin + 2, yPos + 6.5);
    yPos += 8;

    // Work Execution Summary Table
    yPos += 3;
    const workExecutionData = [];
    if (completion.workExecutionRows && completion.workExecutionRows.length > 0) {
        completion.workExecutionRows.forEach(row => {
            workExecutionData.push([
                row.summary || '',
                row.startDate ? new Date(row.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '',
                row.endDate ? new Date(row.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '',
                row.timeDelay || '',
                row.actual || '',
                row.completionPercent ? `${row.completionPercent}%` : ''
            ]);
        });
    }

    // Add empty row if needed
    if (workExecutionData.length === 0) {
        workExecutionData.push(['', '', '', '', '', '']);
    }

    autoTable(doc, {
        startY: yPos,
        head: [['Work Execution Summary', 'Start Date', 'Work End Date', 'Time Delay', 'Actual', 'Completion %']],
        body: workExecutionData,
        theme: 'grid',
        headStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            fontSize: 7,
            halign: 'center',
            lineWidth: 0.5,
            lineColor: [0, 0, 0]
        },
        bodyStyles: {
            textColor: [0, 0, 0],
            fontSize: 7,
            cellPadding: 2,
            lineWidth: 0.5,
            lineColor: [0, 0, 0]
        },
        columnStyles: {
            0: { cellWidth: 50 },
            1: { cellWidth: 25, halign: 'center' },
            2: { cellWidth: 25, halign: 'center' },
            3: { cellWidth: 25, halign: 'center' },
            4: { cellWidth: 25, halign: 'center' },
            5: { cellWidth: 20, halign: 'center' }
        },
        margin: { left: 15, right: 15 }
    });

    // Three Checklists Section
    yPos = doc.lastAutoTable.finalY + 5;
    const checkboxSize = 3;
    const checklistColWidth = fieldWidth / 3;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');

    // Headers for three checklists
    const checklistY = yPos;
    doc.text('Pre-Work Checklist', leftMargin + checklistColWidth / 2, checklistY, { align: 'center' });
    doc.text('During Work Checklist', leftMargin + checklistColWidth + checklistColWidth / 2, checklistY, { align: 'center' });
    doc.text('Post-Work Checklist', leftMargin + (2 * checklistColWidth) + checklistColWidth / 2, checklistY, { align: 'center' });

    yPos = checklistY + 5;

    // Pre-Work Checklist items
    const preWorkItems = [
        { key: 'materialsChecked', label: 'Materials Checked & Approved' },
        { key: 'linesLevelsMarkings', label: 'Lines, Levels & Markings Done' },
        { key: 'servicesCoordinated', label: 'Services Coordinated' },
        { key: 'surfacePrepared', label: 'Surface Prepared' }
    ];

    // During Work Checklist items
    const duringWorkItems = [
        { key: 'workmanshipQuality', label: 'Workmanship Quality Maintained' },
        { key: 'approvedMaterialRatio', label: 'Approved Material Ratio Used' },
        { key: 'alignmentLevel', label: 'Alignment & Level Verified' },
        { key: 'safetyHousekeeping', label: 'Safety & Housekeeping Followed' }
    ];

    // Post-Work Checklist items
    const postWorkItems = [
        { key: 'finishingQuality', label: 'Finishing Quality Checked' },
        { key: 'noCracksLeakage', label: 'No Cracks / Leakage / Unevenness' },
        { key: 'curingDone', label: 'Curing Done' },
        { key: 'debrisCleared', label: 'Debris Cleared' },
        { key: 'finalPhotos', label: 'Final photos attached' }
    ];

    const maxItems = Math.max(preWorkItems.length, duringWorkItems.length, postWorkItems.length);

    // Helper: draw a ✓ inside the checkbox box using lines
    const drawCheckmark = (x, y, size) => {
        doc.setDrawColor(0, 150, 0); // green
        doc.setLineWidth(0.6);
        doc.line(x + 0.5, y + size / 2, x + size * 0.4, y + size - 0.5);
        doc.line(x + size * 0.4, y + size - 0.5, x + size - 0.3, y + 0.5);
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.2);
    };

    // Helper: draw ✗ for unchecked items
    const drawCross = (x, y, size) => {
        doc.setDrawColor(200, 0, 0); // red
        doc.setLineWidth(0.6);
        doc.line(x + 0.5, y + 0.5, x + size - 0.5, y + size - 0.5);
        doc.line(x + size - 0.5, y + 0.5, x + 0.5, y + size - 0.5);
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.2);
    };

    doc.setFontSize(7);
    for (let i = 0; i < maxItems; i++) {
        const itemY = yPos + (i * 5);

        // Pre-Work Checklist
        if (i < preWorkItems.length) {
            const item = preWorkItems[i];
            const isChecked = completion.preWorkChecklist?.[item.key];

            doc.setLineWidth(0.3);
            doc.rect(leftMargin + 2, itemY, checkboxSize, checkboxSize);
            if (isChecked) {
                drawCheckmark(leftMargin + 2, itemY, checkboxSize);
            } else {
                drawCross(leftMargin + 2, itemY, checkboxSize);
            }
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.text(item.label, leftMargin + 7, itemY + 2.5);
        }

        // During Work Checklist
        if (i < duringWorkItems.length) {
            const item = duringWorkItems[i];
            const isChecked = completion.duringWorkChecklist?.[item.key];
            const x = leftMargin + checklistColWidth;

            doc.setLineWidth(0.3);
            doc.rect(x + 2, itemY, checkboxSize, checkboxSize);
            if (isChecked) {
                drawCheckmark(x + 2, itemY, checkboxSize);
            } else {
                drawCross(x + 2, itemY, checkboxSize);
            }
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.text(item.label, x + 7, itemY + 2.5);
        }

        // Post-Work Checklist
        if (i < postWorkItems.length) {
            const item = postWorkItems[i];
            const isChecked = completion.postWorkChecklist?.[item.key];
            const x = leftMargin + (2 * checklistColWidth);

            doc.setLineWidth(0.3);
            doc.rect(x + 2, itemY, checkboxSize, checkboxSize);
            if (isChecked) {
                drawCheckmark(x + 2, itemY, checkboxSize);
            } else {
                drawCross(x + 2, itemY, checkboxSize);
            }
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.text(item.label, x + 7, itemY + 2.5);
        }
    }

    // QC Remarks section
    yPos = yPos + (maxItems * 5) + 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('QC Remarks By Engineer', leftMargin, yPos);

    yPos += 3;
    const remarksHeight = 15;
    doc.rect(leftMargin, yPos, fieldWidth, remarksHeight);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    if (completion.qcRemarks) {
        const remarksLines = doc.splitTextToSize(completion.qcRemarks, fieldWidth - 4);
        doc.text(remarksLines, leftMargin + 2, yPos + 3);
    }

    // Contractor Confirmation Section
    yPos += remarksHeight + 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const confirmationText = 'I confirm the work is completed as per approved drawings & specifications.';
    doc.text(confirmationText, leftMargin, yPos);

    yPos += 5;
    const signatureBoxHeight = 20;
    const signatureBoxWidth = (fieldWidth - 5) / 2;

    // Left box - Statement and checkbox
    doc.rect(leftMargin, yPos, signatureBoxWidth, signatureBoxHeight);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('Contractor Confirmation', leftMargin + 2, yPos + 3);

    // I Agree checkbox - show if user confirmed
    const checkX = leftMargin + 2;
    const checkY = yPos + 8;
    const agreeCheckboxSize = 3;
    doc.rect(checkX, checkY, agreeCheckboxSize, agreeCheckboxSize);

    // Only show tick mark if the form was actually submitted with confirmation
    if (completion.contractorSignature || completion.iAgree) {
        drawCheckmark(checkX, checkY, agreeCheckboxSize);
    }

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('I Agree', checkX + 5, checkY + 2.5);

    // Right box - Signature
    const sigX = leftMargin + signatureBoxWidth + 5;
    doc.rect(sigX, yPos, signatureBoxWidth, signatureBoxHeight);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('Signature Of Contractor', sigX + signatureBoxWidth / 2, yPos + 3, { align: 'center' });

    // Add signature if available
    if (completion.contractorSignature) {
        try {
            doc.addImage(completion.contractorSignature, 'PNG', sigX + 2, yPos + 5, signatureBoxWidth - 4, signatureBoxHeight - 7);
        } catch (error) {
            console.warn('Contractor signature could not be added:', error);
        }
    }

    // Date below signature
    yPos += signatureBoxHeight + 2;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('Date', sigX + 2, yPos);
    doc.setFont('helvetica', 'normal');
    const confirmationDateFormatted = completion.confirmationDate ? new Date(completion.confirmationDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '';
    doc.text(`: ${confirmationDateFormatted}`, sigX + 10, yPos);

    // Save the PDF
    const fileName = `Work_Completion_Certification_${completion.workOrderNumber}_${new Date().toISOString().split('T')[0]}.pdf`;

    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    // Cleanup
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);
};
