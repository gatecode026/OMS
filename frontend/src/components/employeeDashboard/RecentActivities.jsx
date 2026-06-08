import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, FileText, Calendar, Paperclip, Users, AlertTriangle } from 'lucide-react';

const RecentActivities = ({
  myActivities = []
}) => {
  const navigate = useNavigate();

  const getActivityIcon = (module, action = '') => {
    const mod = (module || '').toLowerCase();
    const act = (action || '').toLowerCase();

    if (mod === 'attendance' || act.includes('punch')) return <Clock className="text-success" size={14} />;
    if (mod === 'tasks' || act.includes('task')) return <CheckCircle className="text-primary-500" size={14} />;
    if (mod === 'leaves' || act.includes('leave')) return <Calendar className="text-purple" size={14} />;
    if (mod === 'work reports' || act.includes('report')) return <FileText className="text-warning" size={14} />;
    if (act.includes('file') || act.includes('upload')) return <Paperclip className="text-info" size={14} />;
    if (act.includes('meeting') || act.includes('join')) return <Users className="text-success" size={14} />;
    return <AlertTriangle className="text-text-muted" size={14} />;
  };

  return (
    <div className="dashboard-widget">
      <div className="widget-header">
        <h3>Recent Activities</h3>
        <button
          onClick={() => navigate('/activity-logs')}
          className="text-xs text-text-muted font-semibold cursor-default hover:text-text-muted"
        >
          Activity Feed
        </button>
      </div>
      <div className="widget-content flex-column gap-1">
        {myActivities.slice(0, 7).map((activity) => (
          <div key={activity.id} className="activity-item">
            <div className="activity-icon-container">
              {getActivityIcon(activity.module, activity.action)}
            </div>
            <div className="flex-column flex-1">
              <span className="text-sm text-text-primary bold-text" style={{ color: 'var(--text-primary)' }}>
                {activity.action}
              </span>
              <span className="text-xs text-text-muted mt-1">{activity.timestamp || 'Just now'}</span>
            </div>
          </div>
        ))}
        {myActivities.length === 0 && (
          <div className="text-center text-text-muted py-4">No recent activities logged.</div>
        )}
      </div>
    </div>
  );
};

export default RecentActivities;
