import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import type { Project } from '../../context/types';

interface ProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    editProject?: Project | null;
}

const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, onClose, editProject }) => {
    const { setProjects, setCurrentProject } = useApp();
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (editProject) {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setName(editProject.name);
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setDesc(editProject.desc || '');
            } else {
                setName('');
                setDesc('');
            }
        }
    }, [isOpen, editProject]);

    const handleSave = () => {
        if (!name.trim()) {
            alert('Project name is required.');
            return;
        }

        if (editProject) {
            // Edit logic - update both projects list and currentProject for immediate reflection
            const updatedProject = { ...editProject, name, desc };
            setProjects(prev => prev.map(p => p.id === editProject.id ? updatedProject : p));
            setCurrentProject(prev => prev && prev.id === editProject.id ? updatedProject : prev);
        } else {
            // Create logic
            const newProject: Project = {
                id: Date.now(),
                name,
                desc,
                date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
                docCount: 0,
                labels: [],
                rules: []
            };
            setProjects(prev => [newProject, ...prev]);
            setCurrentProject(newProject);
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay active fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50 backdrop-blur-sm">
            <div className="modal-content bg-white dark:bg-gray-800 w-[500px] rounded-xl shadow-2xl p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold dark:text-white">{editProject ? 'Edit Project' : 'Create New Project'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Project Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-sm dark:text-white"
                            placeholder="Enter project name..."
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Description</label>
                        <textarea
                            value={desc}
                            onChange={e => setDesc(e.target.value)}
                            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-sm dark:text-white h-24 resize-none"
                            placeholder="Enter project description..."
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm">Cancel</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium">{editProject ? 'Save Changes' : 'Create Project'}</button>
                </div>
            </div>
        </div>
    );
};

export default ProjectModal;
