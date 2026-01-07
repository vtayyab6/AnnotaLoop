import React, { useState, useEffect } from 'react';
import { X, Download, FileText } from 'lucide-react';

interface FilenameDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (filename: string) => void;
    defaultFilename: string;
    fileExtension: string;
}

const FilenameDialog: React.FC<FilenameDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    defaultFilename,
    fileExtension
}) => {
    const [filename, setFilename] = useState(defaultFilename);

    useEffect(() => {
        if (isOpen) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setFilename(defaultFilename);
        }
    }, [isOpen, defaultFilename]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (filename.trim()) {
            onConfirm(filename.trim());
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-700">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Download className="w-5 h-5 text-primary" />
                        Save File
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-6">
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Filename
                        </label>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                    <FileText className="w-4 h-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={filename}
                                    onChange={(e) => setFilename(e.target.value)}
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                    placeholder="Enter filename"
                                    autoFocus
                                />
                            </div>
                            <span className="px-3 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-mono text-gray-600 dark:text-gray-400">
                                .{fileExtension}
                            </span>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!filename.trim()}
                            className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Download
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default FilenameDialog;
