/**
 * AnnotatedPDFViewer Component
 * Renders PDF with annotation highlights overlaid on top
 */

import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import type { Annotation, Label } from '../../context/types';
import { indexPdfPages, matchAnnotationText, colorForLabel, parseLabelColor, type PageIndex, type AnnotationCoord } from '../../utils/pdfAnnotationService';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';

export interface AnnotatedPDFViewerRef {
    scrollToAnnotation: (annotationId: string) => void;
}

interface AnnotatedPDFViewerProps {
    fileUrl: string;
    annotations: Annotation[];
    activeAnnotationId?: string | null;
    onAnnotationClick?: (annotationId: string) => void;
    labels?: Label[];
    className?: string;
}

interface AnnotationWithCoords extends Annotation {
    coords?: AnnotationCoord[];
    color?: { rgb: [number, number, number]; hex: string; soft: string };
}

const AnnotatedPDFViewer = forwardRef<AnnotatedPDFViewerRef, AnnotatedPDFViewerProps>(({
    fileUrl,
    annotations,
    activeAnnotationId,
    onAnnotationClick,
    labels = [],
    className = ''
}, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [pdf, setPdf] = useState<any>(null);
    const [scale, setScale] = useState(1.0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pageIndexes, setPageIndexes] = useState<PageIndex[]>([]);
    const [annotationsWithCoords, setAnnotationsWithCoords] = useState<AnnotationWithCoords[]>([]);
    const highlightRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    // Expose scrollToAnnotation method via ref
    useImperativeHandle(ref, () => ({
        scrollToAnnotation: (annotationId: string) => {
            const highlight = highlightRefs.current.get(annotationId);
            if (highlight) {
                highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }));

    // Load PDF
    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setError(null);

        const loadPDF = async () => {
            try {
                let pdfDoc;
                if (fileUrl.startsWith('blob:')) {
                    const response = await fetch(fileUrl);
                    const blob = await response.blob();
                    const arrayBuffer = await blob.arrayBuffer();
                    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                    pdfDoc = await loadingTask.promise;
                } else {
                    const loadingTask = pdfjsLib.getDocument(fileUrl);
                    pdfDoc = await loadingTask.promise;
                }

                if (isMounted) {
                    setPdf(pdfDoc);

                    // Index pages for text matching
                    const indexes = await indexPdfPages(pdfDoc);
                    setPageIndexes(indexes);
                    setLoading(false);
                }
            } catch (err: any) {
                console.error('PDF loading error:', err);
                if (isMounted) {
                    setError(err.message || 'Failed to load PDF');
                    setLoading(false);
                }
            }
        };

        loadPDF();
        return () => { isMounted = false; };
    }, [fileUrl]);

    // Match annotations with text coordinates
    useEffect(() => {
        const matchAnnotations = async () => {
            if (pageIndexes.length === 0 || annotations.length === 0) {
                setAnnotationsWithCoords([]);
                return;
            }

            const matched: AnnotationWithCoords[] = [];

            for (const ann of annotations) {
                // Skip rejected annotations
                if (ann.status === 'rejected') continue;

                let coords = ann.coords;
                let color = ann.color;

                if (!coords || coords.length === 0) {
                    const result = await matchAnnotationText(pageIndexes, ann.text, ann.labelId, labels);
                    if (result) {
                        coords = result.coords;
                        color = result.color;
                    }
                }

                if (!color) {
                    const labelDef = labels.find(l => l.name === ann.labelId);
                    color = labelDef ? parseLabelColor(labelDef.color) : colorForLabel(ann.labelId);
                }

                matched.push({
                    ...ann,
                    coords,
                    color
                });
            }

            setAnnotationsWithCoords(matched);
        };

        matchAnnotations();
    }, [pageIndexes, annotations, labels]);

    // Render pages
    const renderPages = useCallback(async () => {
        if (!pdf || !containerRef.current) return;

        const container = containerRef.current;

        // Clear existing content
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        highlightRefs.current.clear();

        const containerWidth = container.clientWidth - 32;
        const dpr = window.devicePixelRatio || 1;

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            try {
                const page = await pdf.getPage(pageNum);

                const baseViewport = page.getViewport({ scale: 1.0 });
                const fitScale = containerWidth / baseViewport.width;
                const renderScale = fitScale * scale * dpr;
                const viewport = page.getViewport({ scale: renderScale });

                // Create page wrapper
                const pageWrapper = document.createElement('div');
                pageWrapper.className = 'page-wrapper';
                pageWrapper.style.position = 'relative';
                pageWrapper.style.margin = '0 auto 16px';
                pageWrapper.dataset.page = String(pageNum);

                // Create canvas
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d', { alpha: false });
                if (!context) continue;

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const displayWidth = containerWidth * scale;
                const displayHeight = (viewport.height / viewport.width) * displayWidth;

                canvas.style.width = `${displayWidth}px`;
                canvas.style.height = `${displayHeight}px`;
                canvas.style.display = 'block';
                canvas.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                canvas.style.backgroundColor = 'white';

                pageWrapper.style.width = `${displayWidth}px`;
                pageWrapper.style.height = `${displayHeight}px`;

                // Create overlay for highlights
                const overlay = document.createElement('div');
                overlay.className = 'highlight-overlay';
                overlay.style.position = 'absolute';
                overlay.style.top = '0';
                overlay.style.left = '0';
                overlay.style.width = '100%';
                overlay.style.height = '100%';
                overlay.style.pointerEvents = 'none';

                pageWrapper.appendChild(canvas);
                pageWrapper.appendChild(overlay);
                container.appendChild(pageWrapper);

                // Render PDF page
                await page.render({
                    canvasContext: context,
                    viewport: viewport,
                }).promise;

                // Add highlights for this page
                const pageViewport = page.getViewport({ scale: 1.0 });
                const displayScale = displayWidth / pageViewport.width;

                for (const ann of annotationsWithCoords) {
                    if (!ann.coords || ann.coords.length === 0) continue;

                    for (const coord of ann.coords) {
                        if (coord.pageIndex !== pageNum) continue;

                        const highlight = document.createElement('div');
                        highlight.className = 'annotation-highlight';
                        highlight.dataset.annotationId = ann.id;
                        highlight.style.position = 'absolute';
                        highlight.style.left = `${coord.boundingRect.x1 * displayScale}px`;
                        highlight.style.top = `${coord.boundingRect.y1 * displayScale}px`;
                        highlight.style.width = `${coord.boundingRect.width * displayScale}px`;
                        highlight.style.height = `${coord.boundingRect.height * displayScale}px`;
                        highlight.style.backgroundColor = ann.color?.soft || 'rgba(255, 200, 0, 0.35)';
                        highlight.style.borderRadius = '3px';
                        highlight.style.pointerEvents = 'auto';
                        highlight.style.cursor = 'pointer';
                        highlight.style.transition = 'box-shadow 0.2s ease, opacity 0.2s ease';

                        // Active state styling handled by separate effect
                        // if (activeAnnotationId === ann.id) {
                        //    highlight.style.boxShadow = `0 0 0 2px ${ann.color?.hex || '#f26d5b'}`;
                        //    highlight.style.opacity = '0.8';
                        // }

                        // Click handler
                        highlight.addEventListener('click', () => {
                            if (onAnnotationClickRef.current) {
                                onAnnotationClickRef.current(ann.id);
                            }
                        });

                        // Hover effect
                        highlight.addEventListener('mouseenter', () => {
                            highlight.style.opacity = '0.7';
                        });
                        highlight.addEventListener('mouseleave', () => {
                            // Let the separate effect handle the opacity reset if needed, 
                            // but simplifying hover logic for now
                            // We'll manage active class manually
                            const isActive = highlight.classList.contains('active-highlight');
                            highlight.style.opacity = isActive ? '0.8' : '1';
                        });

                        overlay.appendChild(highlight);

                        // Store first highlight ref for scrolling
                        if (!highlightRefs.current.has(ann.id)) {
                            highlightRefs.current.set(ann.id, highlight);
                        }
                    }
                }
            } catch (err) {
                console.error(`Error rendering page ${pageNum}:`, err);
            }
        }


    }, [pdf, scale, annotationsWithCoords]); // Removed onAnnotationClick dependency

    // Keep callback ref updated
    const onAnnotationClickRef = useRef(onAnnotationClick);
    useEffect(() => {
        onAnnotationClickRef.current = onAnnotationClick;
    }, [onAnnotationClick]);

    useEffect(() => {
        renderPages();
    }, [renderPages]);

    // Zoom handlers
    const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.1, 3.0));
    const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.1, 0.5));
    const handleFitWidth = () => setScale(1.0);

    // Scroll zoom handling
    useEffect(() => {
        const scrollContainer = scrollContainerRef.current;
        if (!scrollContainer) return;

        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                setScale((prevScale) => {
                    const delta = e.deltaY;
                    return delta > 0 ? Math.max(prevScale - 0.1, 0.5) : Math.min(prevScale + 0.1, 3.0);
                });
            }
        };

        scrollContainer.addEventListener('wheel', handleWheel, { passive: false });
        return () => scrollContainer.removeEventListener('wheel', handleWheel);
    }, []);

    // Handle active annotation styling and scrolling separately to avoid re-rendering
    useEffect(() => {
        // Reset ALL highlights (not just the ones in the ref map, but all DOM elements)
        const allHighlightElements = containerRef.current?.querySelectorAll('.annotation-highlight');
        if (allHighlightElements) {
            allHighlightElements.forEach((el) => {
                const div = el as HTMLDivElement;
                div.style.boxShadow = 'none';
                div.style.opacity = '1';
                div.style.zIndex = '';
                div.classList.remove('active-highlight');
            });
        }

        if (activeAnnotationId) {
            // Find all highlights for this specific annotation (could be multiple rects/pages)
            const activeHighlights = containerRef.current?.querySelectorAll(`[data-annotation-id="${activeAnnotationId}"]`);
            if (activeHighlights) {
                activeHighlights.forEach((el) => {
                    const div = el as HTMLDivElement;
                    div.style.boxShadow = '0 0 0 2px #3b82f6'; // Blue-500 for active
                    div.style.opacity = '0.8';
                    div.classList.add('active-highlight');
                    div.style.zIndex = '10'; // Bring to front
                });
            }

            // Scroll the FIRST one into view
            const mainHighlight = highlightRefs.current.get(activeAnnotationId);
            if (mainHighlight) {
                mainHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [activeAnnotationId, scale]); // Run when active ID changes or scale changes (re-render checks)



    return (
        <div className={`relative w-full h-full min-w-0 overflow-hidden flex flex-col bg-gray-50 dark:bg-gray-900 ${className}`}>
            {/* Loading/Error Overlay */}
            {(loading || error) && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center bg-white/90 dark:bg-gray-900/95 backdrop-blur-sm transition-all duration-300">
                    {error ? (
                        <div className="text-center text-red-500 dark:text-red-400 p-4">
                            <p className="text-sm font-medium mb-2">Failed to load PDF</p>
                            <p className="text-xs opacity-70">{error}</p>
                        </div>
                    ) : (
                        <div className="text-center">
                            <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3"></div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Loading Document...</p>
                            {pageIndexes.length === 0 && annotations.length > 0 && (
                                <p className="text-xs text-gray-400 mt-1">Indexing content...</p>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Zoom toolbar */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-px bg-black/60 backdrop-blur-sm rounded px-1 py-0.5 shadow-lg">
                <button onClick={handleZoomOut} className="p-0.5 hover:bg-white/20 rounded" title="Zoom Out">
                    <ZoomOut className="w-3 h-3 text-white" />
                </button>
                <div className="px-1 text-[9px] font-mono text-white min-w-[28px] text-center">
                    {Math.round(scale * 100)}%
                </div>
                <button onClick={handleZoomIn} className="p-0.5 hover:bg-white/20 rounded" title="Zoom In">
                    <ZoomIn className="w-3 h-3 text-white" />
                </button>
                <div className="w-px h-2.5 bg-white/30 mx-px"></div>
                <button onClick={handleFitWidth} className="p-0.5 hover:bg-white/20 rounded" title="Fit">
                    <Maximize2 className="w-3 h-3 text-white" />
                </button>
            </div>



            <div
                ref={scrollContainerRef}
                className="flex-1 min-w-0 w-full h-full overflow-auto p-4"
                style={{ backgroundColor: '#f9fafb' }}
            >
                <div ref={containerRef} />
            </div>
        </div>
    );
});

AnnotatedPDFViewer.displayName = 'AnnotatedPDFViewer';

export default AnnotatedPDFViewer;
