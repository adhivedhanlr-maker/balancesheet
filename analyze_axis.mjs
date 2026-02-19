import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';

// Node.js doesn't have a worker naturally for pdf.mjs easily without polyfills 
// but we can use the legacy build if it exists.
// Let's try to just read the first few pages' text manually if possible.

async function run() {
    try {
        const data = fs.readFileSync('Axis-Bank-AR-2022-23-Standalone-financial-statements.pdf');
        const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);

        console.log("Starting analysis of Axis Bank AR...");

        const loadingTask = pdfjsLib.getDocument({
            data: buffer,
            useSystemFonts: true,
            disableFontFace: true, // often helpful in Node environments
        });
        const pdf = await loadingTask.promise;

        console.log(`Analyzing Axis Bank AR: ${pdf.numPages} pages found.`);

        // Sample first 100 pages and search for "Balance Sheet"
        for (let i = 1; i <= Math.min(pdf.numPages, 100); i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const text = textContent.items.map(item => item.str).join(' ');

            if (text.toLowerCase().includes('balance sheet') && text.toLowerCase().includes('standalone')) {
                console.log(`\n[!] FOUND Balance Sheet on Page ${i}`);
                console.log('--- Snippet ---');
                console.log(text.substring(0, 500));
                console.log('---------------\n');
            }

            if (text.toLowerCase().includes('interest rate') || text.toLowerCase().includes('roi')) {
                // console.log(`[i] FOUND Interest Rate keywords on Page ${i}`);
            }
        }
        console.log("Analysis complete.");
    } catch (error) {
        console.error("Error during analysis:", error);
    }
}

run();

