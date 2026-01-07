import React from 'react';
import { useApp } from '../../context/AppContext';
import { Trash, Download, Settings } from 'lucide-react';
import type { Document } from '../../context/types';

interface DocumentTableProps {
    documents: Document[];
    onOpenExportModal: (id: number) => void;
    onPromptDelete: (type: 'document', id: number) => void;
}

const DocumentTable: React.FC<DocumentTableProps> = ({ documents, onOpenExportModal, onPromptDelete }) => {
    const { selectedDocs, toggleDocSelect, selectAllDocuments, clearSelection, setAnnotatingDocId, currentProject, showToast } = useApp();

    const handleAnnotate = (docId: number) => {
        if (!currentProject?.labels || currentProject.labels.length === 0) {
            showToast('error', 'No Labels Defined', 'Please create at least one label in Project Configuration before annotating.');
            return;
        }
        setAnnotatingDocId(docId);
    };

    const allSelected = documents.length > 0 && documents.every(d => selectedDocs.has(d.id));

    const handleSelectAll = () => {
        if (allSelected) {
            clearSelection();
            return;
        }

        const projectDocsCount = currentProject ? documents.filter(d => d.projectId === currentProject.id).length : documents.length;
        const displayedCount = documents.length;

        if (currentProject && displayedCount !== projectDocsCount) {
            documents.forEach(d => {
                if (!selectedDocs.has(d.id)) toggleDocSelect(d.id);
            });
            return;
        }

        selectAllDocuments();
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs uppercase font-semibold border-b border-gray-200 dark:border-gray-600">
                    <tr>
                        <th className="w-8 px-4 py-3">
                            <input type="checkbox" checked={allSelected} onChange={handleSelectAll} className="rounded text-primary focus:ring-primary cursor-pointer" />
                        </th>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-left">Size</th>
                        <th className="px-4 py-3 text-left">Tokens</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {documents.map(d => {
                        const isSelected = selectedDocs.has(d.id);

                        let statusColor = 'text-slate-600 border-slate-300 dark:text-gray-300 dark:border-gray-600';
                        if (d.status === 'Annotated') statusColor = 'text-emerald-600 border-emerald-400/60 dark:text-emerald-300 dark:border-emerald-300/50';
                        else if (d.status === 'Review') statusColor = 'text-amber-600 border-amber-400/60 dark:text-amber-300 dark:border-amber-300/50';
                        else if (d.status === 'Processed') statusColor = 'text-violet-600 border-violet-400/60 dark:text-violet-300 dark:border-violet-300/50';
                        else if (d.status === 'In Progress') statusColor = 'text-blue-600 border-blue-400/60 dark:text-blue-300 dark:border-blue-300/50';
                        else if (d.status === 'Error') statusColor = 'text-red-600 border-red-400/60 dark:text-red-300 dark:border-red-300/50';

                        let actionBtn = (
                            <button onClick={() => handleAnnotate(d.id)} className="text-xs font-medium min-w-[96px] px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:border-gray-400 dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-500 transition-colors">
                                Annotate
                            </button>
                        );

                        if (d.status === 'Processed') {
                            actionBtn = (
                                <button onClick={() => handleAnnotate(d.id)} className="text-xs font-medium min-w-[96px] px-3 py-1.5 rounded border border-violet-300 text-violet-600 hover:border-violet-400 dark:border-violet-500 dark:text-violet-300 dark:hover:border-violet-400 transition-colors">
                                    View
                                </button>
                            );
                        } else if (d.status === 'Review') {
                            actionBtn = (
                                <button onClick={() => handleAnnotate(d.id)} className="text-xs font-medium min-w-[96px] px-3 py-1.5 rounded border border-amber-300 text-amber-600 hover:border-amber-400 dark:border-amber-500 dark:text-amber-300 dark:hover:border-amber-400 transition-colors">
                                    Review
                                </button>
                            );
                        } else if (d.status === 'Annotated') {
                            actionBtn = (
                                <button onClick={() => handleAnnotate(d.id)} className="text-xs font-medium min-w-[96px] px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:border-gray-400 dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-500 transition-colors">
                                    View
                                </button>
                            );
                        }

                        return (
                            <tr key={d.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${isSelected ? 'bg-emerald-50/20 dark:bg-emerald-900/10' : ''}`}>
                                <td className="px-4 py-3">
                                    <input type="checkbox" checked={isSelected} onChange={() => toggleDocSelect(d.id)} className="w-5 h-5 rounded text-primary focus:ring-primary border-2 border-gray-400 dark:border-gray-500 cursor-pointer" />
                                </td>
                                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{d.name}</td>
                                <td className="px-4 py-3">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border ${statusColor}`}>{d.status}</span>
                                </td>
                                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{new Date(d.date).toLocaleDateString()}</td>
                                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{d.size}</td>
                                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{d.tokens}</td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex justify-end gap-2 items-center">
                                        {actionBtn}
                                        <button onClick={() => onOpenExportModal(d.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                            <Download className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleAnnotate(d.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" title="Configure Document">
                                            <Settings className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => onPromptDelete('document', d.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-red-500">
                                            <Trash className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default DocumentTable;
