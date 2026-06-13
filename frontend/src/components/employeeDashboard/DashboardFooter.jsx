import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

const DashboardFooter = ({
  myTasks = [],
  myAttendance = [],
  currentUser = {},
  activeProjectsCount = 0,
  leaveBalance = 0
}) => {
  const [lastUpdated, setLastUpdated] = useState('Just now');

  useEffect(() => {
    const timer = setInterval(() => {
      // Simulate changing timestamp
      setLastUpdated('Just now');
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Compute values
  const totalDaysInMonth = 24;
  const presentDays = myAttendance.filter(h => h.status === 'Present' || h.status === 'Late' || h.status === 'Overtime' || h.status === 'Work From Home').length;
  const attendancePercentage = presentDays > 0 ? Math.min(100, Math.round((presentDays / totalDaysInMonth) * 100)) : 0;

  const scoreData = currentUser.performanceScore || {};
  const performanceScore = scoreData.overall !== undefined ? `${scoreData.overall}%` : 'N/A';
  
  // Total completed tasks (sum of current list done)
  const completedTasks = myTasks.filter(t => t.status === 'Done').length;

  return (
    <div className="dashboard-footer-bar flex-row justify-between align-center flex-wrap gap-4 padding-3 bg-surface border-border border-b-border rounded-lg mt-3">
      {/* Stats summary */}
      <div className="flex-row gap-5 flex-wrap">
        <div className="flex-column">
          <span className="text-xs text-text-muted bold-text uppercase">Attendance (Month)</span>
          <span className="bold-text text-sm mt-1">{attendancePercentage}%</span>
        </div>
        <div className="flex-column">
          <span className="text-xs text-text-muted bold-text uppercase">Tasks Completed</span>
          <span className="bold-text text-sm mt-1">{completedTasks}</span>
        </div>
        <div className="flex-column">
          <span className="text-xs text-text-muted bold-text uppercase">Active Projects</span>
          <span className="bold-text text-sm mt-1">{activeProjectsCount}</span>
        </div>
        <div className="flex-column">
          <span className="text-xs text-text-muted bold-text uppercase">Leave Balance</span>
          <span className="bold-text text-sm mt-1">{leaveBalance} Days</span>
        </div>
        <div className="flex-column">
          <span className="text-xs text-text-muted bold-text uppercase">Performance Score</span>
          <span className="bold-text text-sm mt-1">{performanceScore}</span>
        </div>
      </div>

      {/* Status */}
      <div className="flex-row align-center gap-3">
        <div className="flex-row align-center gap-2">
          <span 
            style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              backgroundColor: '#10b981', 
              display: 'inline-block',
              boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.4)'
            }} 
          />
          <span className="bold-text text-xs text-success uppercase">Active Employee</span>
        </div>
        <span className="text-xs text-text-muted">Last updated: {lastUpdated}</span>
      </div>
    </div>
  );
};

export default DashboardFooter;
