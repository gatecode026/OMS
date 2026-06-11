import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  CheckCircle,
  Briefcase,
  FileText,
  Calendar,
  Award,
  ArrowUpRight
} from 'lucide-react';

const TopSummaryCards = ({
  currentUser = {},
  attendanceData = {},
  todayTasks = [],
  activeProjectsCount = 0,
  dwrStatus = 'Pending',
  leaveBalance = 0,
  performance = {}
}) => {
  const navigate = useNavigate();

  const cards = [
    {
      id: 'attendance',
      label: 'My Attendance',
      value: attendanceData.status || 'Not Checked In',
      detail: attendanceData.punchIn || '--:--',
      icon: Clock,
      color: 'text-success',
      path: '/attendance'
    },
    {
      id: 'tasks',
      label: 'Today\'s Tasks',
      value: todayTasks.length > 0 ? `${todayTasks.filter(t => t.status === 'Done').length}/${todayTasks.length}` : '0/0',
      detail: `${todayTasks.filter(t => t.status !== 'Done').length} Pending`,
      icon: CheckCircle,
      color: 'text-primary-500',
      path: '/tasks'
    },
    {
      id: 'projects',
      label: 'Active Projects',
      value: activeProjectsCount,
      detail: 'Assigned to you',
      icon: Briefcase,
      color: 'text-info',
      path: '/projects'
    },
    {
      id: 'dwr',
      label: 'Report Status',
      value: dwrStatus || 'Pending',
      detail: 'Work Report',
      icon: FileText,
      color: 'text-warning',
      path: '/work-reports'
    },
    {
      id: 'leave',
      label: 'Leave Balance',
      value: `${leaveBalance} Days`,
      detail: 'Available leaves',
      icon: Calendar,
      color: 'text-purple',
      path: '/leaves'
    },
    {
      id: 'performance',
      label: 'Performance Score',
      value: performance.overall ? `${performance.overall}%` : 'N/A',
      detail: performance.overall >= 90 ? 'Excellent' : performance.overall >= 80 ? 'Good' : 'Average',
      icon: Award,
      color: 'text-success',
      path: '/performance'
    }
  ];

  const renderValue = (card) => {
    if (card.id === 'attendance') {
      const status = card.value;
      let badgeClass = 'status-badge ';
      if (status === 'Present' || status === 'WFH' || status === 'Work From Home') {
        badgeClass += 'status-present';
      } else if (status === 'Late') {
        badgeClass += 'status-late';
      } else if (status === 'Absent') {
        badgeClass += 'status-absent';
      } else if (status === 'Half Day' || status === 'Half-Day') {
        badgeClass += 'status-late';
      } else if (status === 'On Leave' || status === 'Leave') {
        badgeClass += 'status-leave';
      } else {
        badgeClass += 'status-neutral';
      }
      return (
        <span className={badgeClass} style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700 }}>
          {status}
        </span>
      );
    }

    if (card.id === 'performance') {
      return (
        <span className="bold-text text-lg" style={{ fontSize: '1.35rem', color: '#10b981' }}>{card.value}</span>
      );
    }

    return (
      <span className="bold-text text-lg" style={{ fontSize: '1.35rem', color: 'var(--text-primary)' }}>{card.value}</span>
    );
  };

  return (
    <div className="summary-cards-grid">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className={`summary-card card-${card.id}`}
            onClick={() => navigate(card.path)}
          >
            <div className="flex-row justify-between w-full align-center" style={{ marginBottom: '8px' }}>
              <div className="icon-wrapper" style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease'
              }}>
                <Icon size={18} />
              </div>
              <div className="arrow-wrapper" style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255, 255, 255, 0.03)'
              }}>
                <ArrowUpRight size={14} />
              </div>
            </div>
            
            <div className="flex-column items-start" style={{ gap: '4px' }}>
              <span className="text-xs text-text-muted bold-text uppercase tracking-wider" style={{ fontSize: '0.68rem', letterSpacing: '0.05em' }}>
                {card.label}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', height: '28px' }}>
                {renderValue(card)}
              </div>
            </div>

            <div className="flex-row justify-between w-full align-center" style={{ borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '8px', marginTop: '4px' }}>
              <span className="text-xs text-text-muted" style={{ fontSize: '0.72rem' }}>
                {card.id === 'attendance' ? `Punch In: ${card.detail}` : card.detail}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TopSummaryCards;
