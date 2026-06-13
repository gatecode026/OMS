import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

export const TodayStatusCard = ({ todayRecord }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Shift settings: 09:30 AM to 06:00 PM
  const shiftStartHour = 9;
  const shiftStartMin = 30;
  const shiftEndHour = 18;
  const shiftEndMin = 0;

  // Calculate live shift progress percentage
  const getProgress = () => {
    const startMins = shiftStartHour * 60 + shiftStartMin; // 570
    const endMins = shiftEndHour * 60 + shiftEndMin; // 1080
    const totalShiftMins = endMins - startMins; // 510

    const nowMins = currentTime.getHours() * 60 + currentTime.getMinutes();

    if (nowMins < startMins) return 0;
    if (nowMins > endMins) return 100;
    return Math.round(((nowMins - startMins) / totalShiftMins) * 100);
  };

  const progressPct = getProgress();

  // Determine status details
  const getStatusDetails = () => {
    if (!todayRecord || todayRecord.isVirtual || todayRecord.status === 'Absent') {
      return {
        label: 'Absent',
        badgeClass: 'ep-badge-danger',
        icon: XCircle,
        desc: 'No punch record found today'
      };
    }
    const s = (todayRecord.status || '').toLowerCase();
    if (s === 'late') {
      return {
        label: 'Late',
        badgeClass: 'ep-badge-warning',
        icon: AlertTriangle,
        desc: 'Punched in after shift start'
      };
    }
    return {
      label: 'On Time',
      badgeClass: 'ep-badge-success',
      icon: CheckCircle,
      desc: 'Shift active'
    };
  };

  const status = getStatusDetails();
  const StatusIcon = status.icon;

  // Format punch times
  const punchInTime = todayRecord?.punchIn || '--:--';
  const punchOutTime = todayRecord?.punchOut || '--:--';

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

  // Format work hours nicely (e.g., "8.5" to "8h 30m")
  const formatWorkHours = (hoursVal) => {
    if (!hoursVal) return '0h 0m';
    const hrs = Math.floor(hoursVal);
    const mins = Math.round((hoursVal - hrs) * 60);
    return `${hrs}h ${mins}m`;
  };

  const getElapsedHours = () => {
    if (todayRecord?.punchIn && todayRecord.punchIn !== '--:--') {
      const inMins = parseTimeToMinutes(todayRecord.punchIn);
      if (inMins !== null) {
        const hasPunchOut = todayRecord.punchOut && todayRecord.punchOut !== '--:--';
        const outMins = hasPunchOut 
          ? parseTimeToMinutes(todayRecord.punchOut)
          : (currentTime.getHours() * 60 + currentTime.getMinutes());
          
        if (outMins !== null) {
          let diffMins = outMins - inMins;
          if (diffMins < 0) {
            diffMins += 24 * 60;
          }
          return diffMins / 60;
        }
      }
    }
    return todayRecord?.totalHours || todayRecord?.workingHours || 0;
  };

  const elapsedHoursStr = formatWorkHours(getElapsedHours());

  // Live time string for display
  const timeString = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="card padding-5 flex-column gap-4 animate-fade-in" style={{
      background: 'var(--bg-card)',
      border: '0.5px solid var(--border-color)',
      borderRadius: 'var(--radius-lg)'
    }}>
      <div className="flex-row justify-between align-center flex-wrap gap-2">
        <div className="flex-row align-center gap-2">
          <span className={`ep-badge ${status.badgeClass}`} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 600 }}>
            <StatusIcon size={14} />
            {status.label}
          </span>
          <span className="text-xs text-text-muted" style={{ fontSize: '0.8rem' }}>({status.desc})</span>
        </div>
        <div className="flex-row align-center gap-2 text-text-secondary" style={{ fontSize: '0.85rem', fontWeight: 500 }}>
          <Clock size={14} className="text-primary" />
          <span>Live: {timeString}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-2" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 'var(--space-4)'
      }}>
        <div className="flex-column">
          <span className="text-xs text-text-secondary" style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Punch In</span>
          <span className="bold-text text-lg mt-1" style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>{punchInTime}</span>
        </div>
        <div className="flex-column">
          <span className="text-xs text-text-secondary" style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Punch Out</span>
          <span className="bold-text text-lg mt-1" style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>{punchOutTime}</span>
        </div>
        <div className="flex-column">
          <span className="text-xs text-text-secondary" style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Work Hours</span>
          <span className="bold-text text-lg mt-1" style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>{elapsedHoursStr}</span>
        </div>
        <div className="flex-column">
          <span className="text-xs text-text-secondary" style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Shift Schedule</span>
          <span className="bold-text text-lg mt-1" style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>09:30 AM - 06:00 PM</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex-column gap-2 mt-2">
        <div className="flex-row justify-between text-xs text-text-secondary" style={{ fontSize: '0.75rem' }}>
          <span>Shift Progress</span>
          <span>{progressPct}% Completed</span>
        </div>
        <div style={{
          height: '8px',
          background: 'var(--bg-elevated)',
          borderRadius: '99px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            height: '100%',
            width: `${progressPct}%`,
            background: 'var(--color-success)',
            borderRadius: '99px',
            transition: 'width 0.5s ease-in-out'
          }} />
        </div>
      </div>
    </div>
  );
};

export default TodayStatusCard;
