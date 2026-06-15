import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';

const MyAttendanceWidget = ({
  currentUser = {},
  attendanceRecord = {},
  attendanceHistory = [],
  onOpenPunchModal
}) => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const parseTimeToSeconds = (timeStr) => {
    if (!timeStr || timeStr === '--:--') return null;
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
    if (!match) {
      const parts = timeStr.trim().split(':');
      if (parts.length >= 2) {
        const hrs = parseInt(parts[0], 10);
        const mins = parseInt(parts[1], 10);
        const secs = parts.length >= 3 ? parseInt(parts[2], 10) : 0;
        if (!isNaN(hrs) && !isNaN(mins)) {
          return hrs * 3600 + mins * 60 + (isNaN(secs) ? 0 : secs);
        }
      }
      return null;
    }
    let hrs = parseInt(match[1], 10);
    const mins = parseInt(match[2], 10);
    const ampm = match[3].toUpperCase();
    if (ampm === 'PM' && hrs !== 12) hrs += 12;
    if (ampm === 'AM' && hrs === 12) hrs = 0;
    return hrs * 3600 + mins * 60;
  };

  const getLiveWorkingSeconds = () => {
    if (attendanceRecord?.punchIn && attendanceRecord.punchIn !== '--:--') {
      const inSecs = parseTimeToSeconds(attendanceRecord.punchIn);
      if (inSecs !== null) {
        const hasPunchOut = attendanceRecord.punchOut && attendanceRecord.punchOut !== '--:--';
        const outSecs = hasPunchOut 
          ? parseTimeToSeconds(attendanceRecord.punchOut)
          : (currentTime.getHours() * 3600 + currentTime.getMinutes() * 60 + currentTime.getSeconds());
          
        if (outSecs !== null) {
          let diffSecs = outSecs - inSecs;
          if (diffSecs < 0) {
            diffSecs += 24 * 3600;
          }
          return diffSecs;
        }
      }
    }
    
    // Fallback to totalHours or workingHours in decimal format
    const hrsVal = attendanceRecord?.totalHours || attendanceRecord?.workingHours || 0;
    if (typeof hrsVal === 'number') {
      return Math.round(hrsVal * 3600);
    }
    const parsedHrs = parseFloat(String(hrsVal).replace(/hrs|hr|hours|hour|%/gi, '').trim());
    return isNaN(parsedHrs) ? 0 : Math.round(parsedHrs * 3600);
  };

  // Calculate monthly stats dynamically from database history of the current month
  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  const monthPrefix = `${currentYear}-${currentMonth}`;
  const thisMonthAttendance = attendanceHistory.filter(h => (h.date || '').startsWith(monthPrefix));
  
  const presentDays = thisMonthAttendance.filter(h => 
    h.status === 'Present' || 
    h.status === 'Late' || 
    h.status === 'Overtime' || 
    h.status === 'Work From Home'
  ).length;
  const attendancePercentage = thisMonthAttendance.length > 0 
    ? Math.min(100, Math.round((presentDays / thisMonthAttendance.length) * 100)) 
    : 0;

  // Live stats from record in seconds
  const workingSeconds = getLiveWorkingSeconds();
  const overtimeSeconds = Math.max(0, workingSeconds - 8 * 3600);

  const formatSecondsTo60 = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
  };

  const workingHoursFormatted = useMemo(() => {
    return formatSecondsTo60(workingSeconds);
  }, [workingSeconds]);

  const overtimeFormatted = useMemo(() => {
    return formatSecondsTo60(overtimeSeconds);
  }, [overtimeSeconds]);

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'present') return <span className="status-badge status-present">Present</span>;
    if (s === 'absent') return <span className="status-badge status-absent">Absent</span>;
    if (s === 'late') return <span className="status-badge status-late">Late</span>;
    if (s === 'work from home' || s === 'wfh') return <span className="status-badge status-wfh">WFH</span>;
    if (s.includes('leave')) return <span className="status-badge status-leave">On Leave</span>;
    return <span className="status-badge status-late">Not Punched</span>;
  };

  return (
    <div className="dashboard-widget">
      <div className="widget-header">
        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700' }}>My Attendance</h3>
        <button
          onClick={() => navigate(`/employee-profile/${currentUser?.id || ''}`)}
          style={{ 
            fontSize: '0.75rem', 
            color: 'var(--color-primary, #d946ef)', 
            fontWeight: '600',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
          onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
        >
          View History
        </button>
      </div>

      <div className="widget-content flex-column gap-4">
        {/* Main Display Row */}
        <div className="flex-row justify-between align-center flex-wrap gap-4">
          <div className="flex-column gap-1">
            <span className="text-xs text-text-muted bold-text uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>Today's Status</span>
            <div className="mt-1">{getStatusBadge(attendanceRecord.status)}</div>
          </div>

          <div className="flex-row gap-4">
            <div className="flex-column">
              <span className="text-xs text-text-muted bold-text uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>Punch In</span>
              <span className="bold-text text-sm mt-1">{attendanceRecord.punchIn || '--:--'}</span>
            </div>
            <div className="flex-column">
              <span className="text-xs text-text-muted bold-text uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>Punch Out</span>
              <span className="bold-text text-sm mt-1">{attendanceRecord.punchOut || 'Pending'}</span>
            </div>
          </div>
        </div>

        {/* Numeric stats with tinted professional styling */}
        <div className="summary-cards-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          <div className="mini-stat-card" style={{ 
            background: 'rgba(59, 130, 246, 0.04)', 
            boxShadow: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '10px 8px',
            borderRadius: '8px',
            border: '1px solid var(--accent-blue-translucent, rgba(59, 130, 246, 0.15))'
          }}>
            <span className="text-xs text-text-muted block font-semibold" style={{ fontSize: '0.72rem' }}>Working Hours</span>
            <span className="bold-text text-sm block mt-1" style={{ color: '#3b82f6', fontWeight: '700' }}>{workingHoursFormatted}</span>
          </div>

          <div className="mini-stat-card" style={{ 
            background: 'rgba(139, 92, 246, 0.04)', 
            boxShadow: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '10px 8px',
            borderRadius: '8px',
            border: '1px solid var(--color-purple-light, rgba(139, 92, 246, 0.15))'
          }}>
            <span className="text-xs text-text-muted block font-semibold" style={{ fontSize: '0.72rem' }}>Overtime</span>
            <span className="bold-text text-sm block mt-1" style={{ color: '#8b5cf6', fontWeight: '700' }}>{overtimeFormatted}</span>
          </div>

          <div className="mini-stat-card" style={{ 
            background: 'rgba(217, 70, 239, 0.04)', 
            boxShadow: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '10px 8px',
            borderRadius: '8px',
            border: '1px solid var(--color-primary-light, rgba(217, 70, 239, 0.15))'
          }}>
            <span className="text-xs text-text-muted block font-semibold" style={{ fontSize: '0.72rem' }}>Monthly Rate</span>
            <span className="bold-text text-sm block mt-1" style={{ color: 'var(--color-primary, #d946ef)', fontWeight: '700' }}>{attendancePercentage}%</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex-row gap-3 mt-1 flex-wrap">
          <button
            onClick={onOpenPunchModal}
            className="flex-1 padding-2 text-xs bold-text rounded flex-center gap-2 transition-all"
            style={{ 
              border: 'none', 
              cursor: 'pointer', 
              background: 'var(--color-primary, #d946ef)', 
              color: '#ffffff',
              fontWeight: '700',
              padding: '10px 14px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-primary-hover, #e879f9)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--color-primary, #d946ef)';
              e.currentTarget.style.transform = 'none';
            }}
          >
            <Clock size={14} /> Mark Attendance
          </button>
          <button
            onClick={() => navigate('/attendance/webportal')}
            className="flex-1 padding-2 text-xs bold-text rounded flex-center gap-2 transition-all"
            style={{ 
              cursor: 'pointer',
              background: 'var(--bg-elevated, rgba(255, 255, 255, 0.02))',
              border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
              color: 'var(--text-primary)',
              fontWeight: '600',
              padding: '10px 14px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.color = 'var(--color-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-elevated, rgba(255, 255, 255, 0.02))';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
          >
            View History
          </button>
        </div>
      </div>
    </div>
  );
};

export default MyAttendanceWidget;
