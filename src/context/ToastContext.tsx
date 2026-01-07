
import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

import type { ToastType } from './types';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    addToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, type: ToastType) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);

        // Auto remove after 3 seconds
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`
                            flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium
                            animate-in slide-in-from-right-full fade-in duration-300
                            ${toast.type === 'success' ? 'bg-white dark:bg-gray-800 border-green-200 dark:border-green-900 text-green-700 dark:text-green-400' : ''}
                            ${toast.type === 'error' ? 'bg-white dark:bg-gray-800 border-red-200 dark:border-red-900 text-red-700 dark:text-red-400' : ''}
                            ${toast.type === 'info' ? 'bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-400' : ''}
                        `}
                    >
                        {toast.type === 'success' && <CheckCircle className="w-5 h-5 shrink-0" />}
                        {toast.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0" />}
                        {toast.type === 'info' && <Info className="w-5 h-5 shrink-0" />}

                        <span>{toast.message}</span>

                        <button
                            onClick={() => removeToast(toast.id)}
                            className="ml-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors opacity-60 hover:opacity-100"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
