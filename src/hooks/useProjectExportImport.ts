import { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Project, Document as AppDocument } from '../context/types';
import type { ProjectExportType } from '../components/modals/ProjectExportModal';
import type { ProjectImportType } from '../components/modals/ProjectImportModal';

export const useProjectExportImport = () => {
    const { projects, setProjects, documents, setDocuments, currentProject, setCurrentProject, showToast } = useApp();

    const [projectExportModalOpen, setProjectExportModalOpen] = useState(false);
    const [projectImportModalOpen, setProjectImportModalOpen] = useState(false);
    const [exportType, setExportType] = useState<ProjectExportType>('project');
    const [importType, setImportType] = useState<ProjectImportType>('project');
    const [exportData, setExportData] = useState<any>(null);
    const [exportFilename, setExportFilename] = useState('export');

    // Export handlers
    const handleOpenProjectExport = (project: Project) => {
        setExportType('project');
        setExportData(project);
        setExportFilename(project.name);
        setProjectExportModalOpen(true);
    };

    const handleExportLabels = () => {
        if (!currentProject) return;
        setExportType('labels');
        setExportData(currentProject.labels);
        setExportFilename(`${currentProject.name}_labels`);
        setProjectExportModalOpen(true);
    };

    const handleExportRules = () => {
        if (!currentProject) return;
        setExportType('rules');
        setExportData(currentProject.rules);
        setExportFilename(`${currentProject.name}_rules`);
        setProjectExportModalOpen(true);
    };

    const handleExportDocument = (document: AppDocument) => {
        if (!currentProject) return;
        setExportType('document');
        setExportData({
            document,
            labels: currentProject.labels,
            rules: currentProject.rules
        });
        setExportFilename(document.name.replace(/\.[^/.]+$/, '')); // Remove extension
        setProjectExportModalOpen(true);
    };

    const handleExportBatch = (docs: AppDocument[]) => {
        if (!currentProject) return;
        setExportType('batch');
        setExportData(docs);
        setExportFilename(`${currentProject.name}_batch`);
        setProjectExportModalOpen(true);
    };

    const handleProjectExport = async (filename: string, password?: string) => {
        try {
            const exportFunctions = await import('../utils/exportImport');
            let success = false;

            switch (exportType) {
                case 'project': {
                    const { exportProject } = exportFunctions;
                    const projectDocs = documents.filter(d => d.projectId === exportData.id);
                    success = await exportProject(exportData, projectDocs, password);
                    break;
                }
                case 'document': {
                    const { exportDocument } = exportFunctions;
                    success = await exportDocument(
                        exportData.document,
                        exportData.labels || [],
                        exportData.rules || [],
                        password
                    );
                    break;
                }
                case 'labels': {
                    const { exportLabels } = exportFunctions;
                    success = await exportLabels(exportData, filename);
                    break;
                }
                case 'rules': {
                    const { exportRules } = exportFunctions;
                    success = await exportRules(exportData, filename);
                    break;
                }
                case 'batch': {
                    const { exportBatchDocuments } = exportFunctions;
                    success = await exportBatchDocuments(exportData, filename, password);
                    break;
                }
            }

            if (success) {
                showToast('success', 'Export Complete', `${exportType.charAt(0).toUpperCase() + exportType.slice(1)} exported successfully${password ? ' with encryption' : ''}.`);
            }
            // Always close modal after export attempt (success or user cancelled)
            setProjectExportModalOpen(false);
        } catch (error) {
            console.error('Export error:', error);
            showToast('error', 'Export Failed', error instanceof Error ? error.message : 'Failed to export');
            throw error;
        }
    };

    // Import handlers
    const handleImportLabels = () => {
        setImportType('labels');
        setProjectImportModalOpen(true);
    };

    const handleImportRules = () => {
        setImportType('rules');
        setProjectImportModalOpen(true);
    };

    const handleOpenProjectImport = () => {
        setImportType('project');
        setProjectImportModalOpen(true);
    };

    const handleOpenDocumentImport = () => {
        setImportType('document');
        setProjectImportModalOpen(true);
    };

    const handleProjectImport = async (filePath: string, password?: string) => {
        try {
            const importFunctions = await import('../utils/exportImport');
            type ImportResult = Awaited<ReturnType<typeof importFunctions.importProject>>;
            let result: ImportResult | undefined;

            const nextProjectId = Math.max(...projects.map(p => p.id), 0) + 1;
            const nextDocumentId = Date.now();

            switch (importType) {
                case 'project': {
                    const { importProject } = importFunctions;
                    const existingProjectNames = projects.map(p => p.name);

                    // For a NEW project, we don't need to check against global document names
                    // This allows same-named files in different projects (e.g. "Invoice.pdf" in two projects)
                    // And prevents the issue where deleting a project but having stale state causes renames
                    const existingDocNames: string[] = [];

                    result = await importProject(filePath, password, nextProjectId, nextDocumentId, existingProjectNames, existingDocNames);
                    if (result && result.success && result.data) {
                        setProjects(prev => [...prev, result!.data!.project]);
                        setDocuments((prev: AppDocument[]) => [...prev, ...result!.data!.documents]);
                        showToast('success', 'Import Complete', 'Project imported successfully.');
                    }
                    break;
                }
                case 'document': {
                    if (!currentProject) {
                        showToast('error', 'No Project Selected', 'Please select a project first.');
                        return;
                    }
                    const { importDocument } = importFunctions;

                    // For document import, we DOES need to check duplicates within THIS project
                    // but we don't care about other projects
                    // We also need to map the current docs to string[]
                    const projectDocNames = documents
                        .filter(d => d.projectId === currentProject.id)
                        .map(d => d.name);

                    // Note: importDocument expects existingNames, but it's not present in the original signature call 
                    // Let's check importDocument signature. It only takes (filePath, password, projectId, nextDocumentId).
                    // It likely handles internal unique naming or doesn't support it yet.
                    // Accessing `importDocument` from `importFunctions`.

                    // result = await importDocument(filePath, password, currentProject.id, nextDocumentId);
                    result = await importDocument(filePath, password, currentProject.id, nextDocumentId, projectDocNames);

                    if (result && result.success && result.data) {
                        setDocuments((prev: AppDocument[]) => [...prev, result!.data!.document]);
                        showToast('success', 'Import Complete', 'Document imported successfully.');
                    }
                    break;
                }
                case 'labels': {
                    const { importLabels } = importFunctions;
                    result = await importLabels(filePath);
                    if (result.success && result.data && currentProject) {
                        const existing = new Set(currentProject.labels.map(l => l.id));
                        const newLabels = result.data.filter((l: any) => !existing.has(l.id));
                        const updatedLabels = [...currentProject.labels, ...newLabels];

                        setProjects(prev => prev.map(p => {
                            if (p.id === currentProject.id) {
                                return { ...p, labels: updatedLabels };
                            }
                            return p;
                        }));

                        // Sync currentProject so UI updates immediately (unlocks next onboarding step)
                        setCurrentProject({ ...currentProject, labels: updatedLabels });

                        showToast('success', 'Import Complete', `${result.data.length} labels imported.`);
                    }
                    break;
                }
                case 'rules': {
                    const { importRules } = importFunctions;
                    result = await importRules(filePath);
                    if (result.success && result.data && currentProject) {
                        const existing = new Set((currentProject.rules || []).map(r => r.id));
                        const newRules = result.data.filter((r: any) => !existing.has(r.id));
                        const updatedRules = [...(currentProject.rules || []), ...newRules];

                        setProjects(prev => prev.map(p => {
                            if (p.id === currentProject.id) {
                                return { ...p, rules: updatedRules };
                            }
                            return p;
                        }));

                        // Sync currentProject so UI updates immediately
                        setCurrentProject({ ...currentProject, rules: updatedRules });

                        showToast('success', 'Import Complete', `${result.data.length} rules imported.`);
                    }
                    break;
                }
            }

            if (result && !result.success) {
                showToast('error', 'Import Failed', result.error || 'Unknown error');
                throw new Error(result.error);
            } else if (result?.success) {
                setProjectImportModalOpen(false);
            }
        } catch (error) {
            console.error('Import error:', error);
            showToast('error', 'Import Failed', error instanceof Error ? error.message : 'Failed to import');
            throw error;
        }
    };

    return {
        // State
        projectExportModalOpen,
        setProjectExportModalOpen,
        projectImportModalOpen,
        setProjectImportModalOpen,
        exportType,
        importType,
        exportFilename,

        // Handlers
        handleOpenProjectExport,
        handleExportLabels,
        handleExportRules,
        handleExportDocument,
        handleExportBatch,
        handleProjectExport,
        handleImportLabels,
        handleImportRules,
        handleOpenProjectImport,
        handleOpenDocumentImport,
        handleProjectImport,
    };
};
