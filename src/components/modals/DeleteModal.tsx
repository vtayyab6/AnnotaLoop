import React from 'react';
import type { DeleteType } from '../../context/types';

interface DeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    type: DeleteType;
    count?: number;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ isOpen, onClose, onConfirm, type, count }) => {
    if (!isOpen) return null;

    let title = "Delete?";
    let msg = "Are you sure?";

    if (type === 'project') {
        title = "Delete Project?";
        msg = "This will delete the project and all containing documents.";
    } else if (type === 'document') {
        title = "Delete Document?";
        msg = "Are you sure you want to delete this file?";
    } else if (type === 'batch') {
        title = "Delete Multiple Documents?";
        msg = `Are you sure you want to delete ${count} documents?`;
    }

    return (
        <div className="modal-overlay active fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50 backdrop-blur-sm">
            <div className="modal-content bg-white dark:bg-gray-800 w-[400px] rounded-xl shadow-2xl p-6 border border-gray-200 dark:border-gray-700 text-center">
                <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{msg}</p>
                <div className="flex justify-center gap-3">
                    <button onClick={onClose} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                    <button onClick={onConfirm} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium">Delete</button>
                </div>
            </div>
        </div>
    );
};

export default DeleteModal;
