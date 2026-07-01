import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import './Calendar.css';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import Skeleton from '../components/common/Skeleton';
import {
  CalendarDays, Plus, ChevronLeft, ChevronRight, Clock, MapPin, Users,
  Trash2, Edit2, Video, Info, Check, X, AlertCircle, Bell, Search,
  Calendar as CalendarIcon, Filter, ExternalLink, LayoutGrid, List, LayoutList,
  ChevronDown
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  { name: 'Sky Blue',  value: '#38bdf8' },
  { name: 'Violet',   value: '#8b5cf6' },
  { name: 'Emerald',  value: '#34d399' },
  { name: 'Amber',    value: '#f59e0b' },
  { name: 'Rose',     value: '#f87171' },
  { name: 'Pink',     value: '#d946ef' },
];

const MONTH_NAMES      = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT_MONTHS     = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WEEK_DAYS_SHORT  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const WEEK_DAYS_FULL   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const pad = (n) => String(n).padStart(2, '0');
const formatDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayOffset = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return formatDate(d); };

// ─── Sample Events ────────────────────────────────────────────────────────────

const INITIAL_EVENTS = [];

const BLANK_FORM = {
  id: '', title: '', type: 'meeting',
  date: formatDate(new Date()), time: '09:00', endTime: '10:00',
  description: '', location: '', attendees: '', color: '#38bdf8',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getInitials = (name) =>
  name.trim().split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

const AVATAR_COLORS = ['#ec4899','#3b82f6','#10b981','#f59e0b','#8b5cf6','#06b6d4','#f87171'];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Calendar() {
  const isLoading = usePageLoading(600);
  const { token, addToast, showConfirm, employees = [], departments = [], currentUser = null, currentUserRole = '', attendanceRules = {}, hasPermission } = useApp();

  const todayNavLabel = useMemo(() => {
    return new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  }, []);

  // ── State ──
  const [currentDate,    setCurrentDate]    = useState(new Date());
  const [selectedDate,   setSelectedDate]   = useState(new Date());
  const [viewMode,       setViewMode]       = useState('month'); // 'month' | 'week' | 'agenda'
  const [filterType,     setFilterType]     = useState('all');
  const [searchQuery,    setSearchQuery]    = useState('');
  const [isFormOpen,     setIsFormOpen]     = useState(false);
  const [isDetailsOpen,  setIsDetailsOpen]  = useState(false);
  const [selectedEvent,  setSelectedEvent]  = useState(null);
  const [formState,      setFormState]      = useState(BLANK_FORM);
  const [submitting,     setSubmitting]     = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('');

  // ── Attendees Dropdown State & Ref ──
  const dropdownRef = useRef(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [attendeeSearchQuery, setAttendeeSearchQuery] = useState('');

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset dropdown when form closes
  useEffect(() => {
    if (!isFormOpen) {
      setIsDropdownOpen(false);
      setAttendeeSearchQuery('');
      setSelectedDepartment('');
    }
  }, [isFormOpen]);

  // ── Filtered Employees for Attendees Dropdown ──
  const filteredDropdownEmployees = useMemo(() => {
    if (!currentUser) return [];

    const isAdmin = currentUserRole === 'super_admin' || currentUserRole === 'admin' || currentUserRole === 'branch_admin';

    let filtered = employees.filter(emp => {
      // Exclude self (the logged-in user)
      const isSelf = emp.id === currentUser.id || 
                     emp.employeeId === currentUser.id || 
                     (emp.name && currentUser.name && emp.name.toLowerCase().trim() === currentUser.name.toLowerCase().trim());
      if (isSelf) return false;

      if (isAdmin) {
        return true; // Admins can see all other employees
      }

      const userTeam = (currentUser.teamName || currentUser.team || '').toLowerCase().trim();
      const userDept = (currentUser.department || '').toLowerCase().trim();

      // 1. Same team
      const empTeam = (emp.teamName || emp.team || '').toLowerCase().trim();
      const sameTeam = userTeam && empTeam === userTeam;

      // 2. Same department
      const empDept = (emp.department || '').toLowerCase().trim();
      const sameDept = userDept && empDept === userDept;

      // 3. Is a Team Leader or Manager (TL / Manager)
      const roleStr = (emp.role || '').toLowerCase();
      const designationStr = (emp.designation || '').toLowerCase();
      const isTL = roleStr.includes('leader') || roleStr.includes('lead') || roleStr.includes('manager') || roleStr.includes('tl') ||
                   designationStr.includes('leader') || designationStr.includes('lead') || designationStr.includes('manager') || designationStr.includes('tl');

      return sameTeam || sameDept || isTL;
    });

    if (selectedDepartment) {
      filtered = filtered.filter(emp => emp.department && emp.department.toLowerCase().trim() === selectedDepartment.toLowerCase().trim());
    }

    return filtered;
  }, [employees, currentUser, currentUserRole, selectedDepartment]);

  // Search filtered employees list
  const searchedDropdownEmployees = useMemo(() => {
    const q = attendeeSearchQuery.toLowerCase().trim();
    if (!q) return filteredDropdownEmployees;
    return filteredDropdownEmployees.filter(emp =>
      emp.name.toLowerCase().includes(q) ||
      (emp.designation || emp.role || '').toLowerCase().includes(q)
    );
  }, [filteredDropdownEmployees, attendeeSearchQuery]);

  // Parse currently selected attendees
  const selectedNames = useMemo(() => {
    if (!formState.attendees) return [];
    return formState.attendees.split(',').map(n => n.trim()).filter(Boolean);
  }, [formState.attendees]);

  // Toggle selection
  const handleToggleAttendee = useCallback((name) => {
    let updated;
    const names = formState.attendees.split(',').map(n => n.trim()).filter(Boolean);
    if (names.includes(name)) {
      updated = names.filter(n => n !== name).join(', ');
    } else {
      updated = [...names, name].join(', ');
    }
    setFormState(s => ({ ...s, attendees: updated }));
  }, [formState.attendees]);

  // Render employee avatar in dropdown list
  const renderEmpAvatar = useCallback((emp, index) => {
    if (emp.photoUrl) {
      return <img src={emp.photoUrl} alt={emp.name} className="cal-dropdown-avatar" />;
    }
    const initials = getInitials(emp.name);
    const bgColor = AVATAR_COLORS[index % AVATAR_COLORS.length];
    return (
      <div className="cal-dropdown-avatar cal-dropdown-avatar--initials" style={{ backgroundColor: bgColor }}>
        {initials}
      </div>
    );
  }, []);

  const [events, setEvents] = useState([]);

  // ── Derived calendar grid data ──
  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const calendarCells = useMemo(() => {
    const cells     = [];
    const firstDay  = new Date(year, month, 1).getDay();
    const daysInMo  = new Date(year, month + 1, 0).getDate();
    const prevDays  = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--)
      cells.push({ date: new Date(year, month - 1, prevDays - i), isCurrentMonth: false, key: `p${prevDays - i}` });
    for (let i = 1; i <= daysInMo; i++)
      cells.push({ date: new Date(year, month, i), isCurrentMonth: true, key: `c${i}` });
    const pad = 42 - cells.length;
    for (let i = 1; i <= pad; i++)
      cells.push({ date: new Date(year, month + 1, i), isCurrentMonth: false, key: `n${i}` });
    return cells;
  }, [year, month]);

  const weekCells = useMemo(() => {
    const start = new Date(selectedDate);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [selectedDate]);

  // ── Query range for API fetching ──
  const queryRange = useMemo(() => {
    if (viewMode === 'month' && calendarCells.length > 0) {
      return {
        from: formatDate(calendarCells[0].date),
        to: formatDate(calendarCells[calendarCells.length - 1].date)
      };
    } else if (viewMode === 'week' && weekCells.length > 0) {
      return {
        from: formatDate(weekCells[0]),
        to: formatDate(weekCells[6])
      };
    } else {
      const fromDate = new Date(year, month - 1, 1);
      const toDate = new Date(year, month + 3, 0);
      return {
        from: formatDate(fromDate),
        to: formatDate(toDate)
      };
    }
  }, [viewMode, calendarCells, weekCells, year, month]);

  const fetchEvents = useCallback(async () => {
    if (!token) return;
    try {
      const { from, to } = queryRange;
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/events?from=${from}&to=${to}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.status === 401) {
        return;
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        const mapped = data.map(evt => ({
          id: evt._id || evt.id,
          title: evt.title,
          type: evt.type,
          date: evt.date,
          time: evt.startTime,
          endTime: evt.endTime || '',
          location: evt.location || '',
          description: evt.description || '',
          attendees: Array.isArray(evt.attendees) ? evt.attendees.map(a => a.name).join(', ') : '',
          rawAttendees: Array.isArray(evt.attendees) ? evt.attendees : [],
          color: evt.color || '#38bdf8',
          createdBy: evt.createdBy || null,
          status: evt.status || 'confirmed'
        }));
        setEvents(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch calendar events:', err);
    }
  }, [token, queryRange]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // ── Role-based action access ──
  const canModify = useCallback((evt) => {
    if (!evt || !currentUser) return false;
    const hasWritePermission = typeof hasPermission === 'function' && (hasPermission('announcements', 'update') || hasPermission('announcements', 'delete'));
    if (!hasWritePermission) return false;

    const isAdmin = currentUserRole === 'super_admin' || currentUserRole === 'admin' || currentUserRole === 'branch_admin' || currentUserRole === 'hr' || currentUserRole === 'hr_manager';
    const isCreator = evt.createdBy && (evt.createdBy.id === currentUser.id || evt.createdBy._id === currentUser._id);
    return isAdmin || isCreator;
  }, [currentUser, currentUserRole, hasPermission]);

  const isUserSenior = useMemo(() => {
    if (!currentUser) return false;
    const role = (currentUserRole || '').toLowerCase();
    const designation = (currentUser.designation || '').toLowerCase();
    const empRole = (currentUser.role || '').toLowerCase();
    return (
      role.includes('admin') ||
      role.includes('manager') ||
      role.includes('leader') ||
      role.includes('tl') ||
      role.includes('hr') ||
      designation.includes('admin') ||
      designation.includes('manager') ||
      designation.includes('leader') ||
      designation.includes('tl') ||
      designation.includes('hr') ||
      empRole.includes('admin') ||
      empRole.includes('manager') ||
      empRole.includes('leader') ||
      empRole.includes('tl') ||
      empRole.includes('hr')
    );
  }, [currentUser, currentUserRole]);

  const isAttendeeOfSelectedEvent = useMemo(() => {
    if (!selectedEvent || !currentUser || !selectedEvent.rawAttendees) return false;
    return selectedEvent.rawAttendees.some(att => 
      att.id === currentUser.id || 
      att._id === currentUser._id || 
      (att.name && currentUser.name && att.name.toLowerCase().trim() === currentUser.name.toLowerCase().trim())
    );
  }, [selectedEvent, currentUser]);

  const handleUpdateStatus = async (eventId, newStatus) => {
    if (!token) return;
    try {
      const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/events/${eventId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await response.json();
      if (!response.ok) {
        addToast('error', data.error || 'Failed to update meeting status.');
        return;
      }
      addToast('success', newStatus === 'confirmed' ? 'Meeting request approved.' : 'Meeting request declined.');
      setIsDetailsOpen(false);
      fetchEvents();
    } catch (err) {
      console.error('Error updating status:', err);
      addToast('error', 'An error occurred while updating the status.');
    }
  };

  // ── Filtered events ──
  const filteredEvents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return events.filter((e) => {
      const typeOk   = filterType === 'all' || e.type === filterType;
      const searchOk = !q || [e.title, e.description, e.location, e.attendees]
        .some((s) => s?.toLowerCase().includes(q));
      return typeOk && searchOk;
    });
  }, [events, filterType, searchQuery]);

  const eventsByDate = useMemo(() => {
    const map = {};
    filteredEvents.forEach((e) => {
      (map[e.date] = map[e.date] || []).push(e);
    });
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.time.localeCompare(b.time)));
    return map;
  }, [filteredEvents]);

  const upcomingEvents = useMemo(() => {
    const todayStr = formatDate(new Date());
    return [...events]
      .filter((e) => e.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
      .slice(0, 6);
  }, [events]);

  const groupedAgendaEvents = useMemo(() => {
    const grouped = {};
    filteredEvents.forEach((e) => {
      (grouped[e.date] = grouped[e.date] || []).push(e);
    });
    return Object.keys(grouped)
      .sort()
      .map((dStr) => ({
        dateStr: dStr,
        dateObj: new Date(dStr + 'T00:00:00'),
        events:  grouped[dStr].sort((a, b) => a.time.localeCompare(b.time)),
      }));
  }, [filteredEvents]);

  const todayStr = formatDate(new Date());

  // ── Navigation ──
  const prevPeriod = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else if (viewMode === 'week') {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() - 7);
      setSelectedDate(d);
      setCurrentDate(d);
    }
  };

  const nextPeriod = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else if (viewMode === 'week') {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + 7);
      setSelectedDate(d);
      setCurrentDate(d);
    }
  };

  const jumpToday = () => {
    const t = new Date();
    setCurrentDate(t);
    setSelectedDate(t);
  };

  // ── Event handlers ──
  const openAddEvent = useCallback((date = new Date()) => {
    if (typeof hasPermission === 'function' && !hasPermission('announcements', 'create')) {
      return;
    }
    setFormState({ ...BLANK_FORM, date: formatDate(date) });
    setIsFormOpen(true);
  }, [hasPermission]);

  const openEditEvent = useCallback((evt) => {
    setFormState({
      id:          evt.id,
      title:       evt.title,
      type:        evt.type,
      date:        evt.date,
      time:        evt.time,
      endTime:     evt.endTime || '',
      description: evt.description || '',
      location:    evt.location || '',
      attendees:   evt.attendees || '',
      color:       evt.color || '#38bdf8',
    });
    setIsDetailsOpen(false);
    setIsFormOpen(true);
  }, []);

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!formState.title.trim()) { addToast('error', 'Event title is required.'); return; }
    if (formState.date < todayStr) {
      addToast('error', 'Cannot schedule events before today.');
      return;
    }

    // Past time validation
    const now = new Date();
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMinutes = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;

    if (formState.date === todayStr && formState.time < currentTimeStr) {
      addToast('error', 'Cannot schedule events in the past time.');
      return;
    }
    
    // Office hours validation on frontend
    const officeStart = attendanceRules?.startTime || '09:00';
    const officeEnd = attendanceRules?.endTime || '18:00';

    if (formState.time < officeStart || formState.time > officeEnd) {
      addToast('error', `Meetings must be scheduled between ${officeStart} and ${officeEnd}.`);
      return;
    }
    if (formState.type === 'meeting' && formState.endTime) {
      if (formState.endTime < officeStart || formState.endTime > officeEnd) {
        addToast('error', `Meetings must be scheduled between ${officeStart} and ${officeEnd}.`);
        return;
      }
      if (formState.endTime <= formState.time) {
        addToast('error', 'End time must be after start time.');
        return;
      }
    }

    // Map attendee names to custom string employee IDs
    const attendeeNames = formState.attendees.split(',').map(n => n.trim()).filter(Boolean);
    const attendeeIds = attendeeNames.map(name => {
      const emp = employees.find(e => e.name && e.name.toLowerCase().trim() === name.toLowerCase().trim());
      return emp ? emp.id : null;
    }).filter(Boolean);

    // Construct API payload
    const payload = {
      title: formState.title,
      type: formState.type,
      date: formState.date,
      startTime: formState.time,
      endTime: formState.type === 'meeting' && formState.endTime ? formState.endTime : null,
      location: formState.location,
      description: formState.description,
      attendees: attendeeIds,
      color: formState.color
    };

    try {
      setSubmitting(true);
      let response;
      if (formState.id) {
        // Update
        response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/events/${formState.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        // Create
        response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }

      const resData = await response.json();
      if (!response.ok) {
        addToast('error', resData.error || 'Failed to save event.');
        return;
      }

      if (resData.warning) {
        addToast('warning', resData.warning);
      } else {
        if (resData.status === 'pending') {
          addToast('success', 'Meeting request submitted. Pending senior approval.');
        } else {
          addToast('success', formState.id ? `"${formState.title}" updated successfully.` : `"${formState.title}" scheduled.`);
        }
      }

      setIsFormOpen(false);
      fetchEvents();
    } catch (err) {
      console.error('Error saving event:', err);
      addToast('error', 'An error occurred while saving the event.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = useCallback((id, title) => {
    showConfirm('Cancel Event', `Remove "${title}" from the calendar?`, async () => {
      try {
        const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/events/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const resData = await response.json();
        if (!response.ok) {
          addToast('error', resData.error || 'Failed to cancel event.');
          return;
        }
        setIsDetailsOpen(false);
        addToast('warning', `"${title}" removed.`);
        fetchEvents();
      } catch (err) {
        console.error('Error deleting event:', err);
        addToast('error', 'An error occurred while canceling the event.');
      }
    }, 'danger');
  }, [showConfirm, addToast, token, fetchEvents]);

  const handleCellClick     = (date) => {
    setSelectedDate(date);
    if (typeof hasPermission === 'function' && hasPermission('announcements', 'create')) {
      openAddEvent(date);
    }
  };
  const handleEventClick    = (e, evt) => { e.stopPropagation(); setSelectedEvent(evt); setIsDetailsOpen(true); };

  // ── Attendee avatars ──
  const renderAvatars = useCallback((attendeesStr, max = 3, size = '') => {
    if (!attendeesStr) return null;
    const list = attendeesStr.split(',').map((s) => s.trim()).filter(Boolean);
    const listClass = size ? `cal-avatar-list cal-avatar-list--${size}` : 'cal-avatar-list';

    return (
      <div className={listClass}>
        {list.slice(0, max).map((name, i) => {
          const emp = employees.find(e => e.name && e.name.toLowerCase().trim() === name.toLowerCase().trim());
          const initials = getInitials(name);
          const bgColor = AVATAR_COLORS[i % AVATAR_COLORS.length];

          if (emp && emp.photoUrl) {
            return (
              <img
                key={name}
                src={emp.photoUrl}
                alt={name}
                className="cal-avatar"
                style={{ objectFit: 'cover' }}
                title={name}
              />
            );
          }

          return (
            <div
              key={name}
              className="cal-avatar"
              style={{ backgroundColor: bgColor }}
              title={name}
            >
              {initials}
            </div>
          );
        })}
        {list.length > max && (
          <div
            className="cal-avatar"
            style={{ backgroundColor: '#334155' }}
            title={`${list.length - max} more`}
          >
            +{list.length - max}
          </div>
        )}
      </div>
    );
  }, [employees]);

  // ── Type label helpers ──
  const relDateLabel = (ds) => {
    if (ds === todayStr) return 'Today';
    if (ds === todayOffset(1)) return 'Tomorrow';
    const d = new Date(ds + 'T00:00:00');
    return `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}`;
  };

  const isVideoLink = (loc) => loc && (loc.includes('http://') || loc.includes('https://'));

  // ── Loading skeleton ──
  if (isLoading) {
    return (
      <div className="cal-page">
        <div className="cal-skeleton">
          <Skeleton variant="rect" width="100%" height="100%" />
        </div>
      </div>
    );
  }

  // ── Week nav title ──
  const weekNavTitle = weekCells.length > 0
    ? `Week of ${SHORT_MONTHS[weekCells[0].getMonth()]} ${weekCells[0].getDate()}, ${weekCells[0].getFullYear()}`
    : 'Week View';

  // ═══════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="cal-page animate-fade-in">

      {/* ── Page Header ── */}
      <div className="cal-page-header">
        <div className="cal-header-left">
          <div className="cal-header-icon">
            <CalendarDays size={22} />
          </div>
          <div>
            <h2 className="cal-header-title">Meetings &amp; Calendar</h2>
            <p className="cal-header-sub">Schedule team meetings, client catchups, standups and daily reminders</p>
          </div>
        </div>

        <div className="cal-header-right">
          {/* View toggle */}
          <div className="cal-view-switcher" role="tablist" aria-label="Calendar view mode">
            <button
              role="tab"
              aria-selected={viewMode === 'month'}
              className={`cal-view-btn ${viewMode === 'month' ? 'cal-view-btn--active' : ''}`}
              onClick={() => setViewMode('month')}
            >
              <LayoutGrid size={13} /> Month
            </button>
            <button
              role="tab"
              aria-selected={viewMode === 'week'}
              className={`cal-view-btn ${viewMode === 'week' ? 'cal-view-btn--active' : ''}`}
              onClick={() => setViewMode('week')}
            >
              <LayoutList size={13} /> Week
            </button>
            <button
              role="tab"
              aria-selected={viewMode === 'agenda'}
              className={`cal-view-btn ${viewMode === 'agenda' ? 'cal-view-btn--active' : ''}`}
              onClick={() => setViewMode('agenda')}
            >
              <List size={13} /> Agenda
            </button>
          </div>

          {/* New event button */}
          {typeof hasPermission === 'function' && hasPermission('announcements', 'create') && (
            <button id="cal-new-event-btn" className="cal-new-btn" onClick={() => openAddEvent(selectedDate)}>
              <Plus size={16} />
              New Event
            </button>
          )}
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="cal-stats-row">
        {[
          { num: events.filter((e) => e.date === todayStr).length,         label: todayNavLabel,     },
          { num: events.filter((e) => e.type === 'meeting').length,         label: 'Meetings',  },
          { num: events.filter((e) => e.type === 'reminder').length,        label: 'Reminders', },
        ].map(({ num, label }) => (
          <div key={label} className="cal-stat-tile">
            <span className="cal-stat-num">{num}</span>
            <span className="cal-stat-label">{label}</span>
          </div>
        ))}
      </div>

      {/* ── Workspace (sidebar + main) ── */}
      <div className="cal-workspace">

        {/* ────────────────── SIDEBAR ────────────────── */}
        <aside className="cal-sidebar">

          {/* Search + Filter card */}
          <div className="cal-sidebar-card">
            {/* Search */}
            <div className="cal-search-wrap">
              <Search size={14} className="cal-search-icon" />
              <input
                id="cal-search-input"
                className="cal-search-input"
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search events"
              />
              {searchQuery && (
                <button className="cal-search-clear" onClick={() => setSearchQuery('')} aria-label="Clear search">
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Filter label */}
            <div className="cal-filter-label">
              <Filter size={11} /> Filter by type
            </div>

            {/* Filter buttons */}
            <div className="cal-filter-group">
              {[
                { key: 'all',      label: 'All Events', color: '#d946ef' },
                { key: 'meeting',  label: 'Meetings',   color: 'var(--cal-event-meeting)' },
                { key: 'reminder', label: 'Reminders',  color: 'var(--cal-event-reminder)' },
              ].map((f) => (
                <button
                  key={f.key}
                  id={`cal-filter-${f.key}`}
                  className={`cal-filter-btn ${filterType === f.key ? 'active' : ''}`}
                  onClick={() => setFilterType(f.key)}
                >
                  <div className="cal-filter-left">
                    <span className="cal-filter-dot" style={{ background: f.color }} />
                    <span>{f.label}</span>
                  </div>
                  <span className="cal-filter-count">
                    {f.key === 'all' ? events.length : events.filter((e) => e.type === f.key).length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Upcoming Schedule card */}
          <div className="cal-sidebar-card">
            <div className="cal-schedule-header">
              <h3 className="cal-schedule-title">Upcoming Schedule</h3>
              <Bell size={14} className="cal-bell-icon" />
            </div>

            <div className="cal-agenda-list">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((evt) => (
                  <div
                    key={evt.id}
                    id={`cal-upcoming-${evt.id}`}
                    className="cal-agenda-item"
                    style={{ borderLeftColor: evt.color }}
                    onClick={() => { setSelectedEvent(evt); setIsDetailsOpen(true); }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && (setSelectedEvent(evt), setIsDetailsOpen(true))}
                  >
                    <div className="cal-agenda-item__meta">
                      <span className="cal-agenda-item__time">
                        <Clock size={10} />
                        {relDateLabel(evt.date)} · {evt.time}
                      </span>
                      <span className={`cal-type-pill cal-type-pill--${evt.type}`}>
                        {evt.type === 'meeting' ? 'Meeting' : 'Reminder'}
                      </span>
                      {evt.status && evt.status !== 'confirmed' && (
                        <span className={`cal-status-badge cal-status-badge--${evt.status}`} style={{ padding: '2px 6px', fontSize: '0.6rem', marginLeft: 'auto' }}>
                          {evt.status}
                        </span>
                      )}
                    </div>
                    <p className="cal-agenda-item__title">{evt.title}</p>
                    {evt.location && (
                      <p className="cal-agenda-item__loc">
                        <MapPin size={10} />
                        {evt.location.length > 28 ? evt.location.slice(0, 28) + '…' : evt.location}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="cal-empty-state">
                  <AlertCircle size={24} />
                  <p>No upcoming events</p>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ────────────────── MAIN CARD ────────────────── */}
        <div className="cal-main-card">

          {/* Navigator row */}
          <div className="cal-nav-row">
            <div className="cal-nav-left">
              <h3 className="cal-nav-title">
                {viewMode === 'month'  && `${MONTH_NAMES[month]} ${year}`}
                {viewMode === 'week'   && weekNavTitle}
                {viewMode === 'agenda' && 'Agenda Schedule'}
              </h3>

              {viewMode !== 'agenda' && (
                <div className="cal-nav-controls">
                  <button className="cal-nav-arrow" onClick={prevPeriod} aria-label="Previous period">
                    <ChevronLeft size={15} />
                  </button>
                  <button className="cal-nav-today" onClick={jumpToday}>{todayNavLabel}</button>
                  <button className="cal-nav-arrow" onClick={nextPeriod} aria-label="Next period">
                    <ChevronRight size={15} />
                  </button>
                </div>
              )}
            </div>

            <div className="cal-legend">
              <div className="cal-legend-item">
                <span className="cal-legend-dot" style={{ background: 'var(--cal-event-meeting)' }} />
                Meetings
              </div>
              <div className="cal-legend-item">
                <span className="cal-legend-dot" style={{ background: 'var(--cal-event-reminder)' }} />
                Reminders
              </div>
            </div>
          </div>

          {/* ═══════ VIEW: MONTH GRID ═══════ */}
          {viewMode === 'month' && (
            <div className="cal-month-grid" role="grid" aria-label="Monthly calendar">
              {/* Weekday headers */}
              {WEEK_DAYS_SHORT.map((d) => (
                <div key={d} className="cal-weekday-header" role="columnheader">{d}</div>
              ))}

              {/* Day cells */}
              {calendarCells.map((cell) => {
                const ds       = formatDate(cell.date);
                const cellEvts = eventsByDate[ds] || [];
                const isToday  = ds === todayStr;
                const isSel    = selectedDate && ds === formatDate(selectedDate);

                return (
                  <div
                    key={cell.key}
                    role="gridcell"
                    aria-label={cell.date.toLocaleDateString()}
                    className={[
                      'cal-cell',
                      !cell.isCurrentMonth && 'cal-cell--other',
                      isToday   && 'cal-cell--today',
                      isSel     && 'cal-cell--selected',
                      ds < todayStr && 'cal-cell--past',
                    ].filter(Boolean).join(' ')}
                    onClick={() => {
                      if (ds >= todayStr) {
                        handleCellClick(cell.date);
                      }
                    }}
                  >
                    <div className="cal-cell__top">
                      <span className={`cal-date-num ${isToday ? 'cal-date-num--today' : ''}`}>
                        {cell.date.getDate()}
                      </span>
                      {ds >= todayStr && typeof hasPermission === 'function' && hasPermission('announcements', 'create') && (
                        <button
                          className="cal-cell-add-btn"
                          title="Add event on this day"
                          onClick={(e) => { e.stopPropagation(); handleCellClick(cell.date); }}
                          aria-label="Add event"
                        >
                          <Plus size={10} />
                        </button>
                      )}
                    </div>

                    <div className="cal-cell__events">
                      {cellEvts.slice(0, 3).map((evt) => (
                        <div key={evt.id} className="cal-cell-event-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div
                            className="cal-event-chip"
                            style={{
                              borderLeftColor: evt.color,
                              background:      evt.color + '1a',
                              color:           evt.color,
                            }}
                            onClick={(e) => handleEventClick(e, evt)}
                            title={`${evt.time} – ${evt.title}`}
                          >
                            <span className="cal-event-chip__time">{evt.time}</span>
                            <span className="cal-event-chip__title">
                              {evt.status && evt.status !== 'confirmed' && (
                                <span className={`cal-mini-badge cal-mini-badge--${evt.status}`} style={{ marginRight: '4px' }}>
                                  {evt.status === 'pending' ? 'P' : 'D'}
                                </span>
                              )}
                              {evt.title}
                            </span>
                          </div>
                          {evt.type === 'meeting' && evt.attendees && (
                            <div className="cal-cell-avatars" style={{ paddingLeft: '4px' }}>
                              {renderAvatars(evt.attendees, 3, 'sm')}
                            </div>
                          )}
                        </div>
                      ))}
                      {cellEvts.length > 3 && (
                        <span className="cal-chip-more">+{cellEvts.length - 3} more</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ═══════ VIEW: WEEK GRID ═══════ */}
          {viewMode === 'week' && (
            <div className="cal-week-grid" role="grid" aria-label="Weekly calendar">
              {weekCells.map((date) => {
                const ds       = formatDate(date);
                const cellEvts = eventsByDate[ds] || [];
                const isToday  = ds === todayStr;

                return (
                  <div
                    key={ds}
                    role="gridcell"
                    className={`cal-week-col ${isToday ? 'cal-week-col--today' : ''} ${ds < todayStr ? 'cal-cell--past' : ''}`}
                  >
                    <div className="cal-week-col-header">
                      <span className="cal-week-col-name">{WEEK_DAYS_SHORT[date.getDay()]}</span>
                      <span className={`cal-week-col-date ${isToday ? 'cal-week-col-date--today' : ''}`}>
                        {date.getDate()}
                      </span>
                    </div>

                    <div className="cal-week-events">
                      {cellEvts.map((evt) => (
                        <div
                          key={evt.id}
                          className="cal-week-event-card"
                          style={{
                            borderLeftColor: evt.color,
                            background:      evt.color + '18',
                            color:           evt.color,
                          }}
                          onClick={(e) => handleEventClick(e, evt)}
                        >
                          <span className="cal-week-event-time">
                            {evt.time}{evt.type === 'meeting' && evt.endTime ? ` – ${evt.endTime}` : ''}
                          </span>
                          <span className="cal-week-event-title" style={{ color: 'var(--cal-text-primary)', marginBottom: evt.type === 'meeting' && evt.attendees ? '4px' : '0' }}>
                            {evt.status && evt.status !== 'confirmed' && (
                              <span className={`cal-mini-badge cal-mini-badge--${evt.status}`} style={{ marginRight: '4px' }}>
                                {evt.status}
                              </span>
                            )}
                            {evt.title}
                          </span>
                          {evt.type === 'meeting' && evt.attendees && (
                            <div className="cal-week-event-avatars">
                              {renderAvatars(evt.attendees, 3, 'sm')}
                            </div>
                          )}
                        </div>
                      ))}

                      {ds >= todayStr && typeof hasPermission === 'function' && hasPermission('announcements', 'create') && (
                        <div className="cal-week-add-slot" onClick={() => handleCellClick(date)}>
                          <Plus size={12} /> Add
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ═══════ VIEW: AGENDA ═══════ */}
          {viewMode === 'agenda' && (
            <div className="cal-agenda-view">
              {groupedAgendaEvents.length > 0 ? (
                groupedAgendaEvents.map((group) => {
                  const isGroupToday = group.dateStr === todayStr;
                  return (
                    <div key={group.dateStr} className="cal-agenda-group">
                      {/* Date card */}
                      <div className="cal-agenda-date-card">
                        <div className="cal-agenda-cal-icon">
                          <div className="cal-agenda-cal-month">
                            {SHORT_MONTHS[group.dateObj.getMonth()]}
                          </div>
                          <div className="cal-agenda-cal-day">{group.dateObj.getDate()}</div>
                        </div>
                        <div className="cal-agenda-date-info">
                          <span className="cal-agenda-date-name">
                            {WEEK_DAYS_FULL[group.dateObj.getDay()]}
                            {isGroupToday && <span style={{ color: 'var(--cal-accent)', marginLeft: 6, fontSize: '0.75rem' }}>· Today</span>}
                          </span>
                          <span className="cal-agenda-date-full">
                            {MONTH_NAMES[group.dateObj.getMonth()]} {group.dateObj.getFullYear()}
                          </span>
                        </div>
                      </div>

                      {/* Events list */}
                      <div className="cal-agenda-events-list">
                        {group.events.map((evt) => (
                          <div
                            key={evt.id}
                            id={`cal-agenda-event-${evt.id}`}
                            className="cal-agenda-event-card"
                            onClick={(e) => handleEventClick(e, evt)}
                          >
                            <div className="cal-agenda-event-stripe" style={{ background: evt.color }} />

                            <div className="cal-agenda-event-body">
                              <div className="cal-agenda-event-info">
                                <div className="cal-agenda-event-time-row">
                                  <span className="cal-agenda-event-time">
                                    <Clock size={11} style={{ color: evt.color }} />
                                    {evt.time}{evt.type === 'meeting' && evt.endTime ? ` – ${evt.endTime}` : ''}
                                  </span>
                                  <span className={`cal-type-pill cal-type-pill--${evt.type}`}>
                                    {evt.type === 'meeting' ? 'Meeting' : 'Reminder'}
                                  </span>
                                  {evt.status && evt.status !== 'confirmed' && (
                                    <span className={`cal-status-badge cal-status-badge--${evt.status}`} style={{ padding: '2px 8px', fontSize: '0.65rem' }}>
                                      {evt.status}
                                    </span>
                                  )}
                                </div>

                                <h4 className="cal-agenda-event-title">{evt.title}</h4>
                                {evt.description && (
                                  <p className="cal-agenda-event-desc">{evt.description}</p>
                                )}

                                <div className="cal-agenda-meta">
                                  {evt.location && (
                                    <div className="cal-agenda-meta-row">
                                      <MapPin size={11} style={{ color: evt.color, flexShrink: 0 }} />
                                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {isVideoLink(evt.location) ? 'Virtual Meeting Link' : evt.location}
                                      </span>
                                    </div>
                                  )}
                                  {evt.attendees && (
                                    <div className="cal-agenda-meta-row">
                                      <Users size={11} style={{ color: evt.color, flexShrink: 0 }} />
                                      {renderAvatars(evt.attendees)}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Right actions */}
                              <div
                                className="cal-agenda-actions"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {isVideoLink(evt.location) && (
                                  <a
                                    href={evt.location}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="cal-join-link"
                                    title="Join virtual meeting"
                                  >
                                    <Video size={11} /> Join
                                  </a>
                                )}
                                {canModify(evt) && (
                                  <>
                                    <button
                                      className="cal-action-icon-btn"
                                      onClick={() => openEditEvent(evt)}
                                      title="Edit event"
                                      aria-label="Edit event"
                                    >
                                      <Edit2 size={13} />
                                    </button>
                                    <button
                                      className="cal-action-icon-btn cal-action-icon-btn--danger"
                                      onClick={() => handleDeleteEvent(evt.id, evt.title)}
                                      title="Cancel event"
                                      aria-label="Cancel event"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="cal-empty-state" style={{ padding: '60px 16px' }}>
                  <CalendarIcon size={36} style={{ color: 'var(--cal-text-muted)', marginBottom: 8 }} />
                  <h4 style={{ color: 'var(--cal-text-secondary)', fontSize: '1rem', fontWeight: 700 }}>
                    No scheduled events
                  </h4>
                  <p>There are no events matching your current search or filter.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          EVENT FORM MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      {isFormOpen && (
        <div
          className="cal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={formState.id ? 'Edit Event' : 'Create Event'}
          onClick={() => setIsFormOpen(false)}
        >
          <div className="cal-modal" onClick={(e) => e.stopPropagation()}>

            {/* Colored top stripe */}
            <div className="cal-modal__stripe" style={{ background: formState.color }} />

            <div className="cal-modal__header">
              <h4 className="cal-modal__title">
                {formState.id ? '✎ Edit Event Details' : '+ Create New Event'}
              </h4>
              <button
                className="cal-modal__close"
                onClick={() => setIsFormOpen(false)}
                aria-label="Close modal"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="cal-form">
              {/* Title */}
              <div className="cal-form__group">
                <label className="cal-form__label" htmlFor="evt-title">Event Title *</label>
                <input
                  id="evt-title"
                  className="cal-form__input cal-form__input--title"
                  type="text"
                  placeholder="e.g. Weekly Sprint Sync…"
                  value={formState.title}
                  onChange={(e) => setFormState((s) => ({ ...s, title: e.target.value }))}
                  required
                  autoFocus
                />
              </div>

              {/* Event Type Cards */}
              <div className="cal-form__group">
                <label className="cal-form__label">Event Type</label>
                <div className="cal-type-cards">
                  <div
                    className={`cal-type-card cal-type-card--meeting ${formState.type === 'meeting' ? 'cal-type-card--active' : ''}`}
                    onClick={() => setFormState((s) => ({ ...s, type: 'meeting', color: '#38bdf8' }))}
                    role="radio"
                    aria-checked={formState.type === 'meeting'}
                    tabIndex={0}
                  >
                    <span className="cal-type-card-dot" style={{ background: 'var(--cal-event-meeting)' }} />
                    <div className="cal-type-card-text">
                      <span className="cal-type-card-title">Meeting</span>
                      <span className="cal-type-card-desc">Collaborative calls &amp; standups</span>
                    </div>
                    {formState.type === 'meeting' && <Check size={14} style={{ marginLeft: 'auto', color: 'var(--cal-event-meeting)', flexShrink: 0 }} />}
                  </div>

                  <div
                    className={`cal-type-card cal-type-card--reminder ${formState.type === 'reminder' ? 'cal-type-card--active' : ''}`}
                    onClick={() => setFormState((s) => ({ ...s, type: 'reminder', color: '#f59e0b' }))}
                    role="radio"
                    aria-checked={formState.type === 'reminder'}
                    tabIndex={0}
                  >
                    <span className="cal-type-card-dot" style={{ background: 'var(--cal-event-reminder)' }} />
                    <div className="cal-type-card-text">
                      <span className="cal-type-card-title">Reminder</span>
                      <span className="cal-type-card-desc">Deadlines &amp; audit reminders</span>
                    </div>
                    {formState.type === 'reminder' && <Check size={14} style={{ marginLeft: 'auto', color: 'var(--cal-event-reminder)', flexShrink: 0 }} />}
                  </div>
                </div>
              </div>

              {/* Date + Times */}
              <div className="cal-form__row">
                <div className="cal-form__group">
                  <label className="cal-form__label" htmlFor="evt-date">Date *</label>
                  <input
                    id="evt-date"
                    className="cal-form__input"
                    type="date"
                    min={todayStr}
                    value={formState.date}
                    onChange={(e) => setFormState((s) => ({ ...s, date: e.target.value }))}
                    required
                  />
                </div>
                <div className="cal-form__group">
                  <label className="cal-form__label" htmlFor="evt-time">Start Time</label>
                  <input
                    id="evt-time"
                    className="cal-form__input"
                    type="time"
                    value={formState.time}
                    onChange={(e) => setFormState((s) => ({ ...s, time: e.target.value }))}
                  />
                </div>
              </div>

              <div className="cal-form__row">
                <div className="cal-form__group">
                  <label className="cal-form__label" htmlFor="evt-end-time">End Time</label>
                  <input
                    id="evt-end-time"
                    className="cal-form__input"
                    type="time"
                    value={formState.endTime}
                    disabled={formState.type === 'reminder'}
                    onChange={(e) => setFormState((s) => ({ ...s, endTime: e.target.value }))}
                  />
                </div>
                <div className="cal-form__group">
                  <label className="cal-form__label">Accent Color</label>
                  <div className="cal-color-row">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        className={`cal-color-swatch ${formState.color === c.value ? 'cal-color-swatch--active' : ''}`}
                        style={{ background: c.value }}
                        onClick={() => setFormState((s) => ({ ...s, color: c.value }))}
                        title={c.name}
                        aria-label={`Color: ${c.name}`}
                      >
                        {formState.color === c.value && <Check size={11} color="#fff" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="cal-form__group">
                <label className="cal-form__label" htmlFor="evt-desc">Description &amp; Agenda</label>
                <textarea
                  id="evt-desc"
                  className="cal-form__input cal-form__textarea"
                  rows={3}
                  placeholder="Meeting notes, links, agenda points…"
                  value={formState.description}
                  onChange={(e) => setFormState((s) => ({ ...s, description: e.target.value }))}
                />
              </div>

              {/* Location + Attendees */}
              <div className="cal-form__row">
                <div className="cal-form__group">
                  <label className="cal-form__label" htmlFor="evt-location">Location / Link</label>
                  <input
                    id="evt-location"
                    className="cal-form__input"
                    type="text"
                    placeholder="Room, Google Meet URL, Zoom…"
                    value={formState.location}
                    onChange={(e) => setFormState((s) => ({ ...s, location: e.target.value }))}
                  />
                </div>
                <div className="cal-form__group">
                  <label className="cal-form__label" htmlFor="evt-department">Department Filter</label>
                  <select
                    id="evt-department"
                    className="cal-form__input"
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                  >
                    <option value="">All Departments</option>
                    {departments.filter(d => d.status === 'Active').map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="cal-form__group">
                  <label className="cal-form__label">Attendees</label>
                  <div className="cal-attendees-select" ref={dropdownRef}>
                    <div
                      className={`cal-select-trigger ${isDropdownOpen ? 'open' : ''}`}
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                      {selectedNames.length > 0 ? (
                        selectedNames.map((name) => (
                          <span key={name} className="cal-selected-pill">
                            {name}
                            <button
                              type="button"
                              className="cal-selected-pill-remove"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleAttendee(name);
                              }}
                              aria-label={`Remove ${name}`}
                            >
                              <X size={10} />
                            </button>
                          </span>
                        ))
                      ) : (
                        <span className="cal-select-placeholder">Select attendees...</span>
                      )}
                      <span className="cal-select-arrow">
                        <ChevronDown size={14} />
                      </span>
                    </div>

                    {isDropdownOpen && (
                      <div className="cal-dropdown-card">
                        <div className="cal-dropdown-search-wrap">
                          <Search size={12} className="cal-dropdown-search-icon" />
                          <input
                            type="text"
                            className="cal-dropdown-search"
                            placeholder="Search employees..."
                            value={attendeeSearchQuery}
                            onChange={(e) => setAttendeeSearchQuery(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          {attendeeSearchQuery && (
                            <button
                              type="button"
                              className="cal-search-clear"
                              style={{ position: 'static', padding: '2px' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setAttendeeSearchQuery('');
                              }}
                            >
                              <X size={10} />
                            </button>
                          )}
                        </div>
                        <div className="cal-dropdown-list">
                          {searchedDropdownEmployees.length > 0 ? (
                            searchedDropdownEmployees.map((emp, index) => {
                              const isSelected = selectedNames.includes(emp.name);
                              return (
                                <div
                                  key={emp.id}
                                  className={`cal-dropdown-item ${isSelected ? 'cal-dropdown-item--selected' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleAttendee(emp.name);
                                  }}
                                >
                                  <div className="cal-checkbox">
                                    {isSelected && <Check size={10} strokeWidth={3} />}
                                  </div>
                                  {renderEmpAvatar(emp, index)}
                                  <div className="cal-dropdown-emp-info">
                                    <span className="cal-dropdown-emp-name">{emp.name}</span>
                                    <span className="cal-dropdown-emp-meta">
                                      {emp.designation || emp.role || 'Staff'} · {emp.department || 'General'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="cal-dropdown-empty">
                              No matching employees found
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="cal-form__footer">
                <button type="button" className="cal-btn cal-btn--ghost" onClick={() => setIsFormOpen(false)} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="cal-btn cal-btn--primary" disabled={submitting}>
                  <Check size={14} />
                  {submitting ? 'Saving...' : (formState.id ? 'Save Changes' : 'Schedule Event')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          EVENT DETAILS MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      {isDetailsOpen && selectedEvent && (
        <div
          className="cal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Event Details"
          onClick={() => setIsDetailsOpen(false)}
        >
          <div className="cal-modal cal-modal--details" onClick={(e) => e.stopPropagation()}>
            <div className="cal-modal__stripe" style={{ background: selectedEvent.color }} />

            <div className="cal-modal__header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={`cal-type-pill cal-type-pill--${selectedEvent.type}`}>
                {selectedEvent.type === 'meeting' ? 'Meeting' : 'Reminder'}
              </span>
              {selectedEvent.status && selectedEvent.status !== 'confirmed' && (
                <span className={`cal-status-badge cal-status-badge--${selectedEvent.status}`}>
                  {selectedEvent.status}
                </span>
              )}
              <button
                className="cal-modal__close"
                onClick={() => setIsDetailsOpen(false)}
                aria-label="Close details"
              >
                <X size={15} />
              </button>
            </div>

            <div className="cal-details__body">
              <h3 className="cal-details__title">{selectedEvent.title}</h3>

              <div className="cal-details__row">
                <Clock size={15} style={{ color: selectedEvent.color, flexShrink: 0, marginTop: 2 }} />
                <span>
                  <strong>{selectedEvent.date}</strong>
                  <span className="cal-details__muted">
                    {' '}· {selectedEvent.time}
                    {selectedEvent.type === 'meeting' && selectedEvent.endTime && ` – ${selectedEvent.endTime}`}
                  </span>
                </span>
              </div>

              {selectedEvent.location && (
                <div className="cal-details__row">
                  <MapPin size={15} style={{ color: selectedEvent.color, flexShrink: 0, marginTop: 2 }} />
                  {isVideoLink(selectedEvent.location) ? (
                    <a
                      href={selectedEvent.location}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cal-details__link"
                    >
                      <Video size={13} /> Join Virtual Meeting
                      <ExternalLink size={11} />
                    </a>
                  ) : (
                    <span>{selectedEvent.location}</span>
                  )}
                </div>
              )}

              {selectedEvent.attendees && (
                <div className="cal-details__row cal-details__row--top">
                  <Users size={15} style={{ color: selectedEvent.color, flexShrink: 0, marginTop: 4 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--cal-text-muted)' }}>
                      Attendees ({selectedEvent.attendees.split(',').length})
                    </span>
                    <div className="cal-attendee-chips">
                      {selectedEvent.attendees.split(',').map((name) => (
                        <span key={name.trim()} className="cal-attendee-chip">{name.trim()}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {selectedEvent.description && (
                <div className="cal-details__desc-box">
                  <div className="cal-details__desc-label">
                    <Info size={11} /> Description &amp; Agenda
                  </div>
                  <p className="cal-details__desc">{selectedEvent.description}</p>
                </div>
              )}
            </div>

            <div className="cal-details__footer">
              {selectedEvent.status === 'pending' && isUserSenior && isAttendeeOfSelectedEvent && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="cal-btn cal-btn--success"
                    onClick={() => handleUpdateStatus(selectedEvent.id, 'confirmed')}
                  >
                    <Check size={13} /> Approve
                  </button>
                  <button
                    className="cal-btn cal-btn--danger"
                    onClick={() => handleUpdateStatus(selectedEvent.id, 'declined')}
                  >
                    <X size={13} /> Decline
                  </button>
                </div>
              )}
              {canModify(selectedEvent) && (
                <button
                  className="cal-btn cal-btn--danger"
                  onClick={() => handleDeleteEvent(selectedEvent.id, selectedEvent.title)}
                >
                  <Trash2 size={13} /> Cancel Event
                </button>
              )}
              <div className="cal-details__footer-right">
                <button className="cal-btn cal-btn--ghost" onClick={() => setIsDetailsOpen(false)}>
                  Close
                </button>
                {canModify(selectedEvent) && (
                  <button className="cal-btn cal-btn--primary" onClick={() => openEditEvent(selectedEvent)}>
                    <Edit2 size={13} /> Edit
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}