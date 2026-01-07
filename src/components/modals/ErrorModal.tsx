import React from 'react';
import { X, AlertTriangle, KeyRound, CreditCard, Clock, Wifi, FileWarning, AlertCircle } from 'lucide-react';

export type ErrorType = 'llm_not_configured' | 'invalid_api_key' | 'insufficient_credits' |
    'rate_limit' | 'timeout' | 'network' | 'token_limit' | 'unknown';

interface ErrorModalProps {
    isOpen: boolean;
    onClose: () => void;
    errorType: ErrorType;
    errorMessage?: string;
    tokenCount?: number;
    tokenLimit?: number;
    onOpenSettings?: () => void;
}

const errorConfigs: Record<ErrorType, {
    icon: React.ReactNode;
    title: string;
    description: string;
    bgColor: string;
    iconBg: string;
}> = {
    llm_not_configured: {
        icon: <AlertTriangle className="w-6 h-6" />,
        title: 'LLM Configuration Required',
        description: 'Please set up a Model Provider in Settings to start the annotation workflow.',
        bgColor: 'from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/10',
        iconBg: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
    },
    invalid_api_key: {
        icon: <KeyRound className="w-6 h-6" />,
        title: 'Invalid API Key',
        description: 'The API key you provided is invalid or has been revoked. Please check your credentials in Settings.',
        bgColor: 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/10',
        iconBg: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
    },
    insufficient_credits: {
        icon: <CreditCard className="w-6 h-6" />,
        title: 'Insufficient API Credits',
        description: 'Your API account has insufficient credits or has exceeded its quota. Please add credits or upgrade your plan.',
        bgColor: 'from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/10',
        iconBg: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
    },
    rate_limit: {
        icon: <Clock className="w-6 h-6" />,
        title: 'Rate Limit Exceeded',
        description: 'You\'ve exceeded the API rate limit. Please wait a moment and try again.',
        bgColor: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10',
        iconBg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
    },
    timeout: {
        icon: <Clock className="w-6 h-6" />,
        title: 'Request Timeout',
        description: 'The request took too long to complete. The document may be too large for processing.',
        bgColor: 'from-gray-50 to-gray-100 dark:from-gray-700/20 dark:to-gray-700/10',
        iconBg: 'bg-gray-100 dark:bg-gray-700/30 text-gray-600 dark:text-gray-400'
    },
    network: {
        icon: <Wifi className="w-6 h-6" />,
        title: 'Connection Failed',
        description: 'Unable to connect to the LLM service. Please check your internet connection or ensure the local LLM is running.',
        bgColor: 'from-slate-50 to-slate-100 dark:from-slate-800/20 dark:to-slate-800/10',
        iconBg: 'bg-slate-100 dark:bg-slate-800/30 text-slate-600 dark:text-slate-400'
    },
    token_limit: {
        icon: <FileWarning className="w-6 h-6" />,
        title: 'Document Too Large',
        description: 'This document exceeds the maximum token limit for processing.',
        bgColor: 'from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/10',
        iconBg: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
    },
    unknown: {
        icon: <AlertCircle className="w-6 h-6" />,
        title: 'Processing Error',
        description: 'An unexpected error occurred during processing.',
        bgColor: 'from-gray-50 to-gray-100 dark:from-gray-700/20 dark:to-gray-700/10',
        iconBg: 'bg-gray-100 dark:bg-gray-700/30 text-gray-600 dark:text-gray-400'
    }
};

const ErrorModal: React.FC<ErrorModalProps> = ({
    isOpen,
    onClose,
    errorType,
    errorMessage,
    tokenCount,
    tokenLimit = 200000,
    onOpenSettings
}) => {
    if (!isOpen) return null;

    const config = errorConfigs[errorType] || errorConfigs.unknown;
    const showSettings = errorType === 'llm_not_configured' || errorType === 'invalid_api_key';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700">
                {/* Header */}
                <div className={`bg-gradient-to-r ${config.bgColor} p-6 flex flex-col items-center text-center`}>
                    <div className={`w-12 h-12 ${config.iconBg} rounded-full flex items-center justify-center mb-4 ring-4 ring-white dark:ring-gray-800`}>
                        {config.icon}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                        {config.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {config.description}
                    </p>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Token limit details */}
                    {errorType === 'token_limit' && tokenCount && (
                        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-lg p-4 mb-4">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-600 dark:text-gray-400">Document tokens:</span>
                                <span className="font-bold text-purple-700 dark:text-purple-300">
                                    {tokenCount.toLocaleString()}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">Maximum allowed:</span>
                                <span className="font-bold text-gray-700 dark:text-gray-300">
                                    {tokenLimit.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Custom error message */}
                    {errorMessage && errorType !== 'token_limit' && (
                        <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-4">
                            <p className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                                {errorMessage}
                            </p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all"
                        >
                            Close
                        </button>
                        {showSettings && onOpenSettings && (
                            <button
                                onClick={() => {
                                    onClose();
                                    onOpenSettings();
                                }}
                                className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white font-medium rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
                            >
                                Open Settings
                            </button>
                        )}
                    </div>
                </div>

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1 rounded-full bg-white/50 dark:bg-black/20 hover:bg-white dark:hover:bg-black/40 transition-colors text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default ErrorModal;
