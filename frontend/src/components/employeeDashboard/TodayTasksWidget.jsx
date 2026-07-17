import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, AlertTriangle, Play, Check } from 'lucide-react';
import Badge from '../common/Badge';

const getDisplayStatus = (statusVal) => {
  if (!statusVal) return 'To Do';
  switch (statusVal.toLowerCase()) {
    case 'todo':
    case 'assigned':
    case 'to do':
      return 'To Do';
    case 'in progress':
    case 'in_progress':
    case 'in review':
    case 'under_review':
    case 'review':
      return 'In Progress';
    case 'done':
    case 'completed':
      return 'Done';
    default:
      return 'To Do';
  }
};

const TodayTasksWidget = ({
  tasks = [],
  onUpdateStatus,
  onOpenUpdateModal,
  timePeriod = 'today',
  addToast
}) => {
  const navigate = useNavigate();

  // Statistics calculations
  const totalAssigned = tasks.length;
  const completed = tasks.filter(t => t.status === 'Done' || t.status === 'done').length;
  const inProgress = tasks.filter(t => t.status === 'In Progress' || t.status === 'in_progress').length;
  const pending = tasks.filter(t => t.status === 'To Do' || t.status === 'todo').length;
  
  // Calculate overdue: due date is in the past and task is not completed
  const todayStr = new Date().toISOString().split('T')[0];
  const overdue = tasks.filter(t => t.dueDate < todayStr && t.status !== 'Done' && t.status !== 'done').length;

  // Priority Breakdown
  const highPriority = tasks.filter(t => t.priority === 'High' || t.priority === 'Critical').length;
  const mediumPriority = tasks.filter(t => t.priority === 'Medium').length;
  const lowPriority = tasks.filter(t => t.priority === 'Low').length;

  const getPriorityBadge = (priority) => {
    const p = (priority || '').toLowerCase();
    if (p === 'high' || p === 'critical') return <span className="status-badge priority-high"><span className="task-dot bg-danger" style={{ marginRight: '6px' }}></span>High</span>;
    if (p === 'medium') return <span className="status-badge priority-medium"><span className="task-dot bg-warning" style={{ marginRight: '6px' }}></span>Medium</span>;
    return <span className="status-badge priority-low"><span className="task-dot bg-success" style={{ marginRight: '6px' }}></span>Low</span>;
  };

  const getStatusIcon = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'done' || s === 'completed') return <CheckCircle className="text-success" size={16} />;
    if (s === 'in progress' || s === 'in_progress' || s === 'in review') return <Clock className="text-warning" size={16} />;
    return <Play className="text-text-muted" size={16} />;
  };

  return (
    <div className="dashboard-widget">
      <div className="widget-header">
        <h3>{timePeriod === 'today' ? "Today's Tasks" : timePeriod === 'week' ? "This Week's Tasks" : "This Month's Tasks"}</h3>
        <button
          onClick={() => navigate('/tasks')}
          className="text-xs text-primary-500 hover:text-primary-400 font-semibold"
        >
          View All Tasks
        </button>
      </div>
      <div className="widget-content flex-column gap-4">
        {/* Statistics Row */}
        <div className="summary-cards-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
          <div className="mini-stat-card" style={{ padding: '8px' }}>
            <span className="text-xs text-text-muted block">Assigned</span>
            <span className="bold-text text-sm block mt-1">{totalAssigned}</span>
          </div>
          <div className="mini-stat-card" style={{ padding: '8px' }}>
            <span className="text-xs text-text-muted block">Completed</span>
            <span className="bold-text text-sm block mt-1 text-success">{completed}</span>
          </div>
          <div className="mini-stat-card" style={{ padding: '8px' }}>
            <span className="text-xs text-text-muted block">In Progress</span>
            <span className="bold-text text-sm block mt-1 text-warning">{inProgress}</span>
          </div>
          <div className="mini-stat-card" style={{ padding: '8px' }}>
            <span className="text-xs text-text-muted block">Pending</span>
            <span className="bold-text text-sm block mt-1">{pending}</span>
          </div>
          <div className="mini-stat-card" style={{ padding: '8px', border: overdue > 0 ? '1px solid var(--color-danger)' : '' }}>
            <span className="text-xs text-text-muted block">Overdue</span>
            <span className={`bold-text text-sm block mt-1 ${overdue > 0 ? 'text-danger' : ''}`}>{overdue}</span>
          </div>
        </div>

        {/* Priority Breakdown Progress Bars */}
        <div className="flex-column gap-2 padding-2 bg-surface rounded-lg">
          <div className="flex-row justify-between text-xs">
            <span className="bold-text">Priority Breakdown</span>
          </div>
          
          <div className="flex-column gap-1">
            <div className="flex-row justify-between text-xs text-text-muted align-center">
              <span className="flex-row align-center gap-2"><span className="task-dot bg-danger"></span> High Priority</span>
              <span>{highPriority} tasks</span>
            </div>
            <div className="progress-bar-bg">
              <div 
                className="progress-bar-fill" 
                style={{ 
                  width: `${totalAssigned > 0 ? (highPriority / totalAssigned) * 100 : 0}%`, 
                  backgroundColor: 'var(--color-danger)' 
                }} 
              />
            </div>
          </div>

          <div className="flex-column gap-1">
            <div className="flex-row justify-between text-xs text-text-muted align-center">
              <span className="flex-row align-center gap-2"><span className="task-dot bg-warning"></span> Medium Priority</span>
              <span>{mediumPriority} tasks</span>
            </div>
            <div className="progress-bar-bg">
              <div 
                className="progress-bar-fill" 
                style={{ 
                  width: `${totalAssigned > 0 ? (mediumPriority / totalAssigned) * 100 : 0}%`, 
                  backgroundColor: 'var(--color-warning)' 
                }} 
              />
            </div>
          </div>

          <div className="flex-column gap-1">
            <div className="flex-row justify-between text-xs text-text-muted align-center">
              <span className="flex-row align-center gap-2"><span className="task-dot bg-success"></span> Low Priority</span>
              <span>{lowPriority} tasks</span>
            </div>
            <div className="progress-bar-bg">
              <div 
                className="progress-bar-fill" 
                style={{ 
                  width: `${totalAssigned > 0 ? (lowPriority / totalAssigned) * 100 : 0}%`, 
                  backgroundColor: 'var(--color-success)' 
                }} 
              />
            </div>
          </div>
        </div>

        {/* Task List (max 5) */}
        <div className="flex-column gap-2">
          <span className="text-xs text-text-muted bold-text uppercase">Task List</span>
          <div className="overflow-x-auto">
            <table className="dash-mini-table" style={{ width: '100%' }}>
              <thead>
                <tr className="border-b-border">
                  <th style={{ padding: '8px 12px' }}>Task Name</th>
                  <th style={{ padding: '8px 12px' }}>Priority</th>
                  <th style={{ padding: '8px 12px' }}>Due Date</th>
                  <th style={{ padding: '8px 12px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {tasks.slice(0, 5).map((task) => (
                  <tr key={task.id} className="border-b-border">
                    <td style={{ padding: '8px 12px' }}>
                      <div className="flex-row align-center gap-2">
                        {getStatusIcon(task.status)}
                        <span className="bold-text text-sm">{task.title}</span>
                      </div>
                    </td>
                    <td style={{ padding: '8px 12px' }}>{getPriorityBadge(task.priority)}</td>
                    <td style={{ padding: '8px 12px', fontSize: '0.8rem' }}>{task.dueDate}</td>
                    <td style={{ padding: '8px 12px' }}>
                       <span 
                         className="text-xs font-semibold px-2 py-1 rounded" 
                         style={{ 
                           backgroundColor: 'var(--bg-elevated)', 
                           color: 'var(--text-primary)',
                           display: 'inline-block'
                         }}
                       >
                         {getDisplayStatus(task.status)}
                       </span>
                     </td>
                  </tr>
                ))}
                {tasks.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-text-muted py-4">No tasks assigned for today.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="flex-row gap-3 mt-1 flex-wrap">
          <button
            onClick={() => navigate('/tasks')}
            className="flex-1 padding-2 text-xs bold-text bg-surface border-border text-primary-500 hover:text-primary-400 rounded flex-center gap-1 transition-all"
            style={{ cursor: 'pointer' }}
          >
            View Tasks
          </button>
        </div>
      </div>
    </div>
  );
};

export default TodayTasksWidget;
