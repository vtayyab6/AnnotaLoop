/**
 * PDF Annotation Service
 * Handles text matching, PDF manipulation, and annotation summary generation
 */

import { PDFDocument, rgb, PDFName, PDFString, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import type { Annotation, Label, RuleEvaluation, Rule } from '../context/types';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';

// --- Types ---
export interface AnnotationCoord {
    pageIndex: number;
    boundingRect: {
        x1: number;
        y1: number;
        x2: number;
        y2: number;
        width: number;
        height: number;
    };
}

export interface AnnotationColor {
    rgb: [number, number, number];
    hex: string;
    soft: string;
}

export interface TextMatch {
    pageNumber: number;
    textItems: any[];
    viewport: any;
    startOffset: number;
    endOffset: number;
}

export interface PageIndex {
    pageNumber: number;
    textItems: any[];
    viewport: any;
    normText: string;
    normMap: { itemIndex: number; charIndex: number }[];
    compactText: string;
    compactMap: { itemIndex: number; charIndex: number }[];
}

export interface SummaryPayload {
    documentName: string;
    projectName?: string;
    llmModel?: string;
    generatedAt: string;
    version: string;
    labels: Label[];
    stats: {
        labelsCount: number;
        rulesCount: number;
        acceptedCount: number;
        rejectedCount: number;
        inputTokens?: number;
        outputTokens?: number;
        totalTokens?: number;
        annotationCounts: Array<{ label: string; count: number }>;
    };
    rules?: Rule[];
    ruleEvaluations?: RuleEvaluation[];
}

// --- Helper Functions ---

function isDash(ch: string): boolean {
    return ch === '-' || ch === '\u2010' || ch === '\u2011' || ch === '\u2012' || ch === '\u2013' || ch === '\u2014';
}

function isWhitespace(ch: string): boolean {
    return /\s/.test(ch);
}

function isSkippable(ch: string): boolean {
    return ch === '\u00ad' || ch === '\u200b' || ch === '\u200c' || ch === '\u200d' || ch === '\ufeff';
}

function normalizeChar(ch: string): string {
    switch (ch) {
        case '\u201c':
        case '\u201d':
            return '"';
        case '\u2018':
        case '\u2019':
            return "'";
        case '\u2013':
        case '\u2014':
            return '-';
        case '\u2026':
            return '...';
        case '\ufb00':
            return 'ff';
        case '\ufb01':
            return 'fi';
        case '\ufb02':
            return 'fl';
        case '\ufb03':
            return 'ffi';
        case '\ufb04':
            return 'ffl';
        default:
            return ch;
    }
}

function buildNormalizedIndex(
    textItems: any[],
    options: { keepSpaces?: boolean; dropHyphens?: boolean; alphaNumeric?: boolean } = {}
): { text: string; map: { itemIndex: number; charIndex: number }[] } {
    const { keepSpaces = true, dropHyphens = false, alphaNumeric = false } = options;
    const parts: string[] = [];
    const map: { itemIndex: number; charIndex: number }[] = [];
    let lastWasSpace = false;

    textItems.forEach((item, itemIndex) => {
        const str = item.str || '';
        const endsWithHyphenBreak = Boolean(item.hasEOL && str && isDash(str[str.length - 1]));
        for (let i = 0; i < str.length; i++) {
            const ch = str[i];
            if (endsWithHyphenBreak && i === str.length - 1 && isDash(ch)) {
                continue;
            }
            if (isSkippable(ch)) continue;
            if (isWhitespace(ch)) {
                if (keepSpaces && !lastWasSpace) {
                    parts.push(' ');
                    map.push({ itemIndex, charIndex: i });
                    lastWasSpace = true;
                }
                continue;
            }
            const normalized = normalizeChar(ch);
            for (let j = 0; j < normalized.length; j++) {
                const normalizedChar = normalized[j];
                if (dropHyphens && normalizedChar === '-') continue;

                const lowerChar = normalizedChar.toLowerCase();
                if (alphaNumeric && !/[a-z0-9]/.test(lowerChar)) continue;

                parts.push(lowerChar);
                map.push({ itemIndex, charIndex: i });
            }
            lastWasSpace = false;
        }
        if (keepSpaces && !lastWasSpace && !endsWithHyphenBreak) {
            parts.push(' ');
            map.push({ itemIndex, charIndex: str.length });
            lastWasSpace = true;
        }
    });

    if (keepSpaces && parts.length > 0 && parts[parts.length - 1] === ' ') {
        parts.pop();
        map.pop();
    }

    return { text: parts.join(''), map };
}

function normalizeForSearch(text: string, options: { keepSpaces?: boolean; dropHyphens?: boolean; removeAll?: boolean }): string {
    const fakeItem = [{ str: text, hasEOL: false }];
    if (options.removeAll) {
        return buildNormalizedIndex(fakeItem, { keepSpaces: false, dropHyphens: true, alphaNumeric: true }).text;
    }
    return buildNormalizedIndex(fakeItem, options).text.trim();
}

function findExactMatch(
    text: string,
    map: { itemIndex: number; charIndex: number }[],
    searchText: string
): { startInfo: { itemIndex: number; charIndex: number }; endInfo: { itemIndex: number; charIndex: number } } | null {
    const matchIndex = text.indexOf(searchText);
    if (matchIndex === -1) return null;
    const matchEnd = matchIndex + searchText.length - 1;
    const startInfo = map[matchIndex];
    const endInfo = map[matchEnd];
    if (!startInfo || !endInfo) return null;
    return { startInfo, endInfo };
}

function findCompactMatch(
    text: string,
    map: { itemIndex: number; charIndex: number }[],
    searchText: string
): { startInfo: { itemIndex: number; charIndex: number }; endInfo: { itemIndex: number; charIndex: number } } | null {
    const exact = findExactMatch(text, map, searchText);
    if (exact) return exact;
    if (searchText.length < 16) return null;

    const headLen = Math.min(24, Math.max(8, Math.floor(searchText.length * 0.3)));
    const head = searchText.slice(0, headLen);
    const tail = searchText.slice(-headLen);
    const headIndex = text.indexOf(head);
    if (headIndex === -1) return null;
    const tailIndex = text.indexOf(tail, headIndex + headLen);
    if (tailIndex === -1) return null;
    const maxSpan = Math.floor(searchText.length * 1.4);
    if (tailIndex - headIndex > maxSpan) return null;

    const matchEnd = tailIndex + tail.length - 1;
    const startInfo = map[headIndex];
    const endInfo = map[matchEnd];
    if (!startInfo || !endInfo) return null;
    return { startInfo, endInfo };
}

function mapMatchToItems(
    pageIndex: PageIndex,
    startInfo: { itemIndex: number; charIndex: number },
    endInfo: { itemIndex: number; charIndex: number }
): TextMatch {
    const textItems = pageIndex.textItems.slice(startInfo.itemIndex, endInfo.itemIndex + 1);
    return {
        pageNumber: pageIndex.pageNumber,
        textItems,
        viewport: pageIndex.viewport,
        startOffset: startInfo.charIndex,
        endOffset: endInfo.charIndex + 1,
    };
}

function calculateBoundingBoxes(
    textItems: any[],
    viewport: any,
    startOffset = 0,
    endOffset = -1
): { x: number; y: number; width: number; height: number }[] {
    const boxes: { x: number; y: number; width: number; height: number }[] = [];

    for (let i = 0; i < textItems.length; i++) {
        const item = textItems[i];
        const [, , , scaleY, tx, ty] = item.transform;
        const charWidth = item.str.length > 0 ? item.width / item.str.length : 0;

        let itemStartChar = 0;
        let itemEndChar = item.str.length;
        if (i === 0) {
            itemStartChar = Math.min(startOffset, item.str.length);
        }
        if (i === textItems.length - 1 && endOffset !== -1) {
            itemEndChar = Math.min(endOffset, item.str.length);
        }

        const effectiveLen = Math.max(0, itemEndChar - itemStartChar);
        if (effectiveLen === 0) continue;

        const pdfX = tx + itemStartChar * charWidth;
        const pdfWidth = effectiveLen * charWidth;
        const fontHeight = Math.abs(scaleY);
        const pdfHeight = fontHeight;
        const pdfRect = [pdfX, ty, pdfX + pdfWidth, ty + pdfHeight];
        const viewRect = viewport.convertToViewportRectangle(pdfRect);

        const x = Math.min(viewRect[0], viewRect[2]);
        const y = Math.min(viewRect[1], viewRect[3]);
        const width = Math.abs(viewRect[2] - viewRect[0]);
        const height = Math.abs(viewRect[3] - viewRect[1]);

        if (width > 0 && height > 0) {
            boxes.push({ x, y, width, height });
        }
    }

    return mergeBoxes(boxes);
}

function mergeBoxes(
    boxes: { x: number; y: number; width: number; height: number }[]
): { x: number; y: number; width: number; height: number }[] {
    if (boxes.length === 0) return [];

    boxes.sort((a, b) => {
        if (Math.abs(a.y - b.y) < a.height * 0.5) {
            return a.x - b.x;
        }
        return a.y - b.y;
    });

    const merged: { x: number; y: number; width: number; height: number }[] = [];
    let current = { ...boxes[0] };

    for (let i = 1; i < boxes.length; i++) {
        const box = boxes[i];
        const sameRow = Math.abs(box.y - current.y) < current.height * 0.5;
        const gap = box.x - (current.x + current.width);
        const adjacent = gap < 15 && gap > -5;

        if (sameRow && adjacent) {
            const newRight = Math.max(current.x + current.width, box.x + box.width);
            current.width = newRight - current.x;
            current.height = Math.max(current.height, box.height);
            current.y = Math.min(current.y, box.y);
        } else {
            merged.push(current);
            current = { ...box };
        }
    }
    merged.push(current);

    return merged;
}

// --- Color Generation ---

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    let r: number, g: number, b: number;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
    return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

export function colorForLabel(label: string): AnnotationColor {
    let hash = 0;
    for (let i = 0; i < label.length; i++) {
        hash = label.charCodeAt(i) + ((hash << 5) - hash);
        hash &= hash;
    }
    const hue = Math.abs(hash) % 360;
    const rgbColor = hslToRgb(hue / 360, 0.68, 0.52);
    const hex = rgbToHex(rgbColor);
    return {
        rgb: [rgbColor[0] / 255, rgbColor[1] / 255, rgbColor[2] / 255],
        hex,
        soft: `hsla(${hue}, 80%, 70%, 0.35)`,
    };
}

const TW_COLORS: Record<string, [number, number, number]> = {
    slate: [100, 116, 139], gray: [107, 114, 128], red: [239, 68, 68], orange: [249, 115, 22],
    amber: [245, 158, 11], yellow: [234, 179, 8], lime: [132, 204, 22], green: [34, 197, 94],
    emerald: [16, 185, 129], teal: [20, 184, 166], cyan: [6, 182, 212], sky: [14, 165, 233],
    blue: [59, 130, 246], indigo: [99, 102, 241], violet: [139, 92, 246], purple: [168, 85, 247],
    fuchsia: [217, 70, 239], pink: [236, 72, 153], rose: [244, 63, 94]
};

export function parseLabelColor(labelColorStr: string): AnnotationColor {
    // 1. Hex
    if (labelColorStr.startsWith('#')) {
        const hex = labelColorStr;
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        return {
            rgb: [r, g, b],
            hex,
            soft: `rgba(${r * 255}, ${g * 255}, ${b * 255}, 0.35)`
        };
    }

    // 2. Tailwind class (e.g. bg-red-500)
    const match = labelColorStr.match(/bg-([a-z]+)-(\d+)/);
    if (match) {
        const colorName = match[1];
        // We use a fixed shade (500) approximation for simplicity or assume generic color
        const baseRgb = TW_COLORS[colorName] || [107, 114, 128];
        const [r, g, b] = baseRgb;
        return {
            rgb: [r / 255, g / 255, b / 255],
            hex: rgbToHex([r, g, b]),
            soft: `rgba(${r}, ${g}, ${b}, 0.35)`
        };
    }

    // Fallback
    return colorForLabel(labelColorStr);
}

// --- Main Functions ---

/**
 * Index all pages of a PDF for text searching
 */
export async function indexPdfPages(pdfDoc: any): Promise<PageIndex[]> {
    const pageIndexes: PageIndex[] = [];

    for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1 });

        const textItems = textContent.items.map((item: any) => ({
            str: item.str || '',
            transform: item.transform,
            width: item.width,
            height: item.height,
            hasEOL: item.hasEOL,
        }));

        const strictIndex = buildNormalizedIndex(textItems, { keepSpaces: true, dropHyphens: false });
        const compactIndex = buildNormalizedIndex(textItems, { keepSpaces: false, dropHyphens: true, alphaNumeric: true });

        pageIndexes.push({
            pageNumber: i,
            textItems,
            viewport,
            normText: strictIndex.text,
            normMap: strictIndex.map,
            compactText: compactIndex.text,
            compactMap: compactIndex.map
        });
    }

    return pageIndexes;
}

/**
 * Find text match across indexed pages
 */
export async function findTextMatch(
    pageIndexes: PageIndex[],
    sentence: string
): Promise<TextMatch | null> {
    const strictSearch = normalizeForSearch(sentence, { keepSpaces: true, dropHyphens: false });
    const compactSearch = normalizeForSearch(sentence, { keepSpaces: false, dropHyphens: true });

    if (!strictSearch && !compactSearch) return null;

    for (const pageIndex of pageIndexes) {
        if (strictSearch) {
            const exact = findExactMatch(pageIndex.normText, pageIndex.normMap, strictSearch);
            if (exact) {
                return mapMatchToItems(pageIndex, exact.startInfo, exact.endInfo);
            }
        }

        if (compactSearch) {
            const compact = findCompactMatch(pageIndex.compactText, pageIndex.compactMap, compactSearch);
            if (compact) {
                return mapMatchToItems(pageIndex, compact.startInfo, compact.endInfo);
            }
        }

    }

    return null;
}

/**
 * Match annotation text and calculate coordinates
 */
export async function matchAnnotationText(
    pageIndexes: PageIndex[],
    annotationText: string,
    labelId: string,
    labels: Label[] = []
): Promise<{ coords: AnnotationCoord[]; color: AnnotationColor } | null> {
    const match = await findTextMatch(pageIndexes, annotationText);
    if (!match) return null;

    const boxes = calculateBoundingBoxes(
        match.textItems,
        match.viewport,
        match.startOffset,
        match.endOffset
    );

    const coords: AnnotationCoord[] = boxes.map(box => ({
        pageIndex: match.pageNumber,
        boundingRect: {
            x1: box.x,
            y1: box.y,
            x2: box.x + box.width,
            y2: box.y + box.height,
            width: box.width,
            height: box.height,
        },
    }));

    const labelDef = labels.find(l => l.name === labelId);
    const color = labelDef ? parseLabelColor(labelDef.color) : colorForLabel(labelId);

    return { coords, color };
}

/**
 * Create an annotated PDF with highlights and sticky notes
 */
export async function createAnnotatedPdfBlob(
    pdfBytes: Uint8Array,
    annotations: Annotation[],
    pageIndexes: PageIndex[],
    labels: Label[] = []
): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    for (const ann of annotations) {
        // Skip rejected annotations
        if (ann.status === 'rejected') continue;

        // Find coordinates if not already computed
        let coords = ann.coords;
        if (!coords || coords.length === 0) {
            const matchResult = await matchAnnotationText(pageIndexes, ann.text, ann.labelId, labels);
            if (matchResult) {
                coords = matchResult.coords;
            }
        }

        if (!coords || coords.length === 0) continue;

        const labelDef = labels.find(l => l.name === ann.labelId);
        const color = labelDef ? parseLabelColor(labelDef.color) : colorForLabel(ann.labelId);
        const [r, g, b] = color.rgb;

        // Group coords by page
        const coordsByPage = new Map<number, AnnotationCoord[]>();
        for (const coord of coords) {
            if (!coordsByPage.has(coord.pageIndex)) {
                coordsByPage.set(coord.pageIndex, []);
            }
            coordsByPage.get(coord.pageIndex)!.push(coord);
        }

        for (const [pageNum, pageCoords] of coordsByPage) {
            const page = pages[pageNum - 1];
            if (!page) continue;

            const { height: pageHeight } = page.getSize();

            // Draw highlight rectangles
            for (const coord of pageCoords) {
                const y = pageHeight - coord.boundingRect.y1 - coord.boundingRect.height;
                page.drawRectangle({
                    x: coord.boundingRect.x1,
                    y,
                    width: coord.boundingRect.width,
                    height: coord.boundingRect.height,
                    color: rgb(r, g, b),
                    opacity: 0.35,
                });
            }

            // Add sticky note annotation on first coord
            const firstCoord = pageCoords[0];
            const firstY = pageHeight - firstCoord.boundingRect.y1 - firstCoord.boundingRect.height;
            const commentText = `${ann.labelId}\n\n${ann.rationale}`;

            const annotDict = pdfDoc.context.obj({
                Type: 'Annot',
                Subtype: 'Text',
                Rect: [
                    firstCoord.boundingRect.x1,
                    firstY + firstCoord.boundingRect.height + 2,
                    firstCoord.boundingRect.x1 + 20,
                    firstY + firstCoord.boundingRect.height + 22,
                ],
                Contents: PDFString.of(commentText),
                Name: 'Comment',
                C: [r, g, b],
            });

            const annotRef = pdfDoc.context.register(annotDict);
            const annots = page.node.lookup(PDFName.of('Annots'));
            if (!annots) {
                page.node.set(PDFName.of('Annots'), pdfDoc.context.obj([annotRef]));
            } else {
                (annots as any).push(annotRef);
            }
        }
    }

    return pdfDoc.save();
}

// --- Summary Generation (Based on sample code) ---

const THEME = {
    primary: rgb(0.96, 0.42, 0.25),
    primaryLight: rgb(0.99, 0.95, 0.93),
    textPrimary: rgb(0.07, 0.09, 0.16),
    textSecondary: rgb(0.42, 0.43, 0.50),
    textMuted: rgb(0.62, 0.63, 0.66),
    bgCream: rgb(0.98, 0.98, 0.98),
    bgGrey: rgb(0.97, 0.97, 0.98),
    white: rgb(1, 1, 1),
    border: rgb(0.90, 0.90, 0.91),
    borderLight: rgb(0.94, 0.94, 0.95),
    success: rgb(0.06, 0.72, 0.51),
    successLight: rgb(0.93, 0.99, 0.96),
    danger: rgb(0.94, 0.27, 0.27),
    dangerLight: rgb(0.99, 0.95, 0.95),
};

const LAYOUT = {
    width: 595.28,
    height: 841.89,
    marginTop: 70,
    marginBottom: 50,
    marginLeft: 40,
    marginRight: 40,
    get contentWidth() { return this.width - this.marginLeft - this.marginRight; }
};

function wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const width = font.widthOfTextAtSize(testLine, fontSize);

        if (width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }

    if (currentLine) {
        lines.push(currentLine);
    }

    return lines;
}

/**
 * Prepend annotation summary pages to a PDF
 */
export async function prependSummaryPages(
    annotatedPdfBytes: Uint8Array,
    payload: SummaryPayload
): Promise<Uint8Array> {
    const summaryDoc = await PDFDocument.create();
    const fontRegular = await summaryDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await summaryDoc.embedFont(StandardFonts.HelveticaBold);
    const fontMono = await summaryDoc.embedFont(StandardFonts.Courier);

    let page = summaryDoc.addPage([LAYOUT.width, LAYOUT.height]);
    let cursorY = LAYOUT.height - LAYOUT.marginTop;
    let pageIndex = 1;
    let isFirstPage = true;

    const addNewPage = () => {
        page = summaryDoc.addPage([LAYOUT.width, LAYOUT.height]);
        pageIndex++;
        cursorY = LAYOUT.height - LAYOUT.marginTop;
        isFirstPage = false;
        drawPageHeader();
    };

    const drawPageHeader = () => {
        if (isFirstPage) return;

        page.drawRectangle({
            x: 0,
            y: LAYOUT.height - 8,
            width: LAYOUT.width,
            height: 8,
            color: THEME.primary
        });

        page.drawLine({
            start: { x: LAYOUT.marginLeft, y: LAYOUT.height - 35 },
            end: { x: LAYOUT.width - LAYOUT.marginRight, y: LAYOUT.height - 35 },
            thickness: 0.5,
            color: THEME.borderLight
        });

        page.drawText('AnnotaLoop Summary', {
            x: LAYOUT.marginLeft,
            y: LAYOUT.height - 30,
            size: 8,
            font: fontRegular,
            color: THEME.textMuted
        });

        cursorY = LAYOUT.height - 50;
    };

    const drawFooter = () => {
        const pageText = `Page ${pageIndex}`;
        const pageWidth = fontRegular.widthOfTextAtSize(pageText, 8);
        page.drawText(pageText, {
            x: (LAYOUT.width - pageWidth) / 2,
            y: 25,
            size: 8,
            font: fontRegular,
            color: THEME.textMuted
        });
    };

    const ensureSpace = (neededHeight: number) => {
        if (cursorY - neededHeight < LAYOUT.marginBottom + 20) {
            drawFooter();
            addNewPage();
        }
    };

    // Draw top border
    if (isFirstPage) {
        page.drawRectangle({
            x: 0,
            y: LAYOUT.height - 8,
            width: LAYOUT.width,
            height: 8,
            color: THEME.primary
        });
    }

    // --- Header Section ---
    ensureSpace(80);

    page.drawText('AnnotaLoop', {
        x: LAYOUT.marginLeft,
        y: cursorY,
        size: 24,
        font: fontBold,
        color: THEME.textPrimary
    });

    cursorY -= 20;

    page.drawText('AI-assisted document annotation with human-in-the-loop workflows', {
        x: LAYOUT.marginLeft,
        y: cursorY,
        size: 11,
        font: fontRegular,
        color: THEME.textSecondary
    });

    cursorY -= 22;

    // Project badge
    if (payload.projectName) {
        const badgeText = `Project: ${payload.projectName}`;
        const badgeWidth = fontBold.widthOfTextAtSize(badgeText, 10) + 16;

        page.drawRectangle({
            x: LAYOUT.marginLeft,
            y: cursorY - 3,
            width: badgeWidth,
            height: 18,
            color: THEME.primaryLight,
            borderColor: rgb(0.95, 0.85, 0.80),
            borderWidth: 1
        });

        page.drawText(badgeText, {
            x: LAYOUT.marginLeft + 8,
            y: cursorY + 2,
            size: 10,
            font: fontBold,
            color: rgb(0.85, 0.35, 0.20)
        });
    }

    // Right side metadata
    const metaY = LAYOUT.height - LAYOUT.marginTop;
    const metaX = LAYOUT.width - LAYOUT.marginRight;

    const metaData = [
        { label: 'Generated:', value: new Date(payload.generatedAt).toLocaleDateString() },
        { label: 'Document:', value: payload.documentName || 'N/A' },
        { label: 'Model:', value: payload.llmModel || 'N/A' },
        { label: 'Version:', value: payload.version },
    ];

    metaData.forEach((item, idx) => {
        const y = metaY - (idx * 14);
        const fullText = `${item.label} ${item.value}`;
        const textWidth = fontRegular.widthOfTextAtSize(fullText, 10);
        const labelWidth = fontBold.widthOfTextAtSize(item.label, 10);

        page.drawText(item.label, {
            x: metaX - textWidth,
            y,
            size: 10,
            font: fontBold,
            color: THEME.textMuted
        });

        page.drawText(item.value, {
            x: metaX - textWidth + labelWidth + 3,
            y,
            size: 10,
            font: fontRegular,
            color: THEME.textPrimary
        });
    });

    cursorY -= 30;

    // Divider line
    page.drawLine({
        start: { x: LAYOUT.marginLeft, y: cursorY },
        end: { x: LAYOUT.width - LAYOUT.marginRight, y: cursorY },
        thickness: 1,
        color: THEME.border
    });

    cursorY -= 25;

    // --- Stats Section ---
    ensureSpace(95);

    // Section title
    page.drawRectangle({
        x: LAYOUT.marginLeft - 10,
        y: cursorY - 4,
        width: 3,
        height: 14,
        color: THEME.primary
    });

    page.drawText('OVERVIEW', {
        x: LAYOUT.marginLeft,
        y: cursorY,
        size: 11,
        font: fontBold,
        color: THEME.primary
    });

    cursorY -= 25;

    // Stats cards
    const cardHeight = 75;
    const cardGap = 15;
    const cardWidth = (LAYOUT.contentWidth - (cardGap * 2)) / 3;

    const cards = [
        {
            title: 'ANNOTATIONS',
            value: String(payload.stats.acceptedCount + payload.stats.rejectedCount),
            subtitle: `${payload.stats.acceptedCount} Accepted / ${payload.stats.rejectedCount} Rejected`
        },
        {
            title: 'TOTAL TOKENS',
            value: String(payload.stats.totalTokens || 0),
            subtitle: 'Estimated usage'
        },
        {
            title: 'LABELS',
            value: String(payload.stats.labelsCount),
            subtitle: `${payload.stats.rulesCount} Rules defined`
        }
    ];

    cards.forEach((card, i) => {
        const x = LAYOUT.marginLeft + (i * (cardWidth + cardGap));
        const y = cursorY - cardHeight;

        page.drawRectangle({
            x,
            y,
            width: cardWidth,
            height: cardHeight,
            color: THEME.bgCream,
            borderColor: THEME.border,
            borderWidth: 1
        });

        page.drawText(card.title, {
            x: x + 12,
            y: y + cardHeight - 18,
            size: 9,
            font: fontBold,
            color: THEME.textMuted
        });

        page.drawText(card.value, {
            x: x + 12,
            y: y + cardHeight - 45,
            size: 22,
            font: fontBold,
            color: THEME.textPrimary
        });

        page.drawText(card.subtitle, {
            x: x + 12,
            y: y + 18,
            size: 9,
            font: fontRegular,
            color: THEME.textSecondary
        });
    });

    cursorY -= (cardHeight + 30);

    // --- Label Breakdown Section ---
    ensureSpace(50);

    page.drawRectangle({
        x: LAYOUT.marginLeft - 10,
        y: cursorY - 4,
        width: 3,
        height: 14,
        color: THEME.primary
    });

    page.drawText('LABEL BREAKDOWN', {
        x: LAYOUT.marginLeft,
        y: cursorY,
        size: 11,
        font: fontBold,
        color: THEME.primary
    });

    cursorY -= 25;

    // Table header
    const colWidths = [25, 175, 80, 235];

    page.drawRectangle({
        x: LAYOUT.marginLeft,
        y: cursorY - 24,
        width: LAYOUT.contentWidth,
        height: 24,
        color: THEME.bgGrey
    });

    const headers = ['', 'LABEL NAME', 'COUNT', 'DESCRIPTION'];
    let colX = LAYOUT.marginLeft;

    headers.forEach((header, i) => {
        page.drawText(header, {
            x: colX + 10,
            y: cursorY - 16,
            size: 9,
            font: fontBold,
            color: THEME.textMuted
        });
        colX += colWidths[i];
    });

    cursorY -= 24;

    // Table rows
    for (const label of payload.labels) {
        ensureSpace(28);

        const count = payload.stats.annotationCounts.find(a => a.label === label.name)?.count || 0;
        const color = parseLabelColor(label.color);
        const [r, g, b] = color.rgb;

        page.drawLine({
            start: { x: LAYOUT.marginLeft, y: cursorY },
            end: { x: LAYOUT.width - LAYOUT.marginRight, y: cursorY },
            thickness: 0.5,
            color: THEME.borderLight
        });

        colX = LAYOUT.marginLeft;

        // Color Swatch
        page.drawRectangle({
            x: colX + 8,
            y: cursorY - 20,
            width: 12,
            height: 12,
            color: rgb(r, g, b),
            borderColor: THEME.borderLight,
            borderWidth: 0.5
        });

        colX += colWidths[0];

        page.drawText(label.name, {
            x: colX + 10,
            y: cursorY - 18,
            size: 10,
            font: fontMono,
            color: THEME.textPrimary
        });

        colX += colWidths[1];

        page.drawText(String(count), {
            x: colX + 10,
            y: cursorY - 18,
            size: 10,
            font: fontBold,
            color: THEME.textPrimary
        });

        colX += colWidths[2];

        const desc = label.desc || '';
        const descLines = wrapText(desc, colWidths[3] - 20, fontRegular, 9);
        descLines.slice(0, 2).forEach((line, lineIdx) => {
            page.drawText(line, {
                x: colX + 10,
                y: cursorY - 18 - (lineIdx * 11),
                size: 9,
                font: fontRegular,
                color: THEME.textSecondary
            });
        });

        cursorY -= 28;
    }

    cursorY -= 20;

    // --- Rule Evaluations Section ---
    if (payload.ruleEvaluations && payload.ruleEvaluations.length > 0) {
        ensureSpace(50);

        page.drawRectangle({
            x: LAYOUT.marginLeft - 10,
            y: cursorY - 4,
            width: 3,
            height: 14,
            color: THEME.primary
        });

        page.drawText('RULE EVALUATIONS', {
            x: LAYOUT.marginLeft,
            y: cursorY,
            size: 11,
            font: fontBold,
            color: THEME.primary
        });

        cursorY -= 25;

        for (const ev of payload.ruleEvaluations) {
            const ruleDef = payload.rules?.find(r => r.name === ev.ruleId);

            // Calculate height requirements
            const ruleLogic = ruleDef?.logic || '';
            const logicLines = wrapText(ruleLogic, LAYOUT.contentWidth - 24, fontMono, 9);
            const rationaleLines = wrapText(ev.rationale, LAYOUT.contentWidth - 24, fontRegular, 9);

            // Layout constants
            const headerH = 30;
            const logicH = ruleLogic ? (logicLines.length * 11) + 16 : 0;
            const rationaleH = (rationaleLines.length * 11) + 20; // + header
            const citationH = ev.citations.length * 20 + 20; // rough estimate
            const totalH = headerH + logicH + rationaleH + (ev.citations.length > 0 ? citationH : 0) + 10; // + padding

            ensureSpace(totalH);

            // Container Box
            const boxY = cursorY - totalH;

            page.drawRectangle({
                x: LAYOUT.marginLeft,
                y: boxY,
                width: LAYOUT.contentWidth,
                height: totalH,
                color: THEME.white,
                borderColor: THEME.borderLight,
                borderWidth: 1
            });

            let currentY = cursorY - 20;

            // 1. Header: Rule Name + Pass/Fail + Confidence
            page.drawText(ev.ruleId, {
                x: LAYOUT.marginLeft + 12,
                y: currentY,
                size: 10,
                font: fontBold,
                color: THEME.textPrimary
            });

            // Pass/Fail Badge
            const statusText = ev.pass ? 'PASSED' : 'FAILED';
            const statusColor = ev.pass ? THEME.success : THEME.danger;
            const statusBg = ev.pass ? THEME.successLight : THEME.dangerLight;
            const statusWidth = fontBold.widthOfTextAtSize(statusText, 8) + 12;

            page.drawRectangle({
                x: LAYOUT.width - LAYOUT.marginRight - statusWidth - 12 - (ev.confidence !== undefined ? 60 : 0),
                y: currentY - 2,
                width: statusWidth,
                height: 14,
                color: statusBg,
                borderColor: statusColor,
                borderWidth: 0.5
            });

            page.drawText(statusText, {
                x: LAYOUT.width - LAYOUT.marginRight - statusWidth - 6 - (ev.confidence !== undefined ? 60 : 0),
                y: currentY + 2,
                size: 8,
                font: fontBold,
                color: statusColor
            });

            // Confidence
            if (ev.confidence !== undefined) {
                const confText = `${(ev.confidence * 100).toFixed(0)}%`;
                page.drawText('Conf:', {
                    x: LAYOUT.width - LAYOUT.marginRight - 50,
                    y: currentY + 2,
                    size: 8,
                    font: fontBold,
                    color: THEME.textMuted
                });
                page.drawText(confText, {
                    x: LAYOUT.width - LAYOUT.marginRight - 25,
                    y: currentY + 2,
                    size: 8,
                    font: fontMono,
                    color: ev.confidence > 0.8 ? THEME.success : (ev.confidence > 0.5 ? rgb(0.8, 0.6, 0) : THEME.danger)
                });
            }

            currentY -= 20;

            // 2. Logic Definition
            if (ruleLogic) {
                page.drawRectangle({
                    x: LAYOUT.marginLeft + 12,
                    y: currentY - (logicLines.length * 11) + 8,
                    width: LAYOUT.contentWidth - 24,
                    height: (logicLines.length * 11) + 4,
                    color: THEME.bgGrey // Light grey for definition
                });

                logicLines.forEach((line, i) => {
                    page.drawText(line, {
                        x: LAYOUT.marginLeft + 18,
                        y: currentY - (i * 11),
                        size: 9,
                        font: fontMono,
                        color: THEME.textSecondary
                    });
                });
                currentY -= (logicLines.length * 11) + 16;
            }

            // 3. Rationale
            page.drawText('RATIONALE', {
                x: LAYOUT.marginLeft + 12,
                y: currentY,
                size: 8,
                font: fontBold,
                color: THEME.textMuted
            });
            currentY -= 12;

            rationaleLines.forEach((line, i) => {
                page.drawText(line, {
                    x: LAYOUT.marginLeft + 12,
                    y: currentY - (i * 11),
                    size: 9,
                    font: fontRegular,
                    color: THEME.textPrimary
                });
            });
            currentY -= (rationaleLines.length * 11) + 14;

            // 4. Citations
            if (ev.citations.length > 0) {
                page.drawText('EVIDENCE', {
                    x: LAYOUT.marginLeft + 12,
                    y: currentY,
                    size: 8,
                    font: fontBold,
                    color: THEME.textMuted
                });
                currentY -= 12;

                for (const cit of ev.citations) {
                    // Try to split marker [X] from text
                    const match = cit.match(/^(\[\d+\])\s*(.*)/);
                    let marker = '', content = cit;

                    if (match) {
                        marker = match[1];
                        content = match[2];
                    }

                    const indent = 24;
                    const contentWidth = LAYOUT.contentWidth - indent - 20;
                    const citLines = wrapText(content, contentWidth, fontRegular, 9);

                    // Draw marker on first line
                    if (marker) {
                        page.drawText(marker, {
                            x: LAYOUT.marginLeft + 12,
                            y: currentY,
                            size: 9,
                            font: fontMono,
                            color: THEME.textSecondary
                        });
                    } else if (citLines.length > 0) {
                        // Fallback if no marker match
                    }

                    citLines.forEach((line, i) => {
                        page.drawText(line, {
                            x: LAYOUT.marginLeft + 12 + (marker ? indent : 0),
                            y: currentY - (i * 11),
                            size: 9,
                            font: fontRegular,
                            color: THEME.textSecondary
                        });
                    });

                    currentY -= (citLines.length * 11) + 6;
                }
            }

            cursorY -= (totalH + 15);
        }
    }

    drawFooter();

    // --- Merge with original PDF ---
    const annotatedDoc = await PDFDocument.load(annotatedPdfBytes);
    const mergedDoc = await PDFDocument.create();

    const summaryPages = await mergedDoc.copyPages(summaryDoc, summaryDoc.getPageIndices());
    summaryPages.forEach((p: any) => mergedDoc.addPage(p));

    const annotatedPages = await mergedDoc.copyPages(annotatedDoc, annotatedDoc.getPageIndices());
    annotatedPages.forEach((p: any) => mergedDoc.addPage(p));

    return mergedDoc.save();
}
