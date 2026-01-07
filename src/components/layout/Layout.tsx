import React from 'react';
import type { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import LockScreen from './LockScreen';
import Toast from '../ui/Toast';

interface LayoutProps {
    children: ReactNode;
    onOpenProjectModal: () => void;
    onOpenSettingsModal: () => void;
    onOpenHelpModal: () => void;
    onOpenAboutModal: () => void;
    onOpenImportModal: () => void;
    hideHeader?: boolean;
    hideSidebar?: boolean;
    forceSidebarCollapsed?: boolean;
}

const Layout: React.FC<LayoutProps> = ({
    children,
    onOpenProjectModal,
    onOpenSettingsModal,
    onOpenHelpModal,
    onOpenAboutModal,
    onOpenImportModal,
    hideHeader = false,
    hideSidebar = false,
    forceSidebarCollapsed = false,
}) => {
    React.useEffect(() => {
        const handleOpenSettings = () => onOpenSettingsModal();
        window.addEventListener('open-settings-modal', handleOpenSettings);
        return () => window.removeEventListener('open-settings-modal', handleOpenSettings);
    }, [onOpenSettingsModal]);

    return (
        <div className="bg-gray-100 dark:bg-gray-900 h-screen w-screen min-w-0 overflow-hidden flex text-gray-800 dark:text-gray-200 text-sm transition-colors duration-200">
            <LockScreen />
            <Toast />

            {!hideSidebar && (
                <Sidebar
                    onOpenProjectModal={onOpenProjectModal}
                    onOpenSettingsModal={onOpenSettingsModal}
                    onOpenHelpModal={onOpenHelpModal}
                    onOpenAboutModal={onOpenAboutModal}
                    defaultCollapsed={forceSidebarCollapsed}
                />
            )}

            {/* IMPORTANT: min-w-0 but NO overflow-hidden on flex container so tooltips can escape */}
            <div className="flex-grow min-w-0 flex flex-col h-full bg-gray-50 dark:bg-gray-900 transition-colors duration-200 relative">
                {!hideHeader && (
                    <Header onOpenProjectModal={onOpenProjectModal} onOpenImportModal={onOpenImportModal} />
                )}

                {/* IMPORTANT: allow BOTH axis scrolling inside main */}
                <main
                    className="flex-grow min-w-0 overflow-auto p-6 scroll-custom relative"
                    id="main-content-scroll"
                >
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
