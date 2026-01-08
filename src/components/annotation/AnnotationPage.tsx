import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Play, ChevronRight, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import DocumentViewer from './DocumentViewer';
import ConfigurationPanel from './ConfigurationPanel';

import ReviewPanel from './ReviewPanel';
import ExportPage from './ExportPage';

import ProcessingView from './ProcessingView';
import WorkflowConfirmModal from '../modals/WorkflowConfirmModal';
import LLMSetupModal from '../modals/LLMSetupModal';
import ErrorModal from '../modals/ErrorModal';
import PendingAnnotationsModal from '../modals/PendingAnnotationsModal';
import type { ErrorType } from '../modals/ErrorModal';

import { processAnnotation, validateLLMConnection } from '../../services/AnnotationProcessor';
import type { ProcessingProgress } from '../../services/AnnotationProcessor';
import { isOverTokenLimit } from '../../services/TextExtractionService';
import type { Document as AppDocument } from '../../context/types';


type WorkflowStage = 'config' | 'processing' | 'review' | 'export';

const TOKEN_LIMIT = 200000;

const AnnotationPage = () => {
    const {
        annotatingDocId,
        setAnnotatingDocId,
        documents,
        setDocuments,
        currentProject,
        settings,
        showToast,
    } = useApp();

    const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
    const [isLLMSetupModalOpen, setIsLLMSetupModalOpen] = useState(false);
    const [workflowStage, setWorkflowStage] = useState<WorkflowStage>('config');

    // Error modal state
    const [errorModalOpen, setErrorModalOpen] = useState(false);
    const [errorType, setErrorType] = useState<ErrorType>('unknown');
    const [errorMessage, setErrorMessage] = useState<string>('');

    // Processing state
    const [processingProgress, setProcessingProgress] = useState<ProcessingProgress | null>(null);
    const [isValidating, setIsValidating] = useState(false);

    // Pending annotations modal state
    const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);

    // Active annotation for click-to-scroll functionality
    const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);

    const doc = documents.find((d) => d.id === annotatingDocId);

    const [prevDocId, setPrevDocId] = useState<string | number | null>(null);

    useEffect(() => {
        // Only set initial stage when document ID changes
        if (annotatingDocId !== prevDocId) {
            setPrevDocId(annotatingDocId);
            const currentDoc = documents.find((d) => d.id === annotatingDocId);
            if (currentDoc) {
                if (currentDoc.status === 'Processed') {
                    setWorkflowStage('export');
                } else if (currentDoc.status === 'Review') {
                    setWorkflowStage('review');
                } else {
                    setWorkflowStage('config');
                }
            }
        }
    }, [annotatingDocId, documents, prevDocId]);

    // Get LLM configuration
    const getLLMConfig = useCallback(() => {
        const defaultProvider = settings.defaultProvider?.toLowerCase();
        let providerKey = defaultProvider;
        if (defaultProvider === 'mistral ai') providerKey = 'mistral';
        if (defaultProvider === 'lm studio') providerKey = 'lmstudio';

        const providerConfig = settings.providers[providerKey];
        return {
            provider: providerKey,
            apiKey: providerConfig?.apiKey || '',
            baseUrl: providerConfig?.baseUrl,
            model: settings.defaultModel,
            hasModels: providerConfig?.models?.length > 0,
            hasKey: !!(providerConfig?.apiKey || providerConfig?.baseUrl)
        };
    }, [settings]);

    // Handle real LLM processing
    const runAnnotation = useCallback(async () => {
        if (!doc || !currentProject) return;

        const config = getLLMConfig();
        const effectiveLabels = doc.labels || currentProject.labels || [];
        const effectiveRules = doc.rules || currentProject.rules || [];

        setProcessingProgress({ stage: 'annotating', message: 'Starting annotation...' });

        try {
            const result = await processAnnotation(
                config.provider,
                config.apiKey,
                config.model,
                doc.extractedText || '',
                effectiveLabels,
                effectiveRules,
                config.baseUrl,
                setProcessingProgress
            );

            if (result.success && result.reviewData) {
                // Update document with results
                setDocuments((prev: AppDocument[]) =>
                    prev.map((d: AppDocument) =>
                        d.id === annotatingDocId
                            ? {
                                ...d,
                                processingCompleted: true,
                                lastProcessedAt: new Date().toISOString(),
                                reviewData: result.reviewData,
                                status: 'Review'
                            }
                            : d
                    )
                );
                setWorkflowStage('review');
                showToast('success', 'Annotation Complete', 'Document has been processed successfully.');
            } else {
                // Handle error
                setWorkflowStage('config');
                const errType = mapErrorType(result.errorType);
                setErrorType(errType);
                setErrorMessage(result.error || 'Processing failed');
                setErrorModalOpen(true);
            }
        } catch (error: any) {
            console.error('Annotation error:', error);
            setWorkflowStage('config');
            setErrorType('unknown');
            setErrorMessage(error.message || 'An unexpected error occurred');
            setErrorModalOpen(true);
        }
    }, [doc, currentProject, annotatingDocId, getLLMConfig, setDocuments, showToast]);

    // Start processing when entering processing stage
    useEffect(() => {
        if (workflowStage === 'processing') {
            runAnnotation();
        }
    }, [workflowStage, runAnnotation]);

    if (!doc || !currentProject) return null;

    // Map error types from service to modal types
    const mapErrorType = (type?: string): ErrorType => {
        switch (type) {
            case 'auth': return 'invalid_api_key';
            case 'credits': return 'insufficient_credits';
            case 'rate_limit': return 'rate_limit';
            case 'timeout': return 'timeout';
            case 'network': return 'network';
            default: return 'unknown';
        }
    };

    const handleBack = () => {
        if (workflowStage === 'review') {
            setWorkflowStage('config');
        } else if (workflowStage === 'export') {
            setWorkflowStage('review');
        } else if (workflowStage === 'config') {
            setAnnotatingDocId(null);
        }
    };

    const handleStartWorkflow = async () => {
        const config = getLLMConfig();

        // Check if LLM is configured
        if (!config.provider || !config.hasKey || !config.hasModels) {
            setIsLLMSetupModalOpen(true);
            return;
        }

        // Check token limit
        const tokenCount = doc.tokenCount || 0;
        if (isOverTokenLimit(tokenCount, TOKEN_LIMIT)) {
            setErrorType('token_limit');
            setErrorMessage(`Document has ${tokenCount.toLocaleString()} tokens, exceeding the ${TOKEN_LIMIT.toLocaleString()} token limit.`);
            setErrorModalOpen(true);
            return;
        }

        // Check if document has extracted text
        if (!doc.extractedText) {
            setErrorType('unknown');
            setErrorMessage('No text content found in this document. Please re-upload the document.');
            setErrorModalOpen(true);
            return;
        }

        // Test LLM connectivity
        setIsValidating(true);
        try {
            const testResult = await validateLLMConnection(
                config.provider,
                config.apiKey,
                config.model,
                config.baseUrl
            );

            setIsValidating(false);

            if (!testResult.success) {
                const errType = mapErrorType(testResult.errorType);
                setErrorType(errType);
                setErrorMessage(testResult.error || 'Connection test failed');
                setErrorModalOpen(true);
                return;
            }

            // All validations passed, show confirmation modal
            setIsWorkflowModalOpen(true);
        } catch (error: any) {
            setIsValidating(false);
            setErrorType('network');
            setErrorMessage(error.message || 'Failed to connect to LLM');
            setErrorModalOpen(true);
        }
    };

    const handleConfirmWorkflow = () => {
        setIsWorkflowModalOpen(false);
        setWorkflowStage('processing');
    };

    const handleReviewComplete = () => {
        // Check if there are pending annotations
        const reviewData = doc?.reviewData;
        const pendingCount = reviewData?.annotations?.filter(a => a.status === 'pending').length || 0;
        const acceptedCount = reviewData?.annotations?.filter(a => a.status === 'accepted').length || 0;

        // If there are pending annotations and no accepted ones, show modal
        if (pendingCount > 0 && acceptedCount === 0) {
            setIsPendingModalOpen(true);
            return;
        }

        // If there are pending but also some accepted, still show modal for confirmation
        if (pendingCount > 0) {
            setIsPendingModalOpen(true);
            return;
        }

        // No pending, proceed to export
        proceedToExport();
    };

    const proceedToExport = () => {
        // Update document status to Processed when entering export stage
        setDocuments((prev: AppDocument[]) =>
            prev.map((d: AppDocument) =>
                d.id === annotatingDocId
                    ? { ...d, status: 'Processed' }
                    : d
            )
        );
        setWorkflowStage('export');
    };

    const handleAcceptAllPending = () => {
        if (!doc?.reviewData) return;
        const updatedAnnotations = doc.reviewData.annotations.map(a =>
            a.status === 'pending' ? { ...a, status: 'accepted' as const } : a
        );
        setDocuments((prev: AppDocument[]) => prev.map((d: AppDocument) =>
            d.id === annotatingDocId
                ? { ...d, reviewData: { ...d.reviewData!, annotations: updatedAnnotations } }
                : d
        ));
        setIsPendingModalOpen(false);
        proceedToExport();
    };

    const handleRejectAllPending = () => {
        if (!doc?.reviewData) return;
        const updatedAnnotations = doc.reviewData.annotations.map(a =>
            a.status === 'pending' ? { ...a, status: 'rejected' as const } : a
        );
        // Only proceed if at least one is accepted
        const hasAccepted = updatedAnnotations.some(a => a.status === 'accepted');
        setDocuments((prev: AppDocument[]) => prev.map((d: AppDocument) =>
            d.id === annotatingDocId
                ? { ...d, reviewData: { ...d.reviewData!, annotations: updatedAnnotations } }
                : d
        ));
        setIsPendingModalOpen(false);
        if (hasAccepted) {
            proceedToExport();
        } else {
            showToast('info', 'No Accepted Annotations', 'At least one annotation must be accepted to proceed.');
        }
    };

    const handleRestartWorkflow = async () => {
        // Re-run same validation as start workflow
        await handleStartWorkflow();
    };

    const handleGoToReview = () => {
        setWorkflowStage('review');
    };

    const openSettings = () => {
        window.dispatchEvent(new CustomEvent('open-settings-modal'));
        setErrorModalOpen(false);
    };

    const StageIndicator = () => {
        const stages: { id: WorkflowStage; label: string }[] = [
            { id: 'config', label: 'Configuration' },
            { id: 'processing', label: 'Processing' },
            { id: 'review', label: 'Review' },
            { id: 'export', label: 'Export' },
        ];

        const activeIndex = stages.findIndex((s) => s.id === workflowStage);

        return (
            <div className="flex items-center gap-2 text-sm">
                {stages.map((s, idx) => (
                    <React.Fragment key={s.id}>
                        {idx > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}
                        <div
                            className={`flex items-center gap-1.5 ${idx === activeIndex
                                ? 'font-bold text-primary dark:text-blue-400'
                                : idx < activeIndex
                                    ? 'font-medium text-green-600 dark:text-green-400'
                                    : 'text-gray-400'
                                }`}
                        >
                            {idx < activeIndex && <Check className="w-3.5 h-3.5" />}
                            {s.label}
                        </div>
                    </React.Fragment>
                ))}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full w-full min-w-0 bg-gray-50 dark:bg-gray-900 overflow-hidden relative transition-colors duration-200">
            {/* Header */}
            <div className="h-16 px-6 flex items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 shadow-sm z-10 shrink-0 relative">
                <div className="flex items-center gap-4 min-w-0">
                    <button
                        onClick={handleBack}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="min-w-0">
                        <h2
                            className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 truncate max-w-[200px] md:max-w-[300px]"
                            title={doc.name}
                        >
                            {doc.name}
                        </h2>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400 hidden md:inline">
                                in {currentProject.name}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Centered Stage Indicator */}
                <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-50 dark:bg-gray-900 px-4 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm">
                    <StageIndicator />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {workflowStage === 'config' && (
                        <>
                            {doc.processingCompleted ? (
                                <>
                                    <button
                                        onClick={handleGoToReview}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-md text-xs font-medium shadow-sm transition-colors"
                                    >
                                        <Check className="w-3.5 h-3.5" />
                                        Review
                                    </button>
                                    <button
                                        onClick={handleRestartWorkflow}
                                        disabled={isValidating}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
                                    >
                                        <Play className="w-3.5 h-3.5" />
                                        {isValidating ? 'Validating...' : 'Re-Annotate'}
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={handleStartWorkflow}
                                    disabled={isValidating}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-md text-xs font-medium shadow-sm transition-colors disabled:opacity-50"
                                >
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                    {isValidating ? 'Validating...' : 'Annotate'}
                                </button>
                            )}
                        </>
                    )}

                    {workflowStage === 'review' && (
                        <button
                            onClick={handleReviewComplete}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-md text-xs font-medium shadow-sm transition-colors"
                        >
                            <Check className="w-3.5 h-3.5" />
                            Export Data
                        </button>
                    )}

                    {workflowStage === 'export' && (
                        <button
                            onClick={() => setAnnotatingDocId(null)}
                            className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mr-2"
                        >
                            Exit
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex w-full min-w-0 overflow-hidden relative">
                {/* CONFIG STAGE */}
                {workflowStage === 'config' && (
                    <>
                        {/* IMPORTANT: overflow-auto contains horizontal overflow so it can't push the sidebar */}
                        <div className="flex-1 min-w-0 overflow-auto bg-gray-100 dark:bg-gray-950 p-6 flex justify-center scroll-custom">
                            <DocumentViewer doc={doc} />
                        </div>

                        <div className="w-[450px] shrink-0 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-xl z-20 overflow-y-auto scroll-custom">
                            <ConfigurationPanel doc={doc} project={currentProject} />
                        </div>
                    </>
                )}

                {/* PROCESSING STAGE */}
                {workflowStage === 'processing' && (
                    <div className="flex-1 min-w-0 w-full h-full overflow-hidden">
                        <ProcessingView progress={processingProgress} />
                    </div>
                )}

                {/* REVIEW STAGE */}
                {workflowStage === 'review' && (
                    <>
                        {/* IMPORTANT: same fix here */}
                        <div className="flex-1 min-w-0 overflow-auto bg-gray-100 dark:bg-gray-950 p-6 flex justify-center scroll-custom">
                            <DocumentViewer
                                doc={doc}
                                annotations={doc.reviewData?.annotations || []}
                                activeAnnotationId={activeAnnotationId}
                                onAnnotationClick={setActiveAnnotationId}
                                showAnnotations={true}
                                labels={doc.labels || currentProject?.labels || []}
                            />
                        </div>

                        <div className="w-[450px] shrink-0 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-xl z-20 overflow-hidden flex flex-col">
                            <ReviewPanel
                                doc={doc}
                                onCompleteReview={handleReviewComplete}
                                activeAnnotationId={activeAnnotationId}
                                onAnnotationSelect={setActiveAnnotationId}
                            />
                        </div>
                    </>
                )}

                {/* EXPORT STAGE */}
                {workflowStage === 'export' && <ExportPage doc={doc} />}
            </div>

            {/* Modals */}
            <WorkflowConfirmModal
                isOpen={isWorkflowModalOpen}
                onClose={() => setIsWorkflowModalOpen(false)}
                onConfirm={handleConfirmWorkflow}
                doc={doc}
                labelCount={(doc.labels || currentProject.labels).length}
                ruleCount={(doc.rules || currentProject.rules).length}
            />

            <LLMSetupModal
                isOpen={isLLMSetupModalOpen}
                onClose={() => setIsLLMSetupModalOpen(false)}
                onOpenSettings={() => {
                    window.dispatchEvent(new CustomEvent('open-settings-modal'));
                    setIsLLMSetupModalOpen(false);
                }}
            />

            <ErrorModal
                isOpen={errorModalOpen}
                onClose={() => setErrorModalOpen(false)}
                errorType={errorType}
                errorMessage={errorMessage}
                tokenCount={doc.tokenCount}
                tokenLimit={TOKEN_LIMIT}
                onOpenSettings={openSettings}
            />

            <PendingAnnotationsModal
                isOpen={isPendingModalOpen}
                onClose={() => setIsPendingModalOpen(false)}
                pendingCount={doc?.reviewData?.annotations?.filter(a => a.status === 'pending').length || 0}
                acceptedCount={doc?.reviewData?.annotations?.filter(a => a.status === 'accepted').length || 0}
                onAcceptAll={handleAcceptAllPending}
                onRejectAll={handleRejectAllPending}
                onContinueReview={() => setIsPendingModalOpen(false)}
            />
        </div>
    );
};

export default AnnotationPage;
