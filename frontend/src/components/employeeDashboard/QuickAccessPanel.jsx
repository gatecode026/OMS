import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Clock, CheckSquare, Briefcase, FileText, Calendar, DollarSign, X } from 'lucide-react';

const QuickAccessPanel = ({
  onPunchClick,
  onReportClick,
  onLeaveClick
}) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const quickActions = [
    {
      name: 'Mark Attendance',
      desc: 'Punch In / Out today',
      icon: Clock,
      color: '#10b981',
      bgLight: 'rgba(16, 185, 129, 0.12)',
      action: onPunchClick
    },
    {
      name: 'Submit DWR',
      desc: 'Log today\'s work report',
      icon: FileText,
      color: '#f59e0b',
      bgLight: 'rgba(245, 158, 11, 0.12)',
      action: onReportClick
    },
    {
      name: 'Apply Leave',
      desc: 'Request time off',
      icon: Calendar,
      color: '#8b5cf6',
      bgLight: 'rgba(139, 92, 246, 0.12)',
      action: onLeaveClick
    },
    {
      name: 'My Tasks',
      desc: 'Check pending work',
      icon: CheckSquare,
      color: '#d946ef',
      bgLight: 'rgba(217, 70, 239, 0.12)',
      path: '/tasks'
    },
    {
      name: 'Active Projects',
      desc: 'Track assigned projects',
      icon: Briefcase,
      color: '#3b82f6',
      bgLight: 'rgba(59, 130, 246, 0.12)',
      path: '/projects'
    },
    {
      name: 'My Payslips',
      desc: 'View salary details',
      icon: DollarSign,
      color: '#10b981',
      bgLight: 'rgba(16, 185, 129, 0.12)',
      path: '/payroll'
    }
  ];

  const handleItemClick = (item) => {
    setOpen(false);
    if (item.action) {
      item.action();
    } else if (item.path) {
      navigate(item.path);
    }
  };

  return (
    <>
      {/* DESKTOP FLOATING QUICK ACCESS */}
      <div className="quick-access-desktop-wrapper" ref={panelRef}>
        <button
          onClick={() => setOpen(!open)}
          className="quick-access-btn"
          title="Quick Access Panel"
        >
          {open ? <X size={20} /> : <Zap size={20} />}
        </button>

        {open && (
          <div className="quick-access-menu">
            <div className="flex-row justify-between align-center pb-2 border-b-border mb-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <span className="bold-text text-xs text-text-muted uppercase tracking-wider">Control Center</span>
              <span className="text-xs text-primary-500 font-bold">Quick Actions</span>
            </div>
            <div className="quick-access-grid">
              {quickActions.map((item, index) => {
                const Icon = item.icon;
                return (
                  <button
                    key={index}
                    onClick={() => handleItemClick(item)}
                    className="quick-action-grid-card"
                    style={{ background: 'none', border: 'none' }}
                  >
                    <div className="quick-action-grid-icon" style={{ backgroundColor: item.bgLight, color: item.color }}>
                      <Icon size={16} />
                    </div>
                    <div className="quick-action-grid-content">
                      <span className="quick-action-grid-title">{item.name}</span>
                      <span className="quick-action-grid-desc">{item.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* MOBILE SLEEK BOTTOM BAR */}
      <div className="quick-access-mobile-bar">
        <button onClick={onPunchClick} className="mobile-bar-action" style={{ background: 'none', border: 'none' }}>
          <Clock size={18} className="text-success" />
          <span>Punch In/Out</span>
        </button>
        <button onClick={onReportClick} className="mobile-bar-action" style={{ background: 'none', border: 'none' }}>
          <FileText size={18} className="text-warning" />
          <span>Log DWR</span>
        </button>
        <button onClick={onLeaveClick} className="mobile-bar-action" style={{ background: 'none', border: 'none' }}>
          <Calendar size={18} className="text-purple" />
          <span>Apply Leave</span>
        </button>
      </div>
    </>
  );
};

export default QuickAccessPanel;
