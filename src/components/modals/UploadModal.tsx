import React, { useState, useEffect } from 'react';
import { Upload } from 'lucide-react';

interface UploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpload: (files: File[]) => void;
    initialFiles?: File[];
}

const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUpload, initialFiles = [] }) => {
    const [files, setFiles] = useState<File[]>([]);

    useEffect(() => {
        if (isOpen) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setFiles(initialFiles);
        }
    }, [isOpen, initialFiles]);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files) {
            setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
        }
    };

    const removeFile = (idx: number) => {
        setFiles(prev => prev.filter((_, i) => i !== idx));
    };

    return (
        <div className="modal-overlay active fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50 backdrop-blur-sm">
            <div className="modal-content bg-white dark:bg-gray-800 w-[550px] rounded-xl shadow-2xl p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-xl font-bold dark:text-white">Upload Documents</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Add documents to your project</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div
                    className="drag-drop-zone p-10 rounded-lg flex flex-col items-center justify-center text-center mb-4 transition-all hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-600"
                    onDragOver={e => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('modal-file-upload')?.click()}
                >
                    <Upload className="w-12 h-12 text-gray-400 mb-3" />
                    <p className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">Drag & Drop your files here</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">or click to browse</p>
                    <p className="text-xs text-gray-400">Supported: PDF, TXT, DOC, DOCX, MD (Max 10MB)</p>
                </div>
                <input type="file" id="modal-file-upload" className="hidden" multiple accept=".pdf,.txt,.doc,.docx,.md" onChange={handleFileChange} />

                {files.length > 0 && (
                    <div className="mb-4 max-h-48 overflow-y-auto space-y-2 custom-scrollbar">
                        {files.map((f, i) => (
                            <div key={i} className="text-sm text-gray-600 dark:text-gray-300 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                                <div className="flex-1 truncate mr-2">
                                    <span className="font-medium text-gray-800 dark:text-gray-200">{f.name}</span>
                                    <span className="text-xs text-gray-400 ml-2">{Math.round(f.size / 1024)}KB</span>
                                </div>
                                <button
                                    onClick={() => removeFile(i)}
                                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                    title="Remove file"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm">Cancel</button>
                    <button onClick={() => { onUpload(files); onClose(); }} disabled={files.length === 0} className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">Upload Files</button>
                </div>
            </div>
        </div>
    );
};

export default UploadModal;
