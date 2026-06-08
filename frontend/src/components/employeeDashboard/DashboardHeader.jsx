import React from 'react';
import Avatar from '../common/Avatar';
import Badge from '../common/Badge';

const DashboardHeader = ({ currentUser }) => {
  if (!currentUser) return null;

  const roleName = currentUser.designation || currentUser.role || 'Employee';

  return (
    <div className="flex-row justify-between align-center flex-wrap gap-4 padding-5 bg-surface border-border border-b-border rounded-lg mb-3 emp-dashboard-header-card">
      <div className="flex-column gap-1">
        <h1 className="bold-text">Employee Dashboard</h1>
        <p className="subtitle">
          Welcome to your personalized workspace. Track your attendance, tasks, projects, daily work reports, leave balance, performance, notifications, and work activities from a single dashboard.
        </p>
      </div>
      <div className="flex-center gap-3">
        <Avatar name={currentUser.name} size="md" />
        <div className="flex-column items-start">
          <span className="bold-text text-sm">Welcome back, {currentUser.name}!</span>
          <span className="text-xs text-muted mt-1">
            <Badge variant="primary">{roleName}</Badge>
          </span>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
