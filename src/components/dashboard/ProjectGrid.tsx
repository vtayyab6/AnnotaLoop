import React from 'react';
import { useApp } from '../../context/AppContext';
import { Plus, Download, Trash, Settings, Calendar, FileText } from 'lucide-react';

interface ProjectGridProps {
    onOpenProjectModal: () => void;
    onOpenConfigModal: (id: number) => void;
    onOpenExportModal: (id: number) => void;
    onPromptDelete: (type: 'project', id: number) => void;
}

const ProjectGrid: React.FC<ProjectGridProps> = ({ onOpenProjectModal, onOpenConfigModal, onOpenExportModal, onPromptDelete }) => {
    const { projects, documents, setCurrentProject, documentSearchQuery } = useApp();

    const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(documentSearchQuery.toLowerCase()));

    return (
        <div id="projects-container" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Create New Card */}
            <div onClick={onOpenProjectModal} className="bg-gray-50 dark:bg-gray-800/50 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-green-50 dark:hover:bg-green-900/10 transition-all min-h-[160px] group">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 group-hover:bg-primary group-hover:text-white text-gray-400 flex items-center justify-center transition-colors mb-2">
                    <Plus className="w-6 h-6" />
                </div>
                <span className="font-semibold text-gray-500 dark:text-gray-400 group-hover:text-primary">Create New Project</span>
            </div>

            {filteredProjects.map(p => (
                <div key={p.id} onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button')) return;
                    setCurrentProject(p);
                }} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all group relative cursor-pointer">
                    <div className="flex justify-between items-start mb-2">

                        <div className="p-2 rounded-lg bg-gray-100/60 text-gray-400 group-hover:bg-emerald-50/30 group-hover:text-emerald-500/70 dark:bg-gray-700/30 dark:text-gray-500 dark:group-hover:bg-gray-700/40 dark:group-hover:text-emerald-300/50 transition-colors">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                            </svg>
                        </div>






                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => onOpenExportModal(p.id)} title="Export Project" className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-primary"><Download className="w-4 h-4" /></button>
                            <button onClick={() => onPromptDelete('project', p.id)} title="Delete Project" className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-red-500"><Trash className="w-4 h-4" /></button>
                            <button onClick={() => onOpenConfigModal(p.id)} title="Project Configuration" className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-primary"><Settings className="w-4 h-4" /></button>
                        </div>
                    </div>
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm truncate">{p.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 h-8">{p.desc}</p>
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-1.5">
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                            <Calendar className="w-3.5 h-3.5 mr-1.5" />
                            {p.date}
                        </div>
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                            <FileText className="w-3.5 h-3.5 mr-1.5" />
                            {documents.filter(d => d.projectId === p.id).length} Documents
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ProjectGrid;
