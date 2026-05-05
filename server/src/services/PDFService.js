const PDFDocument = require('pdfkit');

class PDFService {
    generateInvoice(transaction, user, res) {
        const doc = new PDFDocument({ margin: 50 });

        // Pipe the PDF into the response
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${transaction._id}.pdf`);
        doc.pipe(res);

        this.generateHeader(doc, user);
        this.generateCustomerInformation(doc, transaction);
        this.generateInvoiceTable(doc, transaction);
        this.generateFooter(doc);

        doc.end();
    }

    generateHeader(doc, user) {
        doc
            .fillColor('#444444')
            .fontSize(20)
            .text(user.businessName || user.name || 'FinBuddy Vendor', 50, 45)
            .fontSize(10)
            .text(`Phone: ${user.phoneNumber || 'N/A'}`, 50, 70)
            .text(`GSTIN: ${user.gstNumber || 'Not Registered'}`, 50, 85)
            .moveDown();
    }

    generateCustomerInformation(doc, transaction) {
        const date = new Date(transaction.date).toLocaleDateString();

        doc
            .fillColor('#444444')
            .fontSize(20)
            .text('INVOICE', 50, 160);

        doc.strokeColor('#aaaaaa').lineWidth(1).moveTo(50, 185).lineTo(550, 185).stroke();

        doc
            .fontSize(10)
            .text('Invoice Number:', 50, 200)
            .font('Helvetica-Bold')
            .text(transaction._id.toString(), 150, 200)
            .font('Helvetica')
            .text('Invoice Date:', 50, 215)
            .text(date, 150, 215)
            .text('Payment Method:', 50, 230)
            .text(transaction.paymentMethod?.toUpperCase() || 'CASH', 150, 230)
            .moveDown();

        doc.strokeColor('#aaaaaa').lineWidth(1).moveTo(50, 250).lineTo(550, 250).stroke();
    }

    generateInvoiceTable(doc, transaction) {
        let i;
        const invoiceTableTop = 330;

        doc.font('Helvetica-Bold');
        this.generateTableRow(
            doc,
            invoiceTableTop,
            'Item Description',
            'Category',
            'Unit Cost',
            'Quantity',
            'Line Total'
        );
        doc.strokeColor('#aaaaaa').lineWidth(1).moveTo(50, invoiceTableTop + 20).lineTo(550, invoiceTableTop + 20).stroke();
        doc.font('Helvetica');

        // Since FinBuddy uses simple parsing, we usually have a single line item for the transaction amount
        const position = invoiceTableTop + 30;
        this.generateTableRow(
            doc,
            position,
            transaction.description || 'General Service/Goods',
            transaction.category || 'General',
            `Rs. ${transaction.amount}`,
            '1',
            `Rs. ${transaction.amount}`
        );

        doc.strokeColor('#aaaaaa').lineWidth(1).moveTo(50, position + 20).lineTo(550, position + 20).stroke();

        const subtotalPosition = position + 40;
        doc.font('Helvetica-Bold');
        this.generateTableRow(
            doc,
            subtotalPosition,
            '',
            '',
            'Total:',
            '',
            `Rs. ${transaction.amount}`
        );
        doc.font('Helvetica');
    }

    generateFooter(doc) {
        doc
            .fontSize(10)
            .text(
                'Payment is due within 15 days. Thank you for your business.',
                50,
                700,
                { align: 'center', width: 500 }
            )
            .text(
                'Generated automatically by FinBuddy AI.',
                50,
                715,
                { align: 'center', width: 500 }
            );
    }

    generateTableRow(doc, y, item, description, unitCost, quantity, lineTotal) {
        doc
            .fontSize(10)
            .text(item, 50, y)
            .text(description, 250, y)
            .text(unitCost, 350, y, { width: 90, align: 'right' })
            .text(quantity, 420, y, { width: 40, align: 'right' })
            .text(lineTotal, 0, y, { align: 'right' });
    }
}

module.exports = new PDFService();
