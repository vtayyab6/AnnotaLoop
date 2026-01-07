import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Trash, X, Edit2, Download, Upload } from 'lucide-react';
import type { Label, Rule, Project } from '../../context/types';

const COLORS = [
    'bg-blue-500', 'bg-green-500', 'bg-red-500', 'bg-yellow-500',
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-gray-500'
];

// --- Auto Color Helper ---
const getNextColor = (currentItems: { color?: string }[]) => {
    const usedColors = new Set(currentItems.map(i => i.color));
    const available = COLORS.filter(c => !usedColors.has(c));
    return available.length > 0 ? available[0] : COLORS[Math.floor(Math.random() * COLORS.length)];
};

interface ConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: number | null;
    onExportLabels?: () => void;
    onImportLabels?: () => void;
    onExportRules?: () => void;
    onImportRules?: () => void;
}

const ConfigModal: React.FC<ConfigModalProps> = ({
    isOpen,
    onClose,
    projectId,
    onExportLabels,
    onImportLabels,
    onExportRules,
    onImportRules
}) => {
    const { projects, setProjects, currentProject, setCurrentProject } = useApp();
    const [activeTab, setActiveTab] = useState<'labels' | 'rules'>('labels');

    // Reset tab on open
    React.useEffect(() => {
        if (isOpen) {
            setActiveTab('labels');
        }
    }, [isOpen]);

    const project = projects.find((p: Project) => p.id === projectId);

    // Local state for forms
    const [labelName, setLabelName] = useState('');
    const [labelDesc, setLabelDesc] = useState('');
    const [labelColor, setLabelColor] = useState('bg-blue-500');
    const [editingLabelIdx, setEditingLabelIdx] = useState<number | null>(null);

    const [ruleName, setRuleName] = useState('');
    const [ruleLogic, setRuleLogic] = useState('');
    const [editingRuleIdx, setEditingRuleIdx] = useState<number | null>(null);

    // Delete Confirmation State
    const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'label' | 'rule'; idx: number } | null>(null);

    if (!isOpen || !project) return null;

    // --- Auto Color Helper ---


    const handleEditLabel = (idx: number) => {
        const l = project.labels[idx];
        setLabelName(l.name);
        setLabelDesc(l.desc || '');
        setLabelColor(l.color);
        setEditingLabelIdx(idx);
    };

    const handleSaveLabel = () => {
        if (!labelName) return;
        const newLabel: Label = { id: crypto.randomUUID(), name: labelName, desc: labelDesc, color: labelColor };

        setProjects((prev: Project[]) => prev.map((p: Project) => {
            if (p.id !== projectId) return p;
            const updatedLabels = [...p.labels];
            if (editingLabelIdx !== null) {
                updatedLabels[editingLabelIdx] = newLabel;
            } else {
                updatedLabels.push(newLabel);
            }
            const updatedProject = { ...p, labels: updatedLabels };
            // Sync currentProject if this is the active project
            if (currentProject?.id === projectId) {
                setCurrentProject(updatedProject);
            }
            return updatedProject;
        }));
        resetLabelForm();
    };

    const confirmDeleteLabel = (idx: number) => {
        setDeleteConfirm({ type: 'label', idx });
    };

    const executeDelete = () => {
        if (!deleteConfirm) return;
        const { type, idx } = deleteConfirm;

        setProjects((prev: Project[]) => prev.map((p: Project) => {
            if (p.id !== projectId) return p;
            let updatedProject;
            if (type === 'label') {
                updatedProject = { ...p, labels: p.labels.filter((_: any, i: number) => i !== idx) };
            } else {
                updatedProject = { ...p, rules: (p.rules || []).filter((_: any, i: number) => i !== idx) };
            }
            // Sync currentProject if this is the active project
            if (currentProject?.id === projectId) {
                setCurrentProject(updatedProject);
            }
            return updatedProject;
        }));

        if (type === 'label' && editingLabelIdx === idx) resetLabelForm();
        if (type === 'rule' && editingRuleIdx === idx) resetRuleForm();

        setDeleteConfirm(null);
    };

    const resetLabelForm = () => {
        setLabelName('');
        setLabelDesc('');
        setLabelColor(getNextColor(project.labels));
        setEditingLabelIdx(null);
    };


    // --- Rule Handlers ---
    const handleEditRule = (idx: number) => {
        if (!project.rules) return;
        const r = project.rules[idx];
        setRuleName(r.name);
        setRuleLogic(r.logic);
        setEditingRuleIdx(idx);
    };

    const handleSaveRule = () => {
        if (!ruleName) return;
        const newRule: Rule = { id: crypto.randomUUID(), name: ruleName, logic: ruleLogic };

        setProjects((prev: Project[]) => prev.map((p: Project) => {
            if (p.id !== projectId) return p;
            const updatedRules = p.rules ? [...p.rules] : [];
            if (editingRuleIdx !== null) {
                updatedRules[editingRuleIdx] = newRule;
            } else {
                updatedRules.push(newRule);
            }
            const updatedProject = { ...p, rules: updatedRules };
            // Sync currentProject if this is the active project
            if (currentProject?.id === projectId) {
                setCurrentProject(updatedProject);
            }
            return updatedProject;
        }));
        resetRuleForm();
    };

    const confirmDeleteRule = (idx: number) => {
        setDeleteConfirm({ type: 'rule', idx });
    };

    const resetRuleForm = () => {
        setRuleName('');
        setRuleLogic('');
        setEditingRuleIdx(null);
    };

    const insertLabelIntoRule = (txt: string) => {
        setRuleLogic(prev => prev + (prev ? ' ' : '') + `[${txt}]`);
    };


    return (
        <div className="modal-overlay active fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50 backdrop-blur-sm">
            <div className="modal-content bg-white dark:bg-gray-800 w-[800px] h-[600px] rounded-xl shadow-2xl flex flex-col overflow-hidden relative">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white">Project Configuration</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Manage labels and extraction rules.</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-between items-center flex-shrink-0">
                    <div className="flex gap-6">
                        <button onClick={() => { setActiveTab('labels'); resetLabelForm(); }} className={`py-3 text-sm font-medium transition-all border-b-2 ${activeTab === 'labels' ? 'text-primary border-primary' : 'text-gray-500 dark:text-gray-400 border-transparent'}`}>Labels</button>
                        <button onClick={() => { setActiveTab('rules'); resetRuleForm(); }} className={`py-3 text-sm font-medium transition-all border-b-2 ${activeTab === 'rules' ? 'text-primary border-primary' : 'text-gray-500 dark:text-gray-400 border-transparent'}`}>Rules</button>
                    </div>

                    {/* Export/Import Buttons */}
                    <div className="flex gap-2">
                        {activeTab === 'labels' ? (
                            <>
                                <button
                                    onClick={onImportLabels}
                                    title="Import Labels"
                                    className="p-2 text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                >
                                    <Upload className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={onExportLabels}
                                    title="Export Labels"
                                    className="p-2 text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={onImportRules}
                                    title="Import Rules"
                                    className="p-2 text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                >
                                    <Upload className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={onExportRules}
                                    title="Export Rules"
                                    className="p-2 text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Body Content */}
                <div className="flex-grow overflow-y-auto bg-gray-50 dark:bg-gray-900 p-6 scroll-custom text-gray-800 dark:text-gray-200 relative">

                    {/* LABELS TAB */}
                    {activeTab === 'labels' && (
                        <div className="flex gap-6 h-full">
                            {/* Left Column: List */}
                            <div className="w-1/2 flex flex-col">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Active Labels</h4>
                                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm flex-grow overflow-y-auto scroll-custom p-2 space-y-2">
                                    {project.labels.length === 0 && (
                                        <p className="text-center text-gray-400 my-10 italic text-xs">No labels yet. Add your first label to get started.</p>
                                    )}
                                    {project.labels.map((l, i) => (
                                        <div key={i}
                                            onClick={() => handleEditLabel(i)}
                                            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${editingLabelIdx === i ? 'border-primary bg-primary/5' : 'border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-gray-50 dark:bg-gray-700/30'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-3 h-3 rounded-full ${l.color} shadow-sm shrink-0`}></div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{l.name}</span>
                                                    {l.desc && <span className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{l.desc}</span>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleEditLabel(i); }}
                                                    className="text-gray-400 hover:text-blue-500 p-1"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); confirmDeleteLabel(i); }}
                                                    className="text-gray-400 hover:text-red-500 p-1"
                                                >
                                                    <Trash className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right Column: Form */}
                            <div className="w-1/2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 shadow-sm h-fit">
                                <h4 className="text-sm font-bold mb-2">{editingLabelIdx !== null ? 'Edit Label' : 'Add New Label'}</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Labels define the data you want to extract (e.g., Invoice Number, Date, Total).</p>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Name</label>
                                        <input
                                            type="text"
                                            value={labelName}
                                            onChange={e => setLabelName(e.target.value)}
                                            className="w-full bg-transparent border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                                            placeholder="Label Name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Description</label>
                                        <input
                                            type="text"
                                            value={labelDesc}
                                            onChange={e => setLabelDesc(e.target.value)}
                                            className="w-full bg-transparent border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                                            placeholder="Description"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Color</label>
                                        <div className="flex gap-2 flex-wrap">
                                            {COLORS.map(c => (
                                                <button
                                                    key={c}
                                                    onClick={() => setLabelColor(c)}
                                                    className={`w-6 h-6 rounded-full ${c} transition-all ${labelColor === c ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-500 scale-110' : 'hover:scale-110 ring-transparent'}`}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        {editingLabelIdx !== null && (
                                            <button
                                                onClick={resetLabelForm}
                                                className="px-4 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                        <button
                                            onClick={handleSaveLabel}
                                            className="flex-1 bg-gray-800 dark:bg-gray-700 hover:bg-gray-700 dark:hover:bg-gray-600 text-white py-2 rounded-lg font-medium text-sm transition-colors"
                                        >
                                            {editingLabelIdx !== null ? 'Update Label' : 'Save Label'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* RULES TAB */}
                    {activeTab === 'rules' && (
                        <div className="flex gap-6 h-full">
                            {/* Left Column: List */}
                            <div className="w-1/2 flex flex-col">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Existing Rules</h4>
                                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm flex-grow overflow-y-auto scroll-custom p-2 space-y-2">
                                    {(project.rules || []).length === 0 && (
                                        <p className="text-center text-gray-400 my-10 italic text-xs">No rules yet. Add a rule to refine or validate extracted data.</p>
                                    )}
                                    {(project.rules || []).map((r: Rule, i: number) => (
                                        <div key={i}
                                            onClick={() => handleEditRule(i)}
                                            className={`flex items-start justify-between p-3 rounded-lg border cursor-pointer transition-all ${editingRuleIdx === i ? 'border-primary bg-primary/5' : 'border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-gray-50 dark:bg-gray-700/30'}`}
                                        >
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{r.name}</span>
                                                </div>
                                                <p className="text-xs font-mono text-gray-500 dark:text-gray-400 line-clamp-2">{r.logic}</p>
                                            </div>
                                            <div className="flex items-center gap-1 ml-2 shrink-0">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleEditRule(i); }}
                                                    className="text-gray-400 hover:text-blue-500 p-1"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); confirmDeleteRule(i); }}
                                                    className="text-gray-400 hover:text-red-500 p-1"
                                                >
                                                    <Trash className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right Column: Form */}
                            <div className="w-1/2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 shadow-sm h-fit">
                                <h4 className="text-sm font-bold mb-2">{editingRuleIdx !== null ? 'Edit Extraction Rule' : 'Add Extraction Rule'}</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Rules refine how labels are extracted and help validate results (optional).</p>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Rule Name</label>
                                        <input
                                            type="text"
                                            value={ruleName}
                                            onChange={e => setRuleName(e.target.value)}
                                            className="w-full bg-transparent border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                                            placeholder="e.g. Extract Invoice Total"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Description / Logic</label>
                                        <textarea
                                            value={ruleLogic}
                                            onChange={e => setRuleLogic(e.target.value)}
                                            className="w-full bg-transparent border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm h-24 resize-none focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                                            placeholder="Describe how extracted labels should be refined or validated."
                                        ></textarea>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Insert Label</label>
                                        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto custom-scroll">
                                            {project.labels.map((l: Label, i: number) => (
                                                <button
                                                    key={i}
                                                    onClick={() => insertLabelIntoRule(l.name)}
                                                    className={`px-2 py-1 rounded text-[10px] font-medium text-white ${l.color} hover:opacity-90 transition-opacity`}
                                                >
                                                    {l.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        {editingRuleIdx !== null && (
                                            <button
                                                onClick={resetRuleForm}
                                                className="px-4 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                        <button
                                            onClick={handleSaveRule}
                                            className="flex-1 bg-gray-800 dark:bg-gray-700 hover:bg-gray-700 dark:hover:bg-gray-600 text-white py-2 rounded-lg font-medium text-sm transition-colors"
                                        >
                                            {editingRuleIdx !== null ? 'Update Rule' : 'Save Rule'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* DELETE CONFIRMATION OVERLAY */}
                {deleteConfirm && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-[2px] transition-all">
                        {/* Click backdrop to cancel */}
                        <div
                            className="absolute inset-0"
                            onClick={() => setDeleteConfirm(null)}
                        ></div>

                        <div className="bg-white dark:bg-gray-800 w-[400px] rounded-xl shadow-2xl p-6 relative z-10 animate-in fade-in zoom-in-95 duration-200">
                            <div className="mx-auto w-12 h-12 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-full flex items-center justify-center mb-4">
                                <Trash className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 text-center">Delete {deleteConfirm.type === 'label' ? 'Label' : 'Rule'}?</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center">
                                Are you sure you want to delete <span className="font-semibold text-gray-800 dark:text-gray-200">
                                    {deleteConfirm.type === 'label'
                                        ? project.labels[deleteConfirm.idx]?.name
                                        : project.rules?.[deleteConfirm.idx]?.name}
                                </span>? This action cannot be undone.
                            </p>
                            <div className="flex justify-center gap-3">
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={executeDelete}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default ConfigModal;
