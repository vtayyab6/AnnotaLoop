import React, { useState } from 'react';
import type { Document, Project, Label, Rule } from '../../context/types';
import { Tag, FileText, Plus, X, Edit2, RotateCcw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import ConfirmModal from '../modals/ConfirmModal';

// Reusing colors from ConfigModal
const COLORS = [
    'bg-blue-500', 'bg-green-500', 'bg-red-500', 'bg-yellow-500',
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-gray-500'
];

interface ConfigurationPanelProps {
    doc: Document;
    project: Project;
}

const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({ doc, project }) => {
    const { setDocuments, showToast } = useApp();
    const [activeTab, setActiveTab] = useState<'labels' | 'rules'>('labels');

    // -- Editing State --
    const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
    const [editingLabelIdx, setEditingLabelIdx] = useState<number | null>(null); // If null, adding new.
    const [currentLabel, setCurrentLabel] = useState<Label>({ id: '', name: '', desc: '', color: 'bg-blue-500' });

    const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
    const [editingRuleIdx, setEditingRuleIdx] = useState<number | null>(null);
    const [currentRule, setCurrentRule] = useState<Rule>({ id: '', name: '', logic: '' });

    // Values to display: prefer document specific, fallback to project defaults
    const hasLabelOverride = !!doc.labels;
    const hasRuleOverride = !!doc.rules;
    const effectiveLabels = doc.labels || project.labels;
    const effectiveRules = doc.rules || project.rules;

    // --- Confirmation Modal State ---
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        type?: 'danger' | 'info';
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    const openConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'info' = 'danger') => {
        setConfirmModal({ isOpen: true, title, message, onConfirm, type });
    };

    const getNextColor = (currentItems: { color?: string }[]) => {
        const usedColors = new Set(currentItems.map(i => i.color));
        const available = COLORS.filter(c => !usedColors.has(c));
        return available.length > 0 ? available[0] : COLORS[Math.floor(Math.random() * COLORS.length)];
    };


    // --- Label Handlers ---
    const openAddLabel = () => {
        const nextColor = getNextColor(effectiveLabels);
        setCurrentLabel({ id: '', name: '', desc: '', color: nextColor });
        setEditingLabelIdx(null);
        setIsLabelModalOpen(true);
    };

    const openEditLabel = (idx: number, label: Label) => {
        setCurrentLabel({ ...label });
        setEditingLabelIdx(idx);
        setIsLabelModalOpen(true);
    };

    const saveLabel = () => {
        if (!currentLabel.name.trim()) return;

        // "Copy" inherited labels if creating override for the first time
        const baseLabels = hasLabelOverride ? [...effectiveLabels] : [...project.labels];

        let newLabels = [...baseLabels];
        if (editingLabelIdx !== null) {
            newLabels[editingLabelIdx] = currentLabel;
        } else {
            newLabels.push(currentLabel);
        }

        updateDocLabels(newLabels);
        setIsLabelModalOpen(false);
        showToast('success', 'Label Saved', `Label "${currentLabel.name}" saved to document configuration.`);
    };

    const confirmDeleteLabel = (idx: number) => {
        openConfirm(
            'Delete Label?',
            'Are you sure you want to delete this label from the document configuration?',
            () => {
                const baseLabels = hasLabelOverride ? [...effectiveLabels] : [...project.labels];
                baseLabels.splice(idx, 1);
                updateDocLabels(baseLabels);
                showToast('success', 'Label Deleted', 'Label removed from document.');
            }
        );
    };

    const updateDocLabels = (newLabels: Label[]) => {
        setDocuments((prev: Document[]) => prev.map((d: Document) =>
            d.id === doc.id ? { ...d, labels: newLabels } : d
        ));
    };


    const resetLabels = () => {
        openConfirm(
            'Reset Labels?',
            'Reset labels to project defaults? This will lose all document-specific changes.',
            () => {
                setDocuments((prev: Document[]) => prev.map((d: Document) => {
                    if (d.id !== doc.id) return d;
                    const { labels, ...rest } = d;
                    return rest;
                }));
                showToast('info', 'Reset Complete', 'Scanning project defaults.');
            },
            'info'
        );
    };

    // --- Rule Handlers ---
    const openAddRule = () => {
        setCurrentRule({ id: '', name: '', logic: '' });
        setEditingRuleIdx(null);
        setIsRuleModalOpen(true);
    };

    const openEditRule = (idx: number, rule: Rule) => {
        setCurrentRule({ ...rule });
        setEditingRuleIdx(idx);
        setIsRuleModalOpen(true);
    };

    const saveRule = () => {
        if (!currentRule.name.trim()) return;

        const baseRules = hasRuleOverride ? [...effectiveRules] : [...project.rules];
        let newRules = [...baseRules];

        if (editingRuleIdx !== null) {
            newRules[editingRuleIdx] = currentRule;
        } else {
            newRules.push(currentRule);
        }

        updateDocRules(newRules);
        setIsRuleModalOpen(false);
        showToast('success', 'Rule Saved', `Rule "${currentRule.name}" saved to document.`);
    };

    const confirmDeleteRule = (idx: number) => {
        openConfirm(
            'Delete Rule?',
            'Are you sure you want to delete this rule from the document configuration?',
            () => {
                const baseRules = hasRuleOverride ? [...effectiveRules] : [...project.rules];
                baseRules.splice(idx, 1);
                updateDocRules(baseRules);
                showToast('success', 'Rule Deleted', 'Rule removed from document.');
            }
        );
    };

    const updateDocRules = (newRules: Rule[]) => {
        setDocuments((prev: Document[]) => prev.map((d: Document) =>
            d.id === doc.id ? { ...d, rules: newRules } : d
        ));
    };


    const resetRules = () => {
        openConfirm(
            'Reset Rules?',
            'Reset rules to project defaults? This will lose all document-specific changes.',
            () => {
                setDocuments((prev: Document[]) => prev.map((d: Document) => {
                    if (d.id !== doc.id) return d;
                    const { rules, ...rest } = d;
                    return rest;
                }));
                showToast('info', 'Reset Complete', 'Using project rules.');
            },
            'info'
        );
    };

    const insertLabelIntoRule = (txtName: string) => {
        setCurrentRule((prev: Rule) => ({
            ...prev,
            logic: prev.logic + (prev.logic ? ' ' : '') + `[${txtName}]`
        }));
    };

    // --- Render Helpers ---

    const InheritanceBadge = ({ isOverride }: { isOverride: boolean }) => (
        <span
            className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded cursor-help flex items-center gap-1 ${isOverride ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
                }`}
            title={isOverride ? "Defined explicitly for this document" : "Inherited from Project Settings"}
        >
            {isOverride ? 'Doc' : 'Proj'}
        </span>
    );

    return (
        <div className="flex flex-col h-full relative">
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                positionClass="absolute inset-0"
            />

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-10">
                <button
                    onClick={() => setActiveTab('labels')}
                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'labels'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
                        }`}
                >
                    <Tag className="w-4 h-4" /> Labels
                    <span className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full text-xs text-gray-600 dark:text-gray-300">{effectiveLabels.length}</span>
                </button>
                <button
                    onClick={() => setActiveTab('rules')}
                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'rules'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
                        }`}
                >
                    <FileText className="w-4 h-4" /> Rules
                    <span className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full text-xs text-gray-600 dark:text-gray-300">{effectiveRules.length}</span>
                </button>
            </div>

            {/* Action Bar (Buttons on Top) */}
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <button
                    onClick={activeTab === 'labels' ? openAddLabel : openAddRule}
                    className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-primary hover:text-primary transition-all shadow-sm flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> New {activeTab === 'labels' ? 'Label' : 'Rule'}
                </button>

                <div className="flex items-center gap-2">
                    {((activeTab === 'labels' && hasLabelOverride) || (activeTab === 'rules' && hasRuleOverride)) ? (
                        <button
                            onClick={activeTab === 'labels' ? resetLabels : resetRules}
                            className="p-1.5 hover:bg-white dark:hover:bg-gray-800 rounded-md text-gray-400 hover:text-orange-500 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
                            title="Reset to Project Defaults"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                    ) : (
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Inherited</span>
                    )}
                </div>
            </div>

            {/* List Content */}
            <div className="p-4 flex-1 overflow-y-auto scroll-custom">
                {activeTab === 'labels' && (
                    <div className="space-y-3">
                        {effectiveLabels.map((label: Label, idx: number) => (
                            <div key={idx} className="bg-white dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700 group hover:shadow-md transition-all">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-4 h-4 rounded-full ${label.color} shadow-sm shrink-0`}></div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-medium text-sm text-gray-800 dark:text-gray-200">{label.name}</span>
                                                <InheritanceBadge isOverride={hasLabelOverride} />
                                            </div>
                                            {label.desc && <p className="text-xs text-gray-500 mt-0.5">{label.desc}</p>}
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openEditLabel(idx, label)} className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-600 rounded text-gray-400 hover:text-blue-500">
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => confirmDeleteLabel(idx)} className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-600 rounded text-gray-400 hover:text-red-500">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {effectiveLabels.length === 0 && (
                            <div className="text-center py-8 text-gray-400 text-sm">
                                <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                No labels defined.
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'rules' && (
                    <div className="space-y-3">
                        {effectiveRules.map((rule: Rule, idx: number) => (
                            <div key={idx} className="bg-white dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700 group hover:shadow-md transition-all">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-medium text-sm text-gray-800 dark:text-gray-200 flex items-center gap-2 flex-wrap">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0"></div>
                                        {rule.name}
                                        <InheritanceBadge isOverride={hasRuleOverride} />
                                    </h4>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openEditRule(idx, rule)} className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-600 rounded text-gray-400 hover:text-blue-500">
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => confirmDeleteRule(idx)} className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-600 rounded text-gray-400 hover:text-red-500">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                                <div className="text-xs font-mono bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-100 dark:border-gray-600 text-gray-600 dark:text-gray-400 overflow-x-auto whitespace-pre-wrap">
                                    {rule.logic}
                                </div>
                            </div>
                        ))}
                        {effectiveRules.length === 0 && (
                            <div className="text-center py-8 text-gray-400 text-sm">
                                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                No rules defined.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* --- Modals --- */}

            {/* Label Modal */}
            {isLabelModalOpen && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-[1px]">
                    <div className="bg-white dark:bg-gray-800 w-[90%] max-w-sm rounded-xl shadow-2xl p-5 border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-900 dark:text-gray-100">{editingLabelIdx !== null ? 'Edit Label' : 'New Label'}</h3>
                            <button onClick={() => setIsLabelModalOpen(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Name</label>
                                <input
                                    autoFocus
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-transparent"
                                    placeholder="Label Name"
                                    value={currentLabel.name}
                                    onChange={e => setCurrentLabel({ ...currentLabel, name: e.target.value })}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') saveLabel();
                                    }}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Description</label>
                                <input
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-transparent"
                                    placeholder="Optional description"
                                    value={currentLabel.desc || ''}
                                    onChange={e => setCurrentLabel({ ...currentLabel, desc: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Color</label>
                                <div className="flex flex-wrap gap-2">
                                    {COLORS.map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setCurrentLabel({ ...currentLabel, color: c })}
                                            className={`w-6 h-6 rounded-full ${c} transition-all ${currentLabel.color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-110'}`}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="pt-2 flex gap-2">
                                <button onClick={() => setIsLabelModalOpen(false)} className="flex-1 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button onClick={saveLabel} className="flex-1 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover shadow-sm">Save</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Rule Modal */}
            {isRuleModalOpen && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-[1px]">
                    <div className="bg-white dark:bg-gray-800 w-[90%] max-w-sm rounded-xl shadow-2xl p-5 border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-900 dark:text-gray-100">{editingRuleIdx !== null ? 'Edit Rule' : 'New Rule'}</h3>
                            <button onClick={() => setIsRuleModalOpen(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Name</label>
                                <input
                                    autoFocus
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-transparent"
                                    placeholder="Rule Name"
                                    value={currentRule.name}
                                    onChange={e => setCurrentRule({ ...currentRule, name: e.target.value })}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') saveRule();
                                    }}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Logic / Prompt</label>
                                <textarea
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-transparent h-24 resize-none"
                                    placeholder="Describe the extraction logic..."
                                    value={currentRule.logic}
                                    onChange={e => setCurrentRule({ ...currentRule, logic: e.target.value })}
                                />
                                <div className="mt-2 text-xs">
                                    <span className="text-gray-500 block mb-1">Insert Label:</span>
                                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto custom-scroll">
                                        {effectiveLabels.map((l: Label, i: number) => (
                                            <button
                                                key={i}
                                                onClick={() => insertLabelIntoRule(l.name)}
                                                className={`px-1.5 py-0.5 rounded text-[10px] text-white ${l.color} hover:opacity-80 transition-opacity`}
                                                title={`Insert [${l.name}]`}
                                            >
                                                {l.name}
                                            </button>
                                        ))}
                                        {effectiveLabels.length === 0 && <span className="text-gray-400 italic">No labels available to insert.</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="pt-2 flex gap-2">
                                <button onClick={() => setIsRuleModalOpen(false)} className="flex-1 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button onClick={saveRule} className="flex-1 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover shadow-sm">Save</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConfigurationPanel;
