import React, { useState } from 'react';
import { X, Download, FolderArchive, FileText, Tag, Folders, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

export type ProjectExportType = 'project' | 'document' | 'labels' | 'rules' | 'batch';

interface ProjectExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (filename: string, password?: string) => Promise<void>;
    exportType: ProjectExportType;
    defaultFilename: string;
}

const ProjectExportModal: React.FC<ProjectExportModalProps> = ({
    isOpen,
    onClose,
    onExport,
    exportType,
    defaultFilename
}) => {
    const [filename, setFilename] = useState(defaultFilename);
    const [enablePassword, setEnablePassword] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState('');

    React.useEffect(() => {
        if (isOpen) {
            setFilename(defaultFilename);
            setEnablePassword(false);
            setPassword('');
            setConfirmPassword('');
            setShowPassword(false);
            setError('');
            setIsExporting(false);
        }
    }, [isOpen, defaultFilename]);

    if (!isOpen) return null;

    const getIcon = () => {
        switch (exportType) {
            case 'project': return <FolderArchive className="w-5 h-5 text-primary" />;
            case 'document': return <FileText className="w-5 h-5 text-primary" />;
            case 'labels': return <Tag className="w-5 h-5 text-primary" />;
            case 'rules': return <Folders className="w-5 h-5 text-primary" />;
            case 'batch': return <FolderArchive className="w-5 h-5 text-primary" />;
            default: return <Download className="w-5 h-5 text-primary" />;
        }
    };

    const getTitle = () => {
        switch (exportType) {
            case 'project': return 'Export Project';
            case 'document': return 'Export Document';
            case 'labels': return 'Export Labels';
            case 'rules': return 'Export Rules';
            case 'batch': return 'Export Documents';
            default: return 'Export';
        }
    };

    const getExtension = () => {
        switch (exportType) {
            case 'project': return 'alproj';
            case 'document': return 'aldoc';
            case 'labels': return 'allabels';
            case 'rules': return 'alrules';
            case 'batch': return 'alproj';
            default: return 'al';
        }
    };

    const getPasswordStrength = (pass: string): { strength: number; label: string; color: string } => {
        if (!pass) return { strength: 0, label: '', color: '' };

        let strength = 0;
        if (pass.length >= 8) strength++;
        if (pass.length >= 12) strength++;
        if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) strength++;
        if (/\d/.test(pass)) strength++;
        if (/[^a-zA-Z0-9]/.test(pass)) strength++;

        if (strength <= 1) return { strength, label: 'Weak', color: 'text-red-500' };
        if (strength <= 3) return { strength, label: 'Medium', color: 'text-yellow-500' };
        return { strength, label: 'Strong', color: 'text-green-500' };
    };

    const passwordStrength = enablePassword ? getPasswordStrength(password) : null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!filename.trim()) {
            setError('Filename is required');
            return;
        }

        if (enablePassword) {
            if (!password) {
                setError('Password is required when encryption is enabled');
                return;
            }
            if (password !== confirmPassword) {
                setError('Passwords do not match');
                return;
            }
            if (password.length < 6) {
                setError('Password must be at least 6 characters');
                return;
            }
        }

        setIsExporting(true);
        try {
            await onExport(filename.trim(), enablePassword ? password : undefined);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Export failed');
            setIsExporting(false);
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
                        disabled={isExporting}
                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-6">
                    {/* Filename */}
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
                                    disabled={isExporting}
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
                                    placeholder="Enter filename"
                                    autoFocus
                                />
                            </div>
                            <span className="px-3 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-mono text-gray-600 dark:text-gray-400">
                                .{getExtension()}
                            </span>
                        </div>
                    </div>

                    {/* Password Encryption Toggle */}
                    <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={enablePassword}
                                onChange={(e) => setEnablePassword(e.target.checked)}
                                disabled={isExporting}
                                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary/20"
                            />
                            <div className="flex items-center gap-2 flex-1">
                                <Lock className="w-4 h-4 text-gray-500 group-hover:text-primary transition-colors" />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Encrypt with password
                                </span>
                            </div>
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-7">
                            Protect your export with AES-256 encryption
                        </p>
                    </div>

                    {/* Password Fields */}
                    {enablePassword && (
                        <div className="space-y-3 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={isExporting}
                                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 pr-10 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
                                        placeholder="Enter password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {passwordStrength && password && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all ${passwordStrength.strength <= 1 ? 'bg-red-500 w-1/3' :
                                                        passwordStrength.strength <= 3 ? 'bg-yellow-500 w-2/3' :
                                                            'bg-green-500 w-full'
                                                    }`}
                                            />
                                        </div>
                                        <span className={`text-xs font-medium ${passwordStrength.color}`}>
                                            {passwordStrength.label}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Confirm Password
                                </label>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    disabled={isExporting}
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
                                    placeholder="Confirm password"
                                />
                            </div>
                        </div>
                    )}

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
                            disabled={isExporting}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!filename.trim() || isExporting}
                            className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isExporting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Exporting...
                                </>
                            ) : (
                                <>
                                    <Download className="w-4 h-4" />
                                    Export
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProjectExportModal;
