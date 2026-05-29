import React, { useState } from 'react';
import './Notifications.css';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import {
  Bell, CheckCheck, AlertTriangle, CheckCircle2, Info, XCircle,
  Filter, BellOff, Trash2, Clock
} from 'lucide-react';

const typeConfig = {
  success: { icon: CheckCircle2, color: '#10b981', variant: 'success', label: 'Success' },
  warning: { icon: AlertTriangle, color: '#f59e0b', variant: 'warning', label: 'Warning' },
  error: { icon: XCircle, color: '#ef4444', variant: 'danger', label: 'Error' },
  info: { icon: Info, color: '#3b82f6', variant: 'primary', label: 'Info' }
};

const NotificationItem = ({ notif, onRead, onDelete }) => {
  const config = typeConfig[notif.type] || typeConfig.info;
  const Icon = config.icon;

  return (
    <div
      className={`notif-item animate-fade-in ${!notif.read ? 'notif-unread' : ''}`}
      onClick={() => onRead(notif.id)}
    >
      <div className="notif-icon-wrap" style={{ background: `${config.color}20`, color: config.color }}>
        <Icon size={18} />
      </div>

      <div className="notif-content">
        <p className="notif-message">{notif.message}</p>
        <div className="notif-meta">
          <Clock size={11} />
          <span className="notif-time">{notif.timestamp}</span>
          <Badge variant={config.variant} style={{ marginLeft: 'auto' }}>{config.label}</Badge>
        </div>
      </div>

      <div className="notif-actions">
        {!notif.read && (
          <div className="notif-unread-dot" title="Unread" />
        )}
        <button
          className="notif-delete-btn"
          onClick={e => { e.stopPropagation(); onDelete(notif.id); }}
          title="Dismiss"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
};

const Notifications = () => {
  const { notifications, markNotificationRead, markAllNotificationsRead, addToast } = useApp();
  const [filter, setFilter] = useState('all');
  const [localNotifs, setLocalNotifs] = useState(null);

  const displayNotifs = localNotifs !== null ? localNotifs : notifications;
  const unreadCount = displayNotifs.filter(n => !n.read).length;

  const handleDelete = (id) => {
    const list = localNotifs !== null ? localNotifs : notifications;
    setLocalNotifs(list.filter(n => n.id !== id));
    addToast('info', 'Notification dismissed.');
  };

  const handleClearAll = () => {
    setLocalNotifs([]);
    addToast('info', 'All notifications cleared.');
  };

  const filtered = displayNotifs.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return true;
  });

  return (
    <div className="notifications-page">

      {/* Header */}
      <div className="notif-page-header card">
        <div className="notif-header-left">
          <div className="notif-header-icon">
            <Bell size={22} />
          </div>
          <div>
            <h2 className="notif-page-title">Notification Center</h2>
            <p className="notif-page-sub">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                : 'All caught up!'}
            </p>
          </div>
        </div>

        <div className="notif-header-actions">
          <Button
            variant="ghost"
            icon={CheckCheck}
            onClick={() => {
              markAllNotificationsRead();
              setLocalNotifs(prev => (prev || notifications).map(n => ({ ...n, read: true })));
            }}
            disabled={unreadCount === 0}
          >
            Mark All Read
          </Button>
          <Button
            variant="ghost"
            icon={Trash2}
            onClick={handleClearAll}
            disabled={displayNotifs.length === 0}
          >
            Clear All
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="notif-filter-bar card">
        {[
          { key: 'all', label: `All (${displayNotifs.length})` },
          { key: 'unread', label: `Unread (${unreadCount})` },
          { key: 'read', label: `Read (${displayNotifs.filter(n => n.read).length})` }
        ].map(f => (
          <button
            key={f.key}
            className={`notif-filter-btn ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}

        <div className="notif-type-filters">
          {Object.entries(typeConfig).map(([key, cfg]) => {
            const Icon = cfg.icon;
            return (
              <button
                key={key}
                className="notif-type-btn"
                style={{ color: cfg.color }}
                onClick={() => setFilter(key)}
                title={`Show ${cfg.label}`}
              >
                <Icon size={15} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Notification List */}
      <div className="card notif-list-container">
        {filtered.length > 0 ? (
          filtered.map(notif => (
            <NotificationItem
              key={notif.id}
              notif={notif}
              onRead={markNotificationRead}
              onDelete={handleDelete}
            />
          ))
        ) : (
          <div className="notif-empty">
            <BellOff size={48} className="notif-empty-icon" />
            <h3>No Notifications</h3>
            <p>
              {filter === 'unread'
                ? 'No unread notifications at this time.'
                : 'Your notification inbox is empty.'}
            </p>
          </div>
        )}
      </div>

    </div>
  );
};

export default Notifications;
