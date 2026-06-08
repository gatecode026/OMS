import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Calendar, CheckSquare, Shield } from 'lucide-react';
import Badge from '../common/Badge';

const MyAttendanceWidget = ({
  attendanceRecord = {},
  attendanceHistory = [],
  onOpenPunchModal
}) => {
  const navigate = useNavigate();

  // Calculate monthly stats
  const totalDaysInMonth = 24; // Average working days
  const presentDays = attendanceHistory.filter(h => h.status === 'Present' || h.status === 'Late' || h.status === 'Overtime' || h.status === 'Work From Home').length;
  const attendancePercentage = presentDays > 0 ? Math.min(100, Math.round((presentDays / totalDaysInMonth) * 100)) : 96;

  // Working hours display
  const workingHours = attendanceRecord.totalHours || attendanceRecord.workingHours || 0;
  const overtime = attendanceRecord.overtime || 0;

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
        <h3>My Attendance</h3>
        <button
          onClick={() => navigate('/attendance/webportal')}
          className="text-xs text-primary-500 hover:text-primary-400 font-semibold"
        >
          View History
        </button>
      </div>
      <div className="widget-content flex-column gap-4">
        {/* Main Display Row */}
        <div className="flex-row justify-between align-center flex-wrap gap-4">
          <div className="flex-column gap-1">
            <span className="text-xs text-text-muted bold-text uppercase">Today's Status</span>
            <div className="mt-1">{getStatusBadge(attendanceRecord.status)}</div>
          </div>

          <div className="flex-row gap-4">
            <div className="flex-column">
              <span className="text-xs text-text-muted bold-text uppercase">Punch In</span>
              <span className="bold-text text-sm mt-1">{attendanceRecord.punchIn || '--:--'}</span>
            </div>
            <div className="flex-column">
              <span className="text-xs text-text-muted bold-text uppercase">Punch Out</span>
              <span className="bold-text text-sm mt-1">{attendanceRecord.punchOut || 'Pending'}</span>
            </div>
          </div>
        </div>

        {/* Numeric stats */}
        <div className="summary-cards-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          <div className="mini-stat-card">
            <span className="text-xs text-text-muted block">Working Hours</span>
            <span className="bold-text text-sm block mt-1">{workingHours} Hrs</span>
          </div>
          <div className="mini-stat-card">
            <span className="text-xs text-text-muted block">Overtime</span>
            <span className="bold-text text-sm block mt-1">{overtime} Hrs</span>
          </div>
          <div className="mini-stat-card">
            <span className="text-xs text-text-muted block">Monthly Rate</span>
            <span className="bold-text text-sm block mt-1">{attendancePercentage}%</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex-row gap-3 mt-1 flex-wrap">
          <button
            onClick={onOpenPunchModal}
            className="flex-1 padding-2 text-xs bold-text bg-primary-500 hover:bg-primary-hover text-white rounded flex-center gap-1 transition-all"
            style={{ border: 'none', cursor: 'pointer', background: 'var(--color-primary)' }}
          >
            <Clock size={14} /> Mark Attendance
          </button>
          <button
            onClick={() => navigate('/attendance/webportal')}
            className="flex-1 padding-2 text-xs bold-text bg-surface border-border text-primary-500 hover:text-primary-400 rounded flex-center gap-1 transition-all"
            style={{ cursor: 'pointer' }}
          >
            View Attendance History
          </button>
        </div>
      </div>
    </div>
  );
};

export default MyAttendanceWidget;
