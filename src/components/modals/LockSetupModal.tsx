import React from 'react';
import { Lock, Settings, X } from 'lucide-react';

interface LockSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenSettings: () => void;
}

const LockSetupModal: React.FC<LockSetupModalProps> = ({ isOpen, onClose, onOpenSettings }) => {
    if (!isOpen) return null;

    const handleGoToSettings = () => {
        onOpenSettings();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-primary" />
                        <h3 className="font-bold text-gray-900 dark:text-white text-sm">App Lock Not Set Up</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                        <Lock className="w-8 h-8 text-primary" />
                    </div>

                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Set Up App Lock
                    </h4>

                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                        You need to create a PIN in Settings to use the app lock feature. This will secure your data when you're away.
                    </p>

                    <div className="flex flex-col gap-2">
                        <button
                            onClick={handleGoToSettings}
                            className="w-full py-2.5 px-4 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors flex items-center justify-center gap-2"
                        >
                            <Settings className="w-4 h-4" />
                            Open Settings
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                        >
                            Maybe Later
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LockSetupModal;
