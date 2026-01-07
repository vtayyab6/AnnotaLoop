import React from 'react';
import { Check, ChevronRight } from 'lucide-react';

interface ProjectOnboardingFlowProps {
    hasLabels: boolean;
    onOpenConfigModal: () => void;
    onOpenUploadModal: () => void;
}

const ProjectOnboardingFlow: React.FC<ProjectOnboardingFlowProps> = ({
    hasLabels,
    onOpenConfigModal,
    onOpenUploadModal
}) => {
    return (
        <div className="flex-grow flex flex-col pt-12 px-4 animate-in fade-in duration-500">
            {/* Simple Header */}
            <div className="text-center mb-6 max-w-3xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    Set up your project
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Define labels and rules so AnotaLoop can extract structured data from your documents.
                </p>
            </div>

            {/* Simplified 2-Step Flow */}
            <div className="w-full max-w-3xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Step 1: Configure */}
                    <div className="relative">
                        <div className={`bg-white dark:bg-gray-800 rounded-lg border p-5 transition-all duration-300 ${hasLabels
                            ? 'border-green-200 dark:border-green-900'
                            : 'border-gray-200 dark:border-gray-700'
                            }`}>
                            {/* Simple header with number OR icon */}
                            <div className="flex items-center gap-2 mb-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${hasLabels
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                    }`}>
                                    {hasLabels ? <Check className="w-3.5 h-3.5" /> : '1'}
                                </div>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                    Configure Labels & Rules
                                </h3>
                            </div>

                            {/* Simplified copy */}
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                                Define what data to extract. At least 1 label required.
                            </p>

                            {/* CTA button only when not configured */}
                            {!hasLabels && (
                                <button
                                    onClick={onOpenConfigModal}
                                    className="w-full bg-primary hover:bg-primary-hover text-white px-3 py-2 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                                >
                                    Configure
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Minimal connector */}
                        <div className={`hidden md:block absolute top-1/2 -right-2 w-4 h-px -translate-y-1/2 ${hasLabels ? 'bg-green-300 dark:bg-green-800' : 'bg-gray-200 dark:bg-gray-700'
                            }`}></div>
                    </div>

                    {/* Step 2: Upload */}
                    <div className="relative">
                        <div className={`bg-white dark:bg-gray-800 rounded-lg border p-5 transition-all duration-300 ${hasLabels
                            ? 'border-gray-200 dark:border-gray-700'
                            : 'border-gray-200 dark:border-gray-700 opacity-50'
                            }`}>
                            {/* Simple header */}
                            <div className="flex items-center gap-2 mb-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${hasLabels
                                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600'
                                    }`}>
                                    2
                                </div>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                    Upload & Annotate
                                </h3>
                            </div>

                            {/* Simplified copy */}
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                                {hasLabels
                                    ? 'Add documents to extract data with AI.'
                                    : 'Upload PDFs, text, or Markdown files to extract data using your labels and rules.'
                                }
                            </p>

                            {/* CTA button only when ready */}
                            {hasLabels && (
                                <button
                                    onClick={onOpenUploadModal}
                                    className="w-full bg-primary hover:bg-primary-hover text-white px-3 py-2 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                                >
                                    Upload Files
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Minimal helper text */}
                <div className="mt-4 text-center">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                        {hasLabels
                            ? 'Use "Annotate" button on documents after uploading'
                            : 'Labels and rules are project-level by default and customizable per document.'
                        }
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ProjectOnboardingFlow;
