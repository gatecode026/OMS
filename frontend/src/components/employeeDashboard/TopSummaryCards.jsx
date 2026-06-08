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
      path: '/attendance/webportal'
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
      label: 'DWR Status',
      value: dwrStatus || 'Pending',
      detail: 'Daily Work Report',
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
            <div className="flex-row justify-between w-full align-center">
              <Icon className={`${card.color}`} size={20} />
              <ArrowUpRight className="text-text-muted" size={16} />
            </div>
            <div className="flex-column items-start mt-2">
              <span className="bold-text text-lg" style={{ fontSize: '1.25rem' }}>{card.value}</span>
              <span className="text-xs text-text-muted mt-1">{card.detail}</span>
            </div>
            <span className="text-xs text-text-muted bold-text uppercase tracking-wider mt-1">{card.label}</span>
          </div>
        );
      })}
    </div>
  );
};

export default TopSummaryCards;
