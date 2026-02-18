import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

/**
 * Generates a professional Balance Sheet PDF.
 */
export function generateBalanceSheetPDF(data) {
    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235); // Primary color
    doc.text('BALANCE SHEET', pageWidth / 2, 30, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('As of ' + new Date().toLocaleDateString(), pageWidth / 2, 38, { align: 'center' });

    // Border line
    doc.setDrawColor(200);
    doc.line(margin, 45, pageWidth - margin, 45);

    // Content
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Entity Information', margin, 55);
    doc.setFontSize(11);
    doc.text(`Address: ${data.address || 'N/A'}`, margin, 65);

    // Table-like structure
    let y = 80;
    const drawRow = (label, value, isHeader = false, isTotal = false) => {
        if (isHeader) {
            doc.setFillColor(240, 245, 255);
            doc.rect(margin, y - 5, pageWidth - (margin * 2), 7, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(37, 99, 235);
        } else if (isTotal) {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0);
            doc.line(margin, y - 5, pageWidth - margin, y - 5);
        } else {
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(50);
        }

        doc.text(label, margin + 2, y);
        doc.text(value, pageWidth - margin - 2, y, { align: 'right' });
        y += 10;
    };

    drawRow('LIABILITIES', 'Amount (₹)', true);
    drawRow('Principal Loan Amount', parseFloat(data.loanAmount || 0).toLocaleString());
    drawRow('Outstanding Interest', parseFloat(data.estimatedInterest || 0).toLocaleString());
    drawRow('Bank Charges', parseFloat(data.bankCharges || 0).toLocaleString());
    drawRow('Operating Expenses', parseFloat(data.calculatedExpenses || 0).toLocaleString());

    y += 5;
    const totalLiabilities = parseFloat(data.loanAmount || 0) +
        parseFloat(data.estimatedInterest || 0) +
        parseFloat(data.bankCharges || 0) +
        parseFloat(data.calculatedExpenses || 0);
    drawRow('TOTAL LIABILITIES', totalLiabilities.toLocaleString(), false, true);

    y += 10;
    drawRow('ASSETS', 'Amount (₹)', true);
    drawRow('Loan Principal (Asset)', parseFloat(data.loanAmount || 0).toLocaleString());
    drawRow('TOTAL ASSETS', parseFloat(data.loanAmount || 0).toLocaleString(), false, true);

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text('This document is generated automatically for loan renewal purposes.', pageWidth / 2, 280, { align: 'center' });
    doc.text('Confidential - For Bank Use Only', pageWidth / 2, 285, { align: 'center' });

    doc.save('Balance_Sheet.pdf');
}

/**
 * Generates a Balance Sheet Excel file.
 */
export function generateBalanceSheetExcel(data) {
    const totalLiabilities = parseFloat(data.loanAmount || 0) +
        parseFloat(data.estimatedInterest || 0) +
        parseFloat(data.bankCharges || 0) +
        parseFloat(data.calculatedExpenses || 0);

    const wsData = [
        ['BALANCE SHEET'],
        ['Generated on:', new Date().toLocaleDateString()],
        ['Address:', data.address || 'N/A'],
        [],
        ['LIABILITIES', 'AMOUNT (₹)'],
        ['Principal Loan Amount', parseFloat(data.loanAmount || 0)],
        ['Outstanding Interest', parseFloat(data.estimatedInterest || 0)],
        ['Bank Charges', parseFloat(data.bankCharges || 0)],
        ['Operating Expenses', parseFloat(data.calculatedExpenses || 0)],
        ['TOTAL LIABILITIES', totalLiabilities],
        [],
        ['ASSETS', 'AMOUNT (₹)'],
        ['Loan Principal', parseFloat(data.loanAmount || 0)],
        ['TOTAL ASSETS', parseFloat(data.loanAmount || 0)],
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Balance Sheet');

    XLSX.writeFile(wb, 'Balance_Sheet.xlsx');
}
