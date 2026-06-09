import React, { useState, useMemo, useEffect } from 'react';
import './Calendar.css';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import Button from '../components/common/Button';
import Skeleton from '../components/common/Skeleton';
import {
  CalendarDays, Plus, ChevronLeft, ChevronRight, Clock, MapPin, Users,
  Trash2, Edit2, Video, Info, Check, X, AlertCircle, Bell, Search,
  Calendar as CalendarIcon, Filter, Sun, Moon
} from 'lucide-react';

const PRESET_COLORS = [
  { name: 'Blue',   value: '#185FA5' },
  { name: 'Violet', value: '#534AB7' },
  { name: 'Teal',   value: '#0F6E56' },
  { name: 'Amber',  value: '#BA7517' },
  { name: 'Red',    value: '#A32D2D' },
];

const pad = (n) => String(n).padStart(2, '0');
const formatDateString = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const getRelativeDateStr = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return formatDateString(d);
};

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WEEK_DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const initialEvents = [
  { id: 'evt-1', title: 'Weekly sync meeting', type: 'meeting', date: getRelativeDateStr(0), time: '10:00', endTime: '10:30', description: 'Sync on sprint tasks, code reviews, and upcoming deployments.', location: 'Google Meet', attendees: 'Uttam Rajpurohit, Ananya Gupta', color: '#185FA5' },
  { id: 'evt-2', title: 'Daily report reminder', type: 'reminder', date: getRelativeDateStr(0), time: '18:00', endTime: '18:15', description: 'Submit daily work reports.', location: 'Office Portal', attendees: 'Uttam Rajpurohit', color: '#BA7517' },
  { id: 'evt-3', title: 'Marketing alignment sync', type: 'meeting', date: getRelativeDateStr(1), time: '11:00', endTime: '12:00', description: 'Align on content strategy.', location: 'Room 204', attendees: 'Priya Patel', color: '#534AB7' },
  { id: 'evt-4', title: 'Architecture review', type: 'reminder', date: getRelativeDateStr(1), time: '14:30', endTime: '15:00', description: 'Complete final check.', location: 'Document Vault', attendees: 'Uttam Rajpurohit', color: '#BA7517' },
  { id: 'evt-5', title: '1-on-1 manager feedback', type: 'meeting', date: getRelativeDateStr(3), time: '15:00', endTime: '15:30', description: 'Quarterly feedback review.', location: 'Manager Cabin', attendees: 'Uttam Rajpurohit', color: '#185FA5' },
  { id: 'evt-6', title: 'Q2 payroll audit', type: 'reminder', date: getRelativeDateStr(4), time: '10:00', endTime: '11:00', description: 'Verify attendance sheets.', location: 'HR Portal', attendees: 'Sarah Connor', color: '#A32D2D' },
  { id: 'evt-7', title: 'Project Alpha retrospective', type: 'meeting', date: getRelativeDateStr(7), time: '14:00', endTime: '15:30', description: 'Post-launch retrospective.', location: 'Conference Room A', attendees: 'Engineering Team', color: '#0F6E56' },
];

const BLANK_FORM = {
  id: '', title: '', type: 'meeting', date: formatDateString(new Date()),
  time: '09:00', endTime: '10:00', description: '', location: '', attendees: '', color: '#185FA5',
};

export default function Calendar() {
  const isLoading = usePageLoading(600);
  const { addToast, showConfirm } = useApp();
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState(() => {
    try {
      const saved = localStorage.getItem('office_calendar_events');
      return saved ? JSON.parse(saved) : initialEvents;
    } catch { return initialEvents; }
  });

  useEffect(() => {
    localStorage.setItem('office_calendar_events', JSON.stringify(events));
  }, [events]);

  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [formState, setFormState] = useState(BLANK_FORM);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark-mode');
  };

  const calendarCells = useMemo(() => {
    const cells = [];
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();

    for (let i = firstDay - 1; i >= 0; i--)
      cells.push({ date: new Date(year, month - 1, prevDays - i), isCurrentMonth: false, key: `p${prevDays - i}` });
    for (let i = 1; i <= daysInMonth; i++)
      cells.push({ date: new Date(year, month, i), isCurrentMonth: true, key: `c${i}` });
    const pad = 42 - cells.length;
    for (let i = 1; i <= pad; i++)
      cells.push({ date: new Date(year, month + 1, i), isCurrentMonth: false, key: `n${i}` });
    return cells;
  }, [year, month]);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return events.filter(e => {
      const matchType = filterType === 'all' || e.type === filterType;
      const matchSearch = !q || [e.title, e.description, e.location, e.attendees].some(s => s?.toLowerCase().includes(q));
      return matchType && matchSearch;
    });
  }, [events, filterType, searchQuery]);

  const eventsByDate = useMemo(() => {
    const map = {};
    filteredEvents.forEach(e => { (map[e.date] = map[e.date] || []).push(e); });
    Object.values(map).forEach(arr => arr.sort((a, b) => a.time.localeCompare(b.time)));
    return map;
  }, [filteredEvents]);

  const upcomingEvents = useMemo(() => {
    const todayStr = formatDateString(new Date());
    return [...events].filter(e => e.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)).slice(0, 6);
  }, [events]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const jumpToday = () => { const t = new Date(); setCurrentDate(t); setSelectedDate(t); };

  const openAddEvent = (date = new Date()) => {
    setFormState({ ...BLANK_FORM, date: formatDateString(date) });
    setIsFormOpen(true);
  };

  const openEditEvent = (evt) => {
    setFormState({ id: evt.id, title: evt.title, type: evt.type, date: evt.date, time: evt.time, endTime: evt.endTime || '', description: evt.description || '', location: evt.location || '', attendees: evt.attendees || '', color: evt.color || '#185FA5' });
    setIsDetailsOpen(false);
    setIsFormOpen(true);
  };

  const clearSearch = () => setSearchQuery('');

  const handleSaveEvent = (e) => {
    e.preventDefault();
    if (!formState.title.trim()) { addToast('error', 'Event title is required.'); return; }
    if (formState.id) {
      setEvents(prev => prev.map(ev => ev.id === formState.id ? { ...formState } : ev));
      addToast('success', `"${formState.title}" updated.`);
    } else {
      setEvents(prev => [...prev, { ...formState, id: `evt-${Date.now()}` }]);
      addToast('success', `"${formState.title}" scheduled.`);
    }
    setIsFormOpen(false);
  };

  const handleDeleteEvent = (id, title) => {
    showConfirm('Cancel event', `Remove "${title}" from the calendar?`, () => {
      setEvents(prev => prev.filter(e => e.id !== id));
      setIsDetailsOpen(false);
      addToast('warning', `"${title}" removed.`);
    }, 'danger');
  };

  const handleCellClick = (date) => { setSelectedDate(date); openAddEvent(date); };
  const handleEventClick = (e, evt) => { e.stopPropagation(); setSelectedEvent(evt); setIsDetailsOpen(true); };

  const todayStr = formatDateString(new Date());

  if (isLoading) {
    return (
      <div className="cal-page">
        <div className="cal-skeleton"><Skeleton variant="rect" width="100%" height="100%" /></div>
      </div>
    );
  }

  return (
    <div className={`cal-page animate-fade-in ${isDarkMode ? 'dark-mode' : ''}`}>
      {/* Page header */}
      <div className="cal-page-header">
        <div className="cal-page-header__left">
          <div className="cal-page-header__icon"><CalendarDays size={18} /></div>
          <div>
            <h2 className="cal-page-header__title">Meetings &amp; Calendar</h2>
            <p className="cal-page-header__sub">Schedule meetings, client calls, standups and reminders</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="icon-btn" onClick={toggleDarkMode}>
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Button variant="primary" icon={Plus} onClick={() => openAddEvent(selectedDate)}>New event</Button>
        </div>
      </div>

      {/* Workspace */}
      <div className="cal-workspace">
        {/* Sidebar */}
        <aside className="cal-sidebar">
          {/* Stats strip */}
          <div className="cal-stats-row">
            <div className="cal-stat"><span className="cal-stat__num">{events.filter(e => e.date === todayStr).length}</span><span className="cal-stat__label">Today</span></div>
            <div className="cal-stat"><span className="cal-stat__num">{events.filter(e => e.type === 'meeting').length}</span><span className="cal-stat__label">Meetings</span></div>
            <div className="cal-stat"><span className="cal-stat__num">{events.filter(e => e.type === 'reminder').length}</span><span className="cal-stat__label">Reminders</span></div>
          </div>

          {/* Search + Filter */}
          <div className="cal-card cal-filter-card">
            <div className="cal-search-wrap">
              <Search size={13} className="cal-search-icon" />
              <input className="cal-search-input" type="text" placeholder="Search events…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              {searchQuery && (<button className="cal-search-clear" onClick={clearSearch}><X size={12} /></button>)}
            </div>
            <div className="cal-filter-label"><Filter size={11} /> <span>Filter by type</span></div>
            <div className="cal-filter-group">
              {[
                { key: 'all', label: 'All events', color: '#888780' },
                { key: 'meeting', label: 'Meetings', color: '#185FA5' },
                { key: 'reminder', label: 'Reminders', color: '#BA7517' },
              ].map(f => (
                <button key={f.key} className={`cal-filter-btn${filterType === f.key ? ' active' : ''}`} onClick={() => setFilterType(f.key)}>
                  <span className="cal-filter-dot" style={{ background: f.color }} />
                  <span className="cal-filter-text">{f.label}</span>
                  <span className="cal-filter-count">{f.key === 'all' ? events.length : events.filter(e => e.type === f.key).length}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Upcoming agenda */}
          <div className="cal-card cal-agenda-card">
            <div className="cal-agenda-header"><span className="cal-section-label">Upcoming schedule</span><Bell size={13} className="cal-agenda-bell" /></div>
            <div className="cal-agenda-list">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map(evt => {
                  const d = new Date(evt.date + 'T00:00:00');
                  const label = evt.date === todayStr ? 'Today' : evt.date === getRelativeDateStr(1) ? 'Tomorrow' : `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}`;
                  return (
                    <div key={evt.id} className="cal-agenda-item" style={{ borderLeftColor: evt.color }} onClick={() => { setSelectedEvent(evt); setIsDetailsOpen(true); }}>
                      <div className="cal-agenda-item__meta">
                        <span className="cal-agenda-item__time"><Clock size={10} /> {label} · {evt.time}</span>
                        <span className="cal-type-badge" style={evt.type === 'meeting' ? { background: 'rgba(24,95,165,.1)', color: '#0C447C' } : { background: 'rgba(186,117,23,.1)', color: '#854F0B' }}>{evt.type === 'meeting' ? 'Meeting' : 'Reminder'}</span>
                      </div>
                      <p className="cal-agenda-item__title">{evt.title}</p>
                      {evt.location && (<p className="cal-agenda-item__loc"><MapPin size={10} />{evt.location.length > 26 ? evt.location.slice(0, 26) + '…' : evt.location}</p>)}
                    </div>
                  );
                })
              ) : (<div className="cal-empty"><AlertCircle size={20} /><p>No upcoming events</p></div>)}
            </div>
          </div>
        </aside>

        {/* Main calendar card */}
        <div className="cal-card cal-main-card">
          <div className="cal-grid-nav">
            <div className="cal-grid-nav__left">
              <h3 className="cal-grid-nav__month">{MONTH_NAMES[month]} {year}</h3>
              <div className="cal-grid-nav__btns">
                <button className="cal-nav-arrow" onClick={prevMonth}><ChevronLeft size={15} /></button>
                <button className="cal-nav-today" onClick={jumpToday}>Today</button>
                <button className="cal-nav-arrow" onClick={nextMonth}><ChevronRight size={15} /></button>
              </div>
            </div>
            <div className="cal-legend">
              <span className="cal-legend-dot" style={{ background: '#185FA5' }} /> Meetings
              <span className="cal-legend-dot" style={{ background: '#BA7517', marginLeft: 12 }} /> Reminders
            </div>
          </div>

          {/* Grid */}
          <div className="cal-grid">
            {WEEK_DAYS.map(d => (<div key={d} className="cal-weekday">{d}</div>))}
            {calendarCells.map(cell => {
              const ds = formatDateString(cell.date);
              const cellEvts = eventsByDate[ds] || [];
              const isToday = ds === todayStr;
              const isSel = selectedDate && ds === formatDateString(selectedDate);
              return (
                <div key={cell.key} className={['cal-cell', !cell.isCurrentMonth && 'cal-cell--other', isToday && 'cal-cell--today', isSel && 'cal-cell--selected'].filter(Boolean).join(' ')} onClick={() => handleCellClick(cell.date)}>
                  <div className="cal-cell__top"><span className={`cal-cell__num${isToday ? ' cal-cell__num--today' : ''}`}>{cell.date.getDate()}</span></div>
                  <div className="cal-cell__events">
                    {cellEvts.slice(0, 3).map(evt => (
                      <div key={evt.id} className="cal-pill" style={{ borderLeftColor: evt.color, background: evt.color + '18', color: evt.color }} onClick={e => handleEventClick(e, evt)} title={`${evt.time} – ${evt.title}`}>
                        <span className="cal-pill__time">{evt.time}</span>
                        <span className="cal-pill__title">{evt.title}</span>
                      </div>
                    ))}
                    {cellEvts.length > 3 && (<span className="cal-pill-more">+{cellEvts.length - 3} more</span>)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Event Form Modal */}
      {isFormOpen && (
        <div className="cal-backdrop" onClick={() => setIsFormOpen(false)}>
          <div className="cal-modal cal-modal--form" onClick={e => e.stopPropagation()}>
            <div className="cal-modal__header">
              <h4 className="cal-modal__title">{formState.id ? 'Edit event' : 'New event'}</h4>
              <button className="cal-modal__close" onClick={() => setIsFormOpen(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveEvent} className="cal-form">
              <div className="cal-form__group">
                <label className="cal-form__label">Title *</label>
                <input className="cal-form__input" type="text" placeholder="e.g. Sprint kickoff, design review…" value={formState.title} onChange={e => setFormState(s => ({ ...s, title: e.target.value }))} required autoFocus />
              </div>
              <div className="cal-form__row">
                <div className="cal-form__group">
                  <label className="cal-form__label">Type</label>
                  <select className="cal-form__input" value={formState.type} onChange={e => setFormState(s => ({ ...s, type: e.target.value, color: e.target.value === 'meeting' ? '#185FA5' : '#BA7517' }))}>
                    <option value="meeting">Meeting</option>
                    <option value="reminder">Reminder</option>
                  </select>
                </div>
                <div className="cal-form__group">
                  <label className="cal-form__label">Date *</label>
                  <input className="cal-form__input" type="date" value={formState.date} onChange={e => setFormState(s => ({ ...s, date: e.target.value }))} required />
                </div>
              </div>
              <div className="cal-form__row">
                <div className="cal-form__group">
                  <label className="cal-form__label">Start time</label>
                  <input className="cal-form__input" type="time" value={formState.time} onChange={e => setFormState(s => ({ ...s, time: e.target.value }))} />
                </div>
                <div className="cal-form__group">
                  <label className="cal-form__label">End time</label>
                  <input className="cal-form__input" type="time" value={formState.endTime} disabled={formState.type === 'reminder'} onChange={e => setFormState(s => ({ ...s, endTime: e.target.value }))} />
                </div>
              </div>
              <div className="cal-form__group">
                <label className="cal-form__label">Color</label>
                <div className="cal-color-row">
                  {PRESET_COLORS.map(c => (
                    <button key={c.value} type="button" className={`cal-color-dot${formState.color === c.value ? ' active' : ''}`} style={{ background: c.value }} onClick={() => setFormState(s => ({ ...s, color: c.value }))} title={c.name}>
                      {formState.color === c.value && <Check size={10} color="#fff" />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="cal-form__group">
                <label className="cal-form__label">Description</label>
                <textarea className="cal-form__input cal-form__textarea" rows={3} placeholder="Agenda topics, notes, checklists…" value={formState.description} onChange={e => setFormState(s => ({ ...s, description: e.target.value }))} />
              </div>
              <div className="cal-form__group">
                <label className="cal-form__label">Location / link</label>
                <input className="cal-form__input" type="text" placeholder="Conference room, Zoom link, Google Meet…" value={formState.location} onChange={e => setFormState(s => ({ ...s, location: e.target.value }))} />
              </div>
              <div className="cal-form__group">
                <label className="cal-form__label">Attendees</label>
                <input className="cal-form__input" type="text" placeholder="Names comma-separated" value={formState.attendees} onChange={e => setFormState(s => ({ ...s, attendees: e.target.value }))} />
              </div>
              <div className="cal-form__footer">
                <button type="button" className="cal-btn cal-btn--ghost" onClick={() => setIsFormOpen(false)}>Cancel</button>
                <button type="submit" className="cal-btn cal-btn--primary">{formState.id ? 'Save changes' : 'Schedule event'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {isDetailsOpen && selectedEvent && (
        <div className="cal-backdrop" onClick={() => setIsDetailsOpen(false)}>
          <div className="cal-modal cal-modal--details" onClick={e => e.stopPropagation()}>
            <div className="cal-modal__stripe" style={{ background: selectedEvent.color }} />
            <div className="cal-modal__header">
              <span className="cal-type-badge" style={selectedEvent.type === 'meeting' ? { background: 'rgba(24,95,165,.1)', color: '#0C447C' } : { background: 'rgba(186,117,23,.1)', color: '#854F0B' }}>{selectedEvent.type === 'meeting' ? 'Meeting' : 'Reminder'}</span>
              <button className="cal-modal__close" onClick={() => setIsDetailsOpen(false)}><X size={16} /></button>
            </div>
            <h3 className="cal-details__title">{selectedEvent.title}</h3>
            <div className="cal-details__body">
              <div className="cal-details__row"><Clock size={14} style={{ color: selectedEvent.color, flexShrink: 0 }} /><span>{selectedEvent.date}<span className="cal-details__muted">&nbsp;·&nbsp;{selectedEvent.time}{selectedEvent.type === 'meeting' && ` – ${selectedEvent.endTime}`}</span></span></div>
              {selectedEvent.location && (<div className="cal-details__row"><MapPin size={14} style={{ color: selectedEvent.color, flexShrink: 0 }} /><span>{selectedEvent.location.includes('http') ? (<a href={selectedEvent.location} target="_blank" rel="noopener noreferrer" className="cal-details__link">Join call <Video size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /></a>) : selectedEvent.location}</span></div>)}
              {selectedEvent.attendees && (<div className="cal-details__row cal-details__row--top"><Users size={14} style={{ color: selectedEvent.color, flexShrink: 0, marginTop: 2 }} /><div className="cal-chips">{selectedEvent.attendees.split(',').map(n => (<span key={n.trim()} className="cal-chip">{n.trim()}</span>))}</div></div>)}
              {selectedEvent.description && (<div className="cal-details__desc-box"><div className="cal-details__desc-label"><Info size={11} /> Description</div><p className="cal-details__desc">{selectedEvent.description}</p></div>)}
            </div>
            <div className="cal-details__footer">
              <button className="cal-btn cal-btn--danger" onClick={() => handleDeleteEvent(selectedEvent.id, selectedEvent.title)}><Trash2 size={12} /> Cancel event</button>
              <div className="cal-details__footer-right">
                <button className="cal-btn cal-btn--ghost" onClick={() => setIsDetailsOpen(false)}>Close</button>
                <button className="cal-btn cal-btn--primary" onClick={() => openEditEvent(selectedEvent)}><Edit2 size={12} /> Edit</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}