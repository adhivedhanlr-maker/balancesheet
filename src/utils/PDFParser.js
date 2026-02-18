import * as pdfjsLib from 'pdfjs-dist';

// Set up worker - Use a local relative path or a more reliable CDN
// Note: In Vite, it's often better to use a worker from the library directly
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

/**
 * Extracts and normalizes financial data from complex PDFs.
 */
export async function parsePDF(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;

        let fullText = '';
        let foundFinancials = false;
        const maxSearchPages = Math.min(pdf.numPages, 200);

        // Optimized Scan: Step through pages to find the Balance Sheet first
        console.log(`Starting scan of ${pdf.numPages} pages...`);

        // First pass: Quick scan for headers to narrow down pages
        let targetPages = [];
        for (let i = 1; i <= maxSearchPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');

            // Keywords for Standalone Balance Sheet sections
            if (/standalone\s*balance\s*sheet/i.test(pageText) || /schedules\s*forming\s*part\s*of/i.test(pageText)) {
                console.log(`Potential financial data found on page ${i}`);
                targetPages.push(i);
                foundFinancials = true;
            }

            // Keep adding to fullText but limit to relevant chunks if we find them
            fullText += pageText + '\n';

            // optimization: if we found more than 5 relevant pages, we've likely captured the core financials
            if (targetPages.length > 8) break;
        }

        if (!foundFinancials) {
            console.warn("Could not find 'Standalone Balance Sheet' header. Parsing first 50 pages as fallback.");
        }

        return extractDetails(fullText);
    } catch (err) {
        console.error("PDF Parsing Error:", err);
        throw err;
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
        /interest\s*rate[:\s]*(\d+\.?\d*)\s*%/i,
        /ROI[:\s]*(\d+\.?\d*)\s*%/i,
        /Rate\s*of\s*Interest[:\s]*(\d+\.?\d*)\s*%/i,
        /Interest\s*Expended[:\s]*(\d+\.?\d*)\s*%/i // Less likely, but used in some P&L contexts
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

    return { interestRate, bankCharges, loanAmount };
}

function detectUnitScale(text) {
    // Look at the first 10k characters which usually contain the document header/units
    const snippet = text.substring(0, 10000);
    if (/\bin\s*₹?\s*Crores?/i.test(snippet) || /\bin\s*Rs\.?\s*Crores?/i.test(snippet)) return 10000000;
    if (/\bin\s*₹?\s*Lakhs?/i.test(snippet) || /\bin\s*Rs\.?\s*Lakhs?/i.test(snippet)) return 100000;
    if (/\bin\s*₹?\s*Thousands?/i.test(snippet) || /\bin\s*Rs\.?\s*Thousands?/i.test(snippet)) return 1000;
    return 1; // Default to absolute Rupees
}

function normalizeValue(valueStr, scale) {
    // Remove commas and handle spaces between digits if they exist due to table layout
    const cleanValue = valueStr.replace(/,/g, '').replace(/\s+/g, '');
    const rawValue = parseFloat(cleanValue) || 0;
    return (rawValue * scale).toString();
}
