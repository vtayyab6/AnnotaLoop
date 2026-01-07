import React, { useState } from 'react';
import { X, Upload, FolderArchive, FileText, Tag, Folders, Lock, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';

export type ProjectImportType = 'project' | 'document' | 'labels' | 'rules';

interface ProjectImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (filePath: string, password?: string) => Promise<void>;
    importType: ProjectImportType;
}

const ProjectImportModal: React.FC<ProjectImportModalProps> = ({
    isOpen,
    onClose,
    onImport,
    importType
}) => {
    const [filePath, setFilePath] = useState('');
    const [fileName, setFileName] = useState('');
    const [needsPassword, setNeedsPassword] = useState(false);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [error, setError] = useState('');

    React.useEffect(() => {
        if (isOpen) {
            setFilePath('');
            setFileName('');
            setNeedsPassword(false);
            setPassword('');
            setShowPassword(false);
            setError('');
            setIsImporting(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const getIcon = () => {
        switch (importType) {
            case 'project': return <FolderArchive className="w-5 h-5 text-primary" />;
            case 'document': return <FileText className="w-5 h-5 text-primary" />;
            case 'labels': return <Tag className="w-5 h-5 text-primary" />;
            case 'rules': return <Folders className="w-5 h-5 text-primary" />;
            default: return <Upload className="w-5 h-5 text-primary" />;
        }
    };

    const getTitle = () => {
        switch (importType) {
            case 'project': return 'Import Project';
            case 'document': return 'Import Document';
            case 'labels': return 'Import Labels';
            case 'rules': return 'Import Rules';
            default: return 'Import';
        }
    };

    const getExtension = () => {
        switch (importType) {
            case 'project': return 'alproj';
            case 'document': return 'aldoc';
            case 'labels': return 'allabels';
            case 'rules': return 'alrules';
            default: return 'al';
        }
    };

    const handleSelectFile = async () => {
        try {
            const selected = await open({
                multiple: false,
                filters: [{
                    name: getTitle(),
                    extensions: [getExtension()]
                }]
            });

            if (selected && typeof selected === 'string') {
                setFilePath(selected);
                // Extract filename from path
                const parts = selected.split(/[\\/]/);
                setFileName(parts[parts.length - 1]);
                setError('');
            }
        } catch (err) {
            setError('Failed to select file');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!filePath) {
            setError('Please select a file to import');
            return;
        }

        setIsImporting(true);
        try {
            await onImport(filePath, password || undefined);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Import failed';

            // Check if error is related to password
            if (errorMessage.includes('password') || errorMessage.includes('decrypt')) {
                setNeedsPassword(true);
                setError('This file is encrypted. Please enter the password.');
            } else {
                setError(errorMessage);
            }
            setIsImporting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-700">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        {getIcon()}
                        {getTitle()}
                    </h2>
                    <button
                        onClick={onClose}
                        disabled={isImporting}
                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-6">
                    {/* File Selection */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Select File
                        </label>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm">
                                {fileName ? (
                                    <span className="text-gray-900 dark:text-gray-100 font-medium">{fileName}</span>
                                ) : (
                                    <span className="text-gray-400">No file selected</span>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={handleSelectFile}
                                disabled={isImporting}
                                className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                <Upload className="w-4 h-4" />
                                Browse
                            </button>
                        </div>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            Supported format: .{getExtension()}
                        </p>
                    </div>

                    {/* Password Field (shown if needed) */}
                    {needsPassword && (
                        <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <div className="flex items-center gap-2 mb-3">
                                <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                <span className="text-sm font-medium text-amber-900 dark:text-amber-200">
                                    Password Required
                                </span>
                            </div>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isImporting}
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 pr-10 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
                                    placeholder="Enter password to decrypt"
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Info Box */}
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                            <div className="text-xs text-blue-800 dark:text-blue-200">
                                {importType === 'project' && 'All project data, documents, and files will be imported with new IDs to avoid conflicts.'}
                                {importType === 'document' && 'The document will be imported into the current project with annotations and files.'}
                                {importType === 'labels' && 'Labels will be merged with existing labels. Duplicates will be skipped.'}
                                {importType === 'rules' && 'Rules will be merged with existing rules. Duplicates will be skipped.'}
                            </div>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isImporting}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!filePath || isImporting || (needsPassword && !password)}
                            className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isImporting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Importing...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4" />
                                    Import
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProjectImportModal;
