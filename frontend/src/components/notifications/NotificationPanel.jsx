/**
 * @file NotificationPanel.jsx
 * @description Quick-view notification dropdown panel.
 *
 *   Shows the 5 most recent notifications with:
 *   • Type-specific color-coded icons (all 14 types)
 *   • Click-to-navigate with mark-as-read
 *   • Mark all read action
 *   • View all → opens full NotificationDrawer
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  MessageSquare, AtSign, Megaphone, CheckSquare, Calendar,
  Paperclip, Users, Info, Bell, CheckCheck, ArrowRight,
  Smile, Radio, UserPlus, UserMinus, Zap, ClipboardList, CreditCard, Clock
} from 'lucide-react';
import './NotificationComponents.css';

// ── TYPE ICON MAP ─────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  message:       { icon: MessageSquare, bg: '#3b82f6', label: 'Message' },
  new_message:   { icon: MessageSquare, bg: '#3b82f6', label: 'Message' },
  chat_invitation: { icon: MessageSquare, bg: '#3b82f6', label: 'Chat Invite' },
  mention:       { icon: AtSign,         bg: '#ef4444', label: 'Mention' },
  group_mention: { icon: AtSign,         bg: '#f97316', label: 'Group Mention' },
  announcement:  { icon: Megaphone,      bg: '#f59e0b', label: 'Announcement' },
  broadcast:     { icon: Radio,          bg: '#f59e0b', label: 'Broadcast' },
  task:          { icon: CheckSquare,    bg: '#10b981', label: 'Task' },
  task_assigned: { icon: CheckSquare,    bg: '#10b981', label: 'Task Assigned' },
  task_updated:  { icon: CheckSquare,    bg: '#059669', label: 'Task Updated' },
  meeting:       { icon: Calendar,       bg: '#8b5cf6', label: 'Meeting' },
  file:          { icon: Paperclip,      bg: '#06b6d4', label: 'File' },
  reaction:      { icon: Smile,          bg: '#f59e0b', label: 'Reaction' },
  group:         { icon: Users,          bg: '#ec4899', label: 'Group' },
  user_added:    { icon: UserPlus,       bg: '#10b981', label: 'Added to Group' },
  user_removed:  { icon: UserMinus,      bg: '#ef4444', label: 'Removed from Group' },
  system:        { icon: Zap,            bg: '#64748b', label: 'System' },
  leave:         { icon: ClipboardList,  bg: '#f97316', label: 'Leave' },
  attendance:    { icon: Clock,          bg: '#0ea5e9', label: 'Attendance' },
  payroll:       { icon: CreditCard,     bg: '#a855f7', label: 'Payroll' },
};

const getNotifConfig = (type) => TYPE_CONFIG[type] || { icon: Info, bg: '#64748b', label: 'Notification' };

const NotifIcon = ({ type, size = 15 }) => {
  const { icon: Icon, bg } = getNotifConfig(type);
  return (
    <div style={{
      width: 32, height: 32,
      borderRadius: 8,
      backgroundColor: bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      color: '#fff',
    }}>
      <Icon size={size} />
    </div>
  );
};

// ── TIME FORMAT ────────────────────────────────────────────────────────────────
const formatTime = (dateStr) => {
  if (!dateStr) return 'Just now';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Just now';
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const API_BASE = window.API_URL || 'http://localhost:5000';

// ── COMPONENT ─────────────────────────────────────────────────────────────────
const NotificationPanel = ({ notifications, onMarkAllRead, onClose, onOpenDrawer }) => {
  const navigate = useNavigate();
  const { token } = useApp();

  const handleNotificationClick = async (notif) => {
    onClose();

    // Mark as read in background (fire-and-forget)
    const notifId = notif.id || notif._id;
    if (notifId && !notif.isRead) {
      fetch(`${API_BASE}/api/v1/notifications/${notifId}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }

    // Navigate based on type
    const type = (notif.type || '').toLowerCase();
    const data = notif.data || {};

    if (type.includes('message') || type === 'mention' || type === 'group_mention' || type === 'chat_invitation') {
      navigate('/chat', { state: { conversationId: data.conversationId } });
    } else if (type.includes('task')) {
      navigate('/tasks');
    } else if (type === 'meeting') {
      navigate('/calendar');
    } else if (type === 'announcement' || type === 'broadcast') {
      navigate('/announcements');
    } else if (type.includes('group') || type.includes('user_added') || type.includes('user_removed')) {
      navigate('/chat', { state: { conversationId: data.conversationId } });
    } else if (type === 'reaction') {
      navigate('/chat', { state: { conversationId: data.conversationId } });
    } else {
      navigate('/notifications');
    }
  };

  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <div className="notif-panel" role="dialog" aria-label="Recent Notifications">
      {/* Header */}
      <div className="notif-panel-header">
        <span className="notif-panel-title">
          <Bell size={15} style={{ color: 'var(--color-primary, #d946ef)' }} />
          Notifications
        </span>
        {hasUnread && (
          <button className="notif-panel-btn" onClick={onMarkAllRead} title="Mark all as read">
            <CheckCheck size={13} />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* Notification list */}
      <div className="notif-list">
        {notifications.length > 0 ? (
          notifications.map((n) => {
            const notifId = n.id || n._id;
            return (
              <div
                key={notifId}
                className={`notif-item-wrapper${!n.isRead ? ' unread' : ''}${n.priority === 'high' ? ' priority-high' : ''}`}
                onClick={() => handleNotificationClick(n)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleNotificationClick(n)}
              >
                <NotifIcon type={n.type} />
                <div className="notif-item-content">
                  <h5 className="notif-item-title">{n.title}</h5>
                  <p className="notif-item-msg">{n.message}</p>
                  <div className="notif-item-footer">
                    <span className="notif-item-time">{formatTime(n.createdAt)}</span>
                    {!n.isRead && <span className="notif-item-dot" />}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="notif-empty-state">
            <Bell size={28} style={{ opacity: 0.2 }} />
            <span className="notif-empty-title">All Caught Up!</span>
            <span className="notif-empty-subtitle">No new notifications.</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="notif-panel-footer">
        <button
          className="notif-view-all"
          onClick={() => {
            onClose();
            if (onOpenDrawer) onOpenDrawer();
          }}
        >
          View all notifications &nbsp;
          <ArrowRight size={13} style={{ verticalAlign: 'middle' }} />
        </button>
      </div>
    </div>
  );
};

export default NotificationPanel;
