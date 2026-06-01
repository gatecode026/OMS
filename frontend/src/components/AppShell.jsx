import React, { useState, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import './AppShell.css';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import CommandPalette from './CommandPalette';
import GlobalSearch from './GlobalSearch';
import { ToastContainer } from './Toast';
import ConfirmDialog from './common/ConfirmDialog';
import Skeleton from './common/Skeleton';
import { useApp } from '../context/AppContext';

const AppShell = () => {
  const { sidebarCollapsed, confirmDialog, commandPaletteOpen, setCommandPaletteOpen } = useApp();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="app-shell-layout">
      {/* Sidebar navigation */}
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
      />

      {/* Main page content area */}
      <div className={`app-shell-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Topbar onMenuToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)} />

        {/* Scrollable page viewport */}
        <main className="app-shell-content">
          <div className="page-entry-container animate-fade-in">
            <Suspense fallback={
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <Skeleton variant="rect" height={40} width={300} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)' }}>
                  <Skeleton variant="rect" height={100} />
                  <Skeleton variant="rect" height={100} />
                  <Skeleton variant="rect" height={100} />
                  <Skeleton variant="rect" height={100} />
                </div>
                <Skeleton variant="rect" height={220} />
                <Skeleton variant="text" count={4} />
              </div>
            }>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>

      {/* Global Utilities */}
      <CommandPalette />
      <GlobalSearch isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
      <ToastContainer />

      {/* Global Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmType={confirmDialog.confirmType}
        onConfirm={confirmDialog.onConfirm}
        onCancel={confirmDialog.onCancel}
      />
    </div>
  );
};

export default AppShell;
