import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Check, X, Filter, ChevronDown, CheckCircle, Clock, Quote, FileText, Bookmark, RotateCcw, AlertTriangle } from 'lucide-react';
import type { Document, Annotation, RuleEvaluation, Label, Rule } from '../../context/types';
import CustomFilterDropdown from './CustomFilterDropdown';

interface ReviewPanelProps {
    doc: Document;
    onCompleteReview: () => void;
    activeAnnotationId?: string | null;
    onAnnotationSelect?: (annotationId: string | null) => void;
}

const ReviewPanel: React.FC<ReviewPanelProps> = ({
    doc,
    onCompleteReview: _onCompleteReview,
    activeAnnotationId,
    onAnnotationSelect
}) => {
    const { currentProject, showToast, setDocuments } = useApp();
    const effectiveLabels = doc.labels || currentProject?.labels || [];
    const effectiveRules = doc.rules || currentProject?.rules || [];

    const [activeTab, setActiveTab] = useState<'annotations' | 'rules'>('annotations');
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');
    const [filterLabel, setFilterLabel] = useState<string>('all');

    // UI state for custom dropdowns
    const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
    const [labelDropdownOpen, setLabelDropdownOpen] = useState(false);

    // Initialize from real review data or fall back to empty
    const [annotations, setAnnotations] = useState<Annotation[]>(() => {
        return doc.reviewData?.annotations || [];
    });

    const [ruleEvaluations, setRuleEvaluations] = useState<RuleEvaluation[]>(() => {
        return doc.reviewData?.ruleEvaluations || [];
    });

    // Update when doc changes
    useEffect(() => {
        if (doc.reviewData?.annotations) {
            setAnnotations(doc.reviewData.annotations);
        }
        if (doc.reviewData?.ruleEvaluations) {
            setRuleEvaluations(doc.reviewData.ruleEvaluations);
        }
    }, [doc.reviewData]);

    // Scroll active annotation into view
    useEffect(() => {
        if (activeAnnotationId) {
            const card = document.getElementById(`annotation-card-${activeAnnotationId}`);
            if (card) {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [activeAnnotationId]);

    // Persist annotation status changes to document
    const updateAnnotationStatus = (id: string, status: 'pending' | 'accepted' | 'rejected') => {
        const updatedAnnotations = annotations.map(a =>
            a.id === id ? { ...a, status } : a
        );
        setAnnotations(updatedAnnotations);

        // Persist to document
        setDocuments((prev: Document[]) => prev.map((d: Document) =>
            d.id === doc.id && d.reviewData
                ? { ...d, reviewData: { ...d.reviewData, annotations: updatedAnnotations } }
                : d
        ));
    };



    // Actions
    const [confirmAction, setConfirmAction] = useState<{ type: string; label: string } | null>(null);
    const [bulkDropdownOpen, setBulkDropdownOpen] = useState(false);

    // Filter Logic
    const filteredAnnotations = annotations.filter(a => {
        if (filterStatus !== 'all' && a.status !== filterStatus) return false;
        if (filterLabel !== 'all' && a.labelId !== filterLabel) return false;
        return true;
    });

    // Actions Handlers
    const handleAccept = (id: string) => {
        updateAnnotationStatus(id, 'accepted');
    };

    const handleReject = (id: string) => {
        updateAnnotationStatus(id, 'rejected');
    };

    const triggerConfirm = (type: string, label: string) => {
        setConfirmAction({ type, label });
        setBulkDropdownOpen(false);
    };

    const handleConfirmAction = () => {
        if (!confirmAction) return;

        const updatedAnnotations = annotations.map(a => {
            // Apply filters
            if (filterLabel !== 'all' && a.labelId !== filterLabel) return a;

            switch (confirmAction.type) {
                case 'accept_pending':
                    return a.status === 'pending' ? { ...a, status: 'accepted' as const } : a;
                case 'reject_pending':
                    return a.status === 'pending' ? { ...a, status: 'rejected' as const } : a;
                case 'accept_all':
                    return { ...a, status: 'accepted' as const };
                case 'reject_all':
                    return { ...a, status: 'rejected' as const };
                case 'reset':
                    return { ...a, status: 'pending' as const };
                default:
                    return a;
            }
        });

        setAnnotations(updatedAnnotations);

        // Persist to document
        setDocuments((prev: Document[]) => prev.map((d: Document) =>
            d.id === doc.id && d.reviewData
                ? { ...d, reviewData: { ...d.reviewData, annotations: updatedAnnotations } }
                : d
        ));

        showToast('success', 'Action Confirmed', 'Bulk action completed successfully.');
        setConfirmAction(null);
    };

    // Helper to get descriptive sentence for confirmation
    const getConfirmSentence = (type: string) => {
        switch (type) {
            case 'accept_pending': return 'accept all pending annotations';
            case 'reject_pending': return 'reject all pending annotations';
            case 'accept_all': return 'accept all annotations (overwriting existing)';
            case 'reject_all': return 'reject all annotations (overwriting existing)';
            case 'reset': return 'reset all decisions to pending';
            default: return 'perform this action';
        }
    };

    // Counts - based on filtered annotations when label filter is active
    const countsSource = filterLabel === 'all' ? annotations : filteredAnnotations;
    const counts = {
        total: countsSource.length,
        pending: countsSource.filter(a => a.status === 'pending').length,
        accepted: countsSource.filter(a => a.status === 'accepted').length,
        rejected: countsSource.filter(a => a.status === 'rejected').length
    };

    // --- Render Helpers ---


    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'accepted': return <CheckCircle className="w-4 h-4" />;
            case 'rejected': return <X className="w-4 h-4" />;
            default: return <Clock className="w-4 h-4" />;
        }
    };





    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-xl">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
                <button
                    onClick={() => setActiveTab('annotations')}
                    className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'annotations'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                        }`}
                >
                    Annotations ({counts.total})
                </button>
                <button
                    onClick={() => setActiveTab('rules')}
                    className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'rules'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                        }`}
                >
                    Rules ({ruleEvaluations.length})
                </button>
            </div>

            {/* Toolbar (Annotations Only) */}
            {activeTab === 'annotations' && (
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 space-y-3 shrink-0">
                    {/* Row 1: Status Counts - Chips */}
                    <div className="flex gap-3 text-xs mb-1">
                        <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 border border-yellow-100 dark:border-yellow-900/30">
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mr-2"></div>
                            <span className="font-semibold">Pending: {counts.pending}</span>
                        </div>
                        <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-100 dark:border-gray-700">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2"></div>
                            <span className="font-medium">Accepted: {counts.accepted}</span>
                        </div>
                        <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-100 dark:border-gray-700">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 mr-2"></div>
                            <span className="font-medium">Rejected: {counts.rejected}</span>
                        </div>
                    </div>

                    {/* Row 2: Filters & Actions - Compact */}
                    <div className="flex items-center gap-2">
                        <CustomFilterDropdown
                            value={filterLabel}
                            onChange={setFilterLabel}
                            isOpen={labelDropdownOpen}
                            setIsOpen={setLabelDropdownOpen}
                            label="All Labels"
                            width="w-32"
                            options={[
                                { value: 'all', label: 'All Labels' },
                                ...effectiveLabels.map((l: Label) => ({
                                    value: l.name,
                                    label: l.name,
                                    render: () => (
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${l.color}`}></div>
                                            <span>{l.name}</span>
                                        </div>
                                    )
                                }))
                            ]}
                            renderOption={(val: string) => {
                                if (val === 'all') return 'All Labels';
                                const l = effectiveLabels.find((x: Label) => x.name === val);
                                return (
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${l?.color}`}></div>
                                        <span className="truncate">{l?.name}</span>
                                    </div>
                                );
                            }}
                        />

                        <CustomFilterDropdown
                            value={filterStatus}
                            onChange={(val) => setFilterStatus(val as any)}
                            isOpen={statusDropdownOpen}
                            setIsOpen={setStatusDropdownOpen}
                            label="All Status"
                            width="w-32"
                            options={[
                                { value: 'all', label: 'All Status' },
                                { value: 'pending', label: 'Pending' },
                                { value: 'accepted', label: 'Accepted' },
                                { value: 'rejected', label: 'Rejected' }
                            ]}
                        />

                        {/* Bulk Actions Dropdown */}
                        <div className="relative shrink-0">
                            <button
                                onClick={() => {
                                    setBulkDropdownOpen(!bulkDropdownOpen);
                                    setConfirmAction(null); // Reset confirmation if re-opening
                                }}
                                className="flex items-center gap-2 px-3 py-2 text-xs font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:border-gray-400 dark:hover:border-gray-500 transition-colors text-gray-700 dark:text-gray-300"
                            >
                                <span>Bulk Actions</span>
                                <ChevronDown className="w-3 h-3 text-gray-400" />
                            </button>

                            {/* Dropdown Menu */}
                            {bulkDropdownOpen && !confirmAction && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setBulkDropdownOpen(false)}></div>
                                    <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 py-1">

                                        <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pending Items</div>
                                        <button
                                            onClick={() => triggerConfirm('accept_pending', 'Accept all pending')}
                                            disabled={counts.pending === 0}
                                            className="w-full text-left px-4 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                            Accept all pending
                                        </button>
                                        <button
                                            onClick={() => triggerConfirm('reject_pending', 'Reject all pending')}
                                            disabled={counts.pending === 0}
                                            className="w-full text-left px-4 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                            Reject all pending
                                        </button>

                                        <div className="my-1 border-t border-gray-100 dark:border-gray-700"></div>

                                        <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Force Update</div>
                                        <button
                                            onClick={() => triggerConfirm('accept_all', 'Force accept all (overwrite)')}
                                            className="w-full text-left px-4 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                                        >
                                            Accept all
                                        </button>
                                        <button
                                            onClick={() => triggerConfirm('reject_all', 'Force reject all (overwrite)')}
                                            className="w-full text-left px-4 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                                        >
                                            Reject all
                                        </button>

                                        <div className="my-1 border-t border-gray-100 dark:border-gray-700"></div>

                                        <button
                                            onClick={() => triggerConfirm('reset', 'Reset all decisions')}
                                            className="w-full text-left px-4 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                                        >
                                            <RotateCcw className="w-3 h-3" />
                                            Reset decisions
                                        </button>
                                    </div>
                                </>
                            )}

                            {/* Inline Confirmation Popover - Refined */}
                            {confirmAction && (
                                <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-2xl z-30 p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                                        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Confirm action</h3>
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                                        Are you sure you want to {getConfirmSentence(confirmAction.type)}?
                                    </p>
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => { setConfirmAction(null); setBulkDropdownOpen(false); }}
                                            className="px-3 py-1.5 h-8 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleConfirmAction}
                                            className="px-3 py-1.5 h-8 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded shadow-sm transition-colors"
                                        >
                                            Confirm
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 scroll-custom bg-gray-50 dark:bg-gray-900">
                {activeTab === 'annotations' && (
                    <div className="space-y-4">
                        {filteredAnnotations.map((ann: Annotation) => {
                            const label = effectiveLabels.find(l => l.name === ann.labelId);
                            const labelColor = label?.color || 'bg-gray-500';

                            // Softer Status Colors
                            const getSoftStatusStyle = (s: string) => {
                                switch (s) {
                                    case 'accepted': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800';
                                    case 'rejected': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800';
                                    default: return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-800';
                                }
                            };

                            return (
                                <div
                                    key={ann.id}
                                    id={`annotation-card-${ann.id}`}
                                    onClick={() => onAnnotationSelect?.(activeAnnotationId === ann.id ? null : ann.id)}
                                    className={`bg-white dark:bg-gray-800 rounded-xl border shadow-sm transition-all cursor-pointer ${activeAnnotationId === ann.id
                                        ? 'border-primary ring-2 ring-primary/30 shadow-md'
                                        : 'border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600'
                                        }`}
                                >

                                    {/* Card Header - Neutral Background */}
                                    <div className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700/50 flex justify-between items-center bg-white dark:bg-gray-800 rounded-t-xl">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-2.5 h-2.5 rounded-full ${labelColor} shadow-sm`}></div>
                                            <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{ann.labelId}</span>
                                        </div>
                                        <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getSoftStatusStyle(ann.status)}`}>
                                            {getStatusIcon(ann.status)}
                                            {ann.status}
                                        </div>
                                    </div>

                                    {/* Card Content */}
                                    <div className="p-3">
                                        <div className="mb-3">
                                            <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5">
                                                <p className="text-sm text-gray-900 dark:text-gray-100 font-medium font-mono">
                                                    "{ann.text}"
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-2 mb-4">
                                            <div className="mt-0.5"><Quote className="w-3 h-3 text-gray-400 rotate-180" /></div>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 italic leading-relaxed">
                                                {ann.rationale}
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Confidence</span>
                                            <div className="flex items-center gap-2">
                                                <div className="w-24 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                    <div className="h-full bg-slate-400 dark:bg-slate-500 rounded-full" style={{ width: `${(ann.confidence || 0) * 100}%` }}></div>
                                                </div>
                                                <span className="text-xs font-mono font-bold text-gray-500 dark:text-gray-400">{((ann.confidence || 0) * 100).toFixed(0)}%</span>
                                            </div>
                                        </div>

                                        {/* Actions - Reject Left (Secondary), Accept Right (Primary) - Auto Width, Right Aligned */}
                                        {ann.status === 'pending' ? (
                                            <div className="flex gap-2 justify-end">
                                                <button
                                                    onClick={() => handleReject(ann.id)}
                                                    className="px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-red-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 text-left"
                                                >
                                                    <X className="w-3.5 h-3.5" /> Reject
                                                </button>
                                                <button
                                                    onClick={() => handleAccept(ann.id)}
                                                    className="px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all bg-primary text-white shadow-sm hover:shadow hover:bg-primary-hover border border-transparent text-left"
                                                >
                                                    <Check className="w-3.5 h-3.5" /> Accept
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2 justify-end">
                                                <button
                                                    onClick={() => handleReject(ann.id)}
                                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all text-left ${ann.status === 'rejected' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-gray-50 text-gray-400 border border-transparent hover:border-gray-200'}`}
                                                >
                                                    <X className="w-3.5 h-3.5" /> Reject
                                                </button>
                                                <button
                                                    onClick={() => handleAccept(ann.id)}
                                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all text-left ${ann.status === 'accepted' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-50 text-gray-400 border border-transparent hover:border-gray-200'}`}
                                                >
                                                    <Check className="w-3.5 h-3.5" /> Accept
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {filteredAnnotations.length === 0 && (
                            <div className="text-center py-12 text-gray-400">
                                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Filter className="w-6 h-6 opacity-50" />
                                </div>
                                <p className="text-sm font-medium">No matches found</p>
                                <p className="text-xs opacity-70">Try adjusting your filters</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'rules' && (
                    <div className="space-y-6 pb-20">
                        {effectiveRules.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                                <AlertTriangle className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No rules defined</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                                    Configure rules in the project settings to enable AI reasoning and validation.
                                </p>
                            </div>
                        ) : (
                            ruleEvaluations.map((ev, i) => {
                                // Find the rule definition to display
                                const ruleDef = effectiveRules.find((r: Rule) => r.name === ev.ruleId);

                                return (
                                    <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
                                        {/* Rule Header (Definition) */}
                                        <div className="bg-gray-50/80 dark:bg-gray-900/50 p-4 border-b border-gray-100 dark:border-gray-700">
                                            <div className="flex items-center justify-between gap-3 mb-3">
                                                <h4 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                                                    <FileText className="w-3.5 h-3.5 text-indigo-500" />
                                                    {ev.ruleId}
                                                </h4>

                                                <div className="flex items-center gap-2">
                                                    {ev.confidence !== undefined && (
                                                        <div className="flex items-center gap-1.5 text-[10px] border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5 bg-white dark:bg-gray-800">
                                                            <span className="text-gray-400 uppercase font-bold">Conf</span>
                                                            <span className={`font-mono font-bold ${ev.confidence > 0.8 ? 'text-green-600' : ev.confidence > 0.5 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                                {(ev.confidence * 100).toFixed(0)}%
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border shrink-0 ${ev.pass ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900'}`}>
                                                        {ev.pass ? 'Passed' : 'Failed'}
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Full-width rule definition */}
                                            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-white dark:bg-gray-800 px-3 py-2 rounded border border-gray-200 dark:border-gray-700 w-full break-words whitespace-pre-wrap">
                                                {ruleDef?.logic || "If X then Y..."}
                                            </div>
                                        </div>

                                        {/* Result & Rationale */}
                                        <div className="p-4">
                                            <div className="flex gap-3">
                                                <div className="mt-1 shrink-0">
                                                    <div className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                                        <Bookmark className="w-3.5 h-3.5" />
                                                    </div>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h5 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">AI Rationale</h5>
                                                    <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed break-words">
                                                        {/* Highlight citations */}
                                                        {ev.rationale.split(/(\[\d+\])/g).map((part, idx) =>
                                                            part.match(/^\[\d+\]$/)
                                                                ? <sup key={idx} className="text-blue-600 dark:text-blue-400 font-bold cursor-pointer hover:underline mx-0.5 bg-blue-50 dark:bg-blue-900/30 px-1 rounded">{part}</sup>
                                                                : part
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* References - properly wrapped */}
                                            {ev.citations.length > 0 && (
                                                <div className="mt-4">
                                                    <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Evidence References</h5>
                                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                                        {ev.citations.map((c, idx) => (
                                                            <div key={idx} className="text-xs bg-gray-50 dark:bg-gray-900/50 p-3 rounded border border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                                                                <span className="font-mono font-bold text-blue-500 mr-2">{c.split(' ')[0] || `[${idx + 1}]`}</span>
                                                                <span className="break-words whitespace-pre-wrap">{c.replace(/^\[\d+\]\s*/, '')}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReviewPanel;
