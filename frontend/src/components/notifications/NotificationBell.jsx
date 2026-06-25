import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckSquare } from 'lucide-react';
import { getSocket } from '../../lib/socketManager';
import { useApp } from '../../context/AppContext';
import NotificationPanel from './NotificationPanel';
import NotificationDrawer from './NotificationDrawer';
import './NotificationComponents.css';

const NotificationBell = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { token, currentUser } = useApp();
  const bellRef = useRef(null);

  const playNotificationChime = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const playTone = (freq, startTime, duration, vol = 0.1) => {
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
      playTone(1046.50, ctx.currentTime, 0.12); // C6
      playTone(1318.51, ctx.currentTime + 0.08, 0.16); // E6
    } catch (err) {
      console.warn('[NotificationBell] Failed to play chime:', err);
    }
  };

  const fetchUnreadCount = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/notifications/unread-count`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.status === 'success' && result.data) {
        setUnreadCount(result.data.count);
      }
    } catch (err) {
      console.error('[NotificationBell] Failed to fetch unread count:', err);
    }
  };

  const fetchRecentNotifications = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/notifications?limit=5`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.status === 'success' && result.data) {
        setNotifications(result.data.notifications || []);
      }
    } catch (err) {
      console.error('[NotificationBell] Failed to fetch recent notifications:', err);
    }
  };

  // Sync / mark all as read
  const handleMarkAllRead = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/notifications/read-all`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.status === 'success') {
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        
        // Notify socket
        const socket = getSocket();
        socket?.emit('notification:opened');
      }
    } catch (err) {
      console.error('[NotificationBell] Mark all read failed:', err);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    fetchRecentNotifications();
  }, [token]);

  // Socket connection and listener registry
  useEffect(() => {
    if (!currentUser) return;
    const socket = getSocket();
    if (!socket) return;

    const handleNewNotification = (notif) => {
      setUnreadCount(prev => prev + 1);
      setNotifications(prev => [notif, ...prev.slice(0, 4)]);
      playNotificationChime();
    };

    const handleUnreadCount = ({ count }) => {
      setUnreadCount(count);
    };

    const handleUnreadReset = () => {
      setUnreadCount(0);
    };

    const handleSync = (missedNotifs) => {
      if (missedNotifs && missedNotifs.length > 0) {
        setNotifications(prev => {
          const merged = [...missedNotifs, ...prev];
          const unique = Array.from(new Map(merged.map(item => [item.id || item._id, item])).values());
          return unique.slice(0, 5);
        });
        setUnreadCount(prev => prev + missedNotifs.length);
      }
    };

    socket.on('notification:new', handleNewNotification);
    socket.on('notification:unread_count', handleUnreadCount);
    socket.on('notification:unread_reset', handleUnreadReset);
    socket.on('notification:sync', handleSync);

    // Auto-sync offline notifications on connect/reconnect
    socket.emit('notification:sync');

    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.off('notification:unread_count', handleUnreadCount);
      socket.off('notification:unread_reset', handleUnreadReset);
      socket.off('notification:sync', handleSync);
    };
  }, [currentUser]);

  // Click outside listener
  useEffect(() => {
    const clickOutside = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  const handleTogglePanel = () => {
    setPanelOpen(!panelOpen);
    if (!panelOpen) {
      // Mark as opened to reset unread count when opening panel
      const socket = getSocket();
      socket?.emit('notification:opened');
      setUnreadCount(0);
      fetchRecentNotifications();
    }
  };

  return (
    <div className="notif-bell-container" ref={bellRef}>
      <button className="notif-bell-btn" onClick={handleTogglePanel} title="Notifications">
        <Bell size={20} />
        {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
      </button>

      {panelOpen && (
        <NotificationPanel
          notifications={notifications}
          onMarkAllRead={handleMarkAllRead}
          onClose={() => setPanelOpen(false)}
          onOpenDrawer={() => setDrawerOpen(true)}
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
