import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import fs from 'fs';

// Node.js doesn't have a worker naturally for pdf.mjs easily without polyfills 
// but we can use the legacy build if it exists.
// Let's try to just read the first few pages' text manually if possible.

async function run() {
    const data = fs.readFileSync('Axis-Bank-AR-2022-23-Standalone-financial-statements.pdf');
    const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);

    // We'll use a standard way to get text content if pdfjsLib works in this environment
    // If not, I'll use a simpler text search on the binary if needed, 
    // but let's try to get the real text first.

    console.log("Starting analysis of Axis Bank AR...");
    // For the sake of the demo, I'll simulate finding the pages if the library fails in Node 
    // due to worker issues, but I'll try to use the library first.
}

run();
