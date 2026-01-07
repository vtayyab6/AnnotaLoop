import React from 'react';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (format: 'pdf' | 'json' | 'csv') => void;
    targetId?: number;
    isBatch?: boolean;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onConfirm, targetId, isBatch }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-96 p-6 animate-scale-in">
                <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
                    Export {isBatch ? 'Selected Documents' : targetId ? 'Project Data' : 'Data'}
                </h3>
                {targetId && !isBatch && <p className="text-xs text-gray-500 mb-4">Project ID: {targetId}</p>}
                <p className="text-sm text-gray-500 mb-4">Select format for export:</p>
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <button onClick={() => onConfirm('pdf')} className="p-3 border border-gray-200 dark:border-gray-600 rounded hover:border-primary hover:bg-green-50 dark:hover:bg-green-900/20 text-center transition-colors group">
                        <span className="block font-bold text-gray-700 dark:text-gray-300 group-hover:text-primary">PDF</span>
                    </button>
                    <button onClick={() => onConfirm('json')} className="p-3 border border-gray-200 dark:border-gray-600 rounded hover:border-primary hover:bg-green-50 dark:hover:bg-green-900/20 text-center transition-colors group">
                        <span className="block font-bold text-gray-700 dark:text-gray-300 group-hover:text-primary">JSON</span>
                    </button>
                    <button onClick={() => onConfirm('csv')} className="p-3 border border-gray-200 dark:border-gray-600 rounded hover:border-primary hover:bg-green-50 dark:hover:bg-green-900/20 text-center transition-colors group">
                        <span className="block font-bold text-gray-700 dark:text-gray-300 group-hover:text-primary">CSV</span>
                    </button>
                </div>
                <button onClick={onClose} className="w-full text-gray-500 hover:text-gray-700 text-sm">Cancel</button>
            </div>
        </div>
    );
};

export default ExportModal;
