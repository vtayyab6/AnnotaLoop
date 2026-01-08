import React from 'react';
import { useApp } from '../../context/AppContext';
import ProjectGrid from './ProjectGrid';
import ProjectTable from './ProjectTable';
import EmptyState from './EmptyState';

interface DashboardProps {
    onOpenProjectModal: () => void;
    onOpenConfigModal: (id: number) => void;
    onOpenExportModal: (id: number) => void;
    onPromptDelete: (type: 'project', id: number) => void;
    onOpenImportModal?: () => void;
    onViewSampleProject?: () => void;
    onOpenSettingsModal?: () => void;
}

const Dashboard: React.FC<DashboardProps> = (props) => {
    const { view, setView, projects } = useApp();

    // Show empty state when no projects
    if (projects.length === 0) {
        return (
            <EmptyState
                onCreateProject={props.onOpenProjectModal}
                onImportProject={() => props.onOpenImportModal?.()}
                onViewSampleProject={props.onViewSampleProject}
            />
        );
    }

    return (
        <div id="dashboard-view" className="h-full flex flex-col">
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Projects</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage and access all your document workflows.</p>
                </div>
                <div className="flex bg-gray-100 dark:bg-gray-700 p-0.5 rounded-lg border border-gray-200 dark:border-gray-600 h-fit">
                    <button onClick={() => setView('grid')} className={`p-1.5 rounded-md transition-all ${view === 'grid' ? 'bg-white dark:bg-gray-600 shadow-sm text-primary dark:text-primary' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                    </button>
                    <button onClick={() => setView('table')} className={`p-1.5 rounded-md transition-all ${view === 'table' ? 'bg-white dark:bg-gray-600 shadow-sm text-primary dark:text-primary' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                    </button>
                </div>
            </div>
            {view === 'grid' ? (
                <ProjectGrid {...props} />
            ) : (
                <ProjectTable {...props} />
            )}
        </div>
    );
};

export default Dashboard;
