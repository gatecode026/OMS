import React, { useState } from 'react';
import './Departments.css';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Avatar from '../components/common/Avatar';
import Skeleton from '../components/common/Skeleton';
import Modal from '../components/common/Modal';
import {
  GitMerge, Plus, Users, TrendingUp, Clock, Search,
  Edit2, Trash2, MoreVertical, Building2, X, Save
} from 'lucide-react';

const mockDepartments = [
  {
    id: 'DEPT-001',
    name: 'Engineering',
    head: 'Elena Rostova',
    headId: 'EMP-2026-003',
    employeeCount: 4,
    branch: 'London',
    budget: 480000,
    spent: 310000,
    projects: 3,
    avgPerformance: 88,
    color: '#3b82f6',
    description: 'Responsible for all software development, infrastructure management, and technical innovation across the platform.',
    createdDate: '2022-01-15'
  },
  {
    id: 'DEPT-002',
    name: 'Sales',
    head: 'Marcus Vance',
    headId: 'EMP-2026-004',
    employeeCount: 2,
    branch: 'Jaipur',
    budget: 320000,
    spent: 198000,
    projects: 2,
    avgPerformance: 92,
    color: '#10b981',
    description: 'Drives revenue growth through new business acquisition, account management, and client relationship development.',
    createdDate: '2022-01-15'
  },
  {
    id: 'DEPT-003',
    name: 'Marketing',
    head: 'Aiko Tanaka',
    headId: 'EMP-2026-005',
    employeeCount: 2,
    branch: 'Tokyo',
    budget: 250000,
    spent: 165000,
    projects: 4,
    avgPerformance: 79,
    color: '#8b5cf6',
    description: 'Manages brand identity, digital marketing campaigns, content creation, and customer acquisition strategies.',
    createdDate: '2022-03-01'
  },
  {
    id: 'DEPT-004',
    name: 'Human Resources',
    head: 'Sophia Laurent',
    headId: 'EMP-2026-007',
    employeeCount: 1,
    branch: 'London',
    budget: 180000,
    spent: 92000,
    projects: 2,
    avgPerformance: 85,
    color: '#f59e0b',
    description: 'Handles recruitment, employee onboarding, training & development, performance reviews, and compliance.',
    createdDate: '2022-01-15'
  },
  {
    id: 'DEPT-005',
    name: 'Operations',
    head: 'Aarav Sharma',
    headId: 'EMP-2026-001',
    employeeCount: 1,
    branch: 'Jaipur',
    budget: 290000,
    spent: 210000,
    projects: 1,
    avgPerformance: 95,
    color: '#ef4444',
    description: 'Oversees day-to-day business operations, process optimization, vendor management, and cross-team coordination.',
    createdDate: '2022-01-15'
  }
];

const DeptDetailModal = ({ dept, onClose }) => {
  if (!dept) return null;
  const spentPct = Math.round((dept.spent / dept.budget) * 100);

  return (
    <Modal isOpen={!!dept} onClose={onClose} title={`${dept.name} Department`} size="md">
      <div className="dept-modal-body">
        <div className="dept-modal-head" style={{ borderColor: dept.color }}>
          <div className="dept-modal-icon" style={{ background: `${dept.color}20`, color: dept.color }}>
            <GitMerge size={28} />
          </div>
          <div>
            <h3 className="dept-modal-name">{dept.name}</h3>
            <p className="dept-modal-branch">{dept.branch} Branch</p>
          </div>
        </div>

        <p className="dept-modal-desc">{dept.description}</p>

        <div className="dept-modal-stats-grid">
          <div className="dept-stat-tile">
            <span className="dept-stat-label">Employees</span>
            <span className="dept-stat-val" style={{ color: dept.color }}>{dept.employeeCount}</span>
          </div>
          <div className="dept-stat-tile">
            <span className="dept-stat-label">Active Projects</span>
            <span className="dept-stat-val" style={{ color: dept.color }}>{dept.projects}</span>
          </div>
          <div className="dept-stat-tile">
            <span className="dept-stat-label">Performance</span>
            <span className="dept-stat-val" style={{ color: dept.color }}>{dept.avgPerformance}%</span>
          </div>
          <div className="dept-stat-tile">
            <span className="dept-stat-label">Since</span>
            <span className="dept-stat-val" style={{ color: dept.color, fontSize: '1rem' }}>{dept.createdDate}</span>
          </div>
        </div>

        <div className="dept-modal-budget">
          <div className="dept-budget-header">
            <span className="dept-stat-label">Budget Utilization</span>
            <span className="dept-budget-pct" style={{ color: spentPct > 80 ? '#ef4444' : dept.color }}>{spentPct}%</span>
          </div>
          <div className="dept-budget-bar-bg">
            <div
              className="dept-budget-bar-fill"
              style={{ width: `${spentPct}%`, background: spentPct > 80 ? '#ef4444' : dept.color }}
            />
          </div>
          <div className="dept-budget-numbers">
            <span>${dept.spent.toLocaleString()} spent</span>
            <span>${dept.budget.toLocaleString()} total</span>
          </div>
        </div>

        <div className="dept-modal-head-section">
          <span className="dept-stat-label">Department Head</span>
          <div className="dept-head-profile">
            <Avatar name={dept.head} size="md" />
            <div>
              <span className="dept-head-name">{dept.head}</span>
              <span className="dept-head-role">Department Head</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

const Departments = () => {
  const isLoading = usePageLoading(500);
  const { employees, addToast, showConfirm } = useApp();
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState(null);
  const [departments, setDepartments] = useState(mockDepartments);

  const filtered = departments.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.head.toLowerCase().includes(search.toLowerCase()) ||
    d.branch.toLowerCase().includes(search.toLowerCase())
  );

  const totalBudget = departments.reduce((acc, d) => acc + d.budget, 0);
  const totalSpent = departments.reduce((acc, d) => acc + d.spent, 0);
  const totalEmployees = departments.reduce((acc, d) => acc + d.employeeCount, 0);
  const avgPerf = Math.round(departments.reduce((acc, d) => acc + d.avgPerformance, 0) / departments.length);

  if (isLoading) {
    return (
      <div className="departments-page">
        <div className="dept-stats-row">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card" style={{ height: 100 }}>
              <Skeleton variant="rect" height="100%" width="100%" />
            </div>
          ))}
        </div>
        <div className="dept-grid">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="card dept-card-skeleton">
              <Skeleton variant="rect" height={220} width="100%" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="departments-page">

      {/* Overview Stats */}
      <div className="dept-stats-row">
        {[
          { label: 'Total Departments', value: departments.length, icon: GitMerge, color: '#3b82f6' },
          { label: 'Total Employees', value: totalEmployees, icon: Users, color: '#10b981' },
          { label: 'Avg Performance', value: `${avgPerf}%`, icon: TrendingUp, color: '#8b5cf6' },
          { label: 'Budget Utilization', value: `${Math.round((totalSpent / totalBudget) * 100)}%`, icon: Clock, color: '#f59e0b' }
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="card dept-summary-stat">
              <div className="dept-sum-icon" style={{ background: `${stat.color}20`, color: stat.color }}>
                <Icon size={20} />
              </div>
              <div>
                <p className="dept-sum-val">{stat.value}</p>
                <p className="dept-sum-label">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="card dept-toolbar">
        <div className="dept-search-wrap">
          <Search size={16} className="dept-search-icon" />
          <input
            className="dept-search-input"
            placeholder="Search departments..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Button
          variant="primary"
          icon={Plus}
          onClick={() => addToast('info', 'Add Department form coming soon!')}
        >
          Add Department
        </Button>
      </div>

      {/* Department Cards Grid */}
      <div className="dept-grid">
        {filtered.map(dept => {
          const spentPct = Math.round((dept.spent / dept.budget) * 100);
          return (
            <div
              key={dept.id}
              className="card dept-card animate-fade-in"
              style={{ borderTop: `3px solid ${dept.color}` }}
            >
              <div className="dept-card-header">
                <div className="dept-card-icon" style={{ background: `${dept.color}20`, color: dept.color }}>
                  <GitMerge size={20} />
                </div>
                <div className="dept-card-actions">
                  <button
                    className="icon-action-btn"
                    title="Edit Department"
                    onClick={() => addToast('info', `Editing ${dept.name}...`)}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    className="icon-action-btn icon-action-danger"
                    title="Delete Department"
                    onClick={() => showConfirm(
                      'Delete Department',
                      `Are you sure you want to delete the ${dept.name} department? This cannot be undone.`,
                      () => {
                        setDepartments(prev => prev.filter(d => d.id !== dept.id));
                        addToast('warning', `${dept.name} department deleted.`);
                      },
                      'danger'
                    )}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <h3 className="dept-card-name">{dept.name}</h3>
              <p className="dept-card-branch"><Building2 size={12} /> {dept.branch}</p>
              <p className="dept-card-desc">{dept.description}</p>

              <div className="dept-card-meta-row">
                <div className="dept-card-meta-item">
                  <Users size={13} />
                  <span>{dept.employeeCount} employees</span>
                </div>
                <div className="dept-card-meta-item">
                  <TrendingUp size={13} />
                  <span>{dept.avgPerformance}% performance</span>
                </div>
              </div>

              <div className="dept-budget-section">
                <div className="dept-budget-header">
                  <span className="dept-budget-label">Budget Used</span>
                  <span
                    className="dept-budget-pct"
                    style={{ color: spentPct > 80 ? '#ef4444' : dept.color }}
                  >
                    {spentPct}%
                  </span>
                </div>
                <div className="dept-budget-bar-bg">
                  <div
                    className="dept-budget-bar-fill"
                    style={{
                      width: `${spentPct}%`,
                      background: spentPct > 80 ? '#ef4444' : dept.color
                    }}
                  />
                </div>
              </div>

              <div className="dept-card-footer">
                <div className="dept-head-mini">
                  <Avatar name={dept.head} size="xs" />
                  <span>{dept.head}</span>
                </div>
                <button
                  className="dept-view-btn"
                  onClick={() => setSelectedDept(dept)}
                  style={{ color: dept.color }}
                >
                  View Details →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <DeptDetailModal dept={selectedDept} onClose={() => setSelectedDept(null)} />
    </div>
  );
};

export default Departments;
