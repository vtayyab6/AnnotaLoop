import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Loader2, AlertCircle, CheckCircle, FileText, Trash2, Coins, Clock, Minimize2, Sparkles, Tag, ScrollText } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { processAnnotation } from '../../services/AnnotationProcessor';

import type { ProcessingProgress } from '../../services/AnnotationProcessor';
import type { Document as AppDocument } from '../../context/types';

interface BatchProcessingModalProps {
    isOpen: boolean;
    onClose: () => void;
    documentIds: number[];
    onUpdateDocIds?: (newIds: number[]) => void;
    onBatchStart?: () => void;
}

interface DocStatus {
    id: number;
    name: string;
    tokens: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    error?: string;
}

type BatchState = 'ready' | 'processing' | 'finished';

const BatchProcessingModal: React.FC<BatchProcessingModalProps> = ({
    isOpen,
    onClose,
    documentIds,
    onUpdateDocIds,
    onBatchStart
}) => {
    const { documents, setDocuments, currentProject, settings, showToast, batchState: globalBatchState, setBatchState: setGlobalBatchState } = useApp();
    const [processingStatus, setProcessingStatus] = useState<DocStatus[]>([]);
    const [batchState, setBatchState] = useState<BatchState>('ready');
    const [currentProgress, setCurrentProgress] = useState<ProcessingProgress | null>(null);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [elapsedTime, setElapsedTime] = useState<string>('');
    const [isMinimized, setIsMinimized] = useState(false);

    // Sync with global batch state - restore from global if it's active
    useEffect(() => {
        if (globalBatchState.isActive && globalBatchState.isMinimized) {
            setIsMinimized(false); // Show full modal when user clicks global badge
            setGlobalBatchState(prev => ({ ...prev, isMinimized: false }));
        }
    }, [globalBatchState.isActive, globalBatchState.isMinimized, setGlobalBatchState]);

    // const [showConfirmation, setShowConfirmation] = useState(true); // Removed separate confirmation state

    // Use refs for values needed in async callbacks (avoid stale closure)
    const isStoppingRef = useRef(false);
    const statusRef = useRef<DocStatus[]>([]);
    const completedRef = useRef(0);
    const failedRef = useRef(0);

    // Keep ref in sync with state
    useEffect(() => {
        statusRef.current = processingStatus;
    }, [processingStatus]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isStoppingRef.current = true;
        };
    }, []);

    // Calculate tokens for a document
    const calculateDocTokens = (doc: any): number => {
        if (!doc?.extractedText) return 0;
        return Math.ceil(doc.extractedText.length / 4);
    };

    // Initialize status when modal opens or ids change
    useEffect(() => {
        if (isOpen && batchState === 'ready') {
            // setShowConfirmation(false); // Removed
            const initialStatus = documentIds.map(id => {
                const doc = documents.find(d => d.id === id);
                return {
                    id,
                    name: doc ? doc.name : `Document #${id}`,
                    tokens: doc ? calculateDocTokens(doc) : 0,
                    status: 'pending' as const
                };
            });
            setProcessingStatus(initialStatus);
            statusRef.current = initialStatus;
            completedRef.current = 0;
            failedRef.current = 0;
            setCurrentProgress(null);
            setStartTime(null);
            setElapsedTime('');
            isStoppingRef.current = false;
        }
    }, [isOpen, documentIds, documents, batchState]);

    // Timer for elapsed time
    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | null = null;
        if (batchState === 'processing' && startTime) {
            interval = setInterval(() => {
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                const mins = Math.floor(elapsed / 60);
                const secs = elapsed % 60;
                setElapsedTime(mins > 0 ? `${mins}m ${secs}s` : `${secs}s`);
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [batchState, startTime]);

    // Summary statistics
    const stats = {
        completed: processingStatus.filter(s => s.status === 'completed').length,
        failed: processingStatus.filter(s => s.status === 'failed').length,
        pending: processingStatus.filter(s => s.status === 'pending').length,
        processing: processingStatus.filter(s => s.status === 'processing').length,
        total: processingStatus.length,
        totalTokens: processingStatus.reduce((sum, s) => sum + s.tokens, 0),
        progressPercent: processingStatus.length > 0
            ? Math.round((processingStatus.filter(s => s.status === 'completed' || s.status === 'failed').length / processingStatus.length) * 100)
            : 0
    };

    const removeFromBatch = (docId: number) => {
        const newStatus = processingStatus.filter(s => s.id !== docId);
        setProcessingStatus(newStatus);
        if (onUpdateDocIds) {
            onUpdateDocIds(newStatus.map(s => s.id));
        }
    };

    if (!isOpen) return null;

    const getLLMConfig = () => {
        const defaultProvider = settings.defaultProvider?.toLowerCase();
        let providerKey = defaultProvider;
        if (defaultProvider === 'mistral ai') providerKey = 'mistral';
        if (defaultProvider === 'openrouter') providerKey = 'openrouter';

        const providerConfig = settings.providers[providerKey];
        return {
            provider: providerKey,
            apiKey: providerConfig?.apiKey || '',
            baseUrl: providerConfig?.baseUrl,
            model: settings.defaultModel,
            hasModels: providerConfig?.models?.length > 0,
            hasKey: !!(providerConfig?.apiKey || providerConfig?.baseUrl)
        };
    };

    const processDocument = async (docStatus: DocStatus): Promise<'completed' | 'failed'> => {
        const doc = documents.find(d => d.id === docStatus.id);

        if (!doc) {
            return 'failed';
        }

        try {
            const config = getLLMConfig();

            if (!config.provider || !config.hasKey) {
                throw new Error('LLM not configured');
            }

            if (!doc.extractedText) {
                throw new Error('No text content');
            }

            const effectiveLabels = doc.labels || currentProject?.labels || [];
            const effectiveRules = doc.rules || currentProject?.rules || [];

            const result = await processAnnotation(
                config.provider,
                config.apiKey,
                config.model,
                doc.extractedText,
                effectiveLabels,
                effectiveRules,
                config.baseUrl,
                (p) => setCurrentProgress(p)
            );

            if (result.success && result.reviewData) {
                // Update document in global state
                setDocuments((prev: AppDocument[]) => prev.map((d: AppDocument) =>
                    d.id === docStatus.id
                        ? {
                            ...d,
                            status: 'Review',
                            processingCompleted: true,
                            lastProcessedAt: new Date().toISOString(),
                            reviewData: result.reviewData
                        }
                        : d
                ));
                return 'completed';
            } else {
                throw new Error(result.error || 'Processing failed');
            }
        } catch {
            return 'failed';
        }
    };

    const runBatchProcessing = async () => {
        const statusList = [...statusRef.current];

        for (let i = 0; i < statusList.length; i++) {
            // Check stop
            if (isStoppingRef.current) {
                setBatchState('finished');
                showToast('info', 'Batch Stopped', 'Processing was stopped.');
                return;
            }

            const docStatus = statusList[i];

            // Update to processing
            setProcessingStatus(prev => prev.map((s, idx) =>
                idx === i ? { ...s, status: 'processing' as const } : s
            ));

            setCurrentProgress({ stage: 'annotating', message: 'Connecting to LLM...' });

            const result = await processDocument(docStatus);

            // Update status based on result
            setProcessingStatus(prev => prev.map((s, idx) =>
                idx === i ? { ...s, status: result, error: result === 'failed' ? 'Processing failed' : undefined } : s
            ));

            if (result === 'completed') {
                completedRef.current++;
            } else {
                failedRef.current++;
            }

            setCurrentProgress(null);
        }

        // All done
        setBatchState('finished');

        if (failedRef.current > 0) {
            showToast('info', 'Batch Complete', `${completedRef.current} succeeded, ${failedRef.current} failed.`);
        } else {
            showToast('success', 'Batch Complete', `Successfully processed ${completedRef.current} documents.`);
        }
    };

    const handleStartBatch = () => {
        setBatchState('processing');
        setStartTime(Date.now());
        isStoppingRef.current = false;
        completedRef.current = 0;
        failedRef.current = 0;

        if (onBatchStart) {
            onBatchStart();
        }

        // Sync with global state immediately
        setGlobalBatchState(prev => ({
            ...prev,
            isActive: true,
            status: 'processing'
        }));

        runBatchProcessing();
    };

    const handleStop = () => {
        isStoppingRef.current = true;
    };

    const handleClose = () => {
        if (batchState === 'processing') return;
        setBatchState('ready');
        onClose();
    };

    const handleRetryFailed = () => {
        setProcessingStatus(prev => prev.map(s =>
            s.status === 'failed' ? { ...s, status: 'pending' as const, error: undefined } : s
        ));
        setBatchState('ready');
        completedRef.current = processingStatus.filter(s => s.status === 'completed').length;
        failedRef.current = 0;
    };

    const handleMinimize = () => {
        setIsMinimized(true);
        // Sync with global state for persistent visibility across pages
        // Map local 'ready' state to global 'idle' state
        const globalStatus = batchState === 'ready' ? 'idle' : batchState;
        setGlobalBatchState({
            isActive: true,
            isMinimized: true,
            documentIds: processingStatus.map(s => s.id),
            completed: completedRef.current,
            failed: failedRef.current,
            total: processingStatus.length,
            currentDocName: processingStatus.find(s => s.status === 'processing')?.name || '',
            status: globalStatus
        });
    };

    // const handleMaximize = ... // Removed unused function (handled by GlobalBatchBadge)

    // Minimized view - return null (handled by GlobalBatchBadge in App.tsx)
    if (isMinimized) {
        return null;
    }

    // Calculate detailed metrics for Ready view
    const totalDocs = documentIds.length;
    const estSystemTokens = totalDocs * 1500;
    const activeLabels = (currentProject?.labels || []);
    const activeRules = currentProject?.rules || [];
    const estLabelTokens = totalDocs * (activeLabels.length * 15);
    const estRuleTokens = totalDocs * (activeRules.length * 45);
    const estContentTokens = statusRef.current.reduce((sum, s) => sum + s.tokens, 0) || (totalDocs * 3000);

    const detailedInput = estContentTokens + estSystemTokens + estLabelTokens + estRuleTokens;
    const detailedOutput = totalDocs * 500;
    const detailedTotal = detailedInput + detailedOutput;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-gray-100 dark:border-gray-700 flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
                                <FileText className="w-4 h-4" />
                            </span>
                            Batch Processing
                            {batchState === 'finished' && (
                                <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                    Finished
                                </span>
                            )}
                            {batchState === 'processing' && (
                                <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 flex items-center gap-1">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Processing
                                </span>
                            )}
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            {batchState === 'ready' && `${stats.total} documents ready • ${settings.defaultModel || 'No model'}`}
                            {batchState === 'processing' && `Processing ${stats.completed + stats.failed + 1} of ${stats.total} • ${elapsedTime || '0s'}`}
                            {batchState === 'finished' && `${stats.completed} completed, ${stats.failed} failed • ${elapsedTime}`}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {batchState === 'processing' && (
                            <button
                                onClick={handleMinimize}
                                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                                title="Minimize"
                            >
                                <Minimize2 className="w-5 h-5" />
                            </button>
                        )}
                        {batchState !== 'processing' && (
                            <button
                                onClick={handleClose}
                                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Token Summary / Metrics */}
                {batchState === 'ready' ? (
                    <div className="px-6 py-4 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                        {/* Detailed Metrics Grid */}
                        <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center border border-gray-200 dark:border-gray-600 shadow-sm">
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Input</div>
                                <div className="text-base font-bold text-gray-900 dark:text-white">{detailedInput.toLocaleString()}</div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center border border-gray-200 dark:border-gray-600 shadow-sm">
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Output</div>
                                <div className="text-base font-bold text-gray-900 dark:text-white">{detailedOutput.toLocaleString()}</div>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center border border-blue-100 dark:border-blue-800 ring-1 ring-blue-500/20">
                                <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Total Estimate</div>
                                <div className="text-base font-bold text-blue-700 dark:text-blue-300">{detailedTotal.toLocaleString()}</div>
                            </div>
                        </div>
                        {/* Collapsed breakdown info with icons */}
                        <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center mt-3">
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <FileText className="w-3.5 h-3.5" />
                                <span>Content: ~{estContentTokens.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>System: ~{estSystemTokens.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <Tag className="w-3.5 h-3.5" />
                                <span>Labels: ~{estLabelTokens.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <ScrollText className="w-3.5 h-3.5" />
                                <span>Rules: ~{estRuleTokens.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Progress Bar */}
                        <div className="w-full bg-gray-100 dark:bg-gray-700 h-2">
                            <div
                                className={`h-2 transition-all duration-500 ease-out ${batchState === 'finished' && stats.failed === 0 ? 'bg-green-500' :
                                    batchState === 'finished' && stats.failed > 0 ? 'bg-yellow-500' :
                                        'bg-primary'
                                    }`}
                                style={{ width: `${stats.progressPercent}%` }}
                            />
                        </div>

                        {/* Token Summary */}
                        <div className="px-6 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <Coins className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                                        Processed: <span className="font-bold">{stats.totalTokens.toLocaleString()}</span> tokens
                                    </span>
                                </div>
                                {elapsedTime && (
                                    <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                                        <Clock className="w-4 h-4" />
                                        {elapsedTime}
                                    </div>
                                )}
                            </div>
                            <div className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                {stats.completed}/{stats.total} complete
                            </div>
                        </div>
                    </>
                )}

                {/* Document List */}
                <div className="flex-1 overflow-y-auto p-4 scroll-custom">
                    <div className="space-y-2">
                        {processingStatus.map((doc, idx) => (
                            <div
                                key={doc.id}
                                className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${doc.status === 'processing'
                                    ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 ring-2 ring-blue-500/30'
                                    : doc.status === 'completed'
                                        ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                                        : doc.status === 'failed'
                                            ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                                    }`}
                            >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${doc.status === 'processing' ? 'bg-blue-100 text-blue-600 dark:bg-blue-800 dark:text-blue-300' :
                                        doc.status === 'completed' ? 'bg-green-100 text-green-600 dark:bg-green-800 dark:text-green-300' :
                                            doc.status === 'failed' ? 'bg-red-100 text-red-600 dark:bg-red-800 dark:text-red-300' :
                                                'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                                        }`}>
                                        {doc.status === 'processing' ? <Loader2 className="w-4 h-4 animate-spin" /> :
                                            doc.status === 'completed' ? <CheckCircle className="w-4 h-4" /> :
                                                doc.status === 'failed' ? <AlertCircle className="w-4 h-4" /> :
                                                    <span className="text-xs font-bold">{idx + 1}</span>}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                            {doc.name}
                                        </p>
                                        <div className="flex items-center gap-3 mt-0.5">
                                            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                <Coins className="w-3 h-3" />
                                                {doc.tokens.toLocaleString()} tokens
                                            </span>

                                            {doc.status === 'processing' && currentProgress && (
                                                <span className="text-xs text-blue-600 dark:text-blue-400 animate-pulse">
                                                    {currentProgress.message}
                                                </span>
                                            )}

                                            {doc.status === 'failed' && doc.error && (
                                                <span className="text-xs text-red-600 dark:text-red-400">
                                                    {doc.error}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${doc.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                        doc.status === 'processing' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                            doc.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                        }`}>
                                        {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                                    </span>

                                    {batchState === 'ready' && processingStatus.length > 1 && (
                                        <button
                                            onClick={() => removeFromBatch(doc.id)}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            title="Remove"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-center">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        {batchState === 'ready' && <span>{stats.total} documents selected</span>}
                        {batchState === 'processing' && (
                            <span className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Processing...
                            </span>
                        )}
                        {batchState === 'finished' && (
                            <span className="text-green-600 dark:text-green-400 font-medium">
                                ✓ Batch complete
                            </span>
                        )}
                    </div>

                    <div className="flex gap-3">
                        {batchState === 'ready' && (
                            <>
                                <button
                                    onClick={handleClose}
                                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleStartBatch}
                                    disabled={stats.total === 0 || !settings.defaultModel}
                                    className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Play className="w-4 h-4 fill-current" />
                                    Start Processing
                                </button>
                            </>
                        )}

                        {batchState === 'processing' && (
                            <>
                                <button
                                    onClick={handleMinimize}
                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                >
                                    <Minimize2 className="w-4 h-4" />
                                    Minimize
                                </button>
                                <button
                                    onClick={handleStop}
                                    className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
                                >
                                    Stop
                                </button>
                            </>
                        )}

                        {batchState === 'finished' && (
                            <>
                                {stats.failed > 0 && (
                                    <button
                                        onClick={handleRetryFailed}
                                        className="px-4 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Retry Failed ({stats.failed})
                                    </button>
                                )}
                                <button
                                    onClick={handleClose}
                                    className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-bold transition-colors shadow-sm"
                                >
                                    Close
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BatchProcessingModal;
