import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Configure PDF.js worker - use the worker from node_modules
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - worker import
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export interface ExtractionResult {
    text: string;
    tokenCount: number;
    pageCount?: number;
    error?: string;
}

/**
 * Estimate token count from text
 * Approximation: ~4 characters = 1 token (common for English text)
 * This is a reasonable estimate for most LLMs
 */
export function estimateTokenCount(text: string): number {
    if (!text) return 0;
    // More accurate: count words and apply multiplier
    // Average English word: ~5 chars, average token: ~4 chars
    // So roughly: tokens ≈ characters / 4
    return Math.ceil(text.length / 4);
}

/**
 * Format token count for display
 */
export function formatTokenCount(count: number): string {
    if (count >= 1000000) {
        return `~${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
        return `~${(count / 1000).toFixed(1)}k`;
    }
    return `~${count}`;
}

/**
 * Extract text from a PDF file
 */
async function extractFromPDF(file: File): Promise<ExtractionResult> {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        let fullText = '';
        const pageCount = pdf.numPages;

        for (let i = 1; i <= pageCount; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((item: any) => item.str || '')
                .join(' ');
            fullText += pageText + '\n\n';
        }

        const text = fullText.trim();
        return {
            text,
            tokenCount: estimateTokenCount(text),
            pageCount
        };
    } catch (error) {
        console.error('PDF extraction error:', error);
        return {
            text: '',
            tokenCount: 0,
            error: error instanceof Error ? error.message : 'Failed to extract PDF text'
        };
    }
}

/**
 * Extract text from a Word document (.docx)
 */
async function extractFromWord(file: File): Promise<ExtractionResult> {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        const text = result.value.trim();

        return {
            text,
            tokenCount: estimateTokenCount(text)
        };
    } catch (error) {
        console.error('Word extraction error:', error);
        return {
            text: '',
            tokenCount: 0,
            error: error instanceof Error ? error.message : 'Failed to extract Word document text'
        };
    }
}

/**
 * Extract text from a plain text file (.txt, .md, .csv, .json)
 */
async function extractFromText(file: File): Promise<ExtractionResult> {
    try {
        const text = await file.text();
        return {
            text: text.trim(),
            tokenCount: estimateTokenCount(text)
        };
    } catch (error) {
        console.error('Text extraction error:', error);
        return {
            text: '',
            tokenCount: 0,
            error: error instanceof Error ? error.message : 'Failed to read text file'
        };
    }
}

/**
 * Main extraction function - determines file type and extracts accordingly
 */
export async function extractText(file: File): Promise<ExtractionResult> {
    const filename = file.name.toLowerCase();

    if (filename.endsWith('.pdf')) {
        return extractFromPDF(file);
    } else if (filename.endsWith('.docx') || filename.endsWith('.doc')) {
        return extractFromWord(file);
    } else if (filename.match(/\.(txt|md|csv|json)$/)) {
        return extractFromText(file);
    } else {
        // Try text extraction as fallback
        return extractFromText(file);
    }
}

/**
 * Check if document exceeds token limit
 */
export function isOverTokenLimit(tokenCount: number, limit: number = 200000): boolean {
    return tokenCount > limit;
}

/**
 * Chunk text for local LLM processing
 * @param text Full document text
 * @param maxWords Maximum words per chunk (default 800)
 * @param overlapWords Overlap between chunks for context (default 100)
 */
export function chunkText(text: string, maxWords: number = 800, overlapWords: number = 100): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];

    if (words.length <= maxWords) {
        return [text];
    }

    let startIndex = 0;
    while (startIndex < words.length) {
        const endIndex = Math.min(startIndex + maxWords, words.length);
        const chunk = words.slice(startIndex, endIndex).join(' ');
        chunks.push(chunk);

        // Move start index, accounting for overlap
        startIndex = endIndex - overlapWords;

        // Prevent infinite loop if overlap is too large
        if (startIndex >= endIndex) {
            startIndex = endIndex;
        }
    }

    return chunks;
}
