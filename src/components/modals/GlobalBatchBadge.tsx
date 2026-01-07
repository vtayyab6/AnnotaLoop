import React from 'react';
import { Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { useApp } from '../../context/AppContext';

/**
 * GlobalBatchBadge - A persistent floating badge that shows batch processing status
 * Visible on all pages when batch processing is active and minimized
 */
const GlobalBatchBadge: React.FC = () => {
    const { batchState, setBatchState } = useApp();

    // Don't render if batch is not active or not minimized
    if (!batchState.isActive || !batchState.isMinimized) {
        return null;
    }

    const handleMaximize = () => {
        setBatchState(prev => ({ ...prev, isMinimized: false }));
    };

    const getStatusIcon = () => {
        if (batchState.status === 'processing') {
            return <Loader2 className="w-4 h-4 animate-spin text-white" />;
        } else if (batchState.status === 'finished') {
            return batchState.failed > 0
                ? <AlertCircle className="w-4 h-4 text-yellow-300" />
                : <CheckCircle className="w-4 h-4 text-green-300" />;
        }
        return null;
    };

    const getStatusText = () => {
        if (batchState.status === 'processing') {
            return `Processing ${batchState.completed + 1}/${batchState.total}`;
        } else if (batchState.status === 'finished') {
            return `Done: ${batchState.completed} ✓ ${batchState.failed > 0 ? `${batchState.failed} ✗` : ''}`;
        }
        return 'Batch processing';
    };

    return (
        <div className="fixed bottom-6 right-6 z-[200]">
            <button
                onClick={handleMaximize}
                className="flex items-center gap-3 px-4 py-3 bg-gray-900 dark:bg-gray-800 text-white rounded-xl shadow-lg hover:bg-gray-800 dark:hover:bg-gray-700 transition-all border border-gray-700 dark:border-gray-600 group"
            >
                {getStatusIcon()}
                <div className="text-left">
                    <div className="text-sm font-medium">{getStatusText()}</div>
                    {batchState.status === 'processing' && batchState.currentDocName && (
                        <div className="text-xs text-gray-400 truncate max-w-[150px]">
                            {batchState.currentDocName}
                        </div>
                    )}
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors ml-2" />
            </button>
        </div>
    );
};

export default GlobalBatchBadge;
