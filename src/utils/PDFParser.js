import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Set up worker locally to avoid CDN issues or version mismatches
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * Extracts and normalizes financial data from complex PDFs.
 */
export async function parsePDF(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        console.log(`Analyzing file: ${file.name} (${arrayBuffer.byteLength} bytes)`);

        const loadingTask = pdfjsLib.getDocument({
            data: arrayBuffer,
            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.624/cmaps/',
            cMapPacked: true,
        });

        // Handle password protection silently
        loadingTask.onPassword = (updateCallback, reason) => {
            console.warn("Silent Fallback: PDF is password protected.");
            return null; // Return nothing to trigger the catch/default
        };

        const pdf = await loadingTask.promise;

        let fullText = '';
        let foundFinancials = false;
        const maxSearchPages = Math.min(pdf.numPages, 100);

        // Optimized Scan: Step through pages to find the Balance Sheet first
        console.log(`Starting scan of ${pdf.numPages} pages...`);

        // First pass: Quick scan for headers to narrow down pages
        for (let i = 1; i <= maxSearchPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');

            // Keywords for Standalone Balance Sheet sections
            if (/standalone\s*balance\s*sheet/i.test(pageText) ||
                /standalone\s*financial\s*statements/i.test(pageText) ||
                /schedules\s*forming\s*part\s*of/i.test(pageText) ||
                /capital\s*and\s*liabilities/i.test(pageText)) {
                foundFinancials = true;
            }

            fullText += pageText + '\n';
            if (foundFinancials && i > 10) break; // Optimization
        }

        return extractDetails(fullText);
    } catch (err) {
        console.warn("PDF Extraction skipped or failed:", err.message);
        // Return default empty values so the app continues without error
        return { interestRate: null, bankCharges: null, loanAmount: null };
    }
}

function extractDetails(text) {
    // 1. Detect Units (Crores, Lakhs, Thousands)
    const unitScale = detectUnitScale(text);
    console.log(`Detected Unit Scale: ${unitScale}`);

    // 2. Extract Interest Rate (ROI / Yield)
    // Yield on advances is a very common term in Indian bank schedules for effective rate
    const interestPatterns = [
        /yield\s*on\s*advances[:\s]*(\d+\.?\d*)\s*%/i,
        /yield\s*on\s*(?:average\s*)?earning\s*assets[:\s]*(\d+\.?\d*)\s*%/i,
        /interest\s*rate[:\s]*(\d+\.?\d*)\s*%/i,
        /ROI[:\s]*(\d+\.?\d*)\s*%/i,
        /Rate\s*of\s*Interest[:\s]*(\d+\.?\d*)\s*%/i,
        /Interest\s*Expended[:\s]*(\d+\.?\d*)\s*%/i
    ];

    // 3. Extract Bank Charges / Operating Expenses
    const chargesPatterns = [
        /Other\s*Operating\s*Expenses[:\s]*(?:₹|Rs\.?)?\s*([\d,]+\.?\d*)/i,
        /bank\s*charges[:\s]*(?:₹|Rs\.?)?\s*([\d,]+\.?\d*)/i,
        /service\s*(?:fee|charge)[:\s]*(?:₹|Rs\.?)?\s*([\d,]+\.?\d*)/i,
        /processing\s*fee[:\s]*(?:₹|Rs\.?)?\s*([\d,]+\.?\d*)/i,
        /Total\s*Operating\s*Expenses[:\s]*(?:₹|Rs\.?)?\s*([\d,]+\.?\d*)/i
    ];

    // 4. Extract Loan Amount (Advances / Borrowings)
    const loanPatterns = [
        /Total\s*Advances[:\s]*(?:₹|Rs\.?)?\s*([\d,]+\.?\d*)/i,
        /Loans\s*and\s*Advances[:\s]*(?:₹|Rs\.?)?\s*([\d,]+\.?\d*)/i,
        /Net\s*Advances[:\s]*(?:₹|Rs\.?)?\s*([\d,]+\.?\d*)/i,
        /Borrowings[:\s]*(?:₹|Rs\.?)?\s*([\d,]+\.?\d*)/i
    ];

    let interestRate = null;
    let bankCharges = null;
    let loanAmount = null;

    for (const pattern of interestPatterns) {
        const match = text.match(pattern);
        if (match) { interestRate = match[1]; break; }
    }

    // Multi-match for charges (choose the first significant one found)
    for (const pattern of chargesPatterns) {
        const match = text.match(pattern);
        if (match) {
            bankCharges = normalizeValue(match[1], unitScale);
            break;
        }
    }

    for (const pattern of loanPatterns) {
        const match = text.match(pattern);
        if (match) {
            loanAmount = normalizeValue(match[1], unitScale);
            break;
        }
    }

    // Fallback for document TOTAL (common in Balance Sheets)
    if (!loanAmount) {
        const totalMatch = text.match(/Total\s+([\d,]+)/i);
        if (totalMatch) loanAmount = normalizeValue(totalMatch[1], unitScale);
    }

    return { interestRate, bankCharges, loanAmount };
}

function detectUnitScale(text) {
    // Look for ( ` in crores) or (Rs. in lakhs) etc.
    const snippet = text.substring(0, 50000); // Larger snippet for deep documents
    if (/\(\s*[`₹Rs\.]+\s*in\s*Crores?\s*\)/i.test(snippet) || /\bin\s*₹?\s*Crores?/i.test(snippet)) return 10000000;
    if (/\(\s*[`₹Rs\.]+\s*in\s*Lakhs?\s*\)/i.test(snippet) || /\bin\s*₹?\s*Lakhs?/i.test(snippet)) return 100000;
    if (/\(\s*[`₹Rs\.]+\s*in\s*Thousands?\s*\)/i.test(snippet) || /\bin\s*₹?\s*Thousands?/i.test(snippet)) return 1000;
    return 1;
}

function normalizeValue(valueStr, scale) {
    // Remove commas and handle spaces between digits if they exist due to table layout
    const cleanValue = valueStr.replace(/,/g, '').replace(/\s+/g, '');
    const rawValue = parseFloat(cleanValue) || 0;
    return (rawValue * scale).toString();
}
