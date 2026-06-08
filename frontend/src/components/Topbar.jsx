import React, { useState, useRef, useEffect } from 'react';
import './Topbar.css';
import { useApp } from '../context/AppContext';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import Avatar from './common/Avatar';
import Badge from './common/Badge';
import {
  Menu,
  Bell,
  Sun,
  Moon,
  MessageSquare,
  ChevronDown,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  Check,
  CheckCheck,
  Search,
  Settings
} from 'lucide-react';

const Topbar = ({ onMenuToggle }) => {
  const navigate = useNavigate();
  const {
    sidebarCollapsed,
    setSidebarCollapsed,
    setCommandPaletteOpen,
    notifications,
    markAllNotificationsRead,
    markNotificationRead,
    currentUser,
    currentUserRole,
    setCurrentUserRole,
    roles,
    addToast,
    theme,
    toggleTheme,
    messages,
    markMessageRead,
    markAllMessagesRead,
    logout
  } = useApp();

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [msgOpen, setMsgOpen] = useState(false);
  
  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const msgRef = useRef(null);
  const location = useLocation();

  const handleLogout = (e) => {
    e.preventDefault();
    logout();
    setProfileOpen(false);
    navigate('/login');
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const recentNotifications = notifications.slice(0, 5);

  const unreadMsgCount = messages.filter(m => m.unread).length;

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (msgRef.current && !msgRef.current.contains(e.target)) {
        setMsgOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format Breadcrumbs
  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(p => p);
    if (paths.length === 0) return <span className="breadcrumb-item active">Dashboard</span>;

    return (
      <>
        <Link to="/" className="breadcrumb-item">Home</Link>
        {paths.map((p, index) => {
          const isLast = index === paths.length - 1;
          const formatted = p.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          return (
            <React.Fragment key={p}>
              <span className="breadcrumb-separator">/</span>
              <span className={`breadcrumb-item ${isLast ? 'active' : ''}`}>
                {formatted}
              </span>
            </React.Fragment>
          );
        })}
      </>
    );
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={16} className="text-success" />;
      case 'warning':
        return <AlertTriangle size={16} className="text-warning" />;
      case 'error':
        return <AlertCircle size={16} className="text-danger" />;
      default:
        return <Info size={16} className="text-info" />;
    }
  };

  return (
    <header className={`app-topbar ${sidebarCollapsed ? 'expanded-width' : ''}`}>
      {/* Topbar Left: Hamburgers & Breadcrumbs */}
      <div className="topbar-left">
        <button className="topbar-icon-btn menu-toggle-btn" onClick={onMenuToggle}>
          <Menu size={20} />
        </button>

        <button 
          className="topbar-icon-btn desktop-collapse-btn" 
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          <Menu size={20} />
        </button>

        <div className="topbar-breadcrumbs">
          {getBreadcrumbs()}
        </div>
      </div>

      {/* Topbar Right: Actions, Notifications, Profile Swapper */}
      <div className="topbar-right">
        {/* Global Search Trigger */}
        <button
          className="topbar-search-trigger"
          onClick={() => setCommandPaletteOpen(true)}
          title="Search (⌘K)"
        >
          <Search size={15} className="search-icon" />
          <span className="search-placeholder">Search anything...</span>
          <span className="shortcut-badge">⌘K</span>
        </button>

        {/* Theme Selector */}
        <button className="topbar-icon-btn" onClick={toggleTheme} title="Toggle Theme">
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        {/* Messages Dropdown */}
        <div className="topbar-dropdown-wrapper" ref={msgRef}>
          <button 
            className={`topbar-icon-btn ${unreadMsgCount > 0 ? 'bell-unread' : ''}`}
            onClick={() => setMsgOpen(!msgOpen)}
            title="Messages"
          >
            <MessageSquare size={20} />
            {unreadMsgCount > 0 && <span className="bell-badge-dot"></span>}
          </button>

          {msgOpen && (
            <div className="topbar-dropdown-panel notifications-panel animate-slide-up">
              <div className="panel-header">
                <span className="panel-title">Messages</span>
                {unreadMsgCount > 0 && (
                  <button className="mark-read-all-btn" onClick={markAllMessagesRead}>
                    <CheckCheck size={14} />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              <div className="panel-body">
                {messages.length > 0 ? (
                  messages.map(m => (
                    <div 
                      key={m.id} 
                      className={`notif-item ${m.unread ? 'unread' : ''}`}
                      onClick={() => markMessageRead(m.id)}
                    >
                      <div className="notif-icon-wrapper" style={{ color: 'var(--color-primary-light)' }}>
                        <MessageSquare size={16} />
                      </div>
                      <div className="notif-content">
                        <span className="notif-sender" style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>{m.sender}</span>
                        <p className="notif-message" style={{ margin: '2px 0 0 0' }}>{m.text}</p>
                        <span className="notif-time">{m.time}</span>
                      </div>
                      {m.unread && <span className="notif-unread-dot"></span>}
                    </div>
                  ))
                ) : (
                  <div className="notif-empty">No messages.</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Notifications Bell Dropdown */}
        <div className="topbar-dropdown-wrapper" ref={notifRef}>
          <button 
            className={`topbar-icon-btn ${unreadCount > 0 ? 'bell-unread' : ''}`}
            onClick={() => setNotifOpen(!notifOpen)}
          >
            <Bell size={20} />
            {unreadCount > 0 && <span className="bell-badge-dot"></span>}
          </button>

          {notifOpen && (
            <div className="topbar-dropdown-panel notifications-panel animate-slide-up">
              <div className="panel-header">
                <span className="panel-title">Notifications</span>
                {unreadCount > 0 && (
                  <button className="mark-read-all-btn" onClick={markAllNotificationsRead}>
                    <CheckCheck size={14} />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              <div className="panel-body">
                {recentNotifications.length > 0 ? (
                  recentNotifications.map(n => (
                    <div 
                      key={n.id} 
                      className={`notif-item ${!n.read ? 'unread' : ''}`}
                      onClick={() => markNotificationRead(n.id)}
                    >
                      <div className="notif-icon-wrapper">
                        {getNotifIcon(n.type)}
                      </div>
                      <div className="notif-content">
                        <p className="notif-message">{n.message}</p>
                        <span className="notif-time">{n.timestamp}</span>
                      </div>
                      {!n.read && <span className="notif-unread-dot"></span>}
                    </div>
                  ))
                ) : (
                  <div className="notif-empty">No notifications.</div>
                )}
              </div>

              <div className="panel-footer">
                <Link to="/notifications" className="view-all-link" onClick={() => setNotifOpen(false)}>
                  View all notifications
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Swapper - Dynamic for demoing RBAC */}
        <div className="topbar-dropdown-wrapper" ref={profileRef}>
          <button className="topbar-profile-btn" onClick={() => setProfileOpen(!profileOpen)}>
            <Avatar name={currentUser?.name || 'User'} size="sm" />
            <div className="profile-details-text">
              <span className="profile-name">{currentUser?.name || 'User'}</span>
              <span className="profile-role-sub">{currentUser?.role || 'Guest'}</span>
            </div>
            <ChevronDown size={14} className="profile-chevron" />
          </button>

          {profileOpen && (
            <div className="topbar-dropdown-panel profile-panel animate-slide-up">
              <div className="profile-panel-header">
                <Avatar name={currentUser?.name} size="md" />
                <div className="profile-panel-info">
                  <h4 className="profile-panel-name">{currentUser?.name}</h4>
                  <p className="profile-panel-email">{currentUser?.email}</p>
                </div>
              </div>

              <div className="profile-panel-actions">
                <Link
                  to="/my-profile"
                  className="profile-action-link"
                  onClick={() => setProfileOpen(false)}
                >
                  <Settings size={14} className="action-icon" />
                  <span>Profile Settings</span>
                </Link>
              </div>
              
              <div className="role-switcher-section">
                <span className="switcher-label">Switch Role (Demo RBAC)</span>
                <div className="role-buttons">
                  {roles.map(r => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setCurrentUserRole(r.id);
                        setProfileOpen(false);
                      }}
                      className={`role-switcher-btn ${currentUserRole === r.id ? 'active' : ''}`}
                    >
                      <span className="role-indicator-dot" style={{ backgroundColor: r.accentColor }}></span>
                      <span className="role-switcher-name">{r.name}</span>
                      {currentUserRole === r.id && <Check size={14} className="role-check" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="profile-panel-footer">
                <button onClick={handleLogout} className="profile-logout-btn" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
