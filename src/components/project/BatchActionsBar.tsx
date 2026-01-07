import React from 'react';
import { useApp } from '../../context/AppContext';

interface BatchActionsBarProps {
    onBatchDelete: () => void;
    onBatchExport: () => void;
    onBatchAnnotate: () => void;
}

const BatchActionsBar: React.FC<BatchActionsBarProps> = ({ onBatchDelete, onBatchExport, onBatchAnnotate }) => {
    const { selectedDocs, documents, selectAllDocuments, clearSelection, showToast, currentProject } = useApp();

    if (selectedDocs.size === 0) return null;

    // Check if any selected doc is already processed or in review
    const selectedDocsList = documents.filter(d => selectedDocs.has(d.id));
    const hasProcessedOrReview = selectedDocsList.some(d => d.status === 'Processed' || d.status === 'Review');
    const readyCount = selectedDocsList.filter(d => d.status === 'Ready').length;

    const handleBatchAnnotate = () => {
        if (hasProcessedOrReview) {
            showToast('info', 'Cannot Batch Annotate', `${selectedDocsList.length - readyCount} selected document(s) are already processed. Deselect them first.`);
            return;
        }
        if (!currentProject?.labels || currentProject.labels.length === 0) {
            showToast('error', 'No Labels Defined', 'Please create at least one label in Project Configuration before batch annotating.');
            return;
        }

        onBatchAnnotate();
    };

    return (
        <div className="flex items-center justify-between bg-white dark:bg-gray-800 border border-primary/30 rounded-lg p-2 mb-4 shadow-sm animate-fade-in">
            <div className="flex items-center gap-3 px-2">
                <span className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">{selectedDocs.size}</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Documents Selected</span>
            </div>
            <div className="flex gap-2">
                <button onClick={selectAllDocuments} className="text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded font-medium transition-colors">Select All</button>
                <button onClick={clearSelection} className="text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded font-medium transition-colors">Clear</button>
                <div className="border-l border-gray-300 dark:border-gray-600 mx-1"></div>
                <button
                    onClick={handleBatchAnnotate}
                    disabled={hasProcessedOrReview}
                    title={hasProcessedOrReview ? `${selectedDocsList.length - readyCount} doc(s) already processed - deselect them` : 'Annotate selected documents'}
                    className={`text-xs px-3 py-1.5 rounded font-medium transition-colors ${hasProcessedOrReview
                        ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                        }`}
                >
                    Batch Annotate{readyCount < selectedDocs.size ? ` (${readyCount})` : ''}
                </button>
                <button onClick={onBatchExport} className="text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded font-medium transition-colors">Batch Export</button>
                <button onClick={onBatchDelete} className="text-xs bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 px-3 py-1.5 rounded font-medium transition-colors">Delete Selected</button>
            </div>
        </div>
    );
};

export default BatchActionsBar;
