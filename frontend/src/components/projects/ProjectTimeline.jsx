import React, { useState } from 'react';
import styles from '../../styles/projects.module.css';
import { Calendar as CalendarIcon, List, ChevronLeft, ChevronRight } from 'lucide-react';

const ProjectTimeline = ({ projects = [], onSelectProject }) => {
  const [viewMode, setViewMode] = useState('timeline'); // 'timeline' (Gantt) or 'calendar'
  const [currentMonth, setCurrentMonth] = useState(new Date('2026-06-01')); // Default to system month

  // Timeline Scale: Jan - June 2026 (6 months)
  const timelineMonths = [
    { name: 'Jan 26', start: new Date('2026-01-01'), end: new Date('2026-01-31') },
    { name: 'Feb 26', start: new Date('2026-02-01'), end: new Date('2026-02-28') },
    { name: 'Mar 26', start: new Date('2026-03-01'), end: new Date('2026-03-31') },
    { name: 'Apr 26', start: new Date('2026-04-01'), end: new Date('2026-04-30') },
    { name: 'May 26', start: new Date('2026-05-01'), end: new Date('2026-05-31') },
    { name: 'Jun 26', start: new Date('2026-06-01'), end: new Date('2026-06-30') }
  ];

  // Helper to calculate position of a project bar in Gantt Chart
  const calculateBarPosition = (startStr, endStr) => {
    const startDate = new Date(startStr);
    const endDate = new Date(endStr);
    
    const scaleStart = timelineMonths[0].start;
    const scaleEnd = timelineMonths[5].end;
    const totalDuration = scaleEnd - scaleStart;

    // Boundary check
    const projectStart = Math.max(startDate, scaleStart);
    const projectEnd = Math.min(endDate, scaleEnd);

    if (projectEnd < scaleStart || projectStart > scaleEnd) {
      return { left: '0%', width: '0%', visible: false }; // out of scale
    }

    const leftOffset = ((projectStart - scaleStart) / totalDuration) * 100;
    const barWidth = ((projectEnd - projectStart) / totalDuration) * 100;

    return {
      left: `${leftOffset}%`,
      width: `${Math.max(barWidth, 3)}%`, // min width
      visible: true
    };
  };

  // Monthly Calendar configuration (June 2026)
  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth(); // 5 = June
    
    const firstDayIndex = new Date(year, month, 1).getDay(); // Sunday is 0
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    // Previous month filler days
    const prevMonthTotalDays = new Date(year, month, 0).getDate();
    const prevDays = [];
    // If firstDayIndex is 0 (Sunday), we want 6 days of previous month if starting week on Mon
    // Let's adjust first day of week to Monday (Monday = 1, Sunday = 0 -> adjust index to Mon=0...Sun=6)
    const adjustedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    for (let i = adjustedFirstDay - 1; i >= 0; i--) {
      prevDays.push({
        day: prevMonthTotalDays - i,
        date: new Date(year, month - 1, prevMonthTotalDays - i),
        isCurrentMonth: false
      });
    }

    // Current month days
    const currentDays = [];
    for (let i = 1; i <= totalDays; i++) {
      currentDays.push({
        day: i,
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }

    // Next month filler days
    const nextDays = [];
    const totalCalendarCells = 42; // 6 rows * 7 days
    const remainingCells = totalCalendarCells - (prevDays.length + currentDays.length);
    for (let i = 1; i <= remainingCells; i++) {
      nextDays.push({
        day: i,
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }

    return [...prevDays, ...currentDays, ...nextDays];
  };

  // Find events/deadlines for a specific calendar day
  const getEventsForDay = (date) => {
    const dayStr = date.toISOString().split('T')[0];
    const events = [];

    projects.forEach(p => {
      if (p.startDate === dayStr) {
        events.push({
          type: 'start',
          label: `Start: ${p.name}`,
          color: 'var(--color-primary)',
          project: p
        });
      }
      if (p.deadline === dayStr) {
        events.push({
          type: 'deadline',
          label: `Due: ${p.name}`,
          color: 'var(--color-danger)',
          project: p
        });
      }
      // Add milestone alerts if date matches
      if (p.milestones) {
        p.milestones.forEach(m => {
          if (m.date === dayStr) {
            events.push({
              type: 'milestone',
              label: `MS: ${m.title}`,
              color: 'var(--color-warning)',
              project: p
            });
          }
        });
      }
    });

    return events;
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className={styles.timelineCard}>
      <div className={styles.timelineHeader}>
        <h3 className={styles.timelineTitle}>
          {viewMode === 'timeline' ? 'Project Schedule Overview (Gantt)' : `Monthly Schedule — ${monthName}`}
        </h3>
        
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {viewMode === 'calendar' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 16 }}>
              <button className={styles.actionBtn} onClick={handlePrevMonth}><ChevronLeft size={14} /></button>
              <button className={styles.actionBtn} onClick={handleNextMonth}><ChevronRight size={14} /></button>
            </div>
          )}
          
          <div className={styles.toggleContainer}>
            <button
              className={`${styles.toggleBtn} ${viewMode === 'timeline' ? styles.active : ''}`}
              onClick={() => setViewMode('timeline')}
            >
              <List size={12} style={{ display: 'inline', marginRight: 4 }} /> Timeline
            </button>
            <button
              className={`${styles.toggleBtn} ${viewMode === 'calendar' ? styles.active : ''}`}
              onClick={() => setViewMode('calendar')}
            >
              <CalendarIcon size={12} style={{ display: 'inline', marginRight: 4 }} /> Calendar
            </button>
          </div>
        </div>
      </div>

      {/* VIEW: GANTT CHART TIMELINE */}
      {viewMode === 'timeline' && (
        <div className={styles.ganttContainer}>
          <div className={styles.ganttGridHeader}>
            <span>Project & Owner</span>
            <div className={styles.ganttMonthsHeader}>
              {timelineMonths.map(m => <span key={m.name}>{m.name}</span>)}
            </div>
          </div>

          {projects && projects.length > 0 && projects.slice(0, 6).map(p => {
            const pos = calculateBarPosition(p.startDate, p.deadline);
            return (
              <div key={p.id} className={styles.ganttRow}>
                <div className={styles.ganttProjectInfo}>
                  <span className={styles.ganttProjName} onClick={() => onSelectProject(p)} style={{ cursor: 'pointer' }}>
                    {p.name}
                  </span>
                  <span className={styles.ganttProjDept}>
                    {p.department} • PM: {p.manager}
                  </span>
                </div>
                
                <div className={styles.ganttBarArea}>
                  {pos.visible ? (
                    <div
                      className={styles.ganttBarFill}
                      style={{
                        left: pos.left,
                        width: pos.width,
                        backgroundColor: p.status === 'Delayed' ? 'var(--color-danger)' : p.status === 'Completed' ? 'var(--color-success)' : 'var(--color-primary)'
                      }}
                      onClick={() => onSelectProject(p)}
                      title={`${p.name} (${p.startDate} to ${p.deadline}) - Click for details`}
                    >
                      {p.progress}%
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', paddingLeft: 12 }}>
                      Starts: {p.startDate} / Ends: {p.deadline} (Out of Range)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {(!projects || projects.length === 0) && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No projects available to show in timeline.
            </div>
          )}
        </div>
      )}

      {/* VIEW: MONTH CALENDAR */}
      {viewMode === 'calendar' && (
        <div className={styles.calendarContainer}>
          <div className={styles.calendarGridHeader}>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>

          <div className={styles.calendarGrid}>
            {getCalendarDays().map((dayCell, idx) => {
              const events = getEventsForDay(dayCell.date);
              const isToday = dayCell.date.toISOString().split('T')[0] === '2026-06-01'; // Simulated today
              
              return (
                <div
                  key={idx}
                  className={`${styles.calendarDay} ${dayCell.isCurrentMonth ? '' : styles.outside} ${isToday ? styles.today : ''}`}
                >
                  <span className={styles.calendarDayNumber}>{dayCell.day}</span>
                  
                  <div className={styles.calendarEvents}>
                    {events.map((ev, evIdx) => (
                      <div
                        key={evIdx}
                        className={styles.calendarEvent}
                        style={{ backgroundColor: ev.color }}
                        onClick={() => onSelectProject(ev.project)}
                        title={ev.label}
                      >
                        {ev.label}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectTimeline;
