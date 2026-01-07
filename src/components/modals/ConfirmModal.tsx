import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'info';
    positionClass?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'danger',
    positionClass = 'fixed inset-0'
}) => {
    if (!isOpen) return null;

    return (
        <div className={`${positionClass} z-[100] flex items-center justify-center bg-gray-900/50 backdrop-blur-[2px] animate-in fade-in duration-200`}>
            <div className="bg-white dark:bg-gray-800 w-[90%] max-w-sm rounded-xl shadow-2xl p-6 border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-200 scale-100">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${type === 'danger' ? 'bg-red-50 text-red-500 dark:bg-red-900/20' : 'bg-blue-50 text-blue-500 dark:bg-blue-900/20'
                            }`}>
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{title}</h3>
                    </div>
                </div>

                <p className="text-gray-500 dark:text-gray-400 mb-6 leading-relaxed text-sm">
                    {message}
                </p>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => { onConfirm(); onClose(); }}
                        className={`flex-1 px-4 py-2 text-white rounded-lg shadow-sm transition-colors text-sm font-medium ${type === 'danger'
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
