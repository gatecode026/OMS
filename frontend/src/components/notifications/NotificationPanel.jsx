import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  MessageSquare, AtSign, Megaphone, CheckSquare, Calendar,
  Paperclip, Users, Info, Bell, CheckCheck, ArrowRight,
  Smile, Radio, UserPlus, UserMinus, Zap, ClipboardList, CreditCard, Clock
} from 'lucide-react';
import './NotificationComponents.css';
import { decodeHTMLEntities } from '../../utils/stringUtils';

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

const getNotificationGroup = (dateStr) => {
  if (!dateStr) return 'Earlier';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Earlier';
  
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  
  const isSameDay = (d1, d2) => 
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
    
  if (isSameDay(date, today)) return 'Today';
  if (isSameDay(date, yesterday)) return 'Yesterday';
  return 'Earlier';
};

// ── COMPONENT ─────────────────────────────────────────────────────────────────
const NotificationPanel = ({ notifications, onMarkAllRead, onClose, onOpenDrawer }) => {
  const navigate = useNavigate();
  const { markNotificationRead } = useApp();

  const handleNotificationClick = async (notif) => {
    onClose();

    // Mark as read in context (updates local and calls backend PATCH)
    const notifId = notif.id || notif._id;
    if (notifId && !notif.isRead) {
      if (markNotificationRead) {
        await markNotificationRead(notifId);
      }
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
      navigate('/notifications', { state: { selectedNotifId: notifId } });
    }
  };

  const hasUnread = notifications.some((n) => !n.isRead);

  const grouped = React.useMemo(() => {
    const sections = {
      Unread: [],
      Today: [],
      Yesterday: [],
      Earlier: []
    };
    notifications.forEach(n => {
      if (!n.isRead) {
        sections.Unread.push(n);
      } else {
        const grp = getNotificationGroup(n.createdAt);
        sections[grp].push(n);
      }
    });
    return sections;
  }, [notifications]);

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
      <div className="notif-list" style={{ maxHeight: '360px', overflowY: 'auto' }}>
        {notifications.length > 0 ? (
          Object.entries(grouped).map(([sectionName, items]) => {
            if (items.length === 0) return null;
            return (
              <div key={sectionName} className="notif-section" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="notif-section-header" style={{
                  padding: '6px 16px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--text-muted, #94a3b8)',
                  backgroundColor: 'rgba(148, 163, 184, 0.06)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                  letterSpacing: '0.05em'
                }}>
                  {sectionName}
                </div>
                {items.map((n) => {
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
                        <h5 className="notif-item-title" style={{ fontWeight: !n.isRead ? 700 : 500 }}>{n.title}</h5>
                        <p className="notif-item-msg">{decodeHTMLEntities(n.message)}</p>
                        <div className="notif-item-footer">
                          <span className="notif-item-time">{formatTime(n.createdAt)}</span>
                          {!n.isRead && <span className="notif-item-dot" style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: '#3b82f6',
                            display: 'inline-block'
                          }} />}
                        </div>
                      </div>
                    </div>
                  );
                })}
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
