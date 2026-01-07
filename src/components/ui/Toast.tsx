import React from 'react';
import { useApp } from '../../context/AppContext';
import { Check, AlertCircle, Info, X } from 'lucide-react';

const Toast: React.FC = () => {
    const { toast, hideToast } = useApp();

    if (!toast.show) return null;

    let icon = <Check className="w-5 h-5" />;
    let colorClass = "bg-green-100 text-green-600";

    if (toast.type === 'error') {
        icon = <AlertCircle className="w-5 h-5" />;
        colorClass = "bg-red-100 text-red-600";
    } else if (toast.type === 'info') {
        icon = <Info className="w-5 h-5" />;
        colorClass = "bg-blue-100 text-blue-600";
    }

    return (
        <div id="notification-toast" className="fixed top-4 right-4 z-[200] animate-slide-in">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-4 flex items-start gap-3 min-w-[320px] max-w-[400px]">
                <div id="toast-icon" className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
                    {icon}
                </div>
                <div className="flex-grow">
                    <h4 id="toast-title" className="font-semibold text-gray-900 dark:text-white text-sm capitalize">{toast.title}</h4>
                    <p id="toast-message" className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{toast.message}</p>
                </div>
                <button onClick={hideToast} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default Toast;
