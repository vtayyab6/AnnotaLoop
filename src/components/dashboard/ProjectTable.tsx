import React from 'react';
import { useApp } from '../../context/AppContext';
import { Download, Trash, Settings } from 'lucide-react';

interface ProjectTableProps {
    onOpenConfigModal: (id: number) => void;
    onOpenExportModal: (id: number) => void;
    onPromptDelete: (type: 'project', id: number) => void;
}

const ProjectTable: React.FC<ProjectTableProps> = ({ onOpenConfigModal, onOpenExportModal, onPromptDelete }) => {
    const { projects, documents, setCurrentProject, documentSearchQuery } = useApp();
    const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(documentSearchQuery.toLowerCase()));

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs uppercase font-semibold border-b border-gray-200 dark:border-gray-600">
                    <tr>
                        <th className="px-4 py-3">Project Name</th>
                        <th className="px-4 py-3">Created</th>
                        <th className="px-4 py-3">Documents</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredProjects.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group" onClick={(e) => {
                            if ((e.target as HTMLElement).closest('button')) return;
                            setCurrentProject(p);
                        }}>
                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{p.name}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{p.date}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{documents.filter(d => d.projectId === p.id).length}</td>
                            <td className="px-4 py-3 text-right flex justify-end gap-2 items-center">
                                <button onClick={() => onOpenExportModal(p.id)} title="Export Project" className="text-gray-400 hover:text-primary p-1"><Download className="w-4 h-4" /></button>
                                <button onClick={() => onOpenConfigModal(p.id)} title="Configuration" className="text-gray-400 hover:text-primary p-1"><Settings className="w-4 h-4" /></button>
                                <button onClick={() => onPromptDelete('project', p.id)} title="Delete Project" className="text-gray-400 hover:text-red-500 p-1"><Trash className="w-4 h-4" /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ProjectTable;
