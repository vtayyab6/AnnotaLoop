import React from 'react';

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (file: File) => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImport }) => {
    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onImport(e.target.files[0]);
        }
    };

    return (
        <div className="modal-overlay active fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50 backdrop-blur-sm">
            <div className="modal-content bg-white dark:bg-gray-800 w-[550px] rounded-xl shadow-2xl p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-xl font-bold dark:text-white">Import Project</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Upload a project export file to restore</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div className="drag-drop-zone p-10 rounded-lg flex flex-col items-center justify-center text-center mb-4 transition-all hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-2"
                    onClick={() => document.getElementById('import-file-input')?.click()}
                >
                    <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"></path>
                    </svg>
                    <p className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">Drag & Drop your project file here</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">or click to browse</p>
                </div>
                <input type="file" id="import-file-input" className="hidden" accept=".json,.zip" onChange={handleFileChange} />

                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm">Cancel</button>
                </div>
            </div>
        </div>
    );
};

export default ImportModal;
