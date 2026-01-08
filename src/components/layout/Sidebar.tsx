import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
    LayoutDashboard,
    Plus,
    Settings,
    Sun,
    Moon,
    Lock,
    CircleHelp,
    Info,
    ChevronLeft,
    Cpu
} from 'lucide-react';
import LockSetupModal from '../modals/LockSetupModal';

interface SidebarProps {
    onOpenProjectModal: () => void;
    onOpenSettingsModal: () => void;
    onOpenHelpModal: () => void;
    onOpenAboutModal: () => void;
    defaultCollapsed?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
    onOpenProjectModal,
    onOpenSettingsModal,
    onOpenHelpModal,
    onOpenAboutModal,
    defaultCollapsed = true
}) => {
    const {
        setCurrentProject,
        setAnnotatingDocId,
        projects,
        toggleTheme,
        isDark,
        lockApp,
        security,
        settings
    } = useApp();

    const [collapsed, setCollapsed] = useState(defaultCollapsed);

    const toggleSidebar = () => setCollapsed(prev => !prev);

    const [showLockSetupModal, setShowLockSetupModal] = useState(false);

    // LLM Connection Status
    const llmStatus = useMemo(() => {
        if (!settings.providers) return { connected: false, provider: null };

        for (const [key, config] of Object.entries(settings.providers)) {
            const providerConfig = config as { models?: string[] };
            if (providerConfig?.models && providerConfig.models.length > 0) {
                const providerNames: Record<string, string> = {
                    mistral: 'Mistral',
                    openai: 'OpenAI',
                    anthropic: 'Claude',
                    gemini: 'Gemini',
                    openrouter: 'OpenRouter',
                    ollama: 'Ollama',
                    lmstudio: 'LM Studio'
                };
                return { connected: true, provider: providerNames[key] || key };
            }
        }
        return { connected: false, provider: null };
    }, [settings.providers]);

    const handleLockApp = () => {
        if (security.enabled) {
            lockApp();
        } else {
            setShowLockSetupModal(true);
        }
    };

    const handleLockSetupGoToSettings = () => {
        setShowLockSetupModal(false);
        onOpenSettingsModal();
    };

    const handleDashboardClick = () => {
        setAnnotatingDocId(null);
        setCurrentProject(null);
    };

    return (
        <>
            <aside
                className={[
                    'bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700',
                    'flex flex-col flex-shrink-0 relative z-50 shadow-sm transition-all duration-300',
                    collapsed ? 'sidebar-collapsed !w-[72px]' : 'w-60'
                ].join(' ')}
            >
                {/* Toggle button / handle */}
                <button
                    onClick={toggleSidebar}
                    className={[
                        'absolute -right-3 top-6 z-50',
                        'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600',
                        'rounded-full p-1 shadow-md text-gray-500 dark:text-gray-300 hover:text-primary',
                        'transition-transform duration-300'
                    ].join(' ')}
                    style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {/* Header */}
                <div className="p-4 border-b border-transparent overflow-x-hidden">
                    <div
                        className={[
                            'flex items-center font-bold text-gray-900 dark:text-white text-lg mb-6',
                            'overflow-hidden whitespace-nowrap',
                            collapsed ? 'justify-center' : 'gap-2'
                        ].join(' ')}
                    >
                        <div className="w-8 h-8 min-w-[2rem] bg-primary rounded-lg flex items-center justify-center text-white shadow-sm shrink-0">
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                            </svg>
                        </div>

                        <span
                            className={[
                                'logo-text tracking-tight transition-all duration-300',
                                collapsed ? 'opacity-0 w-0 ml-0 overflow-hidden' : 'opacity-100 ml-2'
                            ].join(' ')}
                        >
                            AnnotaLoop
                        </span>
                    </div>

                    {/* Dashboard Button */}
                    <button
                        onClick={handleDashboardClick}
                        className={[
                            'sidebar-item w-full flex items-center px-2 py-2 mb-1 rounded',
                            'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
                            'cursor-pointer transition-colors overflow-hidden whitespace-nowrap group relative',
                            collapsed ? 'justify-center' : ''
                        ].join(' ')}
                    >
                        <span className="w-5 h-5 min-w-[1.25rem] flex items-center justify-center">
                            <LayoutDashboard className="w-[18px] h-[18px] text-gray-500 dark:text-gray-400" />
                        </span>
                        <span className={collapsed ? 'hidden' : 'nav-text font-medium ml-2'}>Dashboard</span>
                        {collapsed && (
                            <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-[11px] font-medium rounded shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[9999]">
                                Dashboard
                            </span>
                        )}
                    </button>

                    {/* New Project Button */}
                    <button
                        onClick={onOpenProjectModal}
                        className={[
                            'sidebar-item w-full py-2 px-3 rounded-md font-medium transition-colors flex items-center text-sm overflow-hidden whitespace-nowrap group relative mt-2',
                            'text-slate-700 bg-transparent hover:bg-slate-50 hover:text-slate-800',
                            'dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-gray-100',
                            collapsed ? 'justify-center' : 'gap-2'
                        ].join(' ')}
                    >
                        <span className="w-5 h-5 min-w-[1.25rem] ml-[-3px] flex items-center justify-center rounded bg-gray-100 text-gray-500 group-hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:group-hover:bg-gray-600 transition-colors">
                            <Plus className="w-3.5 h-3.5" />
                        </span>

                        <span className={collapsed ? 'hidden' : 'btn-text'}>New Project</span>
                        {collapsed && <span className="sidebar-tooltip">New Project</span>}
                    </button>

                </div>

                {/* Recent projects */}
                <div
                    className={[
                        'flex-grow overflow-y-auto overflow-x-hidden px-2 scroll-custom',
                        collapsed ? 'invisible pointer-events-none' : 'visible'
                    ].join(' ')}
                    aria-hidden={collapsed}
                >
                    <div className="section-title px-2 mt-2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 transition-opacity duration-300">
                        Recent
                    </div>

                    <ul className="space-y-0.5 overflow-x-hidden" id="recent-projects-list">
                        {projects.slice(0, 3).map(p => (
                            <li key={p.id} className="relative group overflow-x-hidden">
                                <button
                                    onClick={() => {
                                        setAnnotatingDocId(null);
                                        setCurrentProject(p);
                                    }}
                                    className="sidebar-item w-full flex items-center px-2 py-2 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors overflow-hidden whitespace-nowrap relative group"
                                    tabIndex={collapsed ? -1 : 0}
                                >
                                    <span className="w-5 h-5 min-w-[1.25rem] flex items-center justify-center rounded bg-gray-100/60 text-gray-400 group-hover:bg-emerald-50/30 group-hover:text-emerald-500/70 dark:bg-gray-700/30 dark:text-gray-500 dark:group-hover:bg-gray-700/40 dark:group-hover:text-emerald-300/50 transition-colors mr-2">
                                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                                        </svg>
                                    </span>

                                    <span className="nav-text truncate">{p.name}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Bottom Actions */}
                <div className="p-2 border-t border-gray-200 dark:border-gray-700 space-y-0.5 overflow-x-hidden">
                    {/* LLM Connection Status */}
                    <button
                        onClick={onOpenSettingsModal}
                        className={[
                            'sidebar-item w-full flex items-center px-2 py-2 rounded mb-1',
                            llmStatus.connected
                                ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                                : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
                            'cursor-pointer transition-colors overflow-hidden whitespace-nowrap group relative',
                            collapsed ? 'justify-center' : ''
                        ].join(' ')}
                        title="Configure LLM"
                    >
                        <span className="w-5 h-5 min-w-[1.25rem] flex items-center justify-center">
                            <Cpu className="w-[18px] h-[18px]" />
                        </span>
                        <span className={collapsed ? 'hidden' : 'nav-text ml-2 text-xs font-medium truncate'}>
                            {llmStatus.connected ? `${llmStatus.provider} Connected` : 'No LLM Connected'}
                        </span>
                        {collapsed && (
                            <span className="sidebar-tooltip">
                                {llmStatus.connected ? `${llmStatus.provider} Connected` : 'No LLM Connected'}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={onOpenSettingsModal}
                        className={[
                            'sidebar-item w-full flex items-center px-2 py-2 rounded',
                            'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
                            'cursor-pointer transition-colors overflow-hidden whitespace-nowrap group relative',
                            collapsed ? 'justify-center' : ''
                        ].join(' ')}
                    >
                        <span className="w-5 h-5 min-w-[1.25rem] flex items-center justify-center">
                            <Settings className="w-[18px] h-[18px] text-gray-500 dark:text-gray-400" />
                        </span>
                        <span className={collapsed ? 'hidden' : 'nav-text ml-2'}>Settings</span>
                        {collapsed && <span className="sidebar-tooltip">Settings</span>}
                    </button>

                    <button
                        onClick={toggleTheme}
                        className={[
                            'sidebar-item w-full flex items-center px-2 py-2 rounded',
                            'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
                            'cursor-pointer transition-colors overflow-hidden whitespace-nowrap group relative',
                            collapsed ? 'justify-center' : ''
                        ].join(' ')}
                    >
                        <span className="w-5 h-5 min-w-[1.25rem] flex items-center justify-center">
                            {isDark ? (
                                <Sun className="w-[18px] h-[18px] text-gray-500 dark:text-gray-400" />
                            ) : (
                                <Moon className="w-[18px] h-[18px] text-gray-500 dark:text-gray-400" />
                            )}
                        </span>

                        <span className={collapsed ? 'hidden' : 'nav-text ml-2'}>
                            {isDark ? 'Light Mode' : 'Dark Mode'}
                        </span>
                        {collapsed && <span className="sidebar-tooltip">Switch Theme</span>}
                    </button>

                    <button
                        onClick={handleLockApp}
                        className={[
                            'sidebar-item w-full flex items-center px-2 py-2 rounded',
                            'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
                            'cursor-pointer transition-colors overflow-hidden whitespace-nowrap group relative',
                            collapsed ? 'justify-center' : ''
                        ].join(' ')}
                    >
                        <span className="w-5 h-5 min-w-[1.25rem] flex items-center justify-center">
                            <Lock className="w-[18px] h-[18px] text-gray-500 dark:text-gray-400" />
                        </span>
                        <span className={collapsed ? 'hidden' : 'nav-text ml-2'}>Lock App</span>
                        {collapsed && <span className="sidebar-tooltip">Lock App</span>}
                    </button>

                    <button
                        onClick={onOpenHelpModal}
                        className={[
                            'sidebar-item w-full flex items-center px-2 py-2 rounded',
                            'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
                            'cursor-pointer transition-colors overflow-hidden whitespace-nowrap group relative',
                            collapsed ? 'justify-center' : ''
                        ].join(' ')}
                    >
                        <span className="w-5 h-5 min-w-[1.25rem] flex items-center justify-center">
                            <CircleHelp className="w-[18px] h-[18px] text-gray-500 dark:text-gray-400" />
                        </span>
                        <span className={collapsed ? 'hidden' : 'nav-text ml-2'}>Help & Support</span>
                        {collapsed && <span className="sidebar-tooltip">Help & Support</span>}
                    </button>

                    <button
                        onClick={onOpenAboutModal}
                        className={[
                            'sidebar-item w-full flex items-center px-2 py-2 rounded',
                            'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
                            'cursor-pointer transition-colors overflow-hidden whitespace-nowrap group relative',
                            collapsed ? 'justify-center' : ''
                        ].join(' ')}
                    >
                        <span className="w-5 h-5 min-w-[1.25rem] flex items-center justify-center">
                            <Info className="w-[18px] h-[18px] text-gray-500 dark:text-gray-400" />
                        </span>
                        <span className={collapsed ? 'hidden' : 'nav-text ml-2'}>About & Updates</span>
                        {collapsed && <span className="sidebar-tooltip">About & Updates</span>}
                    </button>
                </div>
            </aside>

            {/* Lock Setup Modal */}
            <LockSetupModal
                isOpen={showLockSetupModal}
                onClose={() => setShowLockSetupModal(false)}
                onOpenSettings={handleLockSetupGoToSettings}
            />
        </>
    );
};

export default Sidebar;
