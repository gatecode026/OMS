import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Bell } from 'lucide-react';
import { getSocket } from '../../lib/socketManager';
import { useApp } from '../../context/AppContext';
import NotificationPanel from './NotificationPanel';
import NotificationDrawer from './NotificationDrawer';
import './NotificationComponents.css';

const NotificationBell = () => {
  const [panelOpen, setPanelOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  
  const {
    token,
    currentUser,
    notifications: apiNotifications = [],
    fetchNotifications,
    markAllNotificationsRead,
  } = useApp();

  const [unreadCount, setUnreadCount] = useState(0);
  const bellRef = useRef(null);

  // Sync and update unread count whenever apiNotifications changes
  useEffect(() => {
    if (!currentUser?.id) return;
    const lastOpenedStr = localStorage.getItem(`last_opened_notifications:${currentUser.id}`);
    const lastOpened = lastOpenedStr ? new Date(lastOpenedStr) : new Date(0);

    const count = apiNotifications.filter(n => {
      if (n.isRead || n.read) return false;
      const created = new Date(n.createdAt || n.time || Date.now());
      return created > lastOpened;
    }).length;

    setUnreadCount(count);
  }, [apiNotifications, currentUser]);

  // ── AUDIO CHIME ──────────────────────────────────────────────────────────
  const playNotificationChime = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const playTone = (freq, startTime, duration, vol = 0.08) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(vol, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      playTone(1046.5, ctx.currentTime, 0.12);
      playTone(1318.51, ctx.currentTime + 0.08, 0.16);
    } catch (err) {}
  }, []);

  const triggerBellRing = useCallback(() => {
    setIsRinging(true);
    const t = setTimeout(() => setIsRinging(false), 700);
    return () => clearTimeout(t);
  }, []);

  // ── FILTER AND SORT NOTIFICATIONS ─────────────────────────────────────────
  const allNotifications = useMemo(() => {
    const seen = new Set();
    return apiNotifications
      .filter(n => {
        const id = n.id || n._id;
        if (!id) return false;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .map(n => ({
        ...n,
        isRead: n.isRead || n.read || false,
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [apiNotifications]);

  // ── MARK ALL READ ─────────────────────────────────────────────────────────
  const handleMarkAllRead = useCallback(async () => {
    if (markAllNotificationsRead) {
      await markAllNotificationsRead();
    }
  }, [markAllNotificationsRead]);

  // ── SOCKET LISTENERS ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    const socket = getSocket();
    if (!socket) return;

    const handleNewNotification = (notif) => {
      if (fetchNotifications) fetchNotifications();
      triggerBellRing();
      playNotificationChime();
    };

    const handleSync = (missedNotifs) => {
      if (fetchNotifications) fetchNotifications();
    };

    const handleUnreadCount = (data) => {
      if (data && typeof data.count === 'number') {
        setUnreadCount(data.count);
      }
    };

    const handleUnreadReset = () => {
      setUnreadCount(0);
    };

    socket.on('notification:new', handleNewNotification);
    socket.on('notification:sync', handleSync);
    socket.on('notification:unread_count', handleUnreadCount);
    socket.on('notification:unread_reset', handleUnreadReset);

    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.off('notification:sync', handleSync);
      socket.off('notification:unread_count', handleUnreadCount);
      socket.off('notification:unread_reset', handleUnreadReset);
    };
  }, [currentUser, fetchNotifications, triggerBellRing, playNotificationChime]);

  // ── CLICK OUTSIDE ────────────────────────────────────────────────────────
  useEffect(() => {
    const clickOutside = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') setPanelOpen(false);
  };

  const handleTogglePanel = () => {
    const willOpen = !panelOpen;
    setPanelOpen(willOpen);
    if (willOpen) {
      if (fetchNotifications) fetchNotifications();
      const socket = getSocket();
      socket?.emit('notification:opened');

      if (currentUser?.id) {
        localStorage.setItem(`last_opened_notifications:${currentUser.id}`, new Date().toISOString());
        setUnreadCount(0);
      }
    }
  };

  return (
    <div className="notif-bell-container" ref={bellRef} onKeyDown={handleKeyDown}>
      <button
        className={`notif-bell-btn${isRinging ? ' notif-bell-ring' : ''}`}
        onClick={handleTogglePanel}
        title="Notifications"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={panelOpen}
        aria-haspopup="dialog"
      >
        <Bell size={20} className="notif-bell-icon" />
        {unreadCount > 0 && (
          <span className="notif-badge" aria-hidden="true">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {panelOpen && (
        <NotificationPanel
          notifications={allNotifications.slice(0, 10)}
          onMarkAllRead={handleMarkAllRead}
          onClose={() => setPanelOpen(false)}
          onOpenDrawer={() => {
            setPanelOpen(false);
            setDrawerOpen(true);
          }}
        />
      )}

      <NotificationDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
};

export default NotificationBell;
