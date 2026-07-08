import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckSquare, Calendar, DollarSign, Settings, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

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

const NotificationsCenter = ({
  notifications = []
}) => {
  const navigate = useNavigate();
  const { markAllNotificationsRead, markNotificationRead, addToast, currentUser, currentUserRole } = useApp();
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = ['All', 'Task', 'Attendance', 'Leave', 'Payroll', 'System'];

  const handleCategoryClick = (cat) => {
    setActiveCategory(cat);
  };

  const getNotificationIcon = (type, message = '') => {
    const msg = message.toLowerCase();
    if (msg.includes('task') || msg.includes('tsk')) return <CheckSquare className="text-primary-500" size={16} />;
    if (msg.includes('leave')) return <Calendar className="text-purple" size={16} />;
    if (msg.includes('payroll') || msg.includes('salary') || msg.includes('payslip')) return <DollarSign className="text-success" size={16} />;
    if (msg.includes('attendance') || msg.includes('punch') || msg.includes('late')) return <AlertTriangle className="text-warning" size={16} />;
    
    if (type === 'warning') return <AlertTriangle className="text-warning" size={16} />;
    if (type === 'error') return <AlertTriangle className="text-danger" size={16} />;
    if (type === 'success') return <CheckCircle className="text-success" size={16} />;
    return <Info className="text-info" size={16} />;
  };

  const matchesCategory = (notif, cat) => {
    if (cat === 'All') return true;
    const msg = notif.message.toLowerCase();
    if (cat === 'Task') return msg.includes('task') || msg.includes('tsk');
    if (cat === 'Leave') return msg.includes('leave');
    if (cat === 'Payroll') return msg.includes('payroll') || msg.includes('salary') || msg.includes('payslip');
    if (cat === 'Attendance') return msg.includes('attendance') || msg.includes('punch') || msg.includes('late');
    if (cat === 'System') {
      return !msg.includes('task') && !msg.includes('tsk') && !msg.includes('leave') && !msg.includes('payroll') && !msg.includes('salary') && !msg.includes('payslip') && !msg.includes('attendance') && !msg.includes('punch') && !msg.includes('late');
    }
    return true;
  };

  const getFilteredNotifications = () => {
    const isAdminRole = ['super_admin', 'company_admin', 'branch_admin', 'dept_admin', 'manager', 'team_leader'].includes(currentUserRole);
    return notifications.filter(n => {
      const recipientId   = n.recipientId || n.targetUserId || n.forUserId || n.userId;
      const recipientRole = (n.recipientRole || n.targetRole || n.recipientType || '').toLowerCase();
      const msg = (n.message || n.title || '').toLowerCase();

      // Rule 1: specific user
      if (recipientId) return recipientId === currentUser?.id;

      // Rule 2 — explicitly tagged as employee-only or staff
      if (recipientRole === 'employee' || recipientRole === 'employees' || recipientRole === 'all employees' || recipientRole === 'staff') {
        return ['employee', 'team_leader', 'manager', 'hr', 'dept_admin', 'branch_admin', 'company_admin'].includes(currentUserRole);
      }

      // Rule 3: admin-only
      if (recipientRole === 'admin' || recipientRole === 'super_admin' || recipientRole === 'manager' || recipientRole === 'team_leader') return isAdminRole;

      // Rule 4: global / broadcast notification (recipientRole is 'all', 'everyone', or empty)
      if (recipientRole === 'all' || recipientRole === 'everyone' || !recipientRole) {
        // If it's an employee-personal message, show to any non-super_admin staff user
        const isPersonalEmployeeMsg =
          msg.startsWith('your ') ||
          msg.includes('your leave') ||
          msg.includes('your request') ||
          msg.includes('your attendance') ||
          msg.includes('has been approved') ||
          msg.includes('has been rejected') ||
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
    });
  };

  const myNotifications = getFilteredNotifications();
  const filteredNotifs = myNotifications.filter(n => matchesCategory(n, activeCategory));

  return (
    <div className="dashboard-widget">
      <div className="widget-header">
        <h3>Notifications Center</h3>
        <button
          onClick={() => navigate('/notifications')}
          className="text-xs text-primary-500 hover:text-primary-400 font-semibold"
        >
          View All
        </button>
      </div>
      <div className="widget-content flex-column gap-3">
        {/* Category Chips */}
        <div className="flex-row gap-2 flex-wrap pb-2 border-b border-border">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              className={`notif-filter-btn ${activeCategory === cat ? 'active' : ''}`}
              style={{ fontSize: '0.72rem', padding: '4px 8px' }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Notification List (max 5) */}
        <div className="flex-column">
          {filteredNotifs.slice(0, 5).map((notif) => (
            <div
              key={notif.id}
              onClick={() => {
                const notifId = notif.id || notif._id;
                if (notifId) {
                  markNotificationRead(notifId);
                  
                  const type = (notif.type || '').toLowerCase();
                  const category = (notif.category || '').toLowerCase();
                  const msg = (notif.message || '').toLowerCase();
                  const title = (notif.title || '').toLowerCase();
                  const data = notif.data || {};

                  if (type === 'leave' || category === 'leave' || msg.includes('leave') || title.includes('leave')) {
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
                  } else if (type === 'announcement' || type === 'broadcast' || category === 'announcement' || category === 'broadcast') {
                    navigate('/announcements');
                  } else {
                    // Fallback: redirect to the main notification page
                    navigate('/notifications', { state: { selectedNotifId: notifId } });
                  }
                }
              }}
              className="flex-row align-start gap-3 py-3 border-b border-border cursor-pointer hover:bg-surface rounded px-2"
              style={{ borderBottom: '1px solid var(--border-color)', padding: '12px 8px' }}
            >
              <div className="activity-icon-container" style={{ marginTop: '2px' }}>
                {getNotificationIcon(notif.type, notif.message)}
              </div>
              <div className="flex-column flex-1">
                <span className={`text-sm ${!notif.read ? 'bold-text' : 'text-text-muted'}`} style={{ color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  {notif.message}
                </span>
                <span className="text-xs text-text-muted mt-2" style={{ display: 'block', marginTop: '6px' }}>{formatNotificationTime(notif)}</span>
              </div>
              {!notif.read && (
                <span 
                  className="flex-shrink-0" 
                  style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', marginTop: '6px' }} 
                />
              )}
            </div>
          ))}

          {filteredNotifs.length === 0 && (
            <div className="text-center text-text-muted py-4">No notifications in this category.</div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex-row gap-3 mt-1 flex-wrap">
          <button
            onClick={() => navigate('/notifications')}
            className="flex-1 padding-2 text-xs bold-text bg-surface border-border text-primary-500 hover:text-primary-400 rounded flex-center gap-1 transition-all"
            style={{ cursor: 'pointer' }}
          >
            View All Notifications
          </button>
          <button
            onClick={markAllNotificationsRead}
            className="flex-1 padding-2 text-xs bold-text bg-surface border-border text-primary-500 hover:text-primary-400 rounded flex-center gap-1 transition-all"
            style={{ cursor: 'pointer' }}
          >
            Mark as Read
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationsCenter;
