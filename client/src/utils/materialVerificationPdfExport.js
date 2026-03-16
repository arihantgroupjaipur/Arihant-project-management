import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export const generateMaterialVerificationPdf = async (pos, showLogo = true) => {
    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;

        let logoData = null;
        if (showLogo) {
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
        }

        let yPos = 10;

        pos.forEach((po, index) => {
            if (index > 0) {
                doc.addPage();
                yPos = 10;
            }

            // Header - Logo
            if (logoData) {
                try {
                    doc.addImage(logoData, 'PNG', 12, yPos, 18, 18);
                } catch (error) {
                    console.warn('Logo could not be added to PDF:', error);
                }
            }

            // Company Title and Header
            doc.setFontSize(13);
            doc.setFont("helvetica", "bold");
            doc.text('Arihant Dream Infra Projects Ltd. Jaipur', pageWidth / 2, yPos + 6, { align: "center" });

            // Company Address
            yPos += 12;
            doc.setFontSize(7);
            doc.setFont("helvetica", "normal");
            const addressLine1 = '2nd Floor, Class Of Pearl, Income Tax Colony, Tonk Road, Durgapura, Jaipur, Rajasthan, 302018 (Pan - AAJCA5226A)';
            doc.text(addressLine1, pageWidth / 2, yPos, { align: "center" });

            yPos += 4;
            const addressLine2 = 'CIN No. U7010RJ2011PLC035322';
            doc.text(addressLine2, pageWidth / 2, yPos, { align: "center" });

            // Document Title
            yPos += 8;
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text("MATERIAL VERIFICATION CERTIFICATE", pageWidth / 2, yPos, { align: "center" });
            yPos += 10;

            doc.setDrawColor(200, 200, 200);
            doc.line(14, yPos, pageWidth - 14, yPos);
            yPos += 6;

            // Vendor & PO Details grid logic
            autoTable(doc, {
                startY: yPos,
                theme: 'plain',
                styles: { fontSize: 9, cellPadding: 2 },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 30 },
                    1: { cellWidth: 65 },
                    2: { fontStyle: 'bold', cellWidth: 30 },
                    3: { cellWidth: 60 }
                },
                body: [
                    [
                        'PO No:', po.poNumber || 'N/A',
                        'Date:', po.date ? format(new Date(po.date), 'dd/MM/yyyy') : 'N/A'
                    ],
                    [
                        'Vendor Name:', po.vendorName || 'N/A',
                        'Contact No:', po.vendorContactNo || 'N/A'
                    ],
                    [
                        'Address:', po.vendorAddress || 'N/A',
                        'GST No:', po.vendorGst || 'N/A'
                    ],
                    [
                        'Task Ref:', po.taskReference || 'N/A',
                        'Status:', po.materialVerificationStatus || 'Pending'
                    ],
                    [
                        '', '',
                        'Indent Ref:', po.indentReferences?.map(i => i?.indentNumber).join(', ') || 'N/A'
                    ]
                ],
                didDrawPage: function (data) {
                    yPos = data.cursor.y + 10;
                }
            });

            // Materials Table
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text("Verified Materials Details", 14, yPos);
            yPos += 5;

            const tableRows = po.items?.map((item, idx) => [
                idx + 1,
                item.materialDescription || 'N/A',
                item.unit || 'N/A',
                item.quantity || 0,
                item.receivedQuantity || 0
            ]) || [];

            autoTable(doc, {
                startY: yPos,
                head: [['S.No', 'Material Description', 'Unit', 'Ordered Qty', 'Total Received']],
                body: tableRows,
                theme: 'grid',
                headStyles: {
                    fillColor: [41, 128, 185],
                    textColor: 255,
                    fontSize: 9,
                    fontStyle: 'bold',
                    halign: 'center'
                },
                styles: { fontSize: 9, cellPadding: 4 },
                columnStyles: {
                    0: { halign: 'center', cellWidth: 15 },
                    1: { halign: 'left', cellWidth: 'auto' },
                    2: { halign: 'center', cellWidth: 20 },
                    3: { halign: 'right', cellWidth: 30 },
                    4: { halign: 'right', cellWidth: 30, fillColor: [240, 248, 255], fontStyle: 'bold' }
                },
                didDrawPage: function (data) {
                    yPos = data.cursor.y + 10;
                }
            });

            // Past Delivery Receipts Table
            if (po.receipts && po.receipts.length > 0) {
                doc.setFontSize(11);
                doc.setFont("helvetica", "bold");
                doc.text("Delivery Receipts History", 14, yPos);
                yPos += 5;

                const receiptsRows = [];
                po.receipts.forEach((receipt, rIdx) => {
                    const rDate = receipt.date ? format(new Date(receipt.date), 'dd/MM/yyyy') : 'N/A';
                    receiptsRows.push([
                        { content: `Delivery #${rIdx + 1} - Date: ${rDate} | Received By: ${receipt.receivedBy || 'N/A'}`, colSpan: 3, styles: { fillColor: [240, 240, 240], fontStyle: 'bold' } }
                    ]);
                    receipt.items?.forEach(item => {
                        receiptsRows.push([
                            item.materialDescription || 'N/A',
                            '',
                            item.quantityReceived || 0
                        ]);
                    });
                });

                autoTable(doc, {
                    startY: yPos,
                    head: [['Description', '', 'Quantity']],
                    body: receiptsRows,
                    theme: 'grid',
                    headStyles: {
                        fillColor: [100, 100, 100],
                        textColor: 255,
                        fontSize: 8,
                        fontStyle: 'bold'
                    },
                    styles: { fontSize: 8, cellPadding: 3 },
                    columnStyles: {
                        0: { halign: 'left', cellWidth: 'auto' },
                        1: { cellWidth: 20 },
                        2: { halign: 'right', cellWidth: 30 }
                    },
                    didDrawPage: function (data) {
                        yPos = data.cursor.y + 10;
                    }
                });
            }

            // Signatures Section (moved to bottom)
            const pageHeight = doc.internal.pageSize.height;
            if (yPos > pageHeight - 40) {
                doc.addPage();
                yPos = 20;
            } else {
                yPos = pageHeight - 40;
            }

            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");

            doc.text("Prepared By", 30, yPos, { align: "center" });
            doc.text("Verified By", pageWidth / 2, yPos, { align: "center" });
            doc.text("Authorized By", pageWidth - 30, yPos, { align: "center" });

            doc.setFontSize(8);
            doc.text("(Store Supervisor)", 30, yPos + 5, { align: "center" });
            doc.text("(Project Manager)", pageWidth / 2, yPos + 5, { align: "center" });
            doc.text("(Director)", pageWidth - 30, yPos + 5, { align: "center" });
        });

        // Use PO number for single export, otherwise plural
        const fileName = pos.length === 1
            ? `Material_Verification_${pos[0].poNumber}.pdf`
            : `Material_Verifications_${format(new Date(), 'yyyy-MM-dd')}.pdf`;

        doc.save(fileName);
    } catch (error) {
        console.error("Error generating PDF:", error);
    }
};
