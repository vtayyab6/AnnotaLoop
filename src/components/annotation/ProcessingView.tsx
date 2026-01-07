import React from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import type { ProcessingProgress } from '../../services/AnnotationProcessor';

interface ProcessingViewProps {
    progress?: ProcessingProgress | null;
}

const ProcessingView: React.FC<ProcessingViewProps> = ({ progress }) => {
    // Map progress stage to step index
    const getStepIndex = () => {
        if (!progress) return 0;
        switch (progress.stage) {
            case 'validating': return 0;
            case 'annotating': return 1;
            case 'evaluating_rules': return 2;
            case 'complete': return 3;
            default: return 0;
        }
    };

    const currentStep = getStepIndex();

    // Dynamic steps based on progress
    const steps = [
        "Validating connection...",
        progress?.currentChunk && progress?.totalChunks
            ? `Annotating chunk ${progress.currentChunk} of ${progress.totalChunks}...`
            : "Extracting annotations...",
        "Evaluating rules...",
        "Finalizing results..."
    ];

    return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-50 dark:bg-gray-900 p-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-10 max-w-md w-full text-center relative overflow-hidden">
                {/* Minimal top accent */}
                <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>

                <div className="mb-8">
                    <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Loader2 className="w-8 h-8 text-green-600 dark:text-green-400 animate-spin" />
                    </div>
                </div>

                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Processing Document</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    {progress?.message || 'AI is analyzing your content based on the configured rules.'}
                </p>

                {/* Chunk progress indicator */}
                {progress?.currentChunk && progress?.totalChunks && (
                    <div className="mb-6">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                            <div
                                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${(progress.currentChunk / progress.totalChunks) * 100}%` }}
                            />
                        </div>
                        <p className="text-xs text-gray-400">
                            Chunk {progress.currentChunk} / {progress.totalChunks}
                        </p>
                    </div>
                )}

                <div className="space-y-4 text-left max-w-xs mx-auto">
                    {steps.map((s, i) => (
                        <div key={i} className={`flex items-center gap-3 transition-opacity duration-500 ${i <= currentStep ? 'opacity-100' : 'opacity-40'}`}>
                            {i < currentStep ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-500 shrink-0" />
                            ) : i === currentStep ? (
                                <Loader2 className="w-5 h-5 text-green-600 dark:text-green-500 animate-spin shrink-0" />
                            ) : (
                                <div className="w-5 h-5 rounded-full border-2 border-gray-200 dark:border-gray-700 shrink-0"></div>
                            )}
                            <span className={`text-sm font-medium ${i === currentStep ? 'text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                                {s}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ProcessingView;
