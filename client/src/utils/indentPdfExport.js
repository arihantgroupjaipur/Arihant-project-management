import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateIndentPDF = async (indents) => {
    if (!indents || indents.length === 0) {
        throw new Error('No indents to export');
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

    // Process each entry as a separate page
    indents.forEach((indent, entryIndex) => {
        if (entryIndex > 0) {
            doc.addPage();
        }

        // Add logo at top left
        if (logoData) {
            try {
                doc.addImage(logoData, 'PNG', 15, 10, 25, 25);
            } catch (error) {
                console.warn('Logo could not be added to PDF:', error);
            }
        }

        // Add date at top right
        doc.setFontSize(10);
        doc.setTextColor(100);
        const today = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        doc.text(today, pageWidth - 15, 15, { align: 'right' });

        // Title
        doc.setFontSize(20);
        doc.setTextColor(0);
        doc.setFont('helvetica', 'bold');
        doc.text('Arihant Dream Infra Projects Ltd.', pageWidth / 2, 25, { align: 'center' });

        doc.setFontSize(14);
        doc.text('MATERIAL INDENT / SITE REQUIREMENT', pageWidth / 2, 35, { align: 'center' });

        // Entry details
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        let yPos = 50;

        const addField = (label, value, x) => {
            doc.setFont('helvetica', 'bold');
            doc.text(label + ':', x, yPos);
            doc.setFont('helvetica', 'normal');
            doc.text(value || 'N/A', x + doc.getTextWidth(label + ': ') + 2, yPos);
        };

        addField('Indent No', indent.indentNumber, 20);
        addField('Date', indent.date ? new Date(indent.date).toLocaleDateString('en-GB') : '', 120);
        yPos += 10;

        addField('Site Name', indent.siteName, 20);
        addField('Task Ref', indent.taskReference, 120);
        yPos += 10;

        addField('Material Group', indent.materialGroup, 20);
        addField('Priority', indent.priority, 120);
        yPos += 10;

        addField('Site Engineer', indent.siteEngineerName, 20);
        addField('Store Manager', indent.storeManagerName, 120);
        yPos += 15;

        // Add Materials header
        doc.setFont('helvetica', 'bold');
        doc.text('Material Requirements List', 20, yPos);
        yPos += 5;

        // Create table data from indent items
        const tableData = [];
        if (indent.items && indent.items.length > 0) {
            indent.items.forEach((item, index) => {
                tableData.push([
                    index + 1,
                    item.materialDescription || '',
                    item.unit || '-',
                    item.requiredQuantity || 0,
                    item.orderQuantity || 0
                ]);
            });
        } else {
            tableData.push(['-', 'No items listed', '', '', '']);
        }

        // Generate table
        autoTable(doc, {
            startY: yPos,
            head: [['S.No', 'Material Description', 'Unit', 'Req. Qty', 'Order Qty']],
            body: tableData,
            theme: 'grid',
            headStyles: {
                fillColor: [240, 240, 240],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                halign: 'center'
            },
            bodyStyles: {
                textColor: [0, 0, 0]
            },
            columnStyles: {
                0: { cellWidth: 15, halign: 'center' },
                1: { cellWidth: 85 },
                2: { cellWidth: 20, halign: 'center' },
                3: { cellWidth: 25, halign: 'center' },
                4: { cellWidth: 25, halign: 'center' }
            },
            margin: { left: 20, right: 20 }
        });

        // Signature section
        const finalY = doc.lastAutoTable.finalY || yPos + 40;
        const sigBoxTop = finalY + 10;
        const sigBoxHeight = 35;
        const sigImgH = 22;
        const sigImgW = 50;

        // Three columns: Store Manager | Purchase Manager | Site Engineer
        const col1X = 15;
        const col2X = pageWidth / 2 - 30;
        const col3X = pageWidth - 75;
        const colW = 60;

        // Draw boxes
        doc.setDrawColor(180);
        doc.setLineWidth(0.3);
        [col1X, col2X, col3X].forEach(x => {
            doc.rect(x, sigBoxTop, colW, sigBoxHeight);
        });

        // Helper: detect image format from data URL
        const getImgFormat = (dataUrl) => {
            if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) return 'JPEG';
            if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
            return 'PNG';
        };

        // Embed Store Manager signature image if available
        if (indent.storeManagerSignature && indent.storeManagerSignature.startsWith('data:image')) {
            try {
                doc.addImage(indent.storeManagerSignature, getImgFormat(indent.storeManagerSignature), col1X + 5, sigBoxTop + 2, sigImgW, sigImgH);
            } catch (e) { console.error('Store Manager sig error:', e); }
        }

        // Embed Site Engineer signature image if available
        if (indent.siteEngineerSignature && indent.siteEngineerSignature.startsWith('data:image')) {
            try {
                doc.addImage(indent.siteEngineerSignature, getImgFormat(indent.siteEngineerSignature), col3X + 5, sigBoxTop + 2, sigImgW, sigImgH);
            } catch (e) { console.error('Site Engineer sig error:', e); }
        }


        // Labels below boxes
        const labelY = sigBoxTop + sigBoxHeight + 5;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(50);
        doc.text('Store Manager', col1X + colW / 2, labelY, { align: 'center' });
        doc.text(indent.storeManagerName || '', col1X + colW / 2, labelY + 4, { align: 'center' });

        doc.text('Purchase Manager', col2X + colW / 2, labelY, { align: 'center' });

        doc.text('Site Engineer', col3X + colW / 2, labelY, { align: 'center' });
        doc.text(indent.siteEngineerName || '', col3X + colW / 2, labelY + 4, { align: 'center' });

        // Footer page number
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150);
        doc.text(
            `Page ${entryIndex + 1} of ${indents.length}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
        );
    });

    const fileName = `Indent_Requirements_${new Date().toISOString().split('T')[0]}.pdf`;

    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);
};
