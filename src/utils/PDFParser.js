import * as pdfjsLib from 'pdfjs-dist';

// Set up worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Extracts text from a PDF file and finds interest rate and bank charges.
 * @param {File} file 
 * @returns {Promise<{interestRate: string|null, bankCharges: string|null}>}
 */
export async function parsePDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
    }

    return extractDetails(fullText);
}

function extractDetails(text) {
    // Regex patterns for interest rate (e.g., "Interest Rate: 8.5%", "ROI: 9.0%")
    const interestPatterns = [
        /interest\s*rate[:\s]*(\d+\.?\d*)\s*%/i,
        /ROI[:\s]*(\d+\.?\d*)\s*%/i,
        /Rate\s*of\s*Interest[:\s]*(\d+\.?\d*)\s*%/i
    ];

    // Regex patterns for bank charges (e.g., "Bank Charges: 50.00", "Service Fee ₹100")
    const chargesPatterns = [
        /bank\s*charges[:\s]*(?:₹|\$)?([\d,]+\.?\d*)/i,
        /service\s*(?:fee|charge)[:\s]*(?:₹|\$)?([\d,]+\.?\d*)/i,
        /processing\s*fee[:\s]*(?:₹|\$)?([\d,]+\.?\d*)/i,
        /Total\s*Charges[:\s]*(?:₹|\$)?([\d,]+\.?\d*)/i
    ];

    let interestRate = null;
    let bankCharges = null;

    for (const pattern of interestPatterns) {
        const match = text.match(pattern);
        if (match) {
            interestRate = match[1];
            break;
        }
    }

    for (const pattern of chargesPatterns) {
        const match = text.match(pattern);
        if (match) {
            bankCharges = match[1].replace(/,/g, '');
            break;
        }
    }

    return { interestRate, bankCharges };
}
