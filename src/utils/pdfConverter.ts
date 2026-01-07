import { jsPDF } from 'jspdf';
import { marked } from 'marked';

// A4 dimensions in mm
const A4_WIDTH = 210;
const A4_HEIGHT = 297;
const MARGIN = 20;
const LINE_HEIGHT = 7;
const FONT_SIZE = 12;
const HEADING_SIZES = { h1: 24, h2: 20, h3: 16, h4: 14, h5: 12, h6: 11 };

interface ConvertToPdfOptions {
    fontSize?: number;
    lineHeight?: number;
    margin?: number;
}

/**
 * Convert plain text to PDF with proper A4 formatting
 */
export const textToPdf = (text: string, title: string, options?: ConvertToPdfOptions): Blob => {
    const fontSize = options?.fontSize || FONT_SIZE;
    const lineHeight = options?.lineHeight || LINE_HEIGHT;
    const margin = options?.margin || MARGIN;

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    // Set font
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSize);

    // Add title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, margin + 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSize);

    // Add horizontal line under title
    doc.setLineWidth(0.5);
    doc.line(margin, margin + 15, A4_WIDTH - margin, margin + 15);

    // Split text into lines that fit the page width
    const contentWidth = A4_WIDTH - (margin * 2);
    const maxY = A4_HEIGHT - margin;
    let y = margin + 25;

    // Split by paragraphs first (handling various newline formats)
    const paragraphs = text.split(/\r?\n\r?\n/);

    paragraphs.forEach(paragraph => {
        if (!paragraph.trim()) return;

        // Split paragraph into lines that fit
        const lines = doc.splitTextToSize(paragraph.trim(), contentWidth);

        lines.forEach((line: string) => {
            if (y + lineHeight > maxY) {
                doc.addPage();
                y = margin;
            }
            doc.text(line, margin, y);
            y += lineHeight;
        });

        // Add paragraph spacing (1 full line height for empty line effect)
        y += lineHeight;
    });

    return doc.output('blob');
};

/**
 * Convert Markdown to PDF with proper rendering
 */
export const markdownToPdf = async (markdown: string, title: string, options?: ConvertToPdfOptions): Promise<Blob> => {
    const fontSize = options?.fontSize || FONT_SIZE;
    const lineHeight = options?.lineHeight || LINE_HEIGHT;
    const margin = options?.margin || MARGIN;

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const contentWidth = A4_WIDTH - (margin * 2);
    const maxY = A4_HEIGHT - margin;
    let y = margin;

    // Add title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, y + 8);
    y += 15;
    doc.setLineWidth(0.5);
    doc.line(margin, y, A4_WIDTH - margin, y);
    y += 10;

    // Parse markdown to tokens
    const tokens = marked.lexer(markdown);

    const addNewPage = () => {
        doc.addPage();
        y = margin;
    };

    const addText = (text: string, bold = false, italic = false, size = fontSize) => {
        doc.setFontSize(size);
        let style = 'normal';
        if (bold && italic) style = 'bolditalic';
        else if (bold) style = 'bold';
        else if (italic) style = 'italic';
        doc.setFont('helvetica', style);

        const lines = doc.splitTextToSize(text, contentWidth);
        lines.forEach((line: string) => {
            if (y + lineHeight > maxY) addNewPage();
            doc.text(line, margin, y);
            y += lineHeight;
        });
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processToken = (token: any) => {
        switch (token.type) {
            case 'heading': {
                if (y + 15 > maxY) addNewPage();
                const headingSize = HEADING_SIZES[`h${token.depth}` as keyof typeof HEADING_SIZES] || 14;
                y += 5; // Space before heading
                addText(token.text, true, false, headingSize);
                y += 8; // Space after heading
                break;
            }

            case 'paragraph': {
                // Strip markdown syntax for cleaner text (e.g. **bold**)
                const cleanText = token.text.replace(/(\*\*|__)(.*?)\1/g, '$2').replace(/(\*|_)(.*?)\1/g, '$2');
                addText(cleanText);
                y += 5; // Space after paragraph
                break;
            }

            case 'list':
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                token.items.forEach((item: any, index: number) => {
                    const bullet = token.ordered ? `${index + 1}.` : '•';
                    if (y + lineHeight > maxY) addNewPage();
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(fontSize);
                    doc.text(`${bullet} ${item.text}`, margin + 5, y);
                    y += lineHeight;
                });
                y += 5; // Space after list
                break;

            case 'code': {
                doc.setFontSize(10);
                doc.setFont('courier', 'normal');
                const codeLines = token.text.split('\n');
                if (y + (codeLines.length * 5) + 10 > maxY) addNewPage();

                // Draw code block background
                doc.setFillColor(245, 245, 245);
                doc.rect(margin, y - 3, contentWidth, (codeLines.length * 5) + 6, 'F');

                codeLines.forEach((line: string) => {
                    doc.text(line, margin + 3, y);
                    y += 5;
                });
                y += 5;
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(fontSize);
                break;
            }

            case 'blockquote': {
                doc.setFillColor(240, 240, 240);
                const quoteLines = doc.splitTextToSize(token.text || '', contentWidth - 10);
                doc.rect(margin, y - 2, contentWidth, (quoteLines.length * lineHeight) + 4, 'F');
                doc.setDrawColor(100, 100, 100);
                doc.line(margin, y - 2, margin, y + (quoteLines.length * lineHeight) + 2);

                doc.setFont('helvetica', 'italic');
                quoteLines.forEach((line: string) => {
                    if (y + lineHeight > maxY) addNewPage();
                    doc.text(line, margin + 5, y);
                    y += lineHeight;
                });
                doc.setFont('helvetica', 'normal');
                y += 5;
                break;
            }

            case 'hr':
                if (y + 5 > maxY) addNewPage();
                doc.setLineWidth(0.3);
                doc.line(margin, y, A4_WIDTH - margin, y);
                y += 8;
                break;

            case 'table': {
                // Simple table rendering
                if (token.header && token.rows) {
                    const colWidth = contentWidth / token.header.length;

                    // Header
                    doc.setFont('helvetica', 'bold');
                    token.header.forEach((cell: any, i: number) => {
                        doc.text(cell.text || '', margin + (i * colWidth), y);
                    });
                    y += lineHeight;
                    doc.line(margin, y - 2, A4_WIDTH - margin, y - 2);

                    // Rows
                    doc.setFont('helvetica', 'normal');
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    token.rows.forEach((row: any[]) => {
                        if (y + lineHeight > maxY) addNewPage();
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        row.forEach((cell: any, i: number) => {
                            doc.text(cell.text || '', margin + (i * colWidth), y);
                        });
                        y += lineHeight;
                    });
                    y += 5;
                }
                break;
            }

            case 'space':
                y += lineHeight;
                break;

            default:
                if (token.text) {
                    addText(token.text);
                }
        }
    };

    tokens.forEach(processToken);

    return doc.output('blob');
};

/**
 * Create a blob URL from a PDF blob
 */
export const createPdfUrl = (blob: Blob): string => {
    return URL.createObjectURL(blob);
};

/**
 * Generate PDF from document content based on type
 */
export const generatePdfFromContent = async (
    content: string,
    filename: string,
    fileType: 'txt' | 'md' | 'text'
): Promise<string> => {
    let pdfBlob: Blob;

    if (fileType === 'md') {
        pdfBlob = await markdownToPdf(content, filename);
    } else {
        pdfBlob = textToPdf(content, filename);
    }

    return createPdfUrl(pdfBlob);
};
