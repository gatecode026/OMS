import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import './Projects.css';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Avatar from '../components/common/Avatar';
import Skeleton from '../components/common/Skeleton';
import {
  Briefcase, Plus, Search, Calendar, TrendingUp, AlertTriangle,
  CheckCircle, Clock, Users, MoreVertical, ExternalLink
} from 'lucide-react';

const mockProjects = [];

const statusVariant = {
  'In Progress': 'primary',
  Planning: 'warning',
  Completed: 'success',
  'On Hold': 'neutral',
  Delayed: 'danger'
};

const priorityVariant = {
  Critical: 'danger',
  High: 'warning',
  Medium: 'neutral',
  Low: 'success'
};

const Projects = () => {
  const isLoading = usePageLoading(500);
  const { addToast, projectsList = [] } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlStatus = searchParams.get('status');
  const urlDept = searchParams.get('department');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(urlStatus || 'All');
  const [deptFilter, setDeptFilter] = useState(urlDept || 'All');

  const projects = React.useMemo(() => {
    return projectsList.map(p => ({
      id: p.id,
      name: p.name || 'Unnamed Project',
      description: p.description || '',
      department: p.department || 'General',
      lead: p.leader || p.lead || 'Unassigned',
      members: p.membersList || p.members || [],
      status: p.status || 'Planning',
      priority: p.priority || 'Medium',
      startDate: p.startDate || '',
      deadline: p.deadline || '',
      progress: p.progress || 0,
      tasksTotal: p.tasks?.length || p.tasksTotal || 0,
      tasksDone: p.tasks?.filter(t => t.completed || t.status === 'Done')?.length || p.tasksDone || 0,
      color: p.color || '#3b82f6',
      tags: p.tags || []
    }));
  }, [projectsList]);

  const handleStatusChange = (status) => {
    setStatusFilter(status);
    const newParams = new URLSearchParams(searchParams);
    if (status === 'All') {
      newParams.delete('status');
    } else {
      newParams.set('status', status);
    }
    setSearchParams(newParams);
  };

  const handleClearDeptFilter = () => {
    setDeptFilter('All');
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('department');
    setSearchParams(newParams);
  };

  const filtered = projects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.department.toLowerCase().includes(search.toLowerCase()) ||
      p.lead.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || p.status === statusFilter;
    const matchDept = deptFilter === 'All' || p.department.toLowerCase() === deptFilter.toLowerCase();
    return matchSearch && matchStatus && matchDept;
  });

  const totalTasks = projects.reduce((a, p) => a + p.tasksTotal, 0);
  const doneTasks  = projects.reduce((a, p) => a + p.tasksDone, 0);

  if (isLoading) {
    return (
      <div className="projects-page">
        {[1, 2, 3].map(i => <div key={i} className="card" style={{ height: 280 }}><Skeleton variant="rect" height="100%" width="100%" /></div>)}
      </div>
    );
  }

  return (
    <div className="projects-page">

      {/* Stats Row */}
      <div className="projects-stats">
        {[
          { label: 'Total Projects', value: projects.length, color: '#3b82f6' },
          { label: 'In Progress', value: projects.filter(p => p.status === 'In Progress').length, color: '#f59e0b' },
          { label: 'Completed', value: projects.filter(p => p.status === 'Completed').length, color: '#10b981' },
          { label: 'Tasks Done', value: `${doneTasks}/${totalTasks}`, color: '#8b5cf6' }
        ].map((s, i) => (
          <div key={i} className="card prj-stat-card">
            <span className="prj-stat-val" style={{ color: s.color }}>{s.value}</span>
            <span className="prj-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="card prj-toolbar">
        <div className="dept-search-wrap">
          <Search size={16} className="dept-search-icon" />
          <input
            className="dept-search-input"
            placeholder="Search projects..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="prj-status-filters">
          {['All', 'Planning', 'In Progress', 'Completed', 'Delayed'].map(s => (
            <button
              key={s}
              className={`notif-filter-btn ${statusFilter === s ? 'active' : ''}`}
              onClick={() => handleStatusChange(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <Button variant="primary" icon={Plus} onClick={() => addToast('info', 'Project creation coming soon!')}>
          New Project
        </Button>
      </div>

      {/* Active filters display */}
      {deptFilter !== 'All' && (
        <div className="card flex-center justify-start gap-2 py-2 px-4 mb-4 text-sm animate-fade-in" style={{ width: 'fit-content', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <span className="text-muted">Filtering by department:</span>
          <Badge variant="purple">{deptFilter}</Badge>
          <button 
            className="icon-action-btn icon-action-danger" 
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '0 4px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', marginLeft: '6px', color: 'var(--text-muted)' }}
            onClick={handleClearDeptFilter}
            title="Clear department filter"
          >
            ×
          </button>
        </div>
      )}

      {/* Project Cards */}
      <div className="prj-list">
        {filtered.map(prj => (
          <div
            key={prj.id}
            className="card prj-card animate-fade-in"
            style={{ borderLeft: `4px solid ${prj.color}` }}
          >
            <div className="prj-card-top">
              <div className="prj-card-title-group">
                <div className="prj-title-row">
                  <h3 className="prj-title">{prj.name}</h3>
                  <Badge variant={statusVariant[prj.status]}>{prj.status}</Badge>
                  <Badge variant={priorityVariant[prj.priority]}>{prj.priority}</Badge>
                </div>
                <p className="prj-desc">{prj.description}</p>
                <div className="prj-tags">
                  {prj.tags.map(t => <span key={t} className="ann-tag">#{t}</span>)}
                </div>
              </div>

              <div className="prj-card-meta">
                <div className="prj-meta-grid">
                  <div className="prj-meta-cell">
                    <span className="prj-meta-label"><Calendar size={11} /> Deadline</span>
                    <span className="prj-meta-val">{prj.deadline}</span>
                  </div>
                  <div className="prj-meta-cell">
                    <span className="prj-meta-label"><Briefcase size={11} /> Dept</span>
                    <span className="prj-meta-val">{prj.department}</span>
                  </div>
                  <div className="prj-meta-cell">
                    <span className="prj-meta-label"><CheckCircle size={11} /> Tasks</span>
                    <span className="prj-meta-val">{prj.tasksDone}/{prj.tasksTotal}</span>
                  </div>
                </div>

                <div className="prj-members">
                  {prj.members.slice(0, 4).map(m => (
                    <Avatar key={m} name={m} size="sm" className="team-avatar-overlap" title={m} />
                  ))}
                  {prj.members.length > 4 && (
                    <div className="prj-members-overflow">+{prj.members.length - 4}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="prj-progress-section">
              <div className="prj-progress-header">
                <div className="prj-lead-mini">
                  <Avatar name={prj.lead} size="xs" />
                  <span>{prj.lead}</span>
                </div>
                <span className="prj-progress-pct" style={{ color: prj.color }}>{prj.progress}%</span>
              </div>
              <div className="dept-budget-bar-bg">
                <div
                  className="dept-budget-bar-fill"
                  style={{ width: `${prj.progress}%`, background: prj.color }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default Projects;
