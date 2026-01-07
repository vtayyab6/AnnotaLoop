import React from 'react';
import { useApp } from '../../context/AppContext';
import { Plus, Upload, Search } from 'lucide-react';

interface HeaderProps {
    onOpenProjectModal: () => void;
    onOpenImportModal: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenProjectModal, onOpenImportModal }) => {
    const { currentProject, setCurrentProject, projects } = useApp();

    return (
        <header className="h-14 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between px-6 flex-shrink-0 transition-colors duration-200">
            {/* Breadcrumbs */}
            <div id="header-left" className="flex items-center gap-2">
                {currentProject ? (
                    <>
                        <button onClick={() => setCurrentProject(null)} title="Back to Dashboard" className="text-gray-500 hover:text-gray-800 dark:hover:text-white text-xs font-semibold flex items-center gap-1">
                            Dashboard
                        </button>
                        <span className="text-gray-300">/</span>
                        <span className="font-semibold text-gray-800 dark:text-white text-sm truncate max-w-[150px]">{currentProject.name}</span>
                    </>
                ) : (
                    projects.length > 0 && (
                        <div className="relative w-72">
                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                <Search className="w-4 h-4" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search projects..."
                                className="w-full pl-9 pr-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 transition-colors placeholder-gray-400 text-gray-700 dark:text-gray-200"
                            />
                        </div>
                    )
                )}
            </div>

            <div className="flex items-center gap-3">
                {!currentProject && projects.length > 0 && (
                    <>
                        <button
                            onClick={onOpenProjectModal}
                            className="hidden md:flex items-center gap-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 px-3 py-1.5 rounded transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            New Project
                        </button>


                        <button
                            onClick={onOpenImportModal}
                            className="hidden md:flex items-center gap-2 text-xs font-semibold text-slate-700 border border-slate-300 hover:text-slate-800 hover:border-slate-400 hover:bg-slate-50 dark:text-gray-200 dark:border-gray-600 dark:hover:text-gray-100 dark:hover:border-gray-500 dark:hover:bg-gray-700 px-3 py-1.5 rounded transition-colors"
                        >
                            <Upload className="w-3.5 h-3.5" />
                            Import Project
                        </button>

                    </>
                )}


            </div>
        </header>
    );
};

export default Header;
