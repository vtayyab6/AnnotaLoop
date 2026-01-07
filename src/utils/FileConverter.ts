import { renderAsync } from 'docx-preview';

/**
 * Determine the display type based on file extension
 */
export function getDisplayFileType(filename: string): 'pdf' | 'image' | 'text' | 'word' {
    const lower = filename.toLowerCase();

    if (lower.endsWith('.pdf')) return 'pdf';
    if (lower.endsWith('.docx') || lower.endsWith('.doc')) return 'word';
    if (lower.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/)) return 'image';
    if (lower.match(/\.(txt|md|csv|json)$/)) return 'text';

    return 'pdf'; // default
}

/**
 * Render a Word document (.docx) to a container element with full formatting
 */
export async function renderWordDocument(file: Blob, container: HTMLElement): Promise<void> {
    try {
        container.innerHTML = ''; // Clear container
        await renderAsync(file, container, undefined, {
            className: 'docx-preview',
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            ignoreFonts: false,
            breakPages: true,
            ignoreLastRenderedPageBreak: false,
            experimental: true,
            trimXmlDeclaration: true,
            useBase64URL: false,
            renderHeaders: true,
            renderFooters: true,
            renderFootnotes: true,
            renderEndnotes: true,
        });
    } catch (error) {
        console.error('Error rendering Word document:', error);
        throw error;
    }
}
