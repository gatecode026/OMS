import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Calendar, FolderOpen, Upload } from 'lucide-react';

const ActiveProjectsWidget = ({
  projects = [],
  allTasks = [],
  myTasks = [],
  onOpenUploadModal
}) => {
  const navigate = useNavigate();

  // Calculate stats
  const activeProjects = projects.filter(p => p.status === 'In Progress' || p.status === 'in_progress');
  const completedProjects = projects.filter(p => p.status === 'Completed' || p.status === 'completed');
  const assignedWorkItemsCount = myTasks.length;
  
  // Find upcoming deadline (nearest due date of user's tasks or project deadlines)
  const sortedTasksWithDeadlines = [...myTasks]
    .filter(t => t.dueDate && t.status !== 'Done')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const upcomingDeadline = sortedTasksWithDeadlines.length > 0 ? sortedTasksWithDeadlines[0].dueDate : '20 Jun 2026';

  // Calculate progress for each project based on its tasks completion
  const getProjectProgress = (projectName) => {
    const projTasks = allTasks.filter(t => t.project === projectName || t.projectName === projectName);
    if (projTasks.length === 0) return 60; // fallback default progress
    const completed = projTasks.filter(t => t.status === 'Done' || t.status === 'done').length;
    return Math.round((completed / projTasks.length) * 100);
  };

  return (
    <div className="dashboard-widget">
      <div className="widget-header">
        <h3>Active Projects</h3>
        <button
          onClick={() => navigate('/projects')}
          className="text-xs text-primary-500 hover:text-primary-400 font-semibold"
        >
          View All Projects
        </button>
      </div>
      <div className="widget-content flex-column gap-4">
        {/* Statistics Row */}
        <div className="summary-cards-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          <div className="mini-stat-card">
            <span className="text-xs text-text-muted block">Active</span>
            <span className="bold-text text-sm block mt-1">{activeProjects.length}</span>
          </div>
          <div className="mini-stat-card">
            <span className="text-xs text-text-muted block">Completed</span>
            <span className="bold-text text-sm block mt-1">{completedProjects.length}</span>
          </div>
          <div className="mini-stat-card">
            <span className="text-xs text-text-muted block">Work Items</span>
            <span className="bold-text text-sm block mt-1">{assignedWorkItemsCount}</span>
          </div>
          <div className="mini-stat-card">
            <span className="text-xs text-text-muted block">Next Deadline</span>
            <span className="bold-text text-xs block mt-1" style={{ fontSize: '0.72rem' }}>{upcomingDeadline}</span>
          </div>
        </div>

        {/* Project Table List */}
        <div className="flex-column gap-2">
          <div className="overflow-x-auto">
            <table className="dash-mini-table">
              <thead>
                <tr className="border-b-border">
                  <th style={{ padding: '8px 12px' }}>Project Name</th>
                  <th style={{ padding: '8px 12px' }}>Progress</th>
                  <th style={{ padding: '8px 12px' }}>Deadline</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {activeProjects.map((project) => {
                  const progress = getProjectProgress(project.name);
                  const deadline = project.name.includes('SaaS') ? '20 Jun 2026' : project.name.includes('Sales') ? '25 Jun 2026' : '30 Jun 2026';
                  return (
                    <tr key={project.id} className="border-b-border">
                      <td style={{ padding: '8px 12px' }}>
                        <span className="bold-text text-sm">{project.name}</span>
                      </td>
                      <td style={{ padding: '8px 12px', width: '35%' }}>
                        <div className="flex-row align-center gap-2">
                          <div className="progress-bar-bg" style={{ flex: 1 }}>
                            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                          </div>
                          <span className="text-xs bold-text">{progress}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '8px 12px', fontSize: '0.8rem' }}>{deadline}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                        <button
                          onClick={() => navigate('/projects')}
                          className="text-xs text-primary-500 hover:text-primary-400 font-semibold"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex-row gap-3 mt-1 flex-wrap">
          <button
            onClick={() => navigate('/projects')}
            className="flex-1 padding-2 text-xs bold-text bg-surface border-border text-primary-500 hover:text-primary-400 rounded flex-center gap-1 transition-all"
            style={{ cursor: 'pointer' }}
          >
            <FolderOpen size={14} /> View Project Details
          </button>
          <button
            onClick={onOpenUploadModal}
            className="flex-1 padding-2 text-xs bold-text bg-surface border-border text-primary-500 hover:text-primary-400 rounded flex-center gap-1 transition-all"
            style={{ cursor: 'pointer' }}
          >
            <Upload size={14} /> Upload Project Files
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActiveProjectsWidget;
