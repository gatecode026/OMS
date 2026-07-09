/**
 * @file NotificationDrawer.jsx
 * @description Full Notification Center — slide-in panel with:
 *   • 10 category filter tabs (All, Messages, Mentions, Announcements,
 *     Tasks, Meetings, Files, Reactions, Groups, System)
 *   • Infinite scroll pagination
 *   • Real-time new notification prepend
 *   • Mark single / all as read
 *   • Delete individual notification
 *   • High-priority visual indicators
 *   • Animated entry for live notifications
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Check, Bell, CheckCheck, Loader2, Trash2,
  MessageSquare, AtSign, Megaphone, CheckSquare, Calendar,
  Paperclip, Users, Info, Smile, Radio, UserPlus, UserMinus, Zap
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { decodeHTMLEntities } from '../../utils/stringUtils';
import { useNavigate } from 'react-router-dom';
import { getSocket } from '../../lib/socketManager';
import './NotificationComponents.css';

const API_BASE = window.API_URL || 'http://localhost:5000';

// ── TYPE CONFIG (shared with NotificationPanel) ────────────────────────────────
const TYPE_CONFIG = {
  message:         { icon: MessageSquare, bg: '#3b82f6' },
  new_message:     { icon: MessageSquare, bg: '#3b82f6' },
  chat_invitation: { icon: MessageSquare, bg: '#3b82f6' },
  mention:         { icon: AtSign,        bg: '#ef4444' },
  group_mention:   { icon: AtSign,        bg: '#f97316' },
  announcement:    { icon: Megaphone,     bg: '#f59e0b' },
  broadcast:       { icon: Radio,         bg: '#eab308' },
  task:            { icon: CheckSquare,   bg: '#10b981' },
  task_assigned:   { icon: CheckSquare,   bg: '#10b981' },
  task_updated:    { icon: CheckSquare,   bg: '#059669' },
  meeting:         { icon: Calendar,      bg: '#8b5cf6' },
  file:            { icon: Paperclip,     bg: '#06b6d4' },
  reaction:        { icon: Smile,         bg: '#f59e0b' },
  group:           { icon: Users,         bg: '#ec4899' },
  user_added:      { icon: UserPlus,      bg: '#10b981' },
  user_removed:    { icon: UserMinus,     bg: '#ef4444' },
  system:          { icon: Zap,           bg: '#64748b' },
};

const NotifIcon = ({ type }) => {
  const cfg = TYPE_CONFIG[type] || { icon: Info, bg: '#64748b' };
  const Icon = cfg.icon;
  return (
    <div style={{
      width: 34, height: 34, borderRadius: 9,
      backgroundColor: cfg.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, color: '#fff',
    }}>
      <Icon size={15} />
    </div>
  );
};

// ── CATEGORY FILTER DEFINITIONS ───────────────────────────────────────────────
const FILTERS = [
  { key: 'all',          label: 'All' },
  { key: 'message',      label: 'Messages' },
  { key: 'mention',      label: 'Mentions' },
  { key: 'announcement', label: 'Announcements' },
  { key: 'task',         label: 'Tasks' },
  { key: 'meeting',      label: 'Meetings' },
  { key: 'file',         label: 'Files' },
  { key: 'reaction',     label: 'Reactions' },
  { key: 'group',        label: 'Groups' },
  { key: 'system',       label: 'System' },
];

const EMPTY_MESSAGES = {
  all:          { title: 'Clean Slate', sub: "You're all caught up!" },
  message:      { title: 'No Messages', sub: 'No message notifications yet.' },
  mention:      { title: 'No Mentions', sub: "You haven't been mentioned recently." },
  announcement: { title: 'No Announcements', sub: 'No company announcements.' },
  task:         { title: 'No Task Updates', sub: 'No task notifications.' },
  meeting:      { title: 'No Meetings', sub: 'No meeting notifications.' },
  file:         { title: 'No Files', sub: 'No file notifications.' },
  reaction:     { title: 'No Reactions', sub: "No one's reacted to your messages yet." },
  group:        { title: 'No Group Updates', sub: 'No group changes.' },
  system:       { title: 'No System Alerts', sub: 'All systems operational.' },
};

// ── TIME FORMAT ────────────────────────────────────────────────────────────────
const formatTime = (dateStr) => {
  if (!dateStr) return 'Just now';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Just now';
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

// ── COMPONENT ─────────────────────────────────────────────────────────────────
const NotificationDrawer = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [newIds, setNewIds] = useState(new Set()); // Track newly-arrived items

  const { token, currentUser, fetchNotifications: refreshGlobalNotifications } = useApp();
  const navigate = useNavigate();
  const observerRef = useRef();
  const listRef = useRef();

  // ── FETCH ────────────────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async (pageNum, filterVal, append = false) => {
    if (!token) return;
    setLoading(true);
    try {
      const catParam = filterVal !== 'all' ? `&category=${filterVal}` : '';
      const res = await fetch(
        `${API_BASE}/api/v1/notifications?page=${pageNum}&limit=15${catParam}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const result = await res.json();
      if (result.status === 'success' && result.data) {
        const { notifications: items, pagination } = result.data;
        setNotifications((prev) => append ? [...prev, ...items] : items);
        setHasMore(pageNum < (pagination?.pages || 1));
      }
    } catch (err) {
      console.error('[NotificationDrawer] Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Load on open / filter change
  useEffect(() => {
    if (isOpen) {
      setPage(1);
      setHasMore(true);
      setNewIds(new Set());
      fetchNotifications(1, activeFilter, false);
    }
  }, [isOpen, activeFilter, fetchNotifications]);

  // Sync last_opened_notifications timestamp when full NotificationDrawer opens
  useEffect(() => {
    if (isOpen && currentUser?.id) {
      localStorage.setItem(`last_opened_notifications:${currentUser.id}`, new Date().toISOString());
      if (refreshGlobalNotifications) {
        refreshGlobalNotifications();
      }
    }
  }, [isOpen, currentUser, refreshGlobalNotifications]);

  // ── REAL-TIME PREPEND ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !currentUser) return;
    const socket = getSocket();
    if (!socket) return;

    const handleNewNotification = (notif) => {
      const matchesFilter =
        activeFilter === 'all' ||
        notif.type === activeFilter ||
        notif.category === activeFilter;

      if (matchesFilter) {
        const id = notif.id || notif._id;
        setNotifications((prev) => {
          const exists = prev.some((n) => (n.id || n._id) === id);
          if (exists) return prev;
          return [notif, ...prev];
        });
        // Mark as "new" for animation (cleared after 3s)
        setNewIds((prev) => {
          const next = new Set(prev);
          next.add(id);
          return next;
        });
        setTimeout(() => {
          setNewIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }, 3000);
      }
    };

    socket.on('notification:new', handleNewNotification);
    return () => socket.off('notification:new', handleNewNotification);
  }, [isOpen, activeFilter, currentUser]);

  // ── INFINITE SCROLL ──────────────────────────────────────────────────────
  const lastElementRef = useCallback((node) => {
    if (loading) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        setPage((prev) => {
          const nextPage = prev + 1;
          fetchNotifications(nextPage, activeFilter, true);
          return nextPage;
        });
      }
    }, { threshold: 0.5 });

    if (node) observerRef.current.observe(node);
  }, [loading, hasMore, activeFilter, fetchNotifications]);

  // ── ACTIONS ──────────────────────────────────────────────────────────────
  const handleMarkRead = async (notifId, e) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${API_BASE}/api/v1/notifications/${notifId}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (result.status === 'success') {
        setNotifications((prev) =>
          prev.map((n) => (n.id || n._id) === notifId ? { ...n, isRead: true } : n)
        );
        if (refreshGlobalNotifications) refreshGlobalNotifications();
      }
    } catch (err) {
      console.error('[NotificationDrawer] Mark read failed:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (result.status === 'success') {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        const socket = getSocket();
        socket?.emit('notification:opened');
        if (refreshGlobalNotifications) refreshGlobalNotifications();
      }
    } catch (err) {
      console.error('[NotificationDrawer] Mark all read failed:', err);
    }
  };

  const handleDelete = async (notifId, e) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${API_BASE}/api/v1/notifications/${notifId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (result.status === 'success') {
        setNotifications((prev) => prev.filter((n) => (n.id || n._id) !== notifId));
      }
    } catch (err) {
      console.error('[NotificationDrawer] Delete failed:', err);
    }
  };

  const handleNotificationClick = async (notif) => {
    onClose();
    const notifId = notif.id || notif._id;

    // Mark as read
    if (notifId && !notif.isRead) {
      try {
        await fetch(`${API_BASE}/api/v1/notifications/${notifId}/read`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (refreshGlobalNotifications) refreshGlobalNotifications();
      } catch (err) {}
    }

    const type = (notif.type || '').toLowerCase();
    const category = (notif.category || '').toLowerCase();
    const msg = (notif.message || '').toLowerCase();
    const title = (notif.title || '').toLowerCase();
    const data = notif.data || {};

    if (type === 'announcement' || type === 'broadcast' || category === 'announcement' || category === 'broadcast') {
      navigate('/announcements');
    } else if (type === 'leave' || category === 'leave' || msg.includes('leave') || title.includes('leave')) {
      navigate('/leaves');
    } else if (type === 'attendance' || category === 'attendance' || msg.includes('attendance') || msg.includes('punch') || msg.includes('late') || title.includes('attendance') || title.includes('punch') || title.includes('late')) {
      navigate('/attendance');
    } else if (type.includes('task') || category === 'task' || msg.includes('task') || title.includes('task')) {
      navigate('/tasks');
    } else if (type === 'meeting' || category === 'meeting' || msg.includes('meeting') || title.includes('meeting')) {
      navigate('/calendar');
    } else if (type === 'payroll' || category === 'payroll' || msg.includes('payroll') || msg.includes('salary') || msg.includes('payslip') || title.includes('payroll') || title.includes('salary') || title.includes('payslip')) {
      navigate('/payroll');
    } else if (
      type.includes('message') || type.includes('mention') || type === 'chat_invitation' || type === 'reaction' ||
      type.includes('group') || type.includes('user_') || category === 'message' || category === 'mention' || category === 'group'
    ) {
      navigate('/chat', { state: { conversationId: data.conversationId } });
    } else {
      // Fallback: Always redirect to the main notification page
      navigate('/notifications', { state: { selectedNotifId: notifId } });
    }
  };

  const hasUnread = notifications.some((n) => !n.isRead);
  const emptyMsg = EMPTY_MESSAGES[activeFilter] || EMPTY_MESSAGES.all;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="notif-drawer-overlay" onClick={onClose} />

      {/* Drawer */}
      <div className="notif-drawer" role="dialog" aria-label="Notification Center">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bell size={17} style={{ color: 'var(--color-primary, #d946ef)' }} />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>
              Notification Center
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {hasUnread && (
              <button
                className="notif-panel-btn"
                onClick={handleMarkAllRead}
                title="Mark all as read"
              >
                <CheckCheck size={15} />
              </button>
            )}
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted, #94a3b8)', cursor: 'pointer', padding: 4, borderRadius: 6 }}
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Category Filter Tabs ───────────────────────────────────── */}
        <div className="notif-filters" style={{ flexShrink: 0 }}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`notif-filter-btn${activeFilter === f.key ? ' active' : ''}`}
              onClick={() => setActiveFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* ── Notification List ──────────────────────────────────────── */}
        <div
          ref={listRef}
          className="notif-list"
          style={{ flex: 1, overflowY: 'auto', maxHeight: 'none' }}
        >
          {notifications.length > 0 ? (
            notifications.map((n, index) => {
              const notifId = n.id || n._id;
              const isLast = index === notifications.length - 1;
              const isNew = newIds.has(notifId);

              return (
                <div
                  key={notifId}
                  ref={isLast ? lastElementRef : null}
                  className={[
                    'notif-item-wrapper',
                    !n.isRead ? 'unread' : '',
                    n.priority === 'high' ? 'priority-high' : '',
                    isNew ? 'notif-item-new' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => handleNotificationClick(n)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleNotificationClick(n)}
                  style={{ padding: '14px 20px', alignItems: 'flex-start' }}
                >
                  <NotifIcon type={n.type} />

                  <div className="notif-item-content" style={{ marginLeft: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <h5
                        className="notif-item-title"
                        style={{ fontSize: '0.84rem', margin: '0 0 3px 0' }}
                      >
                        {n.title}
                      </h5>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        {!n.isRead && (
                          <button
                            className="notif-item-delete-btn"
                            onClick={(e) => handleMarkRead(notifId, e)}
                            title="Mark as read"
                            style={{ color: 'var(--color-primary, #d946ef)' }}
                          >
                            <Check size={13} />
                          </button>
                        )}
                        <button
                          className="notif-item-delete-btn"
                          onClick={(e) => handleDelete(notifId, e)}
                          title="Delete notification"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <p
                      className="notif-item-msg"
                      style={{ fontSize: '0.78rem', whiteSpace: 'normal', overflow: 'visible' }}
                    >
                      {decodeHTMLEntities(n.message)}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                      <span className="notif-item-time">{formatTime(n.createdAt)}</span>
                      {!n.isRead && <span className="notif-item-dot" />}
                      {n.priority === 'high' && (
                        <span style={{
                          fontSize: '0.62rem', fontWeight: 700,
                          color: '#ef4444',
                          background: 'rgba(239,68,68,0.12)',
                          padding: '1px 5px', borderRadius: 4,
                        }}>
                          PRIORITY
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            !loading && (
              <div className="notif-empty-state" style={{ padding: '80px 20px' }}>
                <Bell size={40} style={{ color: 'rgba(255,255,255,0.08)' }} />
                <span className="notif-empty-title">{emptyMsg.title}</span>
                <span className="notif-empty-subtitle">{emptyMsg.sub}</span>
              </div>
            )
          )}

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
              <Loader2 size={22} style={{
                color: 'var(--color-primary, #d946ef)',
                animation: 'spin 1s linear infinite',
              }} />
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .notif-item-new { animation: notif-item-enter 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }
      `}</style>
    </>
  );
};

export default NotificationDrawer;
