import React, { useState } from 'react';
import './Branches.css';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Avatar from '../components/common/Avatar';
import Skeleton from '../components/common/Skeleton';
import {
  Network, Plus, Users, MapPin, Globe, TrendingUp, Search,
  Edit2, Trash2, Clock, BarChart3
} from 'lucide-react';

const mockBranches = [
  {
    id: 'BR-001',
    name: 'Jaipur',
    country: 'India',
    flag: '🇮🇳',
    manager: 'Aarav Sharma',
    managerId: 'EMP-2026-001',
    employeeCount: 3,
    departments: ['Operations', 'Sales', 'Marketing'],
    status: 'Active',
    timezone: 'IST (UTC+5:30)',
    established: '2022-01-15',
    revenue: 2400000,
    growth: '+14.2%',
    growthPositive: true,
    color: '#3b82f6',
    address: 'Malviya Nagar, Jaipur, Rajasthan 302017'
  },
  {
    id: 'BR-002',
    name: 'London',
    country: 'United Kingdom',
    flag: '🇬🇧',
    manager: 'John Miller',
    managerId: 'EMP-2026-002',
    employeeCount: 4,
    departments: ['Engineering', 'Human Resources'],
    status: 'Active',
    timezone: 'GMT (UTC+0)',
    established: '2022-06-10',
    revenue: 1850000,
    growth: '+9.7%',
    growthPositive: true,
    color: '#8b5cf6',
    address: '25 Old Broad Street, London, EC2N 1HQ'
  },
  {
    id: 'BR-003',
    name: 'Tokyo',
    country: 'Japan',
    flag: '🇯🇵',
    manager: 'Aiko Tanaka',
    managerId: 'EMP-2026-005',
    employeeCount: 1,
    departments: ['Marketing'],
    status: 'Active',
    timezone: 'JST (UTC+9)',
    established: '2023-11-01',
    revenue: 920000,
    growth: '+22.1%',
    growthPositive: true,
    color: '#ef4444',
    address: '2-1 Marunouchi, Chiyoda City, Tokyo 100-0005'
  },
  {
    id: 'BR-004',
    name: 'Singapore',
    country: 'Singapore',
    flag: '🇸🇬',
    manager: 'David Kim',
    managerId: 'EMP-2026-006',
    employeeCount: 1,
    departments: ['Engineering'],
    status: 'Active',
    timezone: 'SGT (UTC+8)',
    established: '2024-02-15',
    revenue: 680000,
    growth: '+31.4%',
    growthPositive: true,
    color: '#10b981',
    address: '1 Marina Boulevard, Singapore 018989'
  }
];

const Branches = () => {
  const isLoading = usePageLoading(500);
  const { addToast, showConfirm } = useApp();
  const [search, setSearch] = useState('');
  const [branches, setBranches] = useState(mockBranches);

  const filtered = branches.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.country.toLowerCase().includes(search.toLowerCase()) ||
    b.manager.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = branches.reduce((acc, b) => acc + b.revenue, 0);
  const totalEmployees = branches.reduce((acc, b) => acc + b.employeeCount, 0);

  if (isLoading) {
    return (
      <div className="branches-page">
        {[1, 2, 3].map(i => (
          <div key={i} className="card" style={{ height: 220 }}>
            <Skeleton variant="rect" height="100%" width="100%" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="branches-page">

      {/* Global Stats */}
      <div className="branches-summary">
        {[
          { label: 'Active Branches', value: branches.filter(b => b.status === 'Active').length, icon: Network, color: '#3b82f6' },
          { label: 'Total Employees', value: totalEmployees, icon: Users, color: '#10b981' },
          { label: 'Countries', value: new Set(branches.map(b => b.country)).size, icon: Globe, color: '#8b5cf6' },
          { label: 'Total Revenue', value: `$${(totalRevenue / 1000000).toFixed(1)}M`, icon: BarChart3, color: '#f59e0b' }
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="card branches-sum-card">
              <div className="branches-sum-icon" style={{ background: `${s.color}20`, color: s.color }}>
                <Icon size={20} />
              </div>
              <div>
                <p className="branches-sum-val">{s.value}</p>
                <p className="branches-sum-label">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="card branches-toolbar">
        <div className="dept-search-wrap">
          <Search size={16} className="dept-search-icon" />
          <input
            className="dept-search-input"
            placeholder="Search branches..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Button
          variant="primary"
          icon={Plus}
          onClick={() => addToast('info', 'Add Branch form coming soon!')}
        >
          Add Branch
        </Button>
      </div>

      {/* Branch Cards */}
      <div className="branches-grid">
        {filtered.map(branch => (
          <div
            key={branch.id}
            className="card branch-card animate-fade-in"
            style={{ borderLeft: `4px solid ${branch.color}` }}
          >
            <div className="branch-card-top">
              <div className="branch-flag-name">
                <span className="branch-flag">{branch.flag}</span>
                <div>
                  <h3 className="branch-card-title">{branch.name}</h3>
                  <p className="branch-country">{branch.country}</p>
                </div>
              </div>
              <div className="branch-status-actions">
                <Badge variant="success">{branch.status}</Badge>
                <button
                  className="icon-action-btn"
                  onClick={() => addToast('info', `Editing ${branch.name} branch...`)}
                >
                  <Edit2 size={14} />
                </button>
                <button
                  className="icon-action-btn icon-action-danger"
                  onClick={() => showConfirm(
                    'Delete Branch',
                    `Delete ${branch.name} branch? All associated data will be archived.`,
                    () => {
                      setBranches(prev => prev.filter(b => b.id !== branch.id));
                      addToast('warning', `${branch.name} branch removed.`);
                    },
                    'danger'
                  )}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="branch-address">
              <MapPin size={12} />
              <span>{branch.address}</span>
            </div>

            <div className="branch-info-grid">
              <div className="branch-info-cell">
                <span className="branch-info-label"><Clock size={11} /> Timezone</span>
                <span className="branch-info-val">{branch.timezone}</span>
              </div>
              <div className="branch-info-cell">
                <span className="branch-info-label"><Users size={11} /> Employees</span>
                <span className="branch-info-val">{branch.employeeCount}</span>
              </div>
              <div className="branch-info-cell">
                <span className="branch-info-label"><BarChart3 size={11} /> Revenue</span>
                <span className="branch-info-val">${(branch.revenue / 1000).toFixed(0)}K</span>
              </div>
              <div className="branch-info-cell">
                <span className="branch-info-label"><TrendingUp size={11} /> Growth</span>
                <span
                  className="branch-info-val"
                  style={{ color: branch.growthPositive ? '#10b981' : '#ef4444' }}
                >
                  {branch.growth}
                </span>
              </div>
            </div>

            <div className="branch-departments">
              <span className="branch-info-label">Departments</span>
              <div className="branch-dept-badges">
                {branch.departments.map(d => (
                  <Badge key={d} variant="neutral">{d}</Badge>
                ))}
              </div>
            </div>

            <div className="branch-footer">
              <div className="dept-head-mini">
                <Avatar name={branch.manager} size="xs" />
                <span>Manager: {branch.manager}</span>
              </div>
              <span className="branch-since">Est. {branch.established}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Branches;
