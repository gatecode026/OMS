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

const mockProjects = [
  {
    id: 'PRJ-001',
    name: 'SaaS Platform v2.0',
    description: 'Full redesign and rebuild of the enterprise workforce management platform with new role-based architecture and modern UI.',
    department: 'Engineering',
    lead: 'Elena Rostova',
    members: ['Elena Rostova', 'John Miller', 'Liam O\'Connor', 'David Kim'],
    status: 'In Progress',
    priority: 'Critical',
    startDate: '2026-01-15',
    deadline: '2026-07-30',
    progress: 62,
    tasksTotal: 48,
    tasksDone: 30,
    color: '#3b82f6',
    tags: ['React', 'Vite', 'RBAC']
  },
  {
    id: 'PRJ-002',
    name: 'Q2 Sales Campaign',
    description: 'Targeted outbound marketing campaign for enterprise clients. Includes email sequences, demo scheduling, and ROI tracking.',
    department: 'Sales',
    lead: 'Marcus Vance',
    members: ['Marcus Vance', 'Carlos Mendez'],
    status: 'In Progress',
    priority: 'High',
    startDate: '2026-04-01',
    deadline: '2026-06-30',
    progress: 78,
    tasksTotal: 12,
    tasksDone: 9,
    color: '#10b981',
    tags: ['Outbound', 'Enterprise', 'CRM']
  },
  {
    id: 'PRJ-003',
    name: 'Brand Identity Refresh',
    description: 'Redesign of all brand assets including logo, style guide, website hero section, and social media templates.',
    department: 'Marketing',
    lead: 'Aiko Tanaka',
    members: ['Aiko Tanaka', 'Priya Sharma'],
    status: 'Planning',
    priority: 'Medium',
    startDate: '2026-06-01',
    deadline: '2026-08-15',
    progress: 10,
    tasksTotal: 20,
    tasksDone: 2,
    color: '#8b5cf6',
    tags: ['Branding', 'Design', 'Marketing']
  },
  {
    id: 'PRJ-004',
    name: 'HR Policy Compliance Audit',
    description: 'Complete audit of HR policies, employment contracts, and GDPR data handling procedures across all branches.',
    department: 'Human Resources',
    lead: 'Sophia Laurent',
    members: ['Sophia Laurent', 'Sarah Connor'],
    status: 'Completed',
    priority: 'Low',
    startDate: '2026-03-01',
    deadline: '2026-05-15',
    progress: 100,
    tasksTotal: 18,
    tasksDone: 18,
    color: '#f59e0b',
    tags: ['Compliance', 'GDPR', 'Audit']
  },
  {
    id: 'PRJ-005',
    name: 'Legacy Migration Core',
    description: 'Migration of database and legacy core APIs to the cloud platform. Delayed due to data mapping complexity.',
    department: 'Engineering',
    lead: 'David Kim',
    members: ['David Kim', 'Liam O\'Connor'],
    status: 'Delayed',
    priority: 'High',
    startDate: '2025-10-01',
    deadline: '2025-12-01',
    progress: 45,
    tasksTotal: 30,
    tasksDone: 12,
    color: '#ef4444',
    tags: ['Database', 'Cloud', 'Migration']
  }
];

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
  const { addToast } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlStatus = searchParams.get('status');
  const urlDept = searchParams.get('department');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(urlStatus || 'All');
  const [deptFilter, setDeptFilter] = useState(urlDept || 'All');

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

  const filtered = mockProjects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.department.toLowerCase().includes(search.toLowerCase()) ||
      p.lead.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || p.status === statusFilter;
    const matchDept = deptFilter === 'All' || p.department.toLowerCase() === deptFilter.toLowerCase();
    return matchSearch && matchStatus && matchDept;
  });

  const totalTasks = mockProjects.reduce((a, p) => a + p.tasksTotal, 0);
  const doneTasks  = mockProjects.reduce((a, p) => a + p.tasksDone, 0);

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
          { label: 'Total Projects', value: mockProjects.length, color: '#3b82f6' },
          { label: 'In Progress', value: mockProjects.filter(p => p.status === 'In Progress').length, color: '#f59e0b' },
          { label: 'Completed', value: mockProjects.filter(p => p.status === 'Completed').length, color: '#10b981' },
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
