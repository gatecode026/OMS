import React, { useState, Suspense } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Sparkles, LayoutDashboard, Building2, PlusCircle, LogOut, Menu, Sun, Moon } from 'lucide-react';
import Avatar from '../../components/common/Avatar';
import Skeleton from '../../components/common/Skeleton';
import '../../components/AppShell.css';
import '../../components/Sidebar.css';
import '../../components/Topbar.css';

const SuperAdminLayout = () => {
  const { currentUser, logout, sidebarCollapsed, theme, toggleTheme } = useApp();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();

  const handleLogout = (e) => {
    e.preventDefault();
    setMobileSidebarOpen(false);
    logout();
  };

  const menuItems = [
    { name: 'Platform Overview', icon: LayoutDashboard, path: '/superadmin/overview' },
    { name: 'Companies', icon: Building2, path: '/superadmin/companies' },
    { name: 'Create New Company', icon: PlusCircle, path: '/superadmin/companies/create' }
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="app-shell-layout">
      {/* Mobile Drawer Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="sidebar-mobile-backdrop animate-fade-in"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Super Admin Sidebar */}
      <aside
        className={`app-sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileSidebarOpen ? 'mobile-show' : ''}`}
      >
        <div className="sidebar-header">
          <Link to="/superadmin/overview" className="sidebar-logo-link" onClick={() => setMobileSidebarOpen(false)}>
            <div className="logo-icon-holder superadmin-logo-holder">
              <Sparkles size={18} className="logo-spark" style={{ color: '#ffffff' }} />
            </div>
            {!sidebarCollapsed && <span className="sidebar-brand-name">Super Admin Console</span>}
          </Link>
        </div>

        <div className="sidebar-menu-container sidebar-scroll">
          <div className="sidebar-section">
            {!sidebarCollapsed && <h5 className="sidebar-section-title">Platform</h5>}
            <div className="sidebar-section-items">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setMobileSidebarOpen(false)}
                    className={`menu-link ${active ? 'active superadmin-active-link' : ''} ${sidebarCollapsed ? 'justify-center' : ''}`}
                    title={sidebarCollapsed ? item.name : ''}
                  >
                    <div className="menu-item-content">
                      <Icon size={18} className="menu-icon" />
                      {!sidebarCollapsed && <span className="menu-label-text">{item.name}</span>}
                    </div>
                    {sidebarCollapsed && <div className="collapsed-tooltip">{item.name}</div>}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Super Admin Sidebar Footer */}
        {!sidebarCollapsed && (
          <div className="sidebar-employee-footer-row" style={{ borderTop: '1px solid var(--border-color)' }}>
            <div className="sidebar-footer-avatar-wrapper">
              <Avatar name={currentUser?.name || 'Super Admin'} className="emp-footer-avatar" size="md" />
            </div>
            <button className="sidebar-footer-logout-btn" onClick={handleLogout} title="Logout">
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        )}
        {sidebarCollapsed && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0', borderTop: '1px solid var(--border-color)' }}>
            <button
              onClick={handleLogout}
              style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className={`app-shell-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Topbar */}
        <header className="app-topbar">
          <div className="topbar-left-side">
            <button
              className="topbar-toggle-btn"
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            >
              <Menu size={20} />
            </button>
            <h1 className="topbar-page-title" style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Platform Control Center
            </h1>
          </div>

          <div className="topbar-right-side">
            <button
              className="theme-toggle-btn-sa"
              onClick={toggleTheme}
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <div className="topbar-user-badge-sa">
              <span className="superadmin-badge">
                Super Admin
              </span>
              <Avatar name={currentUser?.name || 'Super Admin'} size="sm" />
            </div>
          </div>
        </header>


        {/* Page Content Viewport */}
        <main className="app-shell-content">
          <div className="page-entry-container animate-fade-in">
            <Suspense fallback={
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <Skeleton variant="rect" height={40} width={300} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
                  <Skeleton variant="rect" height={100} />
                  <Skeleton variant="rect" height={100} />
                  <Skeleton variant="rect" height={100} />
                </div>
                <Skeleton variant="rect" height={220} />
              </div>
            }>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;
