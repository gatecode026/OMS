import React, { useState } from 'react';
import './Teams.css';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Avatar from '../components/common/Avatar';
import Skeleton from '../components/common/Skeleton';
import {
  Award, Plus, Users, TrendingUp, Search, Edit2, Trash2, MapPin
} from 'lucide-react';

const mockTeams = [
  {
    id: 'TEAM-001',
    name: 'Frontend Devs',
    leader: 'Ananya Gupta',
    department: 'Engineering',
    branch: 'Delhi',
    members: ['Ananya Gupta', 'Vikram Singh', 'Suresh Kumar'],
    activeProjects: 2,
    tasksCompleted: 14,
    tasksTotal: 18,
    performance: 88,
    color: '#3b82f6'
  },
  {
    id: 'TEAM-002',
    name: 'Domestic Sales',
    leader: 'Rohit Sharma',
    department: 'Sales',
    branch: 'Jaipur',
    members: ['Rohit Sharma', 'Deepak Joshi'],
    activeProjects: 1,
    tasksCompleted: 9,
    tasksTotal: 10,
    performance: 92,
    color: '#10b981'
  },
  {
    id: 'TEAM-003',
    name: 'Digital Marketing',
    leader: 'Priya Patel',
    department: 'Marketing',
    branch: 'Mumbai',
    members: ['Priya Patel', 'Priya Sharma'],
    activeProjects: 4,
    tasksCompleted: 6,
    tasksTotal: 12,
    performance: 79,
    color: '#8b5cf6'
  },
  {
    id: 'TEAM-004',
    name: 'Operations Core',
    leader: 'Aarav Sharma',
    department: 'Operations',
    branch: 'Jaipur',
    members: ['Aarav Sharma'],
    activeProjects: 1,
    tasksCompleted: 5,
    tasksTotal: 5,
    performance: 98,
    color: '#ef4444'
  },
  {
    id: 'TEAM-005',
    name: 'HR Operations',
    leader: 'Neha Verma',
    department: 'Human Resources',
    branch: 'Delhi',
    members: ['Neha Verma'],
    activeProjects: 2,
    tasksCompleted: 3,
    tasksTotal: 4,
    performance: 85,
    color: '#f59e0b'
  },
  {
    id: 'TEAM-006',
    name: 'Data Services',
    leader: 'Arjun Mehta',
    department: 'Engineering',
    branch: 'Bangalore',
    members: ['Arjun Mehta'],
    activeProjects: 1,
    tasksCompleted: 2,
    tasksTotal: 5,
    performance: 72,
    color: '#06b6d4'
  }
];

const Teams = () => {
  const isLoading = usePageLoading(500);
  const { addToast, showConfirm } = useApp();
  const [search, setSearch] = useState('');
  const [teams, setTeams] = useState(mockTeams);

  const filtered = teams.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.leader.toLowerCase().includes(search.toLowerCase()) ||
    t.department.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="teams-page">
        <div className="teams-grid">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="card" style={{ height: 250 }}>
              <Skeleton variant="rect" height="100%" width="100%" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="teams-page">

      {/* Summary Stats */}
      <div className="teams-summary">
        {[
          { label: 'Total Teams', value: teams.length, color: '#3b82f6' },
          { label: 'Team Leaders', value: teams.length, color: '#8b5cf6' },
          { label: 'Total Members', value: teams.reduce((a, t) => a + t.members.length, 0), color: '#10b981' },
          { label: 'Avg Performance', value: `${Math.round(teams.reduce((a, t) => a + t.performance, 0) / teams.length)}%`, color: '#f59e0b' }
        ].map((s, i) => (
          <div key={i} className="card teams-stat-card">
            <span className="teams-stat-val" style={{ color: s.color }}>{s.value}</span>
            <span className="teams-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="card teams-toolbar">
        <div className="dept-search-wrap">
          <Search size={16} className="dept-search-icon" />
          <input
            className="dept-search-input"
            placeholder="Search teams..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Button variant="primary" icon={Plus} onClick={() => addToast('info', 'Team creation form coming soon!')}>
          New Team
        </Button>
      </div>

      {/* Team Cards */}
      <div className="teams-grid">
        {filtered.map(team => {
          const completionPct = Math.round((team.tasksCompleted / team.tasksTotal) * 100);
          return (
            <div
              key={team.id}
              className="card team-card animate-fade-in"
              style={{ borderTop: `3px solid ${team.color}` }}
            >
              <div className="team-card-header">
                <div className="team-icon" style={{ background: `${team.color}20`, color: team.color }}>
                  <Award size={18} />
                </div>
                <div className="team-card-actions">
                  <button className="icon-action-btn" onClick={() => addToast('info', `Editing ${team.name}...`)}>
                    <Edit2 size={13} />
                  </button>
                  <button
                    className="icon-action-btn icon-action-danger"
                    onClick={() => showConfirm(
                      'Disband Team',
                      `Disband "${team.name}"? This cannot be undone.`,
                      () => {
                        setTeams(prev => prev.filter(t => t.id !== team.id));
                        addToast('warning', `${team.name} disbanded.`);
                      },
                      'danger'
                    )}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <h3 className="team-name">{team.name}</h3>

              <div className="team-meta">
                <div className="team-meta-item">
                  <MapPin size={12} />
                  <span>{team.branch}</span>
                </div>
                <div className="team-meta-item">
                  <Badge variant="neutral">{team.department}</Badge>
                </div>
              </div>

              {/* Members */}
              <div className="team-members-section">
                <span className="team-section-label">Members ({team.members.length})</span>
                <div className="team-member-avatars">
                  {team.members.map(m => (
                    <Avatar key={m} name={m} size="sm" className="team-avatar-overlap" title={m} />
                  ))}
                </div>
              </div>

              {/* Task Progress */}
              <div className="team-task-progress">
                <div className="team-task-header">
                  <span className="team-section-label">Task Completion</span>
                  <span className="team-task-count">{team.tasksCompleted}/{team.tasksTotal}</span>
                </div>
                <div className="dept-budget-bar-bg">
                  <div
                    className="dept-budget-bar-fill"
                    style={{ width: `${completionPct}%`, background: team.color }}
                  />
                </div>
              </div>

              {/* Performance */}
              <div className="team-perf-footer">
                <span className="team-section-label">Performance</span>
                <span className="team-perf-score" style={{
                  color: team.performance >= 90 ? '#10b981' : team.performance >= 75 ? '#3b82f6' : '#f59e0b'
                }}>
                  {team.performance}%
                </span>
              </div>

              {/* Leader */}
              <div className="team-leader-row">
                <Avatar name={team.leader} size="xs" />
                <span className="team-leader-name">Lead: {team.leader}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Teams;
