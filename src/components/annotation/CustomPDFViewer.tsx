import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';

interface CustomPDFViewerProps {
    fileUrl: string;
    className?: string;
}

const CustomPDFViewer: React.FC<CustomPDFViewerProps> = ({ fileUrl, className = '' }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [pdf, setPdf] = useState<any>(null);
    const [scale, setScale] = useState(1.0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setError(null);

        const loadPDF = async () => {
            try {
                if (fileUrl.startsWith('blob:')) {
                    const response = await fetch(fileUrl);
                    const blob = await response.blob();
                    const arrayBuffer = await blob.arrayBuffer();

                    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                    const pdfDoc = await loadingTask.promise;

                    if (isMounted) {
                        setPdf(pdfDoc);
                        setLoading(false);
                    }
                } else {
                    const loadingTask = pdfjsLib.getDocument(fileUrl);
                    const pdfDoc = await loadingTask.promise;

                    if (isMounted) {
                        setPdf(pdfDoc);
                        setLoading(false);
                    }
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
        return () => {
            isMounted = false;
        };
    }, [fileUrl]);

    const renderPages = useCallback(async () => {
        if (!pdf || !containerRef.current) return;

        const container = containerRef.current;

        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        const containerWidth = container.clientWidth - 32;
        const dpr = window.devicePixelRatio || 1;

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            try {
                const page = await pdf.getPage(pageNum);

                const baseViewport = page.getViewport({ scale: 1.0 });
                const fitScale = containerWidth / baseViewport.width;

                const renderScale = fitScale * scale * dpr;
                const viewport = page.getViewport({ scale: renderScale });

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
                canvas.style.margin = '0 auto 16px';
                canvas.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                canvas.style.backgroundColor = 'white';

                container.appendChild(canvas);

                await page.render({
                    canvasContext: context,
                    viewport: viewport,
                }).promise;
            } catch (err) {
                console.error(`Error rendering page ${pageNum}:`, err);
            }
        }
    }, [pdf, scale]);

    useEffect(() => {
        renderPages();
    }, [renderPages]);

    const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.03, 3.0));
    const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.03, 0.5));
    const handleFitWidth = () => setScale(1.0);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                setScale((prevScale) => {
                    const delta = e.deltaY;
                    return delta > 0 ? Math.max(prevScale - 0.1, 0.5) : Math.min(prevScale + 0.1, 3.0);
                });
            }
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, []);



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
                        </div>
                    )}
                </div>
            )}

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
                ref={containerRef}
                className="flex-1 min-w-0 w-full h-full overflow-auto p-4"
                style={{ backgroundColor: '#f9fafb' }}
            />
        </div>
    );
};

export default CustomPDFViewer;
