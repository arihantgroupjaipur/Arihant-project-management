import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generatePurchaseOrderPDF = async (purchaseOrders) => {
    if (!purchaseOrders || purchaseOrders.length === 0) {
        throw new Error('No purchase orders to export');
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
    purchaseOrders.forEach((po, entryIndex) => {
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
        doc.text('PURCHASE ORDER', pageWidth / 2, 35, { align: 'center' });

        // Entry details
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        let yPos = 50;

        const addField = (label, value, x) => {
            doc.setFont('helvetica', 'bold');
            doc.text(label + ':', x, yPos);
            doc.setFont('helvetica', 'normal');
            doc.text(value || 'N/A', x + doc.getTextWidth(label + ': ') + 2, yPos);
        };

        const indentNum = po.indentReference?.indentNumber || po.indentReference || 'N/A';

        // Row 1: Headers
        addField('PO No', po.poNumber, 15);
        addField('Date', po.date ? new Date(po.date).toLocaleDateString('en-GB') : '', 80);
        addField('Indent', indentNum, 140);
        yPos += 8;

        addField('Task Ref', po.taskReference, 15);
        addField('Status', po.status, 80);
        yPos += 15;

        // Draw boxes around Vendor and Ship To
        doc.setDrawColor(200);
        doc.rect(15, yPos, 85, 30); // Vendor box
        doc.rect(110, yPos, 85, 30); // Ship To box

        // Vendor details
        doc.setFont('helvetica', 'bold');
        doc.text('Vendor Details', 18, yPos + 6);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(po.vendorName || '-', 18, yPos + 12, { maxWidth: 80 });
        doc.text(po.vendorAddress || '-', 18, yPos + 18, { maxWidth: 80 });
        doc.text(`GST: ${po.vendorGst || '-'}`, 18, yPos + 24);
        doc.text(`Ph: ${po.vendorContactNo || '-'}`, 18, yPos + 28);

        // Ship To Details
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Ship To Details', 113, yPos + 6);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(po.shipToCompanyName || '-', 113, yPos + 12, { maxWidth: 80 });
        doc.text(po.shipToAddress || '-', 113, yPos + 18, { maxWidth: 80 });
        doc.text(`Attn: ${po.shipToContactPerson || '-'}`, 113, yPos + 24);
        doc.text(`Ph: ${po.shipToContactNo || '-'}`, 113, yPos + 28);
        yPos += 40;

        // Items table
        const tableData = [];
        if (po.items && po.items.length > 0) {
            po.items.forEach((item, index) => {
                tableData.push([
                    index + 1,
                    item.materialDescription || '',
                    item.unit || '-',
                    item.quantity || 0,
                    Number(item.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
                    Number(item.taxAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
                    Number(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })
                ]);
            });
        } else {
            tableData.push(['-', 'No items listed', '', '', '', '', '']);
        }

        autoTable(doc, {
            startY: yPos,
            head: [['S.No', 'Description', 'Unit', 'QTY', 'Rate (Rs)', 'Tax (Rs)', 'Amount (Rs)']],
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
                0: { cellWidth: 12, halign: 'center' },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 15, halign: 'center' },
                3: { cellWidth: 15, halign: 'center' },
                4: { cellWidth: 22, halign: 'right' },
                5: { cellWidth: 20, halign: 'right' },
                6: { cellWidth: 30, halign: 'right' }
            },
            margin: { left: 15, right: 15 }
        });

        const finalY = doc.lastAutoTable.finalY || yPos + 20;
        yPos = finalY + 5;

        // Summary block (right aligned underneath table)
        doc.setFontSize(10);
        const rightAlignX = pageWidth - 15;
        const totalW = 30; // Amount column width match

        doc.setFont('helvetica', 'normal');
        doc.text('Subtotal:', rightAlignX - totalW - 5, yPos, { align: 'right' });
        doc.text(Number(po.subTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), rightAlignX, yPos, { align: 'right' });
        yPos += 6;

        doc.text('Freight:', rightAlignX - totalW - 5, yPos, { align: 'right' });
        doc.text(Number(po.freight || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), rightAlignX, yPos, { align: 'right' });
        yPos += 6;

        doc.setFont('helvetica', 'bold');
        doc.text('Grand Total:', rightAlignX - totalW - 5, yPos, { align: 'right' });
        doc.text(Number(po.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), rightAlignX, yPos, { align: 'right' });
        yPos += 15;

        // Comments & Terms
        doc.setFontSize(9);
        if (po.comments) {
            doc.setFont('helvetica', 'bold');
            doc.text('Comments & Instructions:', 15, yPos);
            doc.setFont('helvetica', 'normal');
            yPos += 5;
            const splitComments = doc.splitTextToSize(po.comments, pageWidth - 30);
            doc.text(splitComments, 15, yPos);
            yPos += (splitComments.length * 4) + 5;
        }

        if (po.termsAndConditions) {
            doc.setFont('helvetica', 'bold');
            doc.text('Terms & Conditions:', 15, yPos);
            doc.setFont('helvetica', 'normal');
            yPos += 5;
            const splitTerms = doc.splitTextToSize(po.termsAndConditions, pageWidth - 30);
            doc.text(splitTerms, 15, yPos);
            yPos += (splitTerms.length * 4) + 15;
        }

        // Authorizations Block at bottom
        // Avoid page break for signatures if possible
        if (yPos > pageHeight - 30) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');

        const sigBoxes = [
            { label: 'Prepared By', name: po.preparedBy || '-' },
            { label: 'Requisitioned By', name: po.requisitionedBy || '-' },
            { label: 'Verified By', name: po.verifiedBy || '-' },
            { label: 'Authorized By', name: po.authorizedBy || '-' }
        ];

        const boxWidth = (pageWidth - 30 - 15) / 4; // 3 gaps of 5
        let currentX = 15;

        sigBoxes.forEach(box => {
            // Draw box line at top
            doc.setDrawColor(150);
            doc.line(currentX, yPos, currentX + boxWidth, yPos);

            // Label
            doc.text(box.label.toUpperCase(), currentX + (boxWidth / 2), yPos + 4, { align: 'center' });

            // Name
            doc.setFont('helvetica', 'normal');
            doc.text(box.name, currentX + (boxWidth / 2), yPos + 10, { align: 'center' });
            doc.setFont('helvetica', 'bold');

            currentX += boxWidth + 5;
        });

        // Add page numbers
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(
                `Generated on ${new Date().toLocaleString()} | Page ${i} of ${pageCount}`,
                pageWidth / 2,
                pageHeight - 10,
                { align: 'center' }
            );
        }
    });

    const fileName = `Purchase_Order_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
};
