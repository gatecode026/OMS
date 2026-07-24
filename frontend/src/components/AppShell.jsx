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
import { useTitleWithUnread } from '../hooks/useTitleWithUnread';
import { Flame, ExternalLink, X } from 'lucide-react';
import ErrorBoundary from './common/ErrorBoundary';

const AppShell = () => {
  const { 
    sidebarCollapsed, 
    confirmDialog, 
    commandPaletteOpen, 
    setCommandPaletteOpen, 
    currentUser,
    emergencyAlert,
    triggerEmergencyAlert,
    addToast
  } = useApp();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  // Dynamic tab title: "(N) Gatecode OMS" when unread messages exist
  useTitleWithUnread();

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

        {/* Global Emergency Flash Banner */}
        {emergencyAlert && emergencyAlert.isActive && (
          <div className="emergency-flash-banner animate-slide-up flex-center justify-between" style={{ margin: '16px 24px 0 24px' }}>
            <div className="flex-center gap-3" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="emergency-icon-ring"><Flame size={20} className="text-danger" /></div>
              <div>
                <strong className="emergency-banner-title">{emergencyAlert.title}</strong>
                <p className="emergency-banner-desc font-xsmall text-muted mb-0" style={{ margin: '3px 0 0 0', fontSize: '0.75rem' }}>
                  {emergencyAlert.description} • {emergencyAlert.date}
                </p>
              </div>
            </div>
            <div className="flex-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button 
                className="flex-center gap-1 font-xsmall badge badge-danger py-1 cursor-pointer" 
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', padding: '4px 8px', borderRadius: '4px' }}
                onClick={() => addToast('info', 'Karnataka Disaster Response SMS Broadcast completed.')}
              >
                <ExternalLink size={10} /> SMS Blast
              </button>
              <button 
                className="action-circle-btn text-muted" 
                style={{ cursor: 'pointer', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => triggerEmergencyAlert({ ...emergencyAlert, isActive: false })}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Scrollable page viewport */}
        <main className="app-shell-content">
          <div className="page-entry-container animate-fade-in">
            <ErrorBoundary>
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
            </ErrorBoundary>
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
