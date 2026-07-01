/**
 * @file NotificationBell.jsx
 * @description Enterprise Notification Bell — derives live notifications
 *   from AppContext data (leaves, tasks, payroll, projects) when the
 *   backend API returns empty results.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Bell } from 'lucide-react';
import { getSocket } from '../../lib/socketManager';
import { useApp } from '../../context/AppContext';
import NotificationPanel from './NotificationPanel';
import NotificationDrawer from './NotificationDrawer';
import './NotificationComponents.css';

const API_BASE = window.API_URL || 'http://localhost:5000';

// ── DERIVE NOTIFICATIONS FROM APP DATA ────────────────────────────────────────
const deriveAppNotifications = ({ currentUser, currentUserRole, leaveRequests, projectsList, payroll, tasks }) => {
  const notifications = [];

  if (!currentUser) return notifications;

  // ── 1. PENDING LEAVE REQUESTS (for admins / managers) ─────────────────────
  if (currentUserRole !== 'employee') {
    const pendingLeaves = (leaveRequests || []).filter(l => l.status === 'Pending');
    pendingLeaves.slice(0, 3).forEach(leave => {
      notifications.push({
        id: `leave-${leave.id || leave._id}`,
        type: 'system',
        title: 'Leave Request Pending',
        message: `${leave.employeeName || leave.name || 'An employee'} requested ${leave.leaveType || 'leave'} (${leave.startDate || ''} – ${leave.endDate || ''})`,
        isRead: false,
        priority: 'high',
        createdAt: leave.appliedDate || leave.createdAt || new Date().toISOString(),
        category: 'system',
      });
    });
  }

  // ── 2. MY OWN PENDING LEAVE (employee) ────────────────────────────────────
  if (currentUserRole === 'employee') {
    const myLeaves = (leaveRequests || []).filter(
      l => l.employeeId === currentUser.id ||
           l.employeeName?.toLowerCase() === currentUser.name?.toLowerCase()
    );
    myLeaves.filter(l => l.status === 'Pending').slice(0, 2).forEach(leave => {
      notifications.push({
        id: `myleave-${leave.id || leave._id}`,
        type: 'system',
        title: 'Leave Request Submitted',
        message: `Your ${leave.leaveType || 'leave'} request is pending approval`,
        isRead: false,
        priority: 'normal',
        createdAt: leave.appliedDate || leave.createdAt || new Date().toISOString(),
        category: 'system',
      });
    });
    // Approved / Rejected feedback
    myLeaves.filter(l => l.status === 'Approved' || l.status === 'Rejected').slice(0, 1).forEach(leave => {
      notifications.push({
        id: `myleave-result-${leave.id || leave._id}`,
        type: 'system',
        title: `Leave ${leave.status}`,
        message: `Your ${leave.leaveType || 'leave'} from ${leave.startDate || ''} to ${leave.endDate || ''} has been ${leave.status?.toLowerCase()}`,
        isRead: false,
        priority: leave.status === 'Rejected' ? 'high' : 'normal',
        createdAt: leave.updatedAt || new Date().toISOString(),
        category: 'system',
      });
    });
  }

  // ── 3. OVERDUE TASKS ASSIGNED TO ME ───────────────────────────────────────
  const allProjTasks = (projectsList || []).flatMap(p =>
    (p.tasks || []).map(t => ({ ...t, project: p.name }))
  );
  const myTasks = allProjTasks.filter(t =>
    t.assigneeId === currentUser.id ||
    t.assigneeName?.toLowerCase() === currentUser.name?.toLowerCase()
  );
  const overdueTasks = myTasks.filter(t => {
    if (t.status === 'Done' || t.completed) return false;
    if (!t.dueDate) return false;
    return new Date(t.dueDate) < new Date();
  });
  overdueTasks.slice(0, 2).forEach(task => {
    notifications.push({
      id: `task-overdue-${task.id}`,
      type: 'task',
      title: 'Task Overdue',
      message: `"${task.title}" in ${task.project} is past its due date`,
      isRead: false,
      priority: 'high',
      createdAt: task.dueDate ? new Date(task.dueDate).toISOString() : new Date().toISOString(),
      category: 'task',
    });
  });

  // ── 4. TASKS IN REVIEW (awaiting my approval) ─────────────────────────────
  if (['manager', 'team_leader', 'company_admin', 'super_admin', 'dept_admin'].includes(currentUserRole)) {
    const pendingApproval = allProjTasks.filter(t => {
      if (t.completed || t.status === 'Done') return false;
      return (t.approvals || []).some(a =>
        a.approverName?.toLowerCase() === currentUser.name?.toLowerCase() &&
        a.status === 'Pending'
      );
    });
    pendingApproval.slice(0, 2).forEach(task => {
      notifications.push({
        id: `task-approve-${task.id}`,
        type: 'task_assigned',
        title: 'Task Needs Your Approval',
        message: `"${task.title}" in ${task.project} is waiting for your approval`,
        isRead: false,
        priority: 'high',
        createdAt: new Date().toISOString(),
        category: 'task',
      });
    });
  }

  // ── 5. TASKS IN REVIEW — MY OWN TASK SUBMITTED ────────────────────────────
  if (currentUserRole === 'employee') {
    const inReview = myTasks.filter(t => t.status === 'In Review' && !t.completed);
    inReview.slice(0, 1).forEach(task => {
      notifications.push({
        id: `task-review-${task.id}`,
        type: 'task',
        title: 'Task In Review',
        message: `"${task.title}" in ${task.project} is being reviewed by Team Leader`,
        isRead: false,
        priority: 'normal',
        createdAt: new Date().toISOString(),
        category: 'task',
      });
    });
  }

  // ── 6. PAYROLL PENDING (employee) ─────────────────────────────────────────
  if (currentUserRole === 'employee' && payroll?.length) {
    const myPayroll = payroll.filter(p =>
      p.employeeId === currentUser.id ||
      p.employeeName?.toLowerCase() === currentUser.name?.toLowerCase()
    );
    const unpaid = myPayroll.filter(p =>
      p.status?.toLowerCase() === 'pending' || p.status?.toLowerCase() === 'unpaid'
    );
    unpaid.slice(0, 1).forEach(p => {
      notifications.push({
        id: `payroll-${p.id || p._id || p.month}`,
        type: 'system',
        title: 'Salary Pending',
        message: `Your salary for ${p.month || p.period || 'this month'} is pending`,
        isRead: false,
        priority: 'high',
        createdAt: new Date().toISOString(),
        category: 'system',
      });
    });
  }

  // ── 7. PROJECT DEADLINE WARNING ───────────────────────────────────────────
  const myProjects = (projectsList || []).filter(p =>
    p.manager?.toLowerCase() === currentUser.name?.toLowerCase() ||
    p.leader?.toLowerCase() === currentUser.name?.toLowerCase() ||
    (p.members || []).some(m => m?.toLowerCase() === currentUser.name?.toLowerCase())
  );
  const nearDeadline = myProjects.filter(p => {
    if (p.status === 'Completed') return false;
    if (!p.deadline) return false;
    const diffDays = (new Date(p.deadline) - new Date()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 3;
  });
  nearDeadline.slice(0, 2).forEach(p => {
    const daysLeft = Math.ceil((new Date(p.deadline) - new Date()) / (1000 * 60 * 60 * 24));
    notifications.push({
      id: `project-deadline-${p.id}`,
      type: 'system',
      title: 'Project Deadline Soon',
      message: `"${p.name}" is due on ${p.deadline} — ${daysLeft} day(s) left`,
      isRead: false,
      priority: 'high',
      createdAt: new Date().toISOString(),
      category: 'system',
    });
  });

  // Sort: high priority first
  return notifications.sort((a, b) => {
    if (a.priority === 'high' && b.priority !== 'high') return -1;
    if (b.priority === 'high' && a.priority !== 'high') return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
};

// ── COMPONENT ─────────────────────────────────────────────────────────────────
const NotificationBell = () => {
  const [panelOpen, setPanelOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const [socketNotifications, setSocketNotifications] = useState([]);
  const [readIds, setReadIds] = useState(new Set());

  const {
    token,
    currentUser,
    currentUserRole,
    leaveRequests,
    projectsList,
    payroll,
    tasks,
    notifications: apiNotifications = [],
    fetchNotifications,
    markAllNotificationsRead,
  } = useApp();

  const bellRef = useRef(null);
  const prevDerivedCountRef = useRef(0);

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

  // ── DERIVED NOTIFICATIONS ─────────────────────────────────────────────────
  const derivedNotifications = useMemo(() => {
    return deriveAppNotifications({
      currentUser,
      currentUserRole,
      leaveRequests,
      projectsList,
      payroll,
      tasks,
    });
  }, [currentUser, currentUserRole, leaveRequests, projectsList, payroll, tasks]);

  // Ring when derived count increases
  useEffect(() => {
    if (derivedNotifications.length > prevDerivedCountRef.current && prevDerivedCountRef.current > 0) {
      triggerBellRing();
    }
    prevDerivedCountRef.current = derivedNotifications.length;
  }, [derivedNotifications.length, triggerBellRing]);

  // ── MERGE ALL NOTIFICATIONS ───────────────────────────────────────────────
  const getFilteredNotifications = useCallback((list) => {
    if (!currentUser) return [];
    const isAdminRole = ['super_admin', 'admin', 'branch_admin'].includes(currentUserRole);

    return list.filter(n => {
      const recipientId   = n.recipientId || n.targetUserId || n.forUserId || n.userId;
      const recipientRole = (n.recipientRole || n.targetRole || n.recipientType || '').toLowerCase();
      const msg = (n.message || n.title || '').toLowerCase();

      if (recipientId) {
        return recipientId === currentUser?.id;
      }

      if (recipientRole === 'employee' || recipientRole === 'employees' || recipientRole === 'all employees' || recipientRole === 'staff') {
        return ['employee', 'team_leader', 'manager', 'hr', 'dept_admin', 'branch_admin', 'company_admin'].includes(currentUserRole);
      }

      if (recipientRole === 'admin' || recipientRole === 'super_admin' || recipientRole === 'manager' || recipientRole === 'team_leader') {
        return isAdminRole;
      }

      if (recipientRole === 'all' || recipientRole === 'everyone' || !recipientRole) {
        const isPersonalEmployeeMsg =
          msg.startsWith('your ') ||
          msg.includes('your leave') ||
          msg.includes('your request') ||
          msg.includes('your attendance') ||
          msg.includes('has been approved') ||
          msg.includes('has been rejected') ||
          msg.includes('has been rejected -') ||
          msg.includes('note: approved') ||
          msg.includes('note: rejected');

        if (isPersonalEmployeeMsg) {
          return ['employee', 'team_leader', 'manager', 'hr', 'dept_admin', 'branch_admin', 'company_admin'].includes(currentUserRole);
        }

        return true;
      }

      return recipientRole === currentUserRole?.toLowerCase();
    });
  }, [currentUser, currentUserRole]);

  // ── MERGE ALL NOTIFICATIONS ───────────────────────────────────────────────
  const allNotifications = useMemo(() => {
    const filteredApi = getFilteredNotifications(apiNotifications);
    const combined = [...socketNotifications, ...filteredApi, ...derivedNotifications];
    const seen = new Set();
    return combined
      .filter(n => {
        const id = n.id || n._id;
        if (!id) return false;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .map(n => ({
        ...n,
        isRead: readIds.has(n.id || n._id) ? true : (n.isRead || n.read || false),
      }))
      .sort((a, b) => {
        if (a.priority === 'high' && b.priority !== 'high') return -1;
        if (b.priority === 'high' && a.priority !== 'high') return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      })
      .slice(0, 20);
  }, [socketNotifications, apiNotifications, derivedNotifications, readIds, getFilteredNotifications]);

  const unreadCount = useMemo(
    () => allNotifications.filter(n => !n.isRead).length,
    [allNotifications]
  );

  // ── MARK ALL READ ─────────────────────────────────────────────────────────
  const handleMarkAllRead = useCallback(async () => {
    const allIds = new Set(allNotifications.map(n => n.id || n._id));
    setReadIds(allIds);

    if (!token) return;
    try {
      await fetch(`${API_BASE}/api/v1/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (markAllNotificationsRead) markAllNotificationsRead();
    } catch (err) {}
  }, [token, allNotifications, markAllNotificationsRead]);

  // ── SOCKET LISTENERS ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    const socket = getSocket();
    if (!socket) return;

    const handleNewNotification = (notif) => {
      setSocketNotifications(prev => {
        const merged = [notif, ...prev];
        const seen = new Set();
        return merged.filter(n => {
          const id = n.id || n._id;
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        }).slice(0, 20);
      });
      triggerBellRing();
      playNotificationChime();
    };

    const handleSync = (missedNotifs) => {
      if (!missedNotifs?.length) return;
      setSocketNotifications(prev => {
        const merged = [...missedNotifs, ...prev];
        const seen = new Set();
        return merged.filter(n => {
          const id = n.id || n._id;
          if (!id || seen.has(id)) return false;
          seen.add(id);
          return true;
        }).slice(0, 20);
      });
    };

    socket.on('notification:new', handleNewNotification);
    socket.on('notification:sync', handleSync);

    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.off('notification:sync', handleSync);
    };
  }, [currentUser, triggerBellRing, playNotificationChime]);

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
          notifications={allNotifications.slice(0, 5)}
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
