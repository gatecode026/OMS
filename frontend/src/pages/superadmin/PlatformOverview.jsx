import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Building2, Users, CheckSquare, Activity, AlertCircle } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import Badge from '../../components/common/Badge';
import Skeleton from '../../components/common/Skeleton';
import './SuperAdmin.css';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-chart-tooltip">
        <p className="tooltip-title">{label}</p>
        {payload.map((entry, index) => {
          // Resolve color fallback
          const color = entry.color || (entry.fill && entry.fill.includes('url') ? (
            entry.name === 'Employees Count' ? '#a855f7' :
            entry.name === 'Activity / 7-Day Logins' ? '#ec4899' : '#3b82f6'
          ) : entry.fill) || '#ffffff';
          
          return (
            <div key={index} className="tooltip-item">
              <span className="tooltip-dot" style={{ backgroundColor: color }} />
              <span>{entry.name}:</span>
              <span className="tooltip-value">{entry.value}</span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

const PlatformOverview = () => {
  const { token, addToast } = useApp();
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:5000/api/admin/overview', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch platform overview stats.');
        }

        const result = await response.json();
        if (result.status === 'success') {
          setStats(result.data || []);
        } else {
          throw new Error(result.message || 'Failed to fetch platform overview stats.');
        }
      } catch (err) {
        console.error(err);
        setError(err.message);
        addToast('danger', err.message);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchOverview();
    }
  }, [token]);

  // Compute overall totals
  const summary = useMemo(() => {
    if (!stats.length) {
      return { totalCompanies: 0, activeCompanies: 0, totalUsers: 0, totalTasks: 0, activeUsers7d: 0 };
    }
    return stats.reduce((acc, curr) => {
      acc.totalUsers += (curr.totalEmployees || 0);
      acc.totalTasks += (curr.totalTasks || 0);
      acc.activeUsers7d += (curr.last7DaysLoginCount || 0);
      if (curr.status === 'Active') {
        acc.activeCompanies += 1;
      }
      return acc;
    }, { totalCompanies: stats.length, activeCompanies: 0, totalUsers: 0, totalTasks: 0, activeUsers7d: 0 });
  }, [stats]);

  if (loading) {
    return (
      <div className="superadmin-container">
        <div className="superadmin-header">
          <Skeleton variant="line" height={32} width={250} />
          <Skeleton variant="line" height={16} width={450} style={{ marginTop: '8px' }} />
        </div>
        <div className="superadmin-stats-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="superadmin-stat-card" style={{ height: '110px' }}>
              <Skeleton variant="rect" height="100%" />
            </div>
          ))}
        </div>
        <div className="superadmin-chart-section" style={{ height: '350px', marginTop: '24px' }}>
          <Skeleton variant="rect" height="100%" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="superadmin-error-container">
        <div className="error-card">
          <AlertCircle size={40} className="text-danger" />
          <h3>Connection Error</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="superadmin-container">
      {/* Header */}
      <div className="superadmin-header">
        <h2 className="syne-heading">Platform Overview</h2>
        <p className="page-desc">
          Real-time diagnostics, tenant resource consumption, and cross-tenant user engagement analytics.
        </p>
      </div>

      {/* Stats Cards Grid */}
      <div className="superadmin-stats-grid">
        <div className="superadmin-stat-card card-purple">
          <div className="stat-card-header">
            <div className="stat-icon-wrapper icon-purple">
              <Building2 size={20} />
            </div>
            <Badge variant="info">Total</Badge>
          </div>
          <div className="stat-card-value">{summary.totalCompanies}</div>
          <div className="stat-card-label">Registered Companies</div>
          <div className="stat-card-desc">{summary.activeCompanies} active tenant environments</div>
        </div>

        <div className="superadmin-stat-card card-pink">
          <div className="stat-card-header">
            <div className="stat-icon-wrapper icon-pink">
              <Users size={20} />
            </div>
            <Badge variant="success">All Tenants</Badge>
          </div>
          <div className="stat-card-value">{summary.totalUsers}</div>
          <div className="stat-card-label">Total Users</div>
          <div className="stat-card-desc">Combined workforce headcount</div>
        </div>

        <div className="superadmin-stat-card card-blue">
          <div className="stat-card-header">
            <div className="stat-icon-wrapper icon-blue">
              <CheckSquare size={20} />
            </div>
            <Badge variant="info">Active</Badge>
          </div>
          <div className="stat-card-value">{summary.totalTasks}</div>
          <div className="stat-card-label">Total Allocated Tasks</div>
          <div className="stat-card-desc">Cross-company operational load</div>
        </div>

        <div className="superadmin-stat-card card-green">
          <div className="stat-card-header">
            <div className="stat-icon-wrapper icon-green">
              <Activity size={20} />
            </div>
            <Badge variant="success">7-Day Active</Badge>
          </div>
          <div className="stat-card-value">{summary.activeUsers7d}</div>
          <div className="stat-card-label">Active Users (7-day)</div>
          <div className="stat-card-desc">Unique logins pichle 7 din mein</div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="superadmin-chart-section">
        <h3 className="section-title">Resource & Activity Comparison</h3>
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={stats} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
              <defs>
                <linearGradient id="colorEmployees" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.15}/>
                </linearGradient>
                <linearGradient id="colorLogins" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ec4899" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#db2777" stopOpacity={0.15}/>
                </linearGradient>
                <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.15}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }} />
              <Bar name="Employees Count" dataKey="totalEmployees" fill="url(#colorEmployees)" radius={[4, 4, 0, 0]} />
              <Bar name="Activity / 7-Day Logins" dataKey="last7DaysLoginCount" fill="url(#colorLogins)" radius={[4, 4, 0, 0]} />
              <Bar name="Total Tasks" dataKey="totalTasks" fill="url(#colorTasks)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Platform Stats List */}
      <div className="superadmin-detailed-table-section">
        <h3 className="section-title">Tenant Diagnostics</h3>
        <div className="table-responsive">
          <table className="superadmin-diagnostic-table">
            <thead>
              <tr>
                <th>Company Name</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Staff Headcount</th>
                <th>Task Completion</th>
                <th>Storage Used</th>
                <th>Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((c) => {
                const total = c.totalTasks || 0;
                const completed = c.completedTasksCount || 0;
                const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
                
                return (
                  <tr key={c.companyId}>
                    <td>
                      <div className="td-company-info">
                        <span className="company-name-bold">{c.name}</span>
                        <span className="company-id-sub">ID: {c.companyId}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`plan-badge plan-${c.plan?.toLowerCase()}`}>
                        {c.plan}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge-sa status-${c.status?.toLowerCase()}`}>
                        {c.status}
                      </span>
                    </td>
                    <td>
                      <div className="td-headcount">
                        <span className="count-main">{c.totalEmployees}</span>
                        <span className="count-sub">({c.activeEmployeesCount} active)</span>
                      </div>
                    </td>
                    <td>
                      <div className="td-progress-cell">
                        <div className="progress-text-row">
                          <span>{completed}/{total} Tasks</span>
                          <span className="percentage-bold">{percentage}%</span>
                        </div>
                        <div className="progress-bar-track">
                          <div className="progress-bar-fill" style={{ width: `${percentage}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="storage-text">{c.storageUsedMB ? `${c.storageUsedMB.toFixed(1)} MB` : '0 MB'}</span>
                    </td>
                    <td>
                      <span className="last-active-text">
                        {c.lastActivityTimestamp ? new Date(c.lastActivityTimestamp).toLocaleString() : 'No activity logged'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {stats.length === 0 && (
                <tr>
                  <td colSpan={7} className="no-data-cell" style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                    No companies registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PlatformOverview;
