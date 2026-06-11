import React, { useState, useEffect, Suspense } from 'react';
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
import WelcomeModal from './employeeDashboard/WelcomeModal';

const AppShell = () => {
  const { sidebarCollapsed, confirmDialog, commandPaletteOpen, setCommandPaletteOpen, currentUser } = useApp();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  // Show welcome modal for ALL roles on first login
  useEffect(() => {
    const justLoggedIn = sessionStorage.getItem('just_logged_in');
    if (justLoggedIn === 'true' && currentUser) {
      setShowWelcome(true);
      sessionStorage.removeItem('just_logged_in');
    }
  }, [currentUser]);

  return (
    <div className="app-shell-layout">

      {/* Global Welcome Modal — shows for all roles after login */}
      {showWelcome && currentUser && (
        <WelcomeModal
          currentUser={currentUser}
          onClose={() => setShowWelcome(false)}
        />
      )}

      {/* Sidebar navigation */}
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
      />

      {/* Main page content area — hidden behind modal until dismissed */}
      <div
        className={`app-shell-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}
        style={{
          opacity: showWelcome ? 0 : 1,
          transition: showWelcome ? 'none' : 'opacity 0.6s ease',
          pointerEvents: showWelcome ? 'none' : 'auto'
        }}
      >
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
