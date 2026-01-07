import React from 'react';
import { useApp } from '../../context/AppContext';
import { FileText, Download, Trash, Settings } from 'lucide-react';
import type { Document } from '../../context/types';

interface DocumentGridProps {
    documents: Document[];
    onOpenExportModal: (id: number) => void;
    onPromptDelete: (type: 'document', id: number) => void;
}

const DocumentGrid: React.FC<DocumentGridProps> = ({
    documents,
    onOpenExportModal,
    onPromptDelete
}) => {
    const { selectedDocs, toggleDocSelect, setAnnotatingDocId, currentProject, showToast } = useApp();

    const handleAnnotate = (e: React.MouseEvent, docId: number) => {
        e.stopPropagation();
        if (!currentProject?.labels || currentProject.labels.length === 0) {
            showToast('error', 'No Labels Defined', 'Please create at least one label in Project Configuration before annotating.');
            return;
        }
        setAnnotatingDocId(docId);
    };

    return (
        <div
            id="documents-grid"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
            {documents.map(d => {
                const isSelected = selectedDocs.has(d.id);

                /* ===============================
                   STATUS CHIP (outline-only)
                =============================== */
                let statusColor =
                    'text-slate-600 border-slate-300 dark:text-gray-300 dark:border-gray-600';

                if (d.status === 'Annotated') {
                    statusColor =
                        'text-emerald-600 border-emerald-400/60 dark:text-emerald-300 dark:border-emerald-300/50';
                } else if (d.status === 'Review') {
                    statusColor =
                        'text-amber-600 border-amber-400/60 dark:text-amber-300 dark:border-amber-300/50';
                } else if (d.status === 'Processed') {
                    statusColor =
                        'text-violet-600 border-violet-400/60 dark:text-violet-300 dark:border-violet-300/50';
                } else if (d.status === 'In Progress') {
                    statusColor =
                        'text-blue-600 border-blue-400/60 dark:text-blue-300 dark:border-blue-300/50';
                } else if (d.status === 'Error') {
                    statusColor =
                        'text-red-600 border-red-400/60 dark:text-red-300 dark:border-red-300/50';
                }

                /* ===============================
                   ACTION BUTTON (neutral)
                =============================== */
                let actionBtn = (
                    <button
                        onClick={(e) => handleAnnotate(e, d.id)}
                        className="text-xs font-medium text-slate-700 border border-slate-300 hover:text-slate-800 hover:border-slate-400 hover:bg-slate-50 dark:text-gray-200 dark:border-gray-600 dark:hover:text-gray-100 dark:hover:border-gray-500 dark:hover:bg-gray-700 px-3 py-1.5 rounded transition-colors"
                    >
                        Annotate
                    </button>
                );

                if (d.status === 'Processed') {
                    actionBtn = (
                        <button
                            onClick={(e) => handleAnnotate(e, d.id)}
                            className="text-xs font-medium text-violet-600 border border-violet-300 hover:text-violet-700 hover:border-violet-400 hover:bg-violet-50 dark:text-violet-300 dark:border-violet-500 dark:hover:text-violet-200 dark:hover:border-violet-400 dark:hover:bg-violet-900/20 px-3 py-1.5 rounded transition-colors"
                        >
                            View
                        </button>
                    );
                } else if (d.status === 'Review') {
                    actionBtn = (
                        <button
                            onClick={(e) => handleAnnotate(e, d.id)}
                            className="text-xs font-medium text-amber-600 border border-amber-300 hover:text-amber-700 hover:border-amber-400 hover:bg-amber-50 dark:text-amber-300 dark:border-amber-500 dark:hover:text-amber-200 dark:hover:border-amber-400 dark:hover:bg-amber-900/20 px-3 py-1.5 rounded transition-colors"
                        >
                            Review
                        </button>
                    );
                } else if (d.status === 'Annotated') {
                    actionBtn = (
                        <button
                            onClick={(e) => handleAnnotate(e, d.id)}
                            className="text-xs font-medium text-slate-600 border border-slate-300 hover:text-slate-700 hover:border-slate-400 hover:bg-slate-50 dark:text-gray-300 dark:border-gray-600 dark:hover:text-gray-100 dark:hover:border-gray-500 dark:hover:bg-gray-700 px-3 py-1.5 rounded transition-colors"
                        >
                            View
                        </button>
                    );
                }

                // Multi-select mode: if any doc is selected, clicks toggle selection instead of navigating
                const isMultiSelectMode = selectedDocs.size > 0;

                const handleCardClick = () => {
                    if (isMultiSelectMode) {
                        toggleDocSelect(d.id);
                    } else {
                        // For card click, we also want to validate, but we can't easily pass the event object in the same way if we want to default to annotate.
                        // Assuming card click implies annotation/view.
                        if (!currentProject?.labels || currentProject.labels.length === 0) {
                            showToast('error', 'No Labels Defined', 'Please create at least one label in Project Configuration before annotating.');
                            return;
                        }
                        setAnnotatingDocId(d.id);
                    }
                };

                return (
                    <div
                        key={d.id}
                        onClick={handleCardClick}
                        className={`bg-white dark:bg-gray-800 border ${isSelected
                            ? 'border-gray-300 dark:border-gray-600 ring-1 ring-emerald-400/40 bg-emerald-50/20 dark:bg-emerald-900/10'
                            : 'border-gray-200 dark:border-gray-700'
                            } rounded-lg p-4 shadow-sm hover:shadow-md transition-all group cursor-pointer`}
                    >
                        {/* Header */}
                        <div className="flex justify-between items-start mb-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-100/60 text-gray-400 dark:bg-gray-700/30 dark:text-gray-500 flex items-center justify-center">
                                <FileText className="w-6 h-6" />
                            </div>
                            <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => { e.stopPropagation(); toggleDocSelect(d.id); }}
                                onClick={(e) => e.stopPropagation()}
                                className={`w-5 h-5 rounded text-primary focus:ring-primary border-2 border-gray-400 dark:border-gray-500 cursor-pointer transition-all ${isSelected || isMultiSelectMode ? 'opacity-100' : 'opacity-50 group-hover:opacity-100'
                                    }`}
                            />
                        </div>

                        {/* Title */}
                        <h4
                            className="font-medium text-gray-800 dark:text-gray-200 truncate mb-1"
                            title={d.name}
                        >
                            {d.name}
                        </h4>

                        {/* Status */}
                        <div className="flex items-center gap-2 mb-4">
                            <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border ${statusColor}`}
                            >
                                {d.status}
                            </span>
                        </div>

                        {/* Meta */}
                        <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-3">
                            <div>
                                <span className="block text-gray-400 dark:text-gray-500">
                                    Size
                                </span>
                                {d.size}
                            </div>
                            <div>
                                <span className="block text-gray-400 dark:text-gray-500">
                                    Tokens
                                </span>
                                {d.tokens}
                            </div>
                            <div>
                                <span className="block text-gray-400 dark:text-gray-500">
                                    Date
                                </span>
                                {new Date(d.date).toLocaleDateString()}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-4 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                            {actionBtn}
                            <div className="flex gap-1">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onOpenExportModal(d.id); }}
                                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                >
                                    <Download className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={(e) => handleAnnotate(e, d.id)}
                                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                    title="Configure Document"
                                >
                                    <Settings className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onPromptDelete('document', d.id); }}
                                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-red-500"
                                >
                                    <Trash className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default DocumentGrid;
