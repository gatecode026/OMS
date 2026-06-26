/**
 * @file NotificationBell.jsx
 * @description Enterprise Notification Bell — Top-bar entry point.
 *
 *   Features:
 *   • Live unread badge (Redis-first count)
 *   • Bell ring animation on new notification
 *   • Auto-sync on socket connect/reconnect (server-driven)
 *   • Dropdown quick-view panel
 *   • Full notification center drawer
 *   • Keyboard accessible (Enter/Space to toggle)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { getSocket } from '../../lib/socketManager';
import { useApp } from '../../context/AppContext';
import NotificationPanel from './NotificationPanel';
import NotificationDrawer from './NotificationDrawer';
import './NotificationComponents.css';

const API_BASE = window.API_URL || 'http://localhost:5000';

const NotificationBell = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isRinging, setIsRinging] = useState(false);

  const { token, currentUser } = useApp();
  const bellRef = useRef(null);

  // ── AUDIO CHIME ───────────────────────────────────────────────────────────
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
      playTone(1046.5, ctx.currentTime, 0.12);       // C6
      playTone(1318.51, ctx.currentTime + 0.08, 0.16); // E6
    } catch (err) {
      // AudioContext may be blocked before user interaction — safe to ignore
    }
  }, []);

  // ── BELL RING ANIMATION ───────────────────────────────────────────────────
  const triggerBellRing = useCallback(() => {
    setIsRinging(true);
    const t = setTimeout(() => setIsRinging(false), 700);
    return () => clearTimeout(t);
  }, []);

  // ── API HELPERS ───────────────────────────────────────────────────────────
  const fetchUnreadCount = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (result.status === 'success' && result.data) {
        setUnreadCount(result.data.count ?? 0);
      }
    } catch (err) {
      // Non-critical — silently fail
    }
  }, [token]);

  const fetchRecentNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/notifications?limit=5`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (result.status === 'success' && result.data) {
        setNotifications(result.data.notifications || []);
      }
    } catch (err) {
      // Non-critical
    }
  }, [token]);

  // ── MARK ALL AS READ ──────────────────────────────────────────────────────
  const handleMarkAllRead = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (result.status === 'success') {
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        const socket = getSocket();
        socket?.emit('notification:opened');
      }
    } catch (err) {
      console.error('[NotificationBell] Mark all read failed:', err);
    }
  }, [token]);

  // ── INITIAL LOAD ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (token) {
      fetchUnreadCount();
      fetchRecentNotifications();
    }
  }, [token, fetchUnreadCount, fetchRecentNotifications]);

  // ── SOCKET LISTENERS ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    const socket = getSocket();
    if (!socket) return;

    /**
     * New notification arrived in real-time.
     * Increment badge, prepend to list, animate bell.
     */
    const handleNewNotification = (notif) => {
      setUnreadCount((prev) => prev + 1);
      setNotifications((prev) => {
        const merged = [notif, ...prev];
        // Deduplicate by id
        const seen = new Set();
        return merged.filter((n) => {
          const id = n.id || n._id;
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        }).slice(0, 5);
      });
      triggerBellRing();
      playNotificationChime();
    };

    /**
     * Server pushes authoritative unread count
     * (on connect, after mark-read via REST on another tab, etc.)
     */
    const handleUnreadCount = ({ count }) => {
      setUnreadCount(typeof count === 'number' ? count : 0);
    };

    /**
     * Server confirms all-read reset.
     */
    const handleUnreadReset = () => {
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    };

    /**
     * Server pushes missed notifications from Redis queue on reconnect.
     * Client deduplicates by id.
     */
    const handleSync = (missedNotifs) => {
      if (!missedNotifs || missedNotifs.length === 0) return;

      setNotifications((prev) => {
        const merged = [...missedNotifs, ...prev];
        const seen = new Set();
        return merged.filter((n) => {
          const id = n.id || n._id;
          if (!id || seen.has(id)) return false;
          seen.add(id);
          return true;
        }).slice(0, 5);
      });
    };

    socket.on('notification:new', handleNewNotification);
    socket.on('notification:unread_count', handleUnreadCount);
    socket.on('notification:unread_reset', handleUnreadReset);
    socket.on('notification:sync', handleSync);

    // On reconnect: re-fetch count as a safety fallback
    const handleReconnect = () => {
      fetchUnreadCount();
    };
    socket.on('connect', handleReconnect);

    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.off('notification:unread_count', handleUnreadCount);
      socket.off('notification:unread_reset', handleUnreadReset);
      socket.off('notification:sync', handleSync);
      socket.off('connect', handleReconnect);
    };
  }, [currentUser, triggerBellRing, playNotificationChime, fetchUnreadCount]);

  // ── CLICK OUTSIDE ─────────────────────────────────────────────────────────
  useEffect(() => {
    const clickOutside = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  // ── KEYBOARD ──────────────────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') setPanelOpen(false);
  };

  // ── TOGGLE PANEL ──────────────────────────────────────────────────────────
  const handleTogglePanel = () => {
    const willOpen = !panelOpen;
    setPanelOpen(willOpen);

    if (willOpen) {
      // Reset badge when opening
      setUnreadCount(0);
      fetchRecentNotifications();
      // Notify server to reset Redis counter
      const socket = getSocket();
      socket?.emit('notification:opened');
    }
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
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
          notifications={notifications}
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
