import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

export const AttendanceDayCard = ({ record, onRequestCorrection }) => {
  const s = (record?.status || '').toLowerCase();
  const [currentTime, setCurrentTime] = useState(new Date());

  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr || timeStr === '--:--') return null;
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
    if (!match) {
      const parts = timeStr.trim().split(':');
      if (parts.length >= 2) {
        const hrs = parseInt(parts[0], 10);
        const mins = parseInt(parts[1], 10);
        if (!isNaN(hrs) && !isNaN(mins)) {
          return hrs * 60 + mins;
        }
      }
      return null;
    }
    let hrs = parseInt(match[1], 10);
    const mins = parseInt(match[2], 10);
    const ampm = match[3].toUpperCase();
    if (ampm === 'PM' && hrs !== 12) hrs += 12;
    if (ampm === 'AM' && hrs === 12) hrs = 0;
    return hrs * 60 + mins;
  };

  const isTodayRecord = (dateVal) => {
    if (!dateVal) return false;
    let y, m, d;
    if (typeof dateVal === 'string') {
      const match = dateVal.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        y = parseInt(match[1], 10);
        m = parseInt(match[2], 10) - 1;
        d = parseInt(match[3], 10);
      }
    }
    if (y === undefined) {
      const parsedDate = new Date(dateVal);
      y = parsedDate.getFullYear();
      m = parsedDate.getMonth();
      d = parsedDate.getDate();
    }
    const today = new Date();
    return y === today.getFullYear() && m === today.getMonth() && d === today.getDate();
  };

  const isToday = isTodayRecord(record?.date);
  const hasPunchIn = record?.punchIn && record.punchIn !== '--:--';
  const hasPunchOut = record?.punchOut && record.punchOut !== '--:--';
  const isActive = isToday && hasPunchIn && !hasPunchOut;

  useEffect(() => {
    if (!isActive) return;
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, [isActive]);

  const getDisplayHours = () => {
    if (isActive) {
      const inMins = parseTimeToMinutes(record.punchIn);
      if (inMins !== null) {
        const outMins = currentTime.getHours() * 60 + currentTime.getMinutes();
        let diffMins = outMins - inMins;
        if (diffMins < 0) {
          diffMins += 24 * 60;
        }
        return diffMins / 60;
      }
    }
    return record?.totalHours || record?.workingHours || 0;
  };

  // Choose border-color and badge variants based on status
  let statusColorVar = 'var(--color-success)';
  let badgeClass = 'ep-badge-success';
  let StatusIcon = CheckCircle;
  let statusText = 'Present';

  if (s === 'absent') {
    statusColorVar = 'var(--color-danger)';
    badgeClass = 'ep-badge-danger';
    StatusIcon = XCircle;
    statusText = 'Absent';
  } else if (s === 'late') {
    statusColorVar = 'var(--color-warning)';
    badgeClass = 'ep-badge-warning';
    StatusIcon = AlertTriangle;
    statusText = 'Late';
  } else if (s === 'wfh' || s === 'work from home') {
    statusColorVar = 'var(--color-success)';
    badgeClass = 'ep-badge-success';
    StatusIcon = CheckCircle;
    statusText = 'WFH';
  } else if (s.includes('leave')) {
    statusColorVar = 'var(--color-purple)';
    badgeClass = 'ep-badge-info';
    StatusIcon = AlertTriangle;
    statusText = record.status;
  }

  // Calculate late minutes offset
  const getLateMinutesText = (punchInStr) => {
    if (!punchInStr || punchInStr === '--:--') return '';
    const match = punchInStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return '';
    let hrs = parseInt(match[1]);
    const mins = parseInt(match[2]);
    const ampm = match[3].toUpperCase();
    if (ampm === 'PM' && hrs !== 12) hrs += 12;
    if (ampm === 'AM' && hrs === 12) hrs = 0;
    
    const punchMins = hrs * 60 + mins;
    const shiftStartMins = 9 * 60 + 30; // 09:30 AM
    const diff = punchMins - shiftStartMins;
    if (diff <= 0) return '';
    if (diff >= 60) {
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      return m > 0 ? ` (+${h}h ${m}m)` : ` (+${h}h)`;
    }
    return ` (+${diff} min)`;
  };

  const lateOffsetStr = s === 'late' ? getLateMinutesText(record.punchIn) : '';

  // Format date: Mon, Jun 09
  const formatCardDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Format work hours nicely (e.g., "8.5" to "8h 30m")
  const formatWorkHours = (hoursVal) => {
    if (!hoursVal) return '0h 0m';
    const hrs = Math.floor(hoursVal);
    const mins = Math.round((hoursVal - hrs) * 60);
    return `${hrs}h ${mins}m`;
  };

  const formattedDate = formatCardDate(record?.date);

  return (
    <div 
      className="att-day-card animate-fade-in"
      style={{
        display: 'flex',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        border: '0.5px solid var(--border-color)',
        transition: 'var(--transition-all)',
        margin: '0.5rem 0',
        cursor: 'default'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-elevated)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--bg-card)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Left Accent Border */}
      <div style={{
        width: '4px',
        background: statusColorVar,
        borderRadius: 0,
        flexShrink: 0
      }} />

      {/* Card Content */}
      <div className="flex-column w-full padding-4" style={{ padding: 'var(--space-4)', gap: 'var(--space-2)' }}>
        <div className="flex-row justify-between align-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
            {formattedDate}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onRequestCorrection && (
              <button
                className="success-btn"
                style={{
                  padding: '3px 8px',
                  fontSize: '0.68rem',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onRequestCorrection(record);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-elevated)';
                  e.currentTarget.style.color = 'var(--color-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                ✏️ Request Correction
              </button>
            )}
            <span className={`ep-badge ${badgeClass}`} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
              <StatusIcon size={12} />
              {statusText}{lateOffsetStr}
            </span>
          </div>
        </div>

        {s === 'absent' ? (
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            No punch record found
          </div>
        ) : (
          <div className="flex-row justify-between flex-wrap gap-2 text-text-secondary" style={{
            fontSize: '0.8125rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center'
          }}>
            <div className="flex-row gap-4 flex-wrap">
              <span>Punch In: <strong>{record?.punchIn || '--:--'}</strong></span>
              <span>Punch Out: <strong>{record?.punchOut || '--:--'}</strong></span>
            </div>
            <div className="flex-row gap-4 flex-wrap">
              <span>Work Hours: <strong>{formatWorkHours(getDisplayHours())}</strong></span>
              <span>Shift: <strong>09:30 AM – 06:00 PM</strong></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceDayCard;
