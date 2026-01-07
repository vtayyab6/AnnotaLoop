
import React from 'react';
import { X, Settings as SettingsIcon, AlertTriangle } from 'lucide-react';

interface LLMSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenSettings: () => void;
}

const LLMSetupModal: React.FC<LLMSetupModalProps> = ({ isOpen, onClose, onOpenSettings }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />

            <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700">
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/10 p-6 flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mb-4 ring-4 ring-white dark:ring-gray-800">
                        <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                        LLM Configuration Required
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        You need to set up a Model Provider to start the workflow.
                    </p>
                </div>

                {/* Content */}
                <div className="p-6">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 text-center">
                        Please go to Settings &gt; LLM Integration to choose a provider (Cloud or Local) and verify your key/connection.
                    </p>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                onClose();
                                onOpenSettings();
                            }}
                            className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white font-medium rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all flex items-center justify-center gap-2"
                        >
                            <SettingsIcon className="w-4 h-4" />
                            Go to Settings
                        </button>
                    </div>
                </div>

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

export default LLMSetupModal;
