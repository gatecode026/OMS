import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Check, Bell, CheckCheck, Loader2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getSocket } from '../../lib/socketManager';
import './NotificationComponents.css';

// Reuse type icons from NotificationPanel
import {
  MessageSquare, AtSign, Megaphone, CheckSquare, Calendar,
  Paperclip, Users, Info
} from 'lucide-react';

const getNotifIcon = (type) => {
  const styles = {
    padding: '6px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff'
  };

  switch (type) {
    case 'message':
    case 'new_message':
      return <div style={{ ...styles, backgroundColor: '#3b82f6' }}><MessageSquare size={14} /></div>;
    case 'mention':
      return <div style={{ ...styles, backgroundColor: '#ef4444' }}><AtSign size={14} /></div>;
    case 'announcement':
    case 'broadcast':
      return <div style={{ ...styles, backgroundColor: '#f59e0b' }}><Megaphone size={14} /></div>;
    case 'task':
    case 'task_assigned':
    case 'task_updated':
      return <div style={{ ...styles, backgroundColor: '#10b981' }}><CheckSquare size={14} /></div>;
    case 'meeting':
      return <div style={{ ...styles, backgroundColor: '#8b5cf6' }}><Calendar size={14} /></div>;
    case 'file':
      return <div style={{ ...styles, backgroundColor: '#06b6d4' }}><Paperclip size={14} /></div>;
    case 'group':
      return <div style={{ ...styles, backgroundColor: '#ec4899' }}><Users size={14} /></div>;
    default:
      return <div style={{ ...styles, backgroundColor: '#64748b' }}><Info size={14} /></div>;
  }
};

const formatNotificationTime = (dateStr) => {
  if (!dateStr) return 'Just now';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const NotificationDrawer = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  
  const { token, currentUser } = useApp();
  const observer = useRef();
  
  const listRef = useRef();

  const fetchNotifications = useCallback(async (pageNum, filterVal, append = false) => {
    if (!token) return;
    setLoading(true);
    try {
      const typeParam = filterVal !== 'all' ? `&type=${filterVal}` : '';
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/notifications?page=${pageNum}&limit=15${typeParam}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.status === 'success' && result.data) {
        const { notifications: items, pagination } = result.data;
        
        setNotifications(prev => append ? [...prev, ...items] : items);
        setHasMore(pageNum < pagination.pages);
      }
    } catch (err) {
      console.error('[NotificationDrawer] Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Load initial page or filter changes
  useEffect(() => {
    if (isOpen) {
      setPage(1);
      setHasMore(true);
      fetchNotifications(1, activeFilter, false);
    }
  }, [isOpen, activeFilter, fetchNotifications]);

  // Socket listener for real-time appends when drawer is open
  useEffect(() => {
    if (!isOpen || !currentUser) return;
    const socket = getSocket();
    if (!socket) return;

    const handleNewNotification = (notif) => {
      // Prepend if matches filter
      if (activeFilter === 'all' || notif.type === activeFilter) {
        setNotifications(prev => [notif, ...prev]);
      }
    };

    socket.on('notification:new', handleNewNotification);
    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [isOpen, activeFilter, currentUser]);

  // Intersection Observer for Infinite Scroll
  const lastElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prev => {
          const nextPage = prev + 1;
          fetchNotifications(nextPage, activeFilter, true);
          return nextPage;
        });
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, hasMore, activeFilter, fetchNotifications]);

  // Mark single as read
  const handleMarkRead = async (notifId, e) => {
    e.stopPropagation();
    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/notifications/${notifId}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.status === 'success') {
        setNotifications(prev => prev.map(n => {
          const id = n.id || n._id;
          return id === notifId ? { ...n, isRead: true } : n;
        }));
      }
    } catch (err) {
      console.error('[NotificationDrawer] Mark read failed:', err);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/notifications/read-all`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.status === 'success') {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        
        // Notify socket
        const socket = getSocket();
        socket?.emit('notification:opened');
      }
    } catch (err) {
      console.error('[NotificationDrawer] Mark all read failed:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="thread-panel glass animate-slide-left" style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: '420px',
      height: '100vh',
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      backdropFilter: 'blur(20px)',
      borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
      zIndex: 1100,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '-10px 0 30px rgba(0,0,0,0.5)'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'between',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Bell size={18} style={{ color: 'var(--color-primary, #d946ef)' }} />
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>Notification Center</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {notifications.some(n => !n.isRead) && (
            <button className="notif-panel-btn" onClick={handleMarkAllRead} title="Mark all read">
              <CheckCheck size={16} />
            </button>
          )}
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Category Filters */}
      <div className="notif-filters">
        <button className={`notif-filter-btn ${activeFilter === 'all' ? 'active' : ''}`} onClick={() => setActiveFilter('all')}>All</button>
        <button className={`notif-filter-btn ${activeFilter === 'message' ? 'active' : ''}`} onClick={() => setActiveFilter('message')}>Messages</button>
        <button className={`notif-filter-btn ${activeFilter === 'mention' ? 'active' : ''}`} onClick={() => setActiveFilter('mention')}>Mentions</button>
        <button className={`notif-filter-btn ${activeFilter === 'announcement' ? 'active' : ''}`} onClick={() => setActiveFilter('announcement')}>Announcements</button>
        <button className={`notif-filter-btn ${activeFilter === 'system' ? 'active' : ''}`} onClick={() => setActiveFilter('system')}>System</button>
      </div>

      {/* List */}
      <div ref={listRef} className="notif-list" style={{ flex: 1, overflowY: 'auto' }}>
        {notifications.length > 0 ? (
          notifications.map((n, index) => {
            const notifId = n.id || n._id;
            const isLast = index === notifications.length - 1;
            return (
              <div
                key={notifId}
                ref={isLast ? lastElementRef : null}
                className={`notif-item-wrapper ${!n.isRead ? 'unread' : ''}`}
                style={{ padding: '16px 20px', display: 'flex', gap: '14px', position: 'relative' }}
              >
                {getNotifIcon(n.type)}
                <div className="notif-item-content" style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <h5 className="notif-item-title" style={{ fontSize: '0.84rem', margin: '0 0 4px 0', fontWeight: 600 }}>{n.title}</h5>
                    {!n.isRead && (
                      <button
                        onClick={(e) => handleMarkRead(notifId, e)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-primary, #d946ef)',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Mark as read"
                      >
                        <Check size={14} />
                      </button>
                    )}
                  </div>
                  <p className="notif-item-msg" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, whiteSpace: 'normal', overflow: 'visible' }}>{n.message}</p>
                  <span className="notif-item-time" style={{ display: 'block', marginTop: '8px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatNotificationTime(n.createdAt)}</span>
                </div>
              </div>
            );
          })
        ) : (
          !loading && (
            <div className="notif-empty-state" style={{ padding: '60px 20px' }}>
              <Bell size={36} style={{ color: 'rgba(255,255,255,0.1)' }} />
              <span className="notif-empty-title">Clean Slate</span>
              <span className="notif-empty-subtitle">No notifications found under this category.</span>
            </div>
          )
        )}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
            <Loader2 className="animate-spin text-primary" size={24} />
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationDrawer;
