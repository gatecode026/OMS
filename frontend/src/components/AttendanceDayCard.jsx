import React from 'react';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

export const AttendanceDayCard = ({ record }) => {
  const s = (record?.status || '').toLowerCase();
  
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
    return diff > 0 ? ` (+${diff} min)` : '';
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
        <div className="flex-row justify-between align-center">
          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
            {formattedDate}
          </span>
          <span className={`ep-badge ${badgeClass}`} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
            <StatusIcon size={12} />
            {statusText}{lateOffsetStr}
          </span>
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
              <span>Work Hours: <strong>{formatWorkHours(record?.totalHours || record?.workingHours)}</strong></span>
              <span>Shift: <strong>09:30 AM – 06:00 PM</strong></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceDayCard;
