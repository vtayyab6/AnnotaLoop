import { useEffect, useState, useRef } from 'react';
import type { Document, Annotation, Label } from '../../context/types';
import { FileText, AlertCircle, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import CustomPDFViewer from './CustomPDFViewer';
import AnnotatedPDFViewer, { type AnnotatedPDFViewerRef } from './AnnotatedPDFViewer';
import { getDisplayFileType, renderWordDocument } from '../../utils/FileConverter';
import { generatePdfFromContent } from '../../utils/pdfConverter';
import { convertWordToPdf } from '../../utils/wordToPdfConverter';

interface DocumentViewerProps {
    doc: Document;
    annotations?: Annotation[];
    activeAnnotationId?: string | null;
    onAnnotationClick?: (annotationId: string) => void;
    showAnnotations?: boolean;
    labels?: Label[];
}

const DocumentViewer = ({
    doc,
    annotations = [],
    activeAnnotationId,
    onAnnotationClick,
    showAnnotations = false,
    labels = []
}: DocumentViewerProps) => {
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isConvertingToPdf, setIsConvertingToPdf] = useState(false);
    const [scale, setScale] = useState(1);
    const wordContainerRef = useRef<HTMLDivElement>(null);
    const annotatedViewerRef = useRef<AnnotatedPDFViewerRef>(null);

    const handleZoomIn = () => setScale(prev => Math.min(prev + 0.1, 2));
    const handleZoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.5));
    const handleFit = () => setScale(0.7);

    const displayType = doc.fileUrl ? getDisplayFileType(doc.name) : 'text';

    // Determine file type for conversion
    const getFileType = (filename: string): 'md' | 'txt' => {
        return filename.toLowerCase().endsWith('.md') ? 'md' : 'txt';
    };

    // Reset scale when document changes (Word only)
    useEffect(() => {
        if (displayType === 'word') {
            setScale(0.7);
        }
    }, [displayType, doc.fileUrl]);

    // Handle PDF and text file display - convert text to PDF for consistent preview
    useEffect(() => {
        const loadFile = async () => {
            // For PDF files, load directly
            if (displayType === 'pdf') {
                if (doc.storageId && (!doc.fileUrl || doc.fileUrl.startsWith('blob:'))) {
                    // Get file extension from document name
                    const ext = doc.name.includes('.') ? doc.name.substring(doc.name.lastIndexOf('.')) : '.pdf';

                    // Try IndexedDB first (where files are stored on normal upload)
                    try {
                        const { getFileFromStorage } = await import('../../utils/fileStorage');
                        const file = await getFileFromStorage(doc.storageId);
                        if (file) {
                            const newUrl = URL.createObjectURL(file);
                            setPdfUrl(newUrl);
                            return;
                        }
                    } catch (e) {
                        console.warn('[DocumentViewer] IndexedDB lookup failed:', e);
                    }

                    // Fallback: Try Tauri storage (for imported files)
                    try {
                        const { loadTauriFile } = await import('../../utils/tauriFileStorage');
                        const tauriData = await loadTauriFile(doc.storageId, ext, false);
                        const blob = new Blob([new Uint8Array(tauriData)], { type: 'application/pdf' });
                        const blobUrl = URL.createObjectURL(blob);
                        setPdfUrl(blobUrl);
                        console.log('[DocumentViewer] Loaded PDF from Tauri storage:', doc.name);
                        return;
                    } catch (e) {
                        console.warn('[DocumentViewer] Tauri storage lookup failed:', e);
                    }
                }

                if (doc.fileUrl && doc.name.toLowerCase().endsWith('.pdf')) {
                    setPdfUrl(doc.fileUrl);
                } else {
                    setPdfUrl(null);
                }
                return;
            }

            // For Word files, convert to PDF for annotation
            if (displayType === 'word' && doc.fileUrl) {
                setIsConvertingToPdf(true);
                try {
                    // Fetch blob
                    let blob: Blob;
                    if (doc.storageId) {
                        const { getFileFromStorage } = await import('../../utils/fileStorage');
                        const file = await getFileFromStorage(doc.storageId);
                        if (file) blob = file;
                        else {
                            const res = await fetch(doc.fileUrl);
                            blob = await res.blob();
                        }
                    } else {
                        const res = await fetch(doc.fileUrl);
                        blob = await res.blob();
                    }

                    const pdfBlob = await convertWordToPdf(blob);
                    const url = URL.createObjectURL(pdfBlob);
                    setPdfUrl(url);
                } catch (e) {
                    console.error("Failed to convert Word to PDF", e);
                    // Fallback to normal Word view happens if pdfUrl remains null
                } finally {
                    setIsConvertingToPdf(false);
                }
                return;
            }

            // For TXT/MD files, convert to PDF for consistent display
            if (displayType === 'text' && (doc.extractedText || doc.fileUrl)) {
                setIsConvertingToPdf(true);
                try {
                    let textContent = doc.extractedText;

                    // If no extracted text, fetch from fileUrl
                    if (!textContent && doc.fileUrl) {
                        const response = await fetch(doc.fileUrl);
                        textContent = await response.text();
                    }

                    if (textContent) {
                        const fileType = getFileType(doc.name);
                        const pdfBlobUrl = await generatePdfFromContent(
                            textContent,
                            doc.name.replace(/\.[^/.]+$/, ''),
                            fileType
                        );
                        setPdfUrl(pdfBlobUrl);
                    }
                } catch (e) {
                    console.error('Failed to convert text to PDF', e);
                    setPdfUrl(null);
                } finally {
                    setIsConvertingToPdf(false);
                }
                return;
            }

            setPdfUrl(null);
        };

        loadFile();
    }, [doc.fileUrl, doc.name, displayType, doc.storageId, doc.extractedText]);

    // Word View with constrained rendering (Moved to top level)
    useEffect(() => {
        if (displayType === 'word' && wordContainerRef.current) {
            // setScale(0.7); // Handled by separate effect
            const loadWordDoc = async () => {
                setIsLoading(true);
                try {
                    // 1. Try Storage first (most reliable for persistent files)
                    if (doc.storageId) {
                        try {
                            const { getFileFromStorage } = await import('../../utils/fileStorage');
                            const file = await getFileFromStorage(doc.storageId);
                            if (file) {
                                await renderWordDocument(file, wordContainerRef.current!);
                                return;
                            }
                        } catch (e) {
                            console.warn("Failed to load from storage", e);
                        }
                    }

                    // 2. Try Fetch (Blob URL or http)
                    if (doc.fileUrl) {
                        const res = await fetch(doc.fileUrl);
                        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
                        const blob = await res.blob();
                        await renderWordDocument(blob, wordContainerRef.current!);
                        return;
                    }

                    if (!doc.storageId && !doc.fileUrl) {
                        // Just wait or handle empty
                    }

                } catch (err) {
                    console.error("Word render failed", err);
                } finally {
                    setIsLoading(false);
                }
            };

            loadWordDoc();

            return () => {
                if (wordContainerRef.current) wordContainerRef.current.innerHTML = '';
            };
        }
    }, [displayType, doc.fileUrl, doc.storageId]);

    if (!doc.fileUrl) {
        return (
            <div className="w-full max-w-4xl bg-white shadow-lg rounded-xl min-h-[800px] flex flex-col pt-8 pb-16 px-12 transition-all">
                <div className="mb-10 text-center border-b border-gray-100 pb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 mb-4">
                        <FileText className="w-8 h-8 text-gray-400" />
                    </div>
                    <h1 className="text-3xl font-serif text-gray-800 mb-2">{doc.name}</h1>
                    <p className="text-sm text-gray-500 uppercase tracking-widest font-medium">
                        Confidential Document • {doc.date}
                    </p>
                </div>
                <div className="text-center text-gray-400 mt-10">
                    <p>This is a mock document. Upload a real file to see it here.</p>
                </div>
            </div>
        );
    }

    // PDF View with annotations - use AnnotatedPDFViewer when annotations available
    // Also handles converted Word/Text files
    if ((displayType === 'pdf' || displayType === 'text' || displayType === 'word') && pdfUrl) {
        // Use AnnotatedPDFViewer when we have annotations to display
        if (showAnnotations && annotations.length > 0) {
            return (
                <AnnotatedPDFViewer
                    ref={annotatedViewerRef}
                    fileUrl={pdfUrl}
                    annotations={annotations}
                    activeAnnotationId={activeAnnotationId}
                    onAnnotationClick={onAnnotationClick}
                    labels={labels}
                    className="w-full h-full"
                />
            );
        }

        // Use regular CustomPDFViewer when no annotations
        return <CustomPDFViewer fileUrl={pdfUrl} className="w-full h-full" />;
    }

    // Loading state for PDF conversion (text or word)
    if ((displayType === 'text' || displayType === 'word') && isConvertingToPdf) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-sm text-gray-500">Converting to PDF preview...</p>
                </div>
            </div>
        );
    }



    if (displayType === 'word') {
        // Re-add Word document rendering
        return (
            <div className="w-full h-full flex flex-col bg-gray-50 dark:bg-gray-950 overflow-hidden relative">
                {/* Word Viewer Toolbar */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-px bg-black/60 backdrop-blur-sm rounded px-1 py-0.5 shadow-lg">
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
                    <button onClick={handleFit} className="p-0.5 hover:bg-white/20 rounded" title="Fit">
                        <Maximize2 className="w-3 h-3 text-white" />
                    </button>
                </div>

                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-50">
                        <div className="text-center">
                            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-sm text-gray-500">Rendering Word document...</p>
                        </div>
                    </div>
                )}
                <div className="flex-1 overflow-auto w-full h-full flex justify-center p-8">
                    <div
                        ref={wordContainerRef}
                        className="docx-wrapper origin-top"
                        style={{
                            width: '100%',
                            maxWidth: '210mm',
                            backgroundColor: 'transparent', // Let pages define background
                            boxShadow: 'none', // Remove wrapper shadow, pages have shadows
                            minHeight: '297mm',
                            transform: `scale(${scale})`,
                            transformOrigin: 'top center',
                            transition: 'transform 0.2s ease-out',
                            marginBottom: '2rem'
                        }}
                    />
                </div>
            </div>
        );
    }

    // Image View
    if (displayType === 'image') {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center overflow-auto p-4 bg-gray-100 dark:bg-gray-950 relative">
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur dark:bg-gray-800/90 p-2 rounded-lg shadow-sm flex gap-2 z-10">
                    <button
                        onClick={handleZoomOut}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        title="Zoom Out"
                    >
                        <ZoomOut className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    </button>
                    <button
                        onClick={handleZoomIn}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        title="Zoom In"
                    >
                        <ZoomIn className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    </button>
                </div>

                <img
                    src={doc.fileUrl}
                    alt={doc.name}
                    className="max-w-full max-h-full shadow-lg object-contain transition-transform duration-200"
                    style={{ transform: `scale(${scale})` }}
                />
            </div>
        );
    }

    // Fallback
    return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
            <p>Preview unavailable for this file type.</p>
        </div>
    );
};

export default DocumentViewer;

