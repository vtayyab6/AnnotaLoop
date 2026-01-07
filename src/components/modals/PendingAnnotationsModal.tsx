import React from 'react';
import { AlertCircle, Check, X, ArrowRight } from 'lucide-react';

interface PendingAnnotationsModalProps {
    isOpen: boolean;
    onClose: () => void;
    pendingCount: number;
    acceptedCount: number;
    onAcceptAll: () => void;
    onRejectAll: () => void;
    onContinueReview: () => void;
}

const PendingAnnotationsModal: React.FC<PendingAnnotationsModalProps> = ({
    isOpen,
    onClose,
    pendingCount,
    acceptedCount,
    onAcceptAll,
    onRejectAll,
    onContinueReview
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 backdrop-blur-[2px] animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 w-[90%] max-w-md rounded-xl shadow-2xl p-6 border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-200 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 dark:bg-amber-900/20 flex items-center justify-center">
                        <AlertCircle className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">Unreviewed Items</h3>
                </div>

                <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm leading-relaxed">
                    You have <span className="font-bold text-amber-500">{pendingCount}</span> annotations still pending review.
                    {acceptedCount > 0 ? (
                        <> You have accepted <span className="font-bold text-green-500">{acceptedCount}</span> items.</>
                    ) : (
                        <> You haven't accepted any items yet.</>
                    )}
                    <br /><br />
                    What would you like to do with the pending items?
                </p>

                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={onAcceptAll}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/20 rounded-lg transition-colors text-sm font-medium border border-green-200 dark:border-green-800"
                        >
                            <Check className="w-4 h-4" />
                            Accept All
                        </button>
                        <button
                            onClick={onRejectAll}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm font-medium border border-red-200 dark:border-red-800"
                        >
                            <X className="w-4 h-4" />
                            Reject All
                        </button>
                    </div>

                    <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                        <span className="flex-shrink-0 mx-4 text-xs text-gray-400 font-medium uppercase tracking-wider">Or</span>
                        <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                    </div>

                    <button
                        onClick={onContinueReview}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm font-medium"
                    >
                        <ArrowRight className="w-4 h-4" />
                        Go Back to Review
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PendingAnnotationsModal;
