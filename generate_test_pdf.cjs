const { jsPDF } = require('jspdf');
const fs = require('fs');

const doc = new jsPDF();

doc.setFontSize(20);
doc.text('Sample Bank Statement', 20, 20);

doc.setFontSize(12);
doc.text('Statement Period: Jan 2026 - Feb 2026', 20, 35);
doc.text('Customer Name: Adhivedhan Tech Solutions', 20, 45);

doc.line(20, 50, 190, 50);

doc.text('Loan Renewal Details:', 20, 65);
doc.setFont('helvetica', 'bold');
doc.text('ROI: 10.5%', 20, 75);
doc.text('Processing Fee: INR 5,000', 20, 85);
doc.setFont('helvetica', 'normal');

doc.text('Other Transactions:', 20, 105);
doc.text('01/02/2026 - Maintenance Charge: INR 200', 20, 115);
doc.text('Bank Charges: ₹5,000', 20, 125);

// The regex in PDFParser looks for "Bank Charges" or "Processing Fee"
// along with the ₹ or $ sign.

const pdfOutput = doc.output();
fs.writeFileSync('Sample_Bank_Statement.pdf', pdfOutput, 'binary');

console.log('Sample_Bank_Statement.pdf has been generated successfully.');
