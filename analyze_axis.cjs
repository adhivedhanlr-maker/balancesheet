const { jsPDF } = require('jspdf'); // Not needed for reading, but using same pattern
const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

async function analyzePDF() {
    const rawData = fs.readFileSync('Axis-Bank-AR-2022-23-Standalone-financial-statements.pdf');
    const loadingTask = pdfjsLib.getDocument({ data: rawData });
    const pdf = await loadingTask.promise;

    console.log(`Analyzing Axis Bank AR: ${pdf.numPages} pages found.`);

    // Sample first 10 pages and search for "Balance Sheet"
    for (let i = 1; i <= Math.min(pdf.numPages, 100); i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const text = textContent.items.map(item => item.str).join(' ');

        if (text.toLowerCase().includes('balance sheet') && text.toLowerCase().includes('standalone')) {
            console.log(`FOUND Balance Sheet on Page ${i}`);
            console.log('Snippet:', text.substring(0, 500));
        }

        if (text.toLowerCase().includes('interest rate') || text.toLowerCase().includes('roi')) {
            console.log(`FOUND Interest Rate keywords on Page ${i}`);
        }
    }
}

analyzePDF().catch(console.error);
