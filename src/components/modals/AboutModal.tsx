import React from 'react';

interface AboutModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay active fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50 backdrop-blur-sm">
            <div className="modal-content bg-white dark:bg-gray-800 w-[500px] rounded-xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700 text-center">
                <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                </div>
                <h2 className="text-2xl font-bold mb-2 dark:text-white">AnnotaLoop</h2>
                <p className="text-primary font-medium mb-6">v2.4.0 (Stable)</p>
                <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                    AI-assisted document annotation with human-in-the-loop workflows.
                </p>
                <div className="flex justify-center gap-4 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-8">
                    <span>• Provider-Agnostic</span>
                    <span>• Open Source</span>
                    <span>• HITL Ready</span>
                </div>
                <button onClick={onClose} className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 px-6 py-2 rounded-full text-sm font-medium transition-colors">Close</button>
            </div>
        </div>
    );
};

export default AboutModal;
