import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  MessageSquare, AtSign, Megaphone, CheckSquare, Calendar,
  Paperclip, Users, Info, Bell, CheckCheck, ArrowRight
} from 'lucide-react';
import './NotificationComponents.css';

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
      return <div style={{ ...styles, backgroundColor: '#3b82f6' }}><MessageSquare size={16} /></div>;
    case 'mention':
      return <div style={{ ...styles, backgroundColor: '#ef4444' }}><AtSign size={16} /></div>;
    case 'announcement':
    case 'broadcast':
      return <div style={{ ...styles, backgroundColor: '#f59e0b' }}><Megaphone size={16} /></div>;
    case 'task':
    case 'task_assigned':
    case 'task_updated':
      return <div style={{ ...styles, backgroundColor: '#10b981' }}><CheckSquare size={16} /></div>;
    case 'meeting':
      return <div style={{ ...styles, backgroundColor: '#8b5cf6' }}><Calendar size={16} /></div>;
    case 'file':
      return <div style={{ ...styles, backgroundColor: '#06b6d4' }}><Paperclip size={16} /></div>;
    case 'group':
      return <div style={{ ...styles, backgroundColor: '#ec4899' }}><Users size={16} /></div>;
    default:
      return <div style={{ ...styles, backgroundColor: '#64748b' }}><Info size={16} /></div>;
  }
};

const formatNotificationTime = (dateStr) => {
  if (!dateStr) return 'Just now';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const NotificationPanel = ({ notifications, onMarkAllRead, onClose }) => {
  const navigate = useNavigate();
  const { token } = useApp();

  const handleNotificationClick = async (notif) => {
    onClose();
    
    // Mark as read in background
    const notifId = notif.id || notif._id;
    if (notifId && !notif.isRead) {
      try {
        await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/notifications/${notifId}/read`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (err) {
        console.error('[NotificationPanel] Failed to mark read:', err);
      }
    }

    // Direct routing based on category/type
    const type = notif.type.toLowerCase();
    const data = notif.data || {};

    if (type.includes('message') || type.includes('chat') || type === 'mention') {
      navigate('/chat', { state: { conversationId: data.conversationId } });
    } else if (type.includes('task')) {
      navigate('/tasks');
    } else if (type.includes('meeting') || type.includes('calendar')) {
      navigate('/calendar');
    } else if (type.includes('announcement') || type.includes('broadcast')) {
      navigate('/announcements');
    } else if (type.includes('leave')) {
      navigate('/leaves');
    } else if (type.includes('payroll')) {
      navigate('/payroll');
    } else {
      navigate('/notifications');
    }
  };

  return (
    <div className="notif-panel">
      <div className="notif-panel-header">
        <span className="notif-panel-title">Recent Notifications</span>
        {notifications.some(n => !n.isRead) && (
          <button className="notif-panel-btn" onClick={onMarkAllRead}>
            <CheckCheck size={14} />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      <div className="notif-list">
        {notifications.length > 0 ? (
          notifications.map(n => {
            const notifId = n.id || n._id;
            return (
              <div
                key={notifId}
                className={`notif-item-wrapper ${!n.isRead ? 'unread' : ''}`}
                onClick={() => handleNotificationClick(n)}
              >
                {getNotifIcon(n.type)}
                <div className="notif-item-content">
                  <h5 className="notif-item-title">{n.title}</h5>
                  <p className="notif-item-msg">{n.message}</p>
                  <div className="notif-item-footer">
                    <span className="notif-item-time">{formatNotificationTime(n.createdAt)}</span>
                    {!n.isRead && <span className="notif-item-dot"></span>}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="notif-empty-state">
            <Bell size={28} />
            <span className="notif-empty-title">All Caught Up!</span>
            <span className="notif-empty-subtitle">You have no new notifications.</span>
          </div>
        )}
      </div>

      <div className="notif-panel-footer">
        <button 
          className="notif-view-all" 
          onClick={() => {
            onClose();
            onOpenDrawer();
          }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <span>View all notifications</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default NotificationPanel;
