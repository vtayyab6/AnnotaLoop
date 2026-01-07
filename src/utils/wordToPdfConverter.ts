/**
 * Word to PDF Converter
 * Uses mammoth.js to extract HTML from Word docs and renders to PDF
 */

import mammoth from 'mammoth';
import { jsPDF } from 'jspdf';

export async function convertWordToPdf(wordBlob: Blob): Promise<Blob> {
    try {
        const arrayBuffer = await wordBlob.arrayBuffer();

        // Extract HTML from Word document
        const result = await mammoth.convertToHtml({ arrayBuffer });
        const html = result.value;

        // Create a temporary container to render HTML
        const container = document.createElement('div');
        container.innerHTML = html;
        container.style.cssText = `
            width: 595px;
            padding: 40px;
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.5;
            background: white;
            color: black;
        `;

        // Apply some basic styling to elements
        container.querySelectorAll('p').forEach(p => {
            (p as HTMLElement).style.marginBottom = '12px';
        });

        container.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(h => {
            (h as HTMLElement).style.fontWeight = 'bold';
            (h as HTMLElement).style.marginTop = '16px';
            (h as HTMLElement).style.marginBottom = '8px';
        });

        document.body.appendChild(container);

        // Create PDF
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: 'a4'
        });

        // Use html2canvas-like approach with jspdf
        await pdf.html(container, {
            callback: function () {
                // PDF generation complete
            },
            x: 0,
            y: 0,
            html2canvas: {
                scale: 0.75,
                useCORS: true,
                logging: false
            },
            margin: [40, 40, 40, 40]
        });

        // Clean up
        document.body.removeChild(container);

        // Return as blob
        const pdfBlob = pdf.output('blob');
        return pdfBlob;
    } catch (error) {
        console.error('Word to PDF conversion failed:', error);
        throw error;
    }
}

export async function extractTextFromWord(wordBlob: Blob): Promise<string> {
    try {
        const arrayBuffer = await wordBlob.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
    } catch (error) {
        console.error('Word text extraction failed:', error);
        throw error;
    }
}
