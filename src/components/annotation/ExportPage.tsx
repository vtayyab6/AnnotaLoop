import React, { useMemo, useState, useEffect } from 'react';
import { Download, FileJson, FileText, Table, Copy, Check, Eye, ChevronLeft } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Document } from '../../context/types';
import CustomPDFViewer from './CustomPDFViewer';
import FilenameDialog from '../modals/FilenameDialog';
import { generatePdfFromContent } from '../../utils/pdfConverter';
import * as pdfjsLib from 'pdfjs-dist';
import {
    indexPdfPages,
    createAnnotatedPdfBlob,
    prependSummaryPages,
    type SummaryPayload,
    type PageIndex
} from '../../utils/pdfAnnotationService';

interface ExportPageProps {
    doc: Document;
}

type ExportFormat = 'pdf' | 'json' | 'csv';

const ExportPage: React.FC<ExportPageProps> = ({ doc }) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { currentProject, setAnnotatingDocId, showToast } = useApp();

    // Check if the document is actually a PDF
    const isPdfDocument = useMemo(() => {
        return doc.name.toLowerCase().endsWith('.pdf');
    }, [doc.name]);

    // Default to PDF for all documents (non-PDFs will be converted)
    const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
    const [copied, setCopied] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);


    // Filename dialog state
    const [isFilenameDialogOpen, setIsFilenameDialogOpen] = useState(false);
    const [defaultFilename, setDefaultFilename] = useState('');
    const [fileExtension, setFileExtension] = useState('');
    const [_isConvertingPdf, setIsConvertingPdf] = useState(false);

    // PDF annotation state
    const [includeSummary, setIncludeSummary] = useState(true);
    const [pageIndexes, setPageIndexes] = useState<PageIndex[]>([]);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

    // Get file type for PDF conversion
    const getFileType = (filename: string): 'pdf' | 'md' | 'txt' | 'text' | 'word' => {
        const lower = filename.toLowerCase();
        if (lower.endsWith('.pdf')) return 'pdf';
        if (lower.endsWith('.md')) return 'md';
        if (lower.endsWith('.docx') || lower.endsWith('.doc')) return 'word';
        return 'txt';
    };

    // Load or generate PDF URL
    useEffect(() => {
        const loadPdfUrl = async () => {
            const fileType = getFileType(doc.name);

            // For PDF files, load directly
            if (fileType === 'pdf') {
                if (doc.storageId) {
                    // Get actual file extension from document name
                    const ext = doc.name.includes('.') ? doc.name.substring(doc.name.lastIndexOf('.')) : '.pdf';

                    // Try IndexedDB first (where files are stored on normal upload)
                    try {
                        const { getFileFromStorage } = await import('../../utils/fileStorage');
                        const file = await getFileFromStorage(doc.storageId);
                        if (file) {
                            setPdfUrl(URL.createObjectURL(file));
                            return;
                        }
                    } catch (e) {
                        console.warn('[ExportPage] IndexedDB lookup failed:', e);
                    }

                    // Fallback: Try Tauri storage (for imported files)
                    try {
                        const { loadTauriFile } = await import('../../utils/tauriFileStorage');
                        const tauriData = await loadTauriFile(doc.storageId, ext, false);
                        // Create blob from Uint8Array - spread to regular array to avoid TypeScript SharedArrayBuffer issue
                        const blob = new Blob([new Uint8Array(tauriData)], { type: 'application/pdf' });
                        const blobUrl = URL.createObjectURL(blob);
                        setPdfUrl(blobUrl);
                        console.log('[ExportPage] Loaded PDF from Tauri storage:', doc.name);
                        return;
                    } catch (e) {
                        console.warn('[ExportPage] Tauri storage lookup failed:', e);
                    }
                }
                // Last resort: use existing fileUrl if available
                if (doc.fileUrl) {
                    setPdfUrl(doc.fileUrl);
                }
                return;
            }

            // For TXT/MD files, convert to PDF
            if ((fileType === 'txt' || fileType === 'md') && doc.extractedText) {
                setIsConvertingPdf(true);
                try {
                    const pdfBlobUrl = await generatePdfFromContent(
                        doc.extractedText,
                        doc.name.replace(/\.[^/.]+$/, ''), // Remove extension
                        fileType
                    );
                    setPdfUrl(pdfBlobUrl);
                } catch (e) {
                    console.error('Failed to convert to PDF', e);
                } finally {
                    setIsConvertingPdf(false);
                }
                return;
            }

            // For Word files - keep existing blob URL (docx-preview handles it)
            if (fileType === 'word' && doc.fileUrl) {
                // Word files can't easily be converted to PDF client-side
                // Show a message or use existing preview
                setPdfUrl(null);
            }
        };

        loadPdfUrl();
    }, [doc.storageId, doc.fileUrl, doc.name, doc.extractedText]);

    // Index PDF pages for annotation coordinate calculation
    useEffect(() => {
        const loadIndexes = async () => {
            if (!pdfUrl) return;

            try {
                let pdfDoc;
                if (pdfUrl.startsWith('blob:')) {
                    const response = await fetch(pdfUrl);
                    const blob = await response.blob();
                    const arrayBuffer = await blob.arrayBuffer();
                    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                    pdfDoc = await loadingTask.promise;
                } else {
                    const loadingTask = pdfjsLib.getDocument(pdfUrl);
                    pdfDoc = await loadingTask.promise;
                }

                const indexes = await indexPdfPages(pdfDoc);
                setPageIndexes(indexes);
            } catch (err) {
                console.error('Failed to index PDF pages:', err);
            }
        };

        loadIndexes();

    }, [pdfUrl]);



    // View Toggles
    const [jsonMode, setJsonMode] = useState<'pretty' | 'raw'>('pretty');
    const [csvMode, setCsvMode] = useState<'table' | 'raw'>('table');

    // Real Stats from document review data
    const stats = useMemo(() => {
        const reviewData = doc.reviewData;
        const annotations = reviewData?.annotations || [];
        const rules = reviewData?.ruleEvaluations || [];

        return {
            totalAnnotations: annotations.length,
            accepted: annotations.filter(a => a.status === 'accepted').length,
            rejected: annotations.filter(a => a.status === 'rejected').length,
            pending: annotations.filter(a => a.status === 'pending').length,
            rulesPassed: rules.filter(r => r.pass).length,
            rulesFailed: rules.filter(r => !r.pass).length,
            tokensUsed: (reviewData?.inputTokens || 0) + (reviewData?.outputTokens || 0),
            modelUsed: reviewData?.modelUsed || 'Unknown'
        };
    }, [doc.reviewData]);

    // Generate real-time preview URL when settings or annotations change
    useEffect(() => {
        let active = true;
        const generatePreview = async () => {
            if (!pdfUrl || selectedFormat !== 'pdf') {
                if (active) {
                    setPreviewBlobUrl(null);
                    setIsGeneratingPreview(false);
                }
                return;
            }

            // Start loading
            if (active) setIsGeneratingPreview(true);

            try {
                // Fetch original PDF bytes
                const response = await fetch(pdfUrl);
                const pdfBytes = new Uint8Array(await response.arrayBuffer());
                const annotations = doc.reviewData?.annotations || [];
                const effectiveLabels = doc.labels || currentProject?.labels || [];

                // Create annotated PDF with highlights
                let annotatedBytes = await createAnnotatedPdfBlob(pdfBytes, annotations, pageIndexes, effectiveLabels);

                // Optionally prepend summary pages
                if (includeSummary && annotations.length > 0) {
                    const summaryPayload: SummaryPayload = {
                        documentName: doc.name,
                        projectName: currentProject?.name,
                        llmModel: doc.reviewData?.modelUsed || 'Unknown',
                        generatedAt: doc.reviewData?.processedAt || new Date().toISOString(),
                        version: '1.0',
                        labels: effectiveLabels,
                        stats: {
                            labelsCount: effectiveLabels.length,
                            rulesCount: (doc.rules || currentProject?.rules || []).length,
                            acceptedCount: stats.accepted,
                            rejectedCount: stats.rejected,
                            inputTokens: doc.reviewData?.inputTokens,
                            outputTokens: doc.reviewData?.outputTokens,
                            totalTokens: stats.tokensUsed,
                            annotationCounts: effectiveLabels.map(label => ({
                                label: label.name,
                                count: annotations.filter(a => a.labelId === label.name && a.status === 'accepted').length
                            }))
                        },
                        rules: doc.rules || currentProject?.rules || [],
                        ruleEvaluations: doc.reviewData?.ruleEvaluations
                    };

                    annotatedBytes = await prependSummaryPages(annotatedBytes, summaryPayload);
                }

                if (active) {
                    const blob = new Blob([annotatedBytes as any], { type: 'application/pdf' });
                    const url = URL.createObjectURL(blob);
                    setPreviewBlobUrl(prev => {
                        if (prev) URL.revokeObjectURL(prev); // Cleanup old URL
                        return url;
                    });
                }
            } catch (err) {
                console.error('Preview generation failed:', err);
            } finally {
                if (active) setIsGeneratingPreview(false);
            }
        };

        const timeoutId = setTimeout(generatePreview, 500); // Debounce slightly
        return () => {
            active = false;
            clearTimeout(timeoutId);
        };
    }, [pdfUrl, selectedFormat, includeSummary, doc.reviewData, pageIndexes, currentProject, doc.labels, doc.rules, doc.name, stats]);

    // Real Content Generators
    const getJsonContent = (pretty: boolean) => {
        const reviewData = doc.reviewData;
        const data = {
            document: doc.name,
            projectId: currentProject?.id,
            projectName: currentProject?.name,
            processedAt: reviewData?.processedAt,
            modelUsed: reviewData?.modelUsed,
            stats: {
                totalAnnotations: stats.totalAnnotations,
                accepted: stats.accepted,
                rejected: stats.rejected,
                rulesPassed: stats.rulesPassed,
                rulesFailed: stats.rulesFailed,
                tokensUsed: stats.tokensUsed
            },
            annotations: (reviewData?.annotations || []).map(a => ({
                id: a.id,
                label: a.labelId,
                text: a.text,
                confidence: a.confidence,
                status: a.status,
                rationale: a.rationale
            })),
            ruleEvaluations: (reviewData?.ruleEvaluations || []).map(r => ({
                rule: r.ruleId,
                passed: r.pass,
                rationale: r.rationale,
                citations: r.citations
            }))
        };
        return JSON.stringify(data, null, pretty ? 2 : 0);
    };

    const getCsvContent = () => {
        const annotations = doc.reviewData?.annotations || [];
        const header = 'Label,Text,Confidence,Status,Rationale';
        const rows = annotations.map(a =>
            `"${a.labelId}","${a.text.replace(/"/g, '""')}",${a.confidence},"${a.status}","${a.rationale.replace(/"/g, '""')}"`
        );
        return [header, ...rows].join('\n');
    };


    const handleCopy = () => {
        const content = selectedFormat === 'json' ? getJsonContent(true) : getCsvContent();
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Open filename dialog before download  
    const handleDownload = () => {
        const baseName = doc.name.replace(/\.[^/.]+$/, ''); // Remove extension
        let extension = 'json';
        let filename = `${baseName}_export`;

        if (selectedFormat === 'pdf') {
            extension = 'pdf';
            filename = `${baseName}_annotated`;
        } else if (selectedFormat === 'csv') {
            extension = 'csv';
        }

        setDefaultFilename(filename);
        setFileExtension(extension);
        setIsFilenameDialogOpen(true);
    };

    // Perform actual download with chosen filename
    const performDownload = async (filename: string) => {
        setIsFilenameDialogOpen(false);

        if (selectedFormat === 'pdf') {
            if (pdfUrl) {
                setIsGeneratingPdf(true);
                try {
                    // Fetch original PDF bytes
                    const response = await fetch(pdfUrl);
                    const pdfBytes = new Uint8Array(await response.arrayBuffer());
                    const annotations = doc.reviewData?.annotations || [];

                    // Create annotated PDF with highlights
                    const effectiveLabels = doc.labels || currentProject?.labels || [];
                    const effectiveRules = doc.rules || currentProject?.rules || [];

                    // Create annotated PDF with highlights
                    let annotatedBytes = await createAnnotatedPdfBlob(pdfBytes, annotations, pageIndexes, effectiveLabels);

                    // Optionally prepend summary pages
                    if (includeSummary && annotations.length > 0) {
                        const summaryPayload: SummaryPayload = {
                            documentName: doc.name,
                            projectName: currentProject?.name,
                            llmModel: doc.reviewData?.modelUsed || 'Unknown',
                            generatedAt: doc.reviewData?.processedAt || new Date().toISOString(),
                            version: '1.0',
                            labels: effectiveLabels,
                            rules: effectiveRules,
                            stats: {
                                labelsCount: effectiveLabels.length,
                                rulesCount: effectiveRules.length,
                                acceptedCount: stats.accepted,
                                rejectedCount: stats.rejected,
                                inputTokens: doc.reviewData?.inputTokens,
                                outputTokens: doc.reviewData?.outputTokens,
                                totalTokens: stats.tokensUsed,
                                annotationCounts: effectiveLabels.map(label => ({
                                    label: label.name,
                                    count: annotations.filter(a => a.labelId === label.name && a.status === 'accepted').length
                                }))
                            },
                            ruleEvaluations: doc.reviewData?.ruleEvaluations
                        };

                        annotatedBytes = await prependSummaryPages(annotatedBytes, summaryPayload);
                    }

                    // Create download link (copy buffer to ensure correct ArrayBuffer type)
                    const pdfBuffer = new ArrayBuffer(annotatedBytes.length);
                    new Uint8Array(pdfBuffer).set(annotatedBytes);
                    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${filename}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);

                    showToast('success', 'Download Complete', `Annotated PDF "${filename}.pdf" saved successfully.`);
                } catch (err) {
                    console.error('PDF generation failed:', err);
                    showToast('error', 'Download Failed', 'Could not generate annotated PDF.');
                } finally {
                    setIsGeneratingPdf(false);
                }
                return;
            }
        } else if (selectedFormat === 'json') {
            const content = getJsonContent(true);
            const blob = new Blob([content], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } else {
            const content = getCsvContent();
            const blob = new Blob([content], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        showToast('success', 'Download Complete', `File "${filename}.${fileExtension}" saved successfully.`);
    };

    // Get annotations for CSV table display
    const tableAnnotations = (doc.reviewData?.annotations || []).slice(0, 20);

    const formatLabel = useMemo(() => {
        if (selectedFormat === 'pdf') return 'PDF';
        if (selectedFormat === 'json') return 'JSON';
        return 'CSV';
    }, [selectedFormat]);

    return (
        <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-gray-900 overflow-hidden">
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel */}
                <div className="w-1/3 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto p-6 flex flex-col gap-6 shadow-sidebar z-10">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Export & Analysis</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Review output and export in your preferred format.</p>
                    </div>

                    {/* Summary (toned down) */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                            <div className="text-[11px] text-gray-500 dark:text-gray-400 uppercase font-semibold tracking-wider mb-1">
                                Annotations
                            </div>
                            <div className="text-xl font-semibold text-gray-900 dark:text-white">
                                {stats.accepted}
                                <span className="text-sm text-gray-400 font-normal">/{stats.totalAnnotations}</span>
                            </div>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400">Accepted</div>
                        </div>

                        <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                            <div className="text-[11px] text-gray-500 dark:text-gray-400 uppercase font-semibold tracking-wider mb-1">
                                Rules
                            </div>
                            <div className="text-xl font-semibold text-gray-900 dark:text-white">
                                {stats.rulesPassed}
                                <span className="text-sm text-gray-400 font-normal">/{stats.rulesPassed + stats.rulesFailed}</span>
                            </div>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400">Passed</div>
                        </div>
                    </div>

                    {/* Format Selection - Always show PDF option (files are converted to PDF) */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Select Format</h3>
                        <div className="space-y-2">
                            {[
                                {
                                    id: 'pdf',
                                    label: 'PDF Document',
                                    desc: isPdfDocument ? 'Original PDF with overlays' : 'Converted to A4 PDF',
                                    icon: FileText
                                },
                                { id: 'json', label: 'JSON Data', desc: 'Structured output', icon: FileJson },
                                { id: 'csv', label: 'CSV Spreadsheet', desc: 'Tabular for Excel', icon: Table }
                            ].map((fmt) => {
                                const active = selectedFormat === fmt.id;
                                return (
                                    <button
                                        key={fmt.id}
                                        onClick={() => setSelectedFormat(fmt.id as ExportFormat)}
                                        className={[
                                            'w-full flex items-center rounded-xl border transition-all',
                                            'px-3 py-2.5',
                                            active
                                                ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                                                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40'
                                        ].join(' ')}
                                    >
                                        <div
                                            className={[
                                                'p-2 rounded-lg mr-3 transition-colors',
                                                active
                                                    ? 'bg-primary/10 text-primary'
                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                            ].join(' ')}
                                        >
                                            <fmt.icon className="w-5 h-5" />
                                        </div>

                                        <div className="text-left flex-1">
                                            <div className={`font-semibold text-sm ${active ? 'text-gray-900 dark:text-white' : 'text-gray-900 dark:text-white'}`}>
                                                {fmt.label}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">{fmt.desc}</div>
                                        </div>

                                        {active && <Check className="w-4 h-4 text-primary" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                        {/* Include Summary Toggle - Only for PDF */}
                        {selectedFormat === 'pdf' && (
                            <label className="flex items-center gap-3 mb-4 cursor-pointer group px-1">
                                <input
                                    type="checkbox"
                                    checked={includeSummary}
                                    onChange={(e) => setIncludeSummary(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary/30"
                                />
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                                        Include Annotation Summary
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        Prepend summary pages with stats and labels
                                    </div>
                                </div>
                            </label>
                        )}

                        <button
                            onClick={handleDownload}
                            disabled={isGeneratingPdf}
                            className="w-full h-10 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-sm font-bold shadow-sm hover:shadow-md hover:bg-black dark:hover:bg-gray-100 transition-all flex items-center justify-center gap-2 mb-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isGeneratingPdf ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 dark:border-gray-900/30 border-t-white dark:border-t-gray-900 rounded-full animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Download className="w-4 h-4" /> Download {formatLabel}
                                </>
                            )}
                        </button>

                        <button
                            onClick={() => setAnnotatingDocId(null)}
                            className="w-full py-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white text-sm font-medium transition-colors flex items-center justify-center gap-1 group"
                        >
                            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                            Back to {currentProject?.name}
                        </button>
                    </div>
                </div>

                {/* Right Panel: Preview */}
                <div className="w-2/3 bg-gray-100 dark:bg-gray-950 p-6 flex flex-col overflow-hidden relative">
                    <div className="flex justify-between items-center mb-4 shrink-0">
                        <h3 className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 text-sm uppercase tracking-wide">
                            <Eye className="w-4 h-4" /> Preview
                            <span className="text-gray-400 dark:text-gray-500 font-normal">· {formatLabel}</span>
                        </h3>

                        {selectedFormat !== 'pdf' && (
                            <div className="flex gap-2 items-center">
                                {/* Format specific toggles */}
                                {selectedFormat === 'json' && (
                                    <div className="bg-white dark:bg-gray-900 rounded-lg p-0.5 border border-gray-200 dark:border-gray-800 flex text-xs">
                                        <button
                                            onClick={() => setJsonMode('pretty')}
                                            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${jsonMode === 'pretty'
                                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
                                                }`}
                                        >
                                            Pretty
                                        </button>
                                        <button
                                            onClick={() => setJsonMode('raw')}
                                            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${jsonMode === 'raw'
                                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
                                                }`}
                                        >
                                            Raw
                                        </button>
                                    </div>
                                )}

                                {selectedFormat === 'csv' && (
                                    <div className="bg-white dark:bg-gray-900 rounded-lg p-0.5 border border-gray-200 dark:border-gray-800 flex text-xs">
                                        <button
                                            onClick={() => setCsvMode('table')}
                                            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${csvMode === 'table'
                                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
                                                }`}
                                        >
                                            Table
                                        </button>
                                        <button
                                            onClick={() => setCsvMode('raw')}
                                            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${csvMode === 'raw'
                                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
                                                }`}
                                        >
                                            Raw
                                        </button>
                                    </div>
                                )}

                                <div className="h-6 w-px bg-gray-300 dark:bg-gray-800 mx-1" />

                                <button
                                    onClick={handleCopy}
                                    className="text-xs font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white flex items-center gap-1.5 bg-white dark:bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm transition-all hover:border-gray-300 dark:hover:border-gray-700"
                                >
                                    {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                    {copied ? 'Copied' : 'Copy'}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden relative flex flex-col">
                        <div className="h-9 bg-gray-50 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-2 shrink-0">
                            <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
                                <div className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
                            </div>
                            <div className="ml-4 text-[10px] font-mono text-gray-400">
                                {selectedFormat === 'pdf' ? doc.name : `export.${selectedFormat}`}
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto custom-scroll relative bg-white dark:bg-gray-900">
                            {selectedFormat === 'pdf' ? (
                                (previewBlobUrl || pdfUrl) && !isGeneratingPreview ? (
                                    <CustomPDFViewer fileUrl={(previewBlobUrl || pdfUrl) as string} className="w-full h-full" />
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-400 flex-col gap-4 bg-gray-50/50 dark:bg-gray-900 transition-opacity">
                                        <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 relative">
                                            <FileText className="w-12 h-12 text-gray-300 dark:text-gray-700 opacity-50" />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <p className="font-medium text-gray-700 dark:text-gray-300">Generating Preview...</p>
                                            <p className="text-xs text-gray-400 mt-1">Applying annotations and summary...</p>
                                        </div>
                                    </div>
                                )
                            ) : selectedFormat === 'json' ? (
                                <pre
                                    className={`p-4 text-xs font-mono text-gray-700 dark:text-gray-300 leading-relaxed ${jsonMode === 'raw' ? 'whitespace-pre-wrap break-all' : ''
                                        }`}
                                >
                                    {getJsonContent(jsonMode === 'pretty')}
                                </pre>
                            ) : csvMode === 'table' ? (
                                <div className="p-4 overflow-x-auto">
                                    <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden min-w-max">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-gray-50 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                <tr>
                                                    <th className="px-4 py-3 font-medium whitespace-nowrap">Label</th>
                                                    <th className="px-4 py-3 font-medium whitespace-nowrap">Text</th>
                                                    <th className="px-4 py-3 font-medium whitespace-nowrap">Confidence</th>
                                                    <th className="px-4 py-3 font-medium whitespace-nowrap">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                                                {tableAnnotations.length > 0 ? tableAnnotations.map((ann, idx) => (
                                                    <tr key={idx}>
                                                        <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-200 whitespace-nowrap">{ann.labelId}</td>
                                                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400 max-w-xs truncate" title={ann.text}>{ann.text}</td>
                                                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{(ann.confidence || 0).toFixed(2)}</td>
                                                        <td className="px-4 py-2 whitespace-nowrap">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${ann.status === 'accepted' ? 'bg-green-100 text-green-700' :
                                                                ann.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                                    'bg-yellow-100 text-yellow-700'
                                                                }`}>{ann.status}</span>
                                                        </td>
                                                    </tr>
                                                )) : (
                                                    <tr>
                                                        <td colSpan={4} className="px-4 py-8 text-center text-gray-400">No annotations available</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    {(doc.reviewData?.annotations || []).length > 20 && (
                                        <p className="text-xs text-gray-400 mt-2 text-center">Showing first 20 of {(doc.reviewData?.annotations || []).length} annotations</p>
                                    )}
                                </div>
                            ) : (
                                <pre className="p-4 text-xs font-mono text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                    {getCsvContent()}
                                </pre>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Filename Dialog */}
            <FilenameDialog
                isOpen={isFilenameDialogOpen}
                onClose={() => setIsFilenameDialogOpen(false)}
                onConfirm={performDownload}
                defaultFilename={defaultFilename}
                fileExtension={fileExtension}
            />
        </div>
    );
};

export default ExportPage;
