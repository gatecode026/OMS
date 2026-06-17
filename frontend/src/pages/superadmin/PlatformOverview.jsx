import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { encodeCompanyId } from '../../utils/hashId';
import {
  Building2, Users, CheckSquare, Activity, AlertCircle,
  TrendingUp, TrendingDown, Database, ShieldAlert,
  HeartPulse, RefreshCw, Eye, Edit3, Ban, ShieldCheck,
  ExternalLink, Calendar, AlertTriangle
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import Badge from '../../components/common/Badge';
import Skeleton from '../../components/common/Skeleton';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import './SuperAdmin.css';

// SVG Sparkline Component
const Sparkline = ({ data = [], color = '#a855f7' }) => {
  if (!data || data.length === 0) return null;
  const width = 90;
  const height = 30;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min === 0 ? 1 : max - min;

  const points = data.map((val, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height - 2; // leave margin
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-chart-tooltip">
        <p className="tooltip-title">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="tooltip-item">
            <span className="tooltip-dot" style={{ backgroundColor: entry.color || entry.fill }} />
            <span>{entry.name}:</span>
            <span className="tooltip-value">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const PlatformOverview = () => {
  const { token, addToast } = useApp();
  const navigate = useNavigate();

  // Dashboard Metrics State
  const [data, setData] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Edit Tenant Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', plan: 'Basic', subscriptionExpiresAt: '', dbUri: '' });

  // Status Switch Modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusForm, setStatusForm] = useState({ id: '', name: '', newStatus: '' });

  // Fetch Dashboard Analytics & Tenant Table List
  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // 1. Fetch rich metrics
      const analyticsRes = await fetch((window.API_URL || 'http://localhost:5000') + '/api/admin/overview/analytics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!analyticsRes.ok) throw new Error('Failed to fetch dashboard metrics.');
      const analyticsResult = await analyticsRes.json();

      // 2. Fetch basic companies list
      const companiesRes = await fetch((window.API_URL || 'http://localhost:5000') + '/api/admin/companies?limit=100', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!companiesRes.ok) throw new Error('Failed to fetch companies list.');
      const companiesResult = await companiesRes.json();

      if (analyticsResult.status === 'success' && companiesResult.status === 'success') {
        setData(analyticsResult.data);

        // Merge companies with live headcount/logs from analytics results if available
        const usageList = analyticsResult.data.tenantUsageComparison || [];
        const merged = (companiesResult.data.companies || []).map(c => {
          const usage = usageList.find(u => u.name === c.name) || {};
          return {
            ...c,
            employees: usage.employees !== undefined ? usage.employees : 0,
            activity: usage.activity || 0,
            storage: usage.storage || (c.databaseType === 'dedicated' ? 12.5 : 5.8)
          };
        });
        setCompanies(merged);
      }
    } catch (err) {
      console.error(err);
      addToast('danger', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDashboardData();
    }
  }, [token]);

    // Open Edit Modal
    const handleOpenEdit = (company) => {
      setSelectedCompany(company);
      setEditForm({
        name: company.name,
        plan: company.plan || 'Basic',
        subscriptionExpiresAt: company.subscriptionExpiresAt ? company.subscriptionExpiresAt.split('T')[0] : '',
        dbUri: company.settings?.dbUri || ''
      });
      setEditModalOpen(true);
    };

    // Submit Edit Modal
    const handleEditSubmit = async (e) => {
      e.preventDefault();
      if (!editForm.name.trim()) {
        addToast('danger', 'Company name is required.');
        return;
      }
      try {
        setActionLoading(true);
        const payload = {
          name: editForm.name,
          plan: editForm.plan,
          subscriptionExpiresAt: editForm.subscriptionExpiresAt || null,
          settings: {
            ...selectedCompany.settings,
            dbUri: editForm.dbUri.trim()
          }
        };

        const res = await fetch(`${window.API_URL || "http://localhost:5000"}/api/admin/companies/${selectedCompany.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result.status === 'success') {
          addToast('success', `${editForm.name} updated successfully.`);
          setEditModalOpen(false);
          fetchDashboardData();
        } else {
          throw new Error(result.message || 'Failed to update company.');
        }
      } catch (err) {
        addToast('danger', err.message);
      } finally {
        setActionLoading(false);
      }
    };

    // Open Status Confirm Modal
    const handleOpenStatus = (company) => {
      const newStatus = company.status === 'Active' ? 'Suspended' : 'Active';
      setStatusForm({ id: company.id, name: company.name, newStatus });
      setStatusModalOpen(true);
    };

    // Submit Status Change
    const handleStatusSubmit = async () => {
      try {
        setActionLoading(true);
        const res = await fetch(`${window.API_URL || "http://localhost:5000"}/api/admin/companies/${statusForm.id}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status: statusForm.newStatus })
        });
        const result = await res.json();
        if (result.status === 'success') {
          addToast('success', `${statusForm.name} status updated to ${statusForm.newStatus}.`);
          setStatusModalOpen(false);
          fetchDashboardData();
        } else {
          throw new Error(result.message || 'Failed to update status.');
        }
      } catch (err) {
        addToast('danger', err.message);
      } finally {
        setActionLoading(false);
      }
    };

    // Donut/Pie Colors
    const COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981'];

    if (loading || !data) {
      return (
        <div className="superadmin-container">
          <div className="superadmin-header">
            <Skeleton variant="line" height={32} width={280} />
            <Skeleton variant="line" height={16} width={500} style={{ marginTop: '8px' }} />
          </div>
          <div className="superadmin-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="superadmin-stat-card" style={{ height: '120px' }}>
                <Skeleton variant="rect" height="100%" />
              </div>
            ))}
          </div>
        </div>
      );
    }

    const kpis = data.kpis;

    return (
      <div className="superadmin-container">
        {/* Header */}
        <div className="superadmin-header flex-header">
          <div>
            <h2 className="syne-heading">Platform Control Center</h2>
            <p className="page-desc">
              Enterprise-grade monitoring dashboard for tenant resource management, SaaS monetization, and live activity streams.
            </p>
          </div>
          <button className="back-link-btn" onClick={fetchDashboardData} title="Refresh Live Data">
            <RefreshCw size={16} />
            <span>Refresh Data</span>
          </button>
        </div>

        {/* 1. TOP KPI CARDS */}
        <div className="superadmin-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>

          {/* KPI: Total Companies */}
          <div className="superadmin-stat-card card-purple">
            <div className="stat-card-header">
              <div className="stat-icon-wrapper icon-purple">
                <Building2 size={20} />
              </div>
              <div className="trend-wrapper">
                <span className={`trend-badge ${kpis.totalCompanies.trend}`}>
                  {kpis.totalCompanies.trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {kpis.totalCompanies.change}%
                </span>
              </div>
            </div>
            <div className="stat-value-sparkline-row">
              <div className="stat-card-value">{kpis.totalCompanies.value}</div>
              <div className="stat-sparkline">
                <Sparkline data={kpis.totalCompanies.sparkline} color="#a855f7" />
              </div>
            </div>
            <div className="stat-card-label">Total Companies</div>
            <div className="stat-card-desc">SaaS companies registered globally</div>
          </div>

          {/* KPI: Active Companies */}
          <div className="superadmin-stat-card card-blue">
            <div className="stat-card-header">
              <div className="stat-icon-wrapper icon-blue">
                <Building2 size={20} />
              </div>
              <div className="trend-wrapper">
                <span className={`trend-badge ${kpis.activeCompanies.trend}`}>
                  {kpis.activeCompanies.trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {kpis.activeCompanies.change}%
                </span>
              </div>
            </div>
            <div className="stat-value-sparkline-row">
              <div className="stat-card-value">{kpis.activeCompanies.value}</div>
              <div className="stat-sparkline">
                <Sparkline data={kpis.activeCompanies.sparkline} color="#3b82f6" />
              </div>
            </div>
            <div className="stat-card-label">Active Companies</div>
            <div className="stat-card-desc">Environments currently operational</div>
          </div>

          {/* KPI: Total Employees */}
          <div className="superadmin-stat-card card-pink">
            <div className="stat-card-header">
              <div className="stat-icon-wrapper icon-pink">
                <Users size={20} />
              </div>
              <div className="trend-wrapper">
                <span className={`trend-badge ${kpis.totalEmployees.trend}`}>
                  {kpis.totalEmployees.trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {kpis.totalEmployees.change}%
                </span>
              </div>
            </div>
            <div className="stat-value-sparkline-row">
              <div className="stat-card-value">{kpis.totalEmployees.value}</div>
              <div className="stat-sparkline">
                <Sparkline data={kpis.totalEmployees.sparkline} color="#ec4899" />
              </div>
            </div>
            <div className="stat-card-label">Total Employees</div>
            <div className="stat-card-desc">Combined staff registered in the platform</div>
          </div>

          {/* KPI: Active Users (7 days) */}
          <div className="superadmin-stat-card card-green">
            <div className="stat-card-header">
              <div className="stat-icon-wrapper icon-green">
                <Activity size={20} />
              </div>
              <div className="trend-wrapper">
                <span className={`trend-badge ${kpis.activeUsers7d.trend}`}>
                  {kpis.activeUsers7d.trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {kpis.activeUsers7d.change}%
                </span>
              </div>
            </div>
            <div className="stat-value-sparkline-row">
              <div className="stat-card-value">{kpis.activeUsers7d.value}</div>
              <div className="stat-sparkline">
                <Sparkline data={kpis.activeUsers7d.sparkline} color="#10b981" />
              </div>
            </div>
            <div className="stat-card-label">Active Users (7 days)</div>
            <div className="stat-card-desc">Unique logins inside the last 7 days</div>
          </div>


          {/* KPI: Dedicated DB Companies */}
          <div className="superadmin-stat-card card-purple">
            <div className="stat-card-header">
              <div className="stat-icon-wrapper icon-purple">
                <Database size={20} />
              </div>
              <div className="trend-wrapper">
                <span className={`trend-badge ${kpis.dedicatedDBCompanies.trend}`}>
                  {kpis.dedicatedDBCompanies.trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {kpis.dedicatedDBCompanies.change}%
                </span>
              </div>
            </div>
            <div className="stat-value-sparkline-row">
              <div className="stat-card-value">{kpis.dedicatedDBCompanies.value}</div>
              <div className="stat-sparkline">
                <Sparkline data={kpis.dedicatedDBCompanies.sparkline} color="#8b5cf6" />
              </div>
            </div>
            <div className="stat-card-label">Dedicated DB Companies</div>
            <div className="stat-card-desc">Tenants operating on isolated Mongo clusters</div>
          </div>

          {/* KPI: Shared DB Companies */}
          <div className="superadmin-stat-card card-blue">
            <div className="stat-card-header">
              <div className="stat-icon-wrapper icon-blue">
                <Database size={20} />
              </div>
              <div className="trend-wrapper">
                <span className={`trend-badge ${kpis.sharedDBCompanies.trend}`}>
                  {kpis.sharedDBCompanies.trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {kpis.sharedDBCompanies.change}%
                </span>
              </div>
            </div>
            <div className="stat-value-sparkline-row">
              <div className="stat-card-value">{kpis.sharedDBCompanies.value}</div>
              <div className="stat-sparkline">
                <Sparkline data={kpis.sharedDBCompanies.sparkline} color="#3b82f6" />
              </div>
            </div>
            <div className="stat-card-label">Shared DB Companies</div>
            <div className="stat-card-desc">Tenants co-located on public cluster schemas</div>
          </div>

          {/* KPI: Failed Login Attempts */}
          <div className="superadmin-stat-card card-pink">
            <div className="stat-card-header">
              <div className="stat-icon-wrapper icon-pink">
                <ShieldAlert size={20} className="text-danger" />
              </div>
              <div className="trend-wrapper">
                <span className={`trend-badge ${kpis.failedLoginAttempts.trend}`}>
                  {kpis.failedLoginAttempts.trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {kpis.failedLoginAttempts.change}%
                </span>
              </div>
            </div>
            <div className="stat-value-sparkline-row">
              <div className="stat-card-value">{kpis.failedLoginAttempts.value}</div>
              <div className="stat-sparkline">
                <Sparkline data={kpis.failedLoginAttempts.sparkline} color="#f43f5e" />
              </div>
            </div>
            <div className="stat-card-label">Failed Login Attempts</div>
            <div className="stat-card-desc">Combined failed auth events or IP blocks</div>
          </div>

          {/* KPI: Platform Health Status */}
          <div className="superadmin-stat-card card-green">
            <div className="stat-card-header">
              <div className="stat-icon-wrapper icon-green">
                <HeartPulse size={20} />
              </div>
              <Badge variant="success">Online</Badge>
            </div>
            <div className="stat-value-sparkline-row">
              <div className="stat-card-value" style={{ fontSize: '1.8rem', padding: '6px 0' }}>{kpis.platformHealth.status}</div>
            </div>
            <div className="stat-card-label">Health & API Latency</div>
            <div className="stat-card-desc">Ping: {kpis.platformHealth.responseTime} | Uptime: {kpis.platformHealth.uptime}</div>
          </div>
        </div>

        {/* GRAPH GRIDS */}
        <div className="superadmin-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px', marginTop: '12px' }}>

          {/* 2. TENANT GROWTH GRAPH */}
          <div className="superadmin-chart-section">
            <h3 className="section-title">Tenant Growth (SaaS Onboarding)</h3>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data.tenantGrowth} margin={{ top: 10, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }} />
                  <Line name="Registrations Growth" type="monotone" dataKey="registrations" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line name="Active Tenant Environments" type="monotone" dataKey="active" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 3. USER ACTIVITY GRAPH */}
          <div className="superadmin-chart-section">
            <h3 className="section-title">User Engagement Trend</h3>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data.userActivity} margin={{ top: 10, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" vertical={false} />
                  <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }} />
                  <Line name="Daily Active Users (DAU)" type="monotone" dataKey="dau" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                  <Line name="Weekly Activity Volume" type="monotone" dataKey="weekly" stroke="#ec4899" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="superadmin-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '24px', marginTop: '12px' }}>

          {/* 4. SUBSCRIPTION PLAN DISTRIBUTION */}
          <div className="superadmin-chart-section">
            <h3 className="section-title">Subscription Plan Share</h3>
            <div className="chart-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie
                    data={data.subscriptionPlanDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.subscriptionPlanDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pie-legend-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px', width: '100%', fontSize: '0.8rem' }}>
                {data.subscriptionPlanDistribution.map((entry, index) => (
                  <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: COLORS[index % COLORS.length] }} />
                    <span>{entry.name}: <strong>{entry.value}</strong></span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 5. TENANT USAGE COMPARISON */}
          <div className="superadmin-chart-section">
            <h3 className="section-title">Tenant Resources & Activity Comparison</h3>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={data.tenantUsageComparison}
                  layout="vertical"
                  margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" horizontal={false} />
                  <XAxis type="number" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={11} width={80} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar name="Employees" dataKey="employees" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  <Bar name="Activity Logs" dataKey="activity" fill="#ec4899" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* FEED, HEALTH AND ALERTS PANELS */}
        <div className="superadmin-grid-3" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '24px', marginTop: '12px' }}>

          {/* 6. RECENT ACTIVITY FEED */}
          <div className="superadmin-chart-section" style={{ display: 'flex', flexDirection: 'column' }}>
            <h3 className="section-title">Live Platform Activity Stream</h3>
            <div className="activity-timeline-wrapper" style={{ overflowY: 'auto', maxHeight: '310px', flex: 1, paddingRight: '4px' }}>
              {data.recentActivity.map((log, index) => (
                <div key={log.id || index} className="activity-timeline-item" style={{ display: 'flex', gap: '12px', marginBottom: '16px', position: 'relative' }}>
                  <div className="timeline-marker" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ec4899', marginTop: '6px' }} />
                    {index < data.recentActivity.length - 1 && (
                      <span style={{ width: '2px', flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.06)', margin: '4px 0' }} />
                    )}
                  </div>
                  <div className="timeline-content">
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-white)' }}>
                      <strong style={{ color: '#ec4899' }}>{log.companyName}</strong>: {log.actionType}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Actor: {log.actor} | {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 8. SYSTEM HEALTH PANEL */}
          <div className="superadmin-chart-section" style={{ display: 'flex', flexDirection: 'column' }}>
            <h3 className="section-title">Infrastructure Status</h3>
            <div className="health-indicators-list" style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>

              {/* MongoDB status */}
              <div className="health-item">
                <div className="health-header" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>MongoDB Cluster connection</span>
                  <Badge variant={data.systemHealth.mongo === 'Connected' ? 'success' : 'danger'}>
                    {data.systemHealth.mongo}
                  </Badge>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: data.systemHealth.mongo === 'Connected' ? '100%' : '0%', background: '#10b981' }}></div>
                </div>
              </div>

              {/* Server Uptime */}
              <div className="health-item">
                <div className="health-header" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Server Operational Uptime</span>
                  <span style={{ fontWeight: '600', color: 'var(--text-white)' }}>{kpis.platformHealth.uptime}</span>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: '100%', background: '#8b5cf6' }}></div>
                </div>
              </div>

              {/* Database storage */}
              <div className="health-item">
                <div className="health-header" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Platform Database Size</span>
                  <span style={{ fontWeight: '600', color: 'var(--text-white)' }}>{data.systemHealth.storageUsage}</span>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: '12%', background: '#3b82f6' }}></div>
                </div>
              </div>

              {/* API Latency */}
              <div className="health-item">
                <div className="health-header" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Avg Response Time</span>
                  <span style={{ fontWeight: '600', color: 'var(--text-white)' }}>{data.systemHealth.responseTime}ms</span>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${(data.systemHealth.responseTime / 100) * 100}%`, background: '#10b981' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* 9. ALERTS PANEL */}
          <div className="superadmin-chart-section" style={{ display: 'flex', flexDirection: 'column' }}>
            <h3 className="section-title">Critical Security & System Alerts</h3>
            <div className="alerts-list-wrapper" style={{ overflowY: 'auto', maxHeight: '310px', flex: 1 }}>
              {data.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`platform-alert-card border-${alert.severity.toLowerCase()}`}
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderLeft: `4px solid ${alert.severity === 'Critical' || alert.severity === 'High' ? '#f43f5e' : '#eab308'}`,
                    padding: '10px 12px',
                    borderRadius: '6px',
                    marginBottom: '10px',
                    border: '1px solid rgba(255,255,255,0.04)',
                    borderLeftWidth: '4px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-white)' }}>{alert.title}</span>
                    <span style={{
                      fontSize: '0.65rem',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: alert.severity === 'Critical' || alert.severity === 'High' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                      color: alert.severity === 'Critical' || alert.severity === 'High' ? '#f43f5e' : '#eab308',
                      fontWeight: 'bold'
                    }}>{alert.severity}</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>{alert.description}</p>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                    {new Date(alert.time).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 7. TENANT MANAGEMENT TABLE */}
        <div className="superadmin-detailed-table-section" style={{ marginTop: '12px' }}>
          <h3 className="section-title">Tenant Management Console</h3>
          <div className="table-responsive">
            <table className="superadmin-diagnostic-table">
              <thead>
                <tr>
                  <th>Company Name</th>
                  <th>Plan</th>
                  <th>Database Type</th>
                  <th>Employees</th>
                  <th>Last Active</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="td-company-info">
                        <span className="company-name-bold">{c.name}</span>
                        <span className="company-id-sub">https://{c.subdomain}.saas.com</span>
                      </div>
                    </td>
                    <td>
                      <span className={`plan-badge plan-${c.plan?.toLowerCase()}`}>
                        {c.plan}
                      </span>
                    </td>
                    <td>
                      <span className="subdomain-tag" style={{ textTransform: 'uppercase' }}>
                        {c.databaseType} DB
                      </span>
                    </td>
                    <td>
                      <div className="td-headcount">
                        <span className="count-main">{c.employees ?? 0}</span>
                      </div>
                    </td>
                    <td>
                      <span className="last-active-text">
                        {c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : 'Just provisioned'}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge-sa status-${c.status?.toLowerCase()}`}>
                        {c.status}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions-row">
                        <button
                          onClick={() => navigate(`/superadmin/companies/${encodeCompanyId(c.id)}`)}
                          className="action-btn-sa btn-view"
                          title="View Usage metrics"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="action-btn-sa btn-edit"
                          title="Edit Plan / Connection"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleOpenStatus(c)}
                          className={`action-btn-sa ${c.status === 'Active' ? 'btn-suspend' : 'btn-activate'}`}
                          title={c.status === 'Active' ? 'Suspend Access' : 'Activate Access'}
                        >
                          {c.status === 'Active' ? <Ban size={14} /> : <ShieldCheck size={14} />}
                        </button>
                        <a
                          href={`http://${c.subdomain}.localhost:5173`}
                          target="_blank"
                          rel="noreferrer"
                          className="action-btn-sa"
                          title="Open Company Dashboard"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
                {companies.length === 0 && (
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

        {/* ── EDIT PLAN/DETAILS MODAL ── */}
        {selectedCompany && (
          <Modal
            isOpen={editModalOpen}
            onClose={() => setEditModalOpen(false)}
            title={`Modify Plan: ${selectedCompany.name}`}
            size="md"
            footer={
              <div className="modal-footer-sa">
                <Button variant="secondary" onClick={() => setEditModalOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleEditSubmit} disabled={actionLoading}>
                  {actionLoading ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            }
          >
            <form onSubmit={handleEditSubmit} className="modal-form-sa">
              <div className="form-group-sa">
                <label>Company Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group-sa">
                <label>Subscription Plan</label>
                <select
                  value={editForm.plan}
                  onChange={e => setEditForm(prev => ({ ...prev, plan: e.target.value }))}
                >
                  <option value="Basic">Basic Plan ($49/mo)</option>
                  <option value="Premium">Pro Plan ($199/mo)</option>
                  <option value="Enterprise">Enterprise Plan ($999/mo)</option>
                </select>
              </div>
              <div className="form-group-sa">
                <label>Subscription Expiration Date</label>
                <input
                  type="date"
                  value={editForm.subscriptionExpiresAt}
                  onChange={e => setEditForm(prev => ({ ...prev, subscriptionExpiresAt: e.target.value }))}
                />
                <span className="input-hint">Leave blank to assign a continuous Trial status.</span>
              </div>
              <div className="form-group-sa">
                <label>Custom Dedicated Database URI (Optional)</label>
                <input
                  type="text"
                  placeholder="mongodb+srv://..."
                  value={editForm.dbUri}
                  onChange={e => setEditForm(prev => ({ ...prev, dbUri: e.target.value }))}
                />
                <span className="input-hint">Leave blank to share the main default cluster.</span>
              </div>
            </form>
          </Modal>
        )}

        {/* ── STATUS TOGGLE MODAL ── */}
        <Modal
          isOpen={statusModalOpen}
          onClose={() => setStatusModalOpen(false)}
          title="Toggle Access Status"
          size="md"
          footer={
            <div className="modal-footer-sa">
              <Button variant="secondary" onClick={() => setStatusModalOpen(false)}>Cancel</Button>
              <Button
                variant={statusForm.newStatus === 'Suspended' ? 'danger' : 'success'}
                onClick={handleStatusSubmit}
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing...' : `Confirm ${statusForm.newStatus === 'Suspended' ? 'Suspension' : 'Activation'}`}
              </Button>
            </div>
          }
        >
          <div className="status-modal-content">
            <AlertTriangle size={36} className={statusForm.newStatus === 'Suspended' ? 'text-danger' : 'text-success'} />
            <h4>Are you absolutely sure?</h4>
            <p>
              You are setting <strong>{statusForm.name}</strong> to <strong>{statusForm.newStatus}</strong>.
              {statusForm.newStatus === 'Suspended'
                ? ' This will instantly block all portal actions and logins for all employees belonging to this tenant.'
                : ' This will restore complete database and portal access for the tenant.'}
            </p>
          </div>
        </Modal>
      </div>
    );
  };

  export default PlatformOverview;
