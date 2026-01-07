import React from 'react';
import { X, Play, BrainCircuit, FileText, Tag, ScrollText } from 'lucide-react';
import type { Document } from '../../context/types';

interface WorkflowConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    doc: Document;
    labelCount: number;
    ruleCount: number;
}

const WorkflowConfirmModal: React.FC<WorkflowConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    doc,
    labelCount,
    ruleCount
}) => {
    if (!isOpen) return null;

    // Real Token Estimation using actual document tokenCount
    const docTokens = doc.tokenCount || 0;
    const systemPromptTokens = 1500;
    const labelsTokens = labelCount * 15;
    const rulesTokens = ruleCount * 45;
    const totalInput = docTokens + systemPromptTokens + labelsTokens + rulesTokens;
    const estOutput = Math.max(500, Math.floor(labelCount * 50 + ruleCount * 100)); // Estimated based on response structure
    const totalEst = totalInput + estOutput;


    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 w-[500px] rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <BrainCircuit className="w-5 h-5 text-primary" /> Confirm AI Processing
                        </h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-4 mb-6">
                        <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
                            This run will send your document, labels, and rules to the LLM.
                            Token counts below are <strong>approximate</strong> estimates.
                        </p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg text-center border border-gray-100 dark:border-gray-700">
                            <span className="block text-xs font-semibold text-gray-500 uppercase">Input</span>
                            <span className="text-xl font-bold text-gray-800 dark:text-gray-200">{totalInput.toLocaleString()}</span>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg text-center border border-gray-100 dark:border-gray-700">
                            <span className="block text-xs font-semibold text-gray-500 uppercase">Est. Output</span>
                            <span className="text-xl font-bold text-gray-800 dark:text-gray-200">{estOutput.toLocaleString()}</span>
                        </div>
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg text-center border border-indigo-100 dark:border-indigo-800">
                            <span className="block text-xs font-bold text-indigo-500 uppercase">Total Est.</span>
                            <span className="text-xl font-bold text-indigo-700 dark:text-indigo-300">{totalEst.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Breakdown */}
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-8 px-2">
                        <div className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-700 border-dashed">
                            <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-gray-400" /> Document Content</span>
                            <span>~{docTokens}</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-700 border-dashed">
                            <span className="flex items-center gap-2"><BrainCircuit className="w-4 h-4 text-gray-400" /> System Prompt</span>
                            <span>~{systemPromptTokens}</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-700 border-dashed">
                            <span className="flex items-center gap-2"><Tag className="w-4 h-4 text-gray-400" /> Active Labels ({labelCount})</span>
                            <span>~{labelsTokens}</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-700 border-dashed">
                            <span className="flex items-center gap-2"><ScrollText className="w-4 h-4 text-gray-400" /> Extraction Rules ({ruleCount})</span>
                            <span>~{rulesTokens}</span>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-8">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-bold shadow-md shadow-primary/20 transform transition-all hover:scale-[1.02] flex items-center gap-2"
                        >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            Proceed to AI Processing
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WorkflowConfirmModal;
