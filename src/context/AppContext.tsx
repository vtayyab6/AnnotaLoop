import React, { createContext, useContext, useState, useEffect } from 'react';
import type {
    Project,
    Document,
    AppState,
    ViewType,
    DeleteType,
    SecurityState,
    SettingsState,
    ToastState,
    BatchProcessingState
} from './types';
import { initialProjects, initialDocuments } from './defaults';

interface AppContextProps extends AppState {
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
    setDocuments: React.Dispatch<React.SetStateAction<Document[]>>;
    setCurrentProject: React.Dispatch<React.SetStateAction<Project | null>>;
    setAnnotatingDocId: React.Dispatch<React.SetStateAction<number | null>>;
    setSelectedDocs: React.Dispatch<React.SetStateAction<Set<number>>>;
    setView: React.Dispatch<React.SetStateAction<ViewType>>;
    setDeleteType: React.Dispatch<React.SetStateAction<DeleteType>>;
    setDeleteTarget: React.Dispatch<React.SetStateAction<number | null>>;
    setSecurity: React.Dispatch<React.SetStateAction<SecurityState>>;
    setSettings: React.Dispatch<React.SetStateAction<SettingsState>>;
    setEditingLabelIndex: React.Dispatch<React.SetStateAction<number | null>>;
    setEditingRuleIndex: React.Dispatch<React.SetStateAction<number | null>>;
    setDocumentFilter: React.Dispatch<React.SetStateAction<string>>;
    setDocumentSearchQuery: React.Dispatch<React.SetStateAction<string>>;
    showToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
    hideToast: () => void;

    // Actions
    toggleDocSelect: (id: number) => void;
    selectAllDocuments: () => void;
    clearSelection: () => void;
    toggleTheme: () => void;
    isDark: boolean;
    unlockApp: () => void;
    lockApp: () => void;

    // Batch Processing
    setBatchState: React.Dispatch<React.SetStateAction<BatchProcessingState>>;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useApp = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // State - Initialized from LocalStorage if available
    const [projects, setProjects] = useState<Project[]>(() => {
        const saved = localStorage.getItem('projects');
        return saved ? JSON.parse(saved) : initialProjects;
    });
    const [documents, setDocuments] = useState<Document[]>(() => {
        const saved = localStorage.getItem('documents');
        return saved ? JSON.parse(saved) : initialDocuments;
    });
    const [currentProject, setCurrentProject] = useState<Project | null>(null);
    const [selectedDocs, setSelectedDocs] = useState<Set<number>>(new Set());
    const [view, setView] = useState<ViewType>('grid');
    const [deleteType, setDeleteType] = useState<DeleteType>(null);
    const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
    const [security, setSecurity] = useState<SecurityState>(() => {
        const saved = localStorage.getItem('security');
        const parsed = saved ? JSON.parse(saved) : {
            enabled: false,
            pin: '1234',
            secret: 'A7X9-B2M4-L8Q1',
            locked: false
        };

        // Auto-lock on load if enabled and not unlocked in session
        if (parsed.enabled && !sessionStorage.getItem('unlocked')) {
            parsed.locked = true;
        }

        return parsed;
    });
    const [settings, setSettings] = useState<SettingsState>(() => {
        const saved = localStorage.getItem('settings');
        return saved ? JSON.parse(saved) : {
            defaultProvider: 'Mistral',
            defaultModel: '',
            providers: {
                mistral: { models: [] },
                openai: { models: [] },
                anthropic: { models: [] },
                gemini: { models: [] },
                openrouter: { models: [] },
                ollama: { models: [], baseUrl: 'http://localhost:11434' },
                lmstudio: { models: [], baseUrl: 'http://localhost:1234/v1' }
            }
        };
    });
    const [editingLabelIndex, setEditingLabelIndex] = useState<number | null>(null);
    const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null);
    const [documentFilter, setDocumentFilter] = useState<string>('All');
    const [documentSearchQuery, setDocumentSearchQuery] = useState<string>('');
    const [isDark, setIsDark] = useState(() => {
        if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
            return true;
        } else {
            document.documentElement.classList.remove('dark');
            return false;
        }
    });
    const [toast, setToast] = useState<ToastState>({ show: false, type: 'success', title: '', message: '' });

    const [annotatingDocId, setAnnotatingDocId] = useState<number | null>(null);

    // Global batch processing state - persists across page navigation
    const [batchState, setBatchState] = useState<BatchProcessingState>({
        isActive: false,
        isMinimized: false,
        documentIds: [],
        completed: 0,
        failed: 0,
        total: 0,
        currentDocName: '',
        status: 'idle'
    });

    // Effects

    // Clear document selection when project changes
    useEffect(() => {
        setSelectedDocs(new Set());
    }, [currentProject?.id]);

    useEffect(() => {
        localStorage.setItem('projects', JSON.stringify(projects));
    }, [projects]);

    useEffect(() => {
        localStorage.setItem('documents', JSON.stringify(documents));
    }, [documents]);

    useEffect(() => {
        localStorage.setItem('settings', JSON.stringify(settings));
    }, [settings]);

    useEffect(() => {
        localStorage.setItem('security', JSON.stringify(security));
    }, [security]);

    useEffect(() => {
        // Persist theme and sync with Tauri window
        if (isDark) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }

        // Sync Tauri window theme (for native title bar)
        const syncWindowTheme = async () => {
            try {
                const { getCurrentWindow } = await import('@tauri-apps/api/window');
                const appWindow = getCurrentWindow();
                await appWindow.setTheme(isDark ? 'dark' : 'light');
            } catch (e) {
                // Not in Tauri environment or API not available
                console.log('Window theme sync not available');
            }
        };
        syncWindowTheme();
    }, [isDark]);

    // Actions
    const toggleDocSelect = (id: number) => {
        const newSet = new Set(selectedDocs);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedDocs(newSet);
    };

    const selectAllDocuments = () => {
        if (!currentProject) return;
        const docs = documents.filter(d => d.projectId === currentProject.id);
        const newSet = new Set(selectedDocs);
        docs.forEach(d => newSet.add(d.id));
        setSelectedDocs(newSet);
    };

    const clearSelection = () => {
        setSelectedDocs(new Set());
    };

    const toggleTheme = () => setIsDark(!isDark);

    const unlockApp = () => {
        setSecurity(prev => ({ ...prev, locked: false }));
        sessionStorage.setItem('unlocked', 'true');
    };

    const lockApp = () => {
        setSecurity(prev => ({ ...prev, locked: true }));
        sessionStorage.removeItem('unlocked');
    };

    const showToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
        setToast({ show: true, type, title, message });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    };

    const hideToast = () => setToast(prev => ({ ...prev, show: false }));

    return (
        <AppContext.Provider value={{
            projects, setProjects,
            documents, setDocuments,
            currentProject, setCurrentProject,
            annotatingDocId, setAnnotatingDocId,
            selectedDocs, setSelectedDocs,
            view, setView,
            deleteType, setDeleteType,
            deleteTarget, setDeleteTarget,
            security, setSecurity,
            settings, setSettings,
            editingLabelIndex, setEditingLabelIndex,
            editingRuleIndex, setEditingRuleIndex,
            documentFilter, setDocumentFilter,
            documentSearchQuery, setDocumentSearchQuery,
            toast,
            toggleDocSelect, selectAllDocuments, clearSelection,
            toggleTheme, isDark,
            unlockApp, lockApp,
            showToast, hideToast,
            batchState, setBatchState
        }}>
            {children}
        </AppContext.Provider>

    );
};
