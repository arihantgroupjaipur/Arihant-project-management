import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateWorkOrderPDF = async (workOrder) => {
    if (!workOrder) {
        throw new Error('No work order to export');
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

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

    // Add logo at top left with larger size
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
    
    let isRqube = false;
    if (workOrder.shipToCompanyName === "RQUBE BUILDCON PRIVATE LIMITED" || 
        workOrder.contactPersonName === "RQUBE BUILDCON PRIVATE LIMITED" ||
        workOrder.addressLocation === "RQUBE") {
        isRqube = true;
    }

    const companyName = isRqube ? 'RQUBE BUILDCON PRIVATE LIMITED' : 'Arihant Dream Infra Projects Ltd. Jaipur';
    doc.text(companyName, pageWidth / 2, yPos + 6, { align: 'center' });

    // Company Address
    yPos += 12;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    const addressLine1 = '2nd Floor, Class Of Pearl, Income Tax Colony, Tonk Road, Durgapura, Jaipur, Rajasthan, 302018 (Pan - AAJCA5226A)';
    doc.text(addressLine1, pageWidth / 2, yPos, { align: 'center' });

    yPos += 4;
    const addressLine2 = 'CIN No. U7010RJ2011PLC035322';
    doc.text(addressLine2, pageWidth / 2, yPos, { align: 'center' });

    // Work Order Title
    yPos += 8;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Work Order', pageWidth / 2, yPos, { align: 'center' });

    // Website and Email info
    yPos += 8;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Website: www.arihantgroupjaipur.com', 15, yPos);

    // Date and Work Order Number (right side)
    doc.setFont('helvetica', 'bold');
    doc.text('Date', pageWidth - 60, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(`: ${new Date(workOrder.date).toLocaleDateString('en-GB')}`, pageWidth - 45, yPos);

    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.text('Email : info@arihantgroupjaipur.com - Legacy@arihantgroupjaipur.com', 15, yPos);

    doc.setFont('helvetica', 'bold');
    doc.text('Work Order Number', pageWidth - 60, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(`: ${workOrder.workOrderNumber}`, pageWidth - 30, yPos);

    // Form fields section
    yPos += 6;
    const leftMargin = 15;
    const rightMargin = pageWidth - 15;
    const fieldWidth = pageWidth - 30;

    // Helper function to draw field
    const drawField = (label, value, y, height = 8) => {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.rect(leftMargin, y, fieldWidth, height);
        doc.text(label, leftMargin + 2, y + 5);

        doc.setFont('helvetica', 'normal');
        const valueText = value || '';
        doc.text(valueText, leftMargin + 60, y + 5);
        return y + height;
    };

    yPos = drawField('Main Work Order Reference', workOrder.mainWorkOrderReference || '', yPos);
    yPos = drawField('Address/Location', workOrder.addressLocation || '', yPos);
    yPos = drawField('Contact Person Name', workOrder.contactPersonName || '', yPos);
    yPos = drawField('Work Location Name', workOrder.workLocationName || '', yPos);
    yPos = drawField('Store Keeper & Supervisor Name', workOrder.storeKeeperSupervisorName || '', yPos);
    yPos = drawField('Comments / Special Instr.', workOrder.comments || '', yPos);

    // Work Items Table
    yPos += 5;
    const tableData = [];
    if (workOrder.workItems && workOrder.workItems.length > 0) {
        workOrder.workItems.forEach(item => {
            tableData.push([
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

    // Add empty rows if needed (minimum 3 rows for form look)
    while (tableData.length < 3) {
        tableData.push(['', '', '', '', '', '', '']);
    }

    autoTable(doc, {
        startY: yPos,
        head: [[
            'Work Description',
            'No Of Planned Labour',
            'Work Start Date',
            'Work Finish Date',
            'Work Area',
            'Rate',
            'Total Amount'
        ]],
        body: tableData,
        theme: 'grid',
        headStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            fontSize: 8,
            halign: 'center',
            lineWidth: 0.5,
            lineColor: [0, 0, 0]
        },
        bodyStyles: {
            textColor: [0, 0, 0],
            fontSize: 8,
            cellPadding: 2,
            lineWidth: 0.5,
            lineColor: [0, 0, 0]
        },
        columnStyles: {
            0: { cellWidth: 45 },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 22, halign: 'center' },
            3: { cellWidth: 22, halign: 'center' },
            4: { cellWidth: 20, halign: 'center' },
            5: { cellWidth: 20, halign: 'center' },
            6: { cellWidth: 22, halign: 'center' }
        },
        margin: { left: 15, right: 15 },
        styles: {
            lineWidth: 0.5,
            lineColor: [0, 0, 0]
        }
    });

    // Additional Notes section - render Hindi text as image to support Devanagari script
    const finalY = doc.lastAutoTable.finalY || yPos + 40;

    // Create canvas to render Hindi text
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 120;
    const ctx = canvas.getContext('2d');

    // Set background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw border
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    // Set font and draw Hindi text
    ctx.fillStyle = 'black';
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.fillText('अतिरिक्त नोट :', 10, 30);

    ctx.font = '18px Arial, sans-serif';
    ctx.fillText('1. बिल जमा करते समय कार्य आदेश (Work Order) की प्रति संलग्न करना आवश्यक है।', 10, 55);
    ctx.fillText('2. कार्य में किसी भी प्रकार की त्रुटि का दायित्व ठेकेदार का है और सुधार का कार्य करना है।', 10, 75);
    ctx.fillText('3. कार्य का वर्क आर्डर के अनुसार गुणवत्ता मानक के अनुसार करना है।', 10, 95);
    ctx.fillText('4. हाउसकीपिंग और सफाई का कार्य करना है।', 10, 115);

    // Convert canvas to image and add to PDF
    const hindiNotesImage = canvas.toDataURL('image/png');
    doc.addImage(hindiNotesImage, 'PNG', 12, finalY + 3, pageWidth - 24, 18);

    // Signature section
    const signatureY = finalY + 27;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');

    // Three signature boxes
    const boxWidth = (pageWidth - 40) / 3;
    const boxHeight = 30;

    // Contractor signature
    doc.rect(15, signatureY, boxWidth, boxHeight);
    doc.text('Signature Of Contractor', 15 + boxWidth / 2, signatureY + boxHeight + 5, { align: 'center' });
    if (workOrder.signatures?.contractor) {
        try {
            doc.addImage(workOrder.signatures.contractor, 'PNG', 17, signatureY + 2, boxWidth - 4, boxHeight - 4);
        } catch (error) {
            console.warn('Contractor signature could not be added:', error);
        }
    }

    // Engineer signature
    const engineerX = 15 + boxWidth + 5;
    doc.rect(engineerX, signatureY, boxWidth, boxHeight);
    doc.text('Signature Of Site Engineer', engineerX + boxWidth / 2, signatureY + boxHeight + 5, { align: 'center' });
    if (workOrder.signatures?.engineer) {
        try {
            doc.addImage(workOrder.signatures.engineer, 'PNG', engineerX + 2, signatureY + 2, boxWidth - 4, boxHeight - 4);
        } catch (error) {
            console.warn('Engineer signature could not be added:', error);
        }
    }

    // Supervisor signature
    const supervisorX = engineerX + boxWidth + 5;
    doc.rect(supervisorX, signatureY, boxWidth, boxHeight);
    doc.text('Signature Of Site Supervisor', supervisorX + boxWidth / 2, signatureY + boxHeight + 5, { align: 'center' });
    if (workOrder.signatures?.supervisor) {
        try {
            doc.addImage(workOrder.signatures.supervisor, 'PNG', supervisorX + 2, signatureY + 2, boxWidth - 4, boxHeight - 4);
        } catch (error) {
            console.warn('Supervisor signature could not be added:', error);
        }
    }

    // Save the PDF
    const fileName = `Work_Order_${workOrder.workOrderNumber}_${new Date().toISOString().split('T')[0]}.pdf`;

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
