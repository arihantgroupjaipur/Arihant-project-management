import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export const generateTaskPDF = async (tasks) => {
    if (!tasks || tasks.length === 0) {
        throw new Error('No tasks to export');
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    // const pageHeight = doc.internal.pageSize.getHeight();

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
    doc.text('PROJECT TASKS LIST', pageWidth / 2, 35, { align: 'center' });

    // Add Company Address on the left
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('K-48,206, Class of Pearls', 15, 42);
    doc.text('Income Tax Colony, Jaipur', 15, 46);
    doc.text('Phone: 0141-2940606, 9785219777', 15, 50);
    doc.text('E-mail: accounts@arihantgroupjaipur.com', 15, 54);
    doc.text('CIN: U7010RJ2011PLC035322', 15, 58);
    doc.text('GST: 08AAJCA5226A1Z3', 15, 62);

    const tableHeaders = [
        'Task ID',
        'Particulars',
        'Contractor',
        'Start Date',
        'Finish Date',
        'Duration',
        'Status'
    ];

    const tableData = tasks.map(t => [
        t.taskId || '-',
        t.workParticulars || '-',
        t.contractor?.name || t.contractorName || '-',
        t.plannedStartDate ? new Date(t.plannedStartDate).toLocaleDateString() : '-',
        t.plannedFinishDate ? new Date(t.plannedFinishDate).toLocaleDateString() : '-',
        t.duration ? `${t.duration} days` : '-',
        t.status || 'Pending'
    ]);

    autoTable(doc, {
        head: [tableHeaders],
        body: tableData,
        startY: 70, // pushed down to account for address block
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3 },
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
            0: { cellWidth: 20 },
            1: { cellWidth: 50 },
            2: { cellWidth: 35 },
            3: { cellWidth: 20 },
            4: { cellWidth: 20 },
            5: { cellWidth: 20 },
            6: { cellWidth: 20 }
        }
    });

    const fileName = `Project_Tasks_${format(new Date(), 'yyyy-MM-dd')}.pdf`;

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
