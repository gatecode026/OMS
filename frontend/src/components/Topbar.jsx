import React, { useState, useRef, useEffect, useMemo } from 'react';
import './Topbar.css';
import { useApp } from '../context/AppContext';
import { useChat } from '../context/ChatContext';
import { getSocket } from '../lib/socketManager';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import Avatar from './common/Avatar';
import Badge from './common/Badge';
import NotificationBell from './notifications/NotificationBell';
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
  Settings,
  Calendar,
  ArrowRight,
  Clock,
  Video
} from 'lucide-react';

const formatNotificationTime = (notif) => {
  const dateObj = notif.createdAt 
    ? new Date(notif.createdAt) 
    : (notif.timestamp && notif.timestamp !== 'Just now' && notif.timestamp !== 'just now' ? new Date(notif.timestamp) : new Date());
  
  if (isNaN(dateObj.getTime())) {
    return notif.timestamp || notif.time || 'Just now';
  }

  const formattedDate = dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  
  const formattedTime = dateObj.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  
  return `${formattedDate}  •  ${formattedTime}`;
};

const formatTime12h = (time24) => {
  if (!time24) return '';
  const [hourStr, minStr] = time24.split(':');
  let hour = parseInt(hourStr, 10);
  const min = minStr || '00';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  hour = hour ? hour : 12;
  return `${String(hour).padStart(2, '0')}:${min} ${ampm}`;
};

const getCountdownText = (dateStr, timeStr) => {
  const now = new Date();
  const [hours, minutes] = timeStr.split(':').map(Number);
  const meetingDate = new Date(dateStr);
  meetingDate.setHours(hours, minutes, 0, 0);
  
  const diffMs = meetingDate - now;
  if (diffMs < 0) {
    if (diffMs > -3600000) {
      return 'Happening now';
    }
    return 'Passed';
  }
  
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Starting now';
  if (diffMins < 60) return `${diffMins}m left`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `in ${diffHours}h`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `in ${diffDays}d`;
};

const getMeetingLink = (location) => {
  if (!location) return null;
  const trimmed = location.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.includes('zoom.us') || trimmed.includes('meet.google') || trimmed.includes('teams.live') || trimmed.includes('teams.microsoft')) {
    return 'https://' + trimmed.replace(/^(https?:\/\/)?/, '');
  }
  return null;
};

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
    logout,
    token
  } = useApp();

  const { getTotalUnread } = useChat();
  const chatUnreadCount = getTotalUnread();

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [meetingsOpen, setMeetingsOpen] = useState(false);
  const [hasUnseenEvents, setHasUnseenEvents] = useState(false);

  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const fetchUpcomingEvents = async () => {
    if (!token) return;
    setLoadingEvents(true);
    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/events/upcoming?limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setUpcomingEvents(data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch upcoming events for Topbar:', err);
    } finally {
      setLoadingEvents(false);
    }
  };

  // Fetch upcoming events on mount/token change
  useEffect(() => {
    fetchUpcomingEvents();
  }, [token]);

  // Handle live socket event updates for Meetings/Events in real-time
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleEventSync = () => {
      console.log('[Topbar] Live socket event sync, refreshing upcoming events...');
      fetchUpcomingEvents();
      if (!meetingsOpen) {
        setHasUnseenEvents(true);
      }
    };

    socket.on('event:sync', handleEventSync);
    socket.on('notification:new', handleEventSync);

    return () => {
      socket.off('event:sync', handleEventSync);
      socket.off('notification:new', handleEventSync);
    };
  }, [token, meetingsOpen]);

  const handleCalendarClick = () => {
    const nextOpen = !meetingsOpen;
    setMeetingsOpen(nextOpen);
    if (nextOpen) {
      setHasUnseenEvents(false);
    }
  };

  const upcomingMeetings = useMemo(() => upcomingEvents.filter(e => e.type === 'meeting'), [upcomingEvents]);
  const upcomingOthers = useMemo(() => upcomingEvents.filter(e => e.type !== 'meeting'), [upcomingEvents]);
  
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const categorizedMeetings = useMemo(() => {
    const categorized = {
      today: [],
      upcoming: [],
      pastOrCancelled: []
    };
    
    upcomingMeetings.forEach(evt => {
      if (evt.status === 'declined') {
        categorized.pastOrCancelled.push(evt);
      } else if (evt.date === todayStr) {
        categorized.today.push(evt);
      } else if (evt.date > todayStr) {
        categorized.upcoming.push(evt);
      } else {
        categorized.pastOrCancelled.push(evt);
      }
    });
    
    return categorized;
  }, [upcomingMeetings, todayStr]);
  
  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const meetingsRef = useRef(null);
  const location = useLocation();

  const handleLogout = (e) => {
    e.preventDefault();
    setProfileOpen(false);
    logout(); // logout() itself does window.location.href = '/login'
  };

  const isAdminRole = ['super_admin', 'company_admin', 'branch_admin', 'dept_admin', 'manager', 'team_leader'].includes(currentUserRole);

  /**
   * Simple rule:
   *  1. recipientId set → only show to that exact user
   *  2. recipientRole === 'employee' → only show to employees
   *  3. recipientRole === 'admin'   → only show to admin roles
   *  4. recipientRole === 'all' or empty → show to everyone
   */
  const getFilteredNotifications = () => {
    return notifications.filter(n => {
      const recipientId   = n.recipientId || n.targetUserId || n.forUserId;
      const recipientRole = (n.recipientRole || n.targetRole || n.recipientType || '').toLowerCase();
      const msg = (n.message || n.title || '').toLowerCase();

      // Rule 1 — specific user id set → show ONLY to that user
      if (recipientId) {
        return recipientId === currentUser?.id;
      }

      // Rule 2 — explicitly tagged as employee-only or staff
      if (recipientRole === 'employee' || recipientRole === 'employees' || recipientRole === 'all employees' || recipientRole === 'staff') {
        return ['employee', 'team_leader', 'manager', 'hr', 'dept_admin', 'branch_admin', 'company_admin'].includes(currentUserRole);
      }

      // Rule 3 — explicitly tagged as admin-only / super_admin / manager
      if (recipientRole === 'admin' || recipientRole === 'super_admin' || recipientRole === 'manager' || recipientRole === 'team_leader') {
        return isAdminRole;
      }

      // Rule 4 — global / broadcast notification (recipientRole is 'all', 'everyone', or empty)
      if (recipientRole === 'all' || recipientRole === 'everyone' || !recipientRole) {
        // If it's an employee-personal message, show to any non-super_admin staff user
        const isPersonalEmployeeMsg =
          msg.startsWith('your ') ||
          msg.includes('your leave') ||
          msg.includes('your request') ||
          msg.includes('your attendance') ||
          msg.includes('has been approved') ||
          msg.includes('has been rejected') ||
          msg.includes('has been rejected -') ||
          msg.includes('note: approved') ||
          msg.includes('note: rejected');

        if (isPersonalEmployeeMsg) {
          return ['employee', 'team_leader', 'manager', 'hr', 'dept_admin', 'branch_admin', 'company_admin'].includes(currentUserRole);
        }

        // Broadcast / general notification → show to everyone
        return true;
      }

      // Fallback: match specific role
      return recipientRole === currentUserRole?.toLowerCase();
    }).slice(0, 5);
  };


  const recentNotifications = getFilteredNotifications();
  const unreadCount = recentNotifications.filter(n => !n.read).length;

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
      if (meetingsRef.current && !meetingsRef.current.contains(e.target)) {
        setMeetingsOpen(false);
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

  // Maps notification message/type → route + action state for smart redirect
  const getNotificationAction = (n) => {
    const msg = (n.message || n.title || '').toLowerCase();
    const cat = (n.category || '').toLowerCase();

    // Leave-related → /leaves
    if (
      msg.includes('leave') ||
      msg.includes('casual leave') ||
      msg.includes('sick leave') ||
      msg.includes('earned leave') ||
      msg.includes('leave request') ||
      msg.includes('leave applied') ||
      cat.includes('leave')
    ) {
      return { path: '/leaves', state: { openPending: true, highlightId: n.referenceId || n.id } };
    }

    // Punch-in / Punch-out / Attendance → /attendance
    if (
      msg.includes('punch') ||
      msg.includes('punched in') ||
      msg.includes('punched out') ||
      msg.includes('check-in') ||
      msg.includes('check-out') ||
      msg.includes('attendance') ||
      cat.includes('attendance')
    ) {
      return { path: '/attendance', state: { highlightId: n.referenceId || n.id } };
    }

    // Payroll → /payroll
    if (
      msg.includes('payroll') ||
      msg.includes('salary') ||
      msg.includes('payslip') ||
      msg.includes('payment') ||
      cat.includes('payroll')
    ) {
      return { path: '/payroll', state: {} };
    }

    // Performance / Appraisal → /performance
    if (
      msg.includes('appraisal') ||
      msg.includes('performance') ||
      msg.includes('review') ||
      msg.includes('kpi') ||
      cat.includes('performance')
    ) {
      return { path: '/kpi', state: {} };
    }

    // Task / Project → /tasks
    if (
      msg.includes('task') ||
      msg.includes('project') ||
      msg.includes('assigned') ||
      msg.includes('deadline') ||
      cat.includes('project')
    ) {
      return { path: '/tasks', state: {} };
    }

    // Employee profile / onboarding → /employees
    if (
      msg.includes('employee') ||
      msg.includes('onboard') ||
      msg.includes('profile') ||
      cat.includes('employee')
    ) {
      return { path: '/employees', state: {} };
    }

    // Announcement → /announcements
    if (
      msg.includes('announcement') ||
      msg.includes('company update') ||
      cat.includes('announcement')
    ) {
      return { path: '/announcements', state: {} };
    }

    // Default → /notifications
    return { path: '/notifications', state: {} };
  };

  const handleNotificationClick = (n) => {
    markNotificationRead(n.id);
    const action = getNotificationAction(n);
    setNotifOpen(false);
    navigate(action.path, { state: action.state });
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



        {/* Notifications Bell Dropdown */}
        <NotificationBell />

        {/* Meetings & Calendar Dropdown */}
        <div className="topbar-dropdown-wrapper" ref={meetingsRef}>
          <button 
            className="topbar-icon-btn"
            onClick={handleCalendarClick}
            title="Meetings & Calendar"
            style={{ position: 'relative' }}
          >
            <Calendar size={20} />
            {hasUnseenEvents && upcomingEvents.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#ef4444',
                border: '1.5px solid var(--bg-card, #0f172a)'
              }} />
            )}
          </button>

          {meetingsOpen && (
            <div className="topbar-dropdown-panel meetings-panel animate-slide-up" style={{ right: 0, width: '320px' }}>
              <div className="panel-header" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
                <span className="panel-title flex-row align-center gap-2" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={16} style={{ color: 'var(--color-primary, #d946ef)' }} />
                  <span>Meetings & Events</span>
                </span>
              </div>
              
              <div className="panel-body" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '420px', overflowY: 'auto' }}>
                {loadingEvents ? (
                  <div className="text-center text-text-muted py-6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: '0.82rem' }}>
                    Loading events...
                  </div>
                ) : upcomingEvents.length === 0 ? (
                  <div className="text-center text-text-muted py-6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: '0.82rem' }}>
                    No upcoming meetings or events
                  </div>
                ) : (
                  <>
                    {/* 1. Today's Meetings */}
                    {categorizedMeetings.today.length > 0 && (
                      <div className="meetings-section">
                        <span className="meetings-section-title" style={{ 
                          fontSize: '0.68rem', 
                          color: '#38bdf8', 
                          fontWeight: 700, 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.08em',
                          display: 'block',
                          marginBottom: '8px'
                        }}>
                          Today's Meetings
                        </span>
                        <div className="meeting-items" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {categorizedMeetings.today.map(evt => {
                            const link = getMeetingLink(evt.location);
                            const countdown = getCountdownText(evt.date, evt.startTime);
                            return (
                              <div 
                                key={evt._id || evt.id}
                                className="meeting-item-card transition-all" 
                                style={{ 
                                  display: 'flex', 
                                  flexDirection: 'column',
                                  gap: '6px', 
                                  padding: '10px 12px', 
                                  background: countdown === 'Happening now' ? 'rgba(56, 189, 248, 0.05)' : 'var(--bg-elevated, rgba(255, 255, 255, 0.02))', 
                                  border: countdown === 'Happening now' ? '1px solid #38bdf8' : '1px solid var(--border-color, rgba(255, 255, 255, 0.06))',
                                  borderRadius: '8px',
                                  cursor: 'pointer'
                                }}
                                onClick={() => {
                                  setMeetingsOpen(false);
                                  navigate('/calendar');
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                  <span className="meeting-name" style={{ color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: 600, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{evt.title}</span>
                                  <span style={{ 
                                    fontSize: '0.62rem', 
                                    fontWeight: 700, 
                                    color: countdown === 'Happening now' ? '#ef4444' : '#38bdf8',
                                    background: countdown === 'Happening now' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(56, 189, 248, 0.1)',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    flexShrink: 0
                                  }}>
                                    {countdown}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', width: '100%', marginTop: '2px' }}>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Clock size={10} /> {formatTime12h(evt.startTime)}
                                  </span>
                                  {link && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(link, '_blank');
                                      }}
                                      style={{
                                        padding: '3px 8px',
                                        fontSize: '0.68rem',
                                        fontWeight: 600,
                                        borderRadius: '4px',
                                        background: '#10b981',
                                        color: '#fff',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}
                                    >
                                      <Video size={10} /> Join
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 2. Upcoming Meetings */}
                    {categorizedMeetings.upcoming.length > 0 && (
                      <div className="meetings-section" style={{ marginTop: '12px' }}>
                        <span className="meetings-section-title" style={{ 
                          fontSize: '0.68rem', 
                          color: 'var(--text-muted)', 
                          fontWeight: 700, 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.08em',
                          display: 'block',
                          marginBottom: '8px'
                        }}>
                          Upcoming Meetings
                        </span>
                        <div className="meeting-items" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {categorizedMeetings.upcoming.map(evt => {
                            const link = getMeetingLink(evt.location);
                            const countdown = getCountdownText(evt.date, evt.startTime);
                            return (
                              <div 
                                key={evt._id || evt.id}
                                className="meeting-item-card transition-all" 
                                style={{ 
                                  display: 'flex', 
                                  flexDirection: 'column',
                                  gap: '6px', 
                                  padding: '10px 12px', 
                                  background: 'var(--bg-elevated, rgba(255, 255, 255, 0.02))', 
                                  border: '1px solid var(--border-color, rgba(255, 255, 255, 0.06))',
                                  borderRadius: '8px',
                                  cursor: 'pointer'
                                }}
                                onClick={() => {
                                  setMeetingsOpen(false);
                                  navigate('/calendar');
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                  <span className="meeting-name" style={{ color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: 600, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{evt.title}</span>
                                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                                    {countdown}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', width: '100%' }}>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Clock size={10} /> {evt.date} • {formatTime12h(evt.startTime)}
                                  </span>
                                  {link && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(link, '_blank');
                                      }}
                                      style={{
                                        padding: '3px 8px',
                                        fontSize: '0.68rem',
                                        fontWeight: 600,
                                        borderRadius: '4px',
                                        background: '#10b981',
                                        color: '#fff',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}
                                    >
                                      <Video size={10} /> Join
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 3. Cancelled / Past Meetings */}
                    {categorizedMeetings.pastOrCancelled.length > 0 && (
                      <div className="meetings-section" style={{ marginTop: '12px' }}>
                        <span className="meetings-section-title" style={{ 
                          fontSize: '0.68rem', 
                          color: 'var(--text-muted)', 
                          fontWeight: 700, 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.08em',
                          display: 'block',
                          marginBottom: '8px'
                        }}>
                          Cancelled / Past
                        </span>
                        <div className="meeting-items" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {categorizedMeetings.pastOrCancelled.map(evt => (
                            <div 
                              key={evt._id || evt.id}
                              className="meeting-item-card transition-all" 
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center',
                                gap: '12px', 
                                padding: '10px 12px', 
                                background: 'rgba(0, 0, 0, 0.1)', 
                                border: '1px solid rgba(255, 255, 255, 0.03)',
                                borderRadius: '8px',
                                opacity: 0.6
                              }}
                              onClick={() => {
                                  setMeetingsOpen(false);
                                  navigate('/calendar');
                              }}
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                                <span className="meeting-name" style={{ color: 'var(--text-primary)', fontSize: '0.8rem', textDecoration: evt.status === 'declined' ? 'line-through' : 'none' }}>{evt.title}</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Clock size={10} /> {evt.date} • {formatTime12h(evt.startTime)}
                                </span>
                              </div>
                              {evt.status === 'declined' && (
                                <span style={{
                                  fontSize: '0.58rem',
                                  fontWeight: 700,
                                  color: '#ef4444',
                                  border: '1px solid #ef4444',
                                  padding: '1px 4px',
                                  borderRadius: '3px',
                                  textTransform: 'uppercase',
                                  flexShrink: 0
                                }}>
                                  Cancelled
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 4. Other Events */}
                    {upcomingOthers.length > 0 && (
                      <div className="meetings-section" style={{ marginTop: '12px' }}>
                        <span className="meetings-section-title" style={{ 
                          fontSize: '0.68rem', 
                          color: 'var(--text-muted)', 
                          fontWeight: 700, 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.08em',
                          display: 'block',
                          marginBottom: '8px'
                        }}>
                          Other Events
                        </span>
                        <div className="meeting-items" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {upcomingOthers.map(evt => (
                            <div 
                              key={evt._id || evt.id}
                              className="meeting-item event-item transition-all" 
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center',
                                gap: '10px', 
                                fontSize: '0.8rem', 
                                padding: '10px 12px', 
                                background: (evt.color || '#10b981') + '04', 
                                border: '1px solid ' + (evt.color || '#10b981') + '14', 
                                borderLeft: '4px solid ' + (evt.color || '#10b981'),
                                borderRadius: '8px',
                                cursor: 'pointer'
                              }}
                              onClick={() => {
                                setMeetingsOpen(false);
                                navigate('/calendar');
                              }}
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
                                <span className="meeting-name" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{evt.title}</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Clock size={10} /> {evt.date} • {formatTime12h(evt.startTime)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Swapper - Dynamic for demoing RBAC */}
        <div className="topbar-dropdown-wrapper" ref={profileRef}>
          <button className="topbar-profile-btn" onClick={() => setProfileOpen(!profileOpen)}>
            <Avatar name={currentUser?.name || 'User'} size="sm" src={currentUser?.avatar || currentUser?.photoUrl} />
            <div className="profile-details-text">
              <span className="profile-name">{currentUser?.name || 'User'}</span>
              <span className="profile-role-sub">{currentUser?.role || 'Guest'}</span>
            </div>
            <ChevronDown size={14} className="profile-chevron" />
          </button>

          {profileOpen && (
            <div className="topbar-dropdown-panel profile-panel animate-slide-up">
              <div className="profile-panel-header">
                <Avatar name={currentUser?.name} size="md" src={currentUser?.avatar || currentUser?.photoUrl} />
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
