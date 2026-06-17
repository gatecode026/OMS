import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { decodeCompanyId } from '../../utils/hashId';
import { ArrowLeft, Building2, Users, Layers, CheckSquare, CalendarDays, ShieldAlert, AlertTriangle, Ban, ShieldCheck } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Skeleton from '../../components/common/Skeleton';
import Modal from '../../components/common/Modal';
import './SuperAdmin.css';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-chart-tooltip">
        <p className="tooltip-title">{label}</p>
        {payload.map((entry, index) => {
          const color = entry.color || entry.fill || '#ffffff';
          return (
            <div key={index} className="tooltip-item">
              <span className="tooltip-dot" style={{ backgroundColor: color }} />
              <span>Count:</span>
              <span className="tooltip-value">{entry.value}</span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

const CompanyDetail = () => {
  const { id: encodedId } = useParams();
  const navigate = useNavigate();
  const { token, addToast } = useApp();

  // Decode URL parameter back to raw company ID
  const id = encodedId ? decodeCompanyId(encodedId) : '';

  // State
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusModalOpen, setStatusModalOpen] = useState(false);

  const fetchCompanyDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:5000/api/admin/companies/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Company not found or unauthorized access.');
      const result = await res.json();
      if (result.status === 'success') {
        setData(result.data);
      } else {
        throw new Error(result.message || 'Failed to load details.');
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
      addToast('danger', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && id) {
      fetchCompanyDetails();
    }
  }, [token, id]);

  // Handle Status Toggle
  const handleStatusChangeSubmit = async () => {
    const currentStatus = data?.company?.status;
    const newStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    try {
      const res = await fetch(`http://localhost:5000/api/admin/companies/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const result = await res.json();
      if (result.status === 'success') {
        addToast('success', `${data.company.name} status updated to ${newStatus}.`);
        setStatusModalOpen(false);
        fetchCompanyDetails(); // Reload data
      } else {
        throw new Error(result.message || 'Failed to update status.');
      }
    } catch (err) {
      addToast('danger', err.message);
    }
  };

  // Memoized Chart Data
  const chartData = useMemo(() => {
    if (!data?.usage) return [];
    const usage = data.usage;
    return [
      { name: 'Employees', count: usage.totalEmployees || 0, fill: 'url(#gradEmployees)' },
      { name: 'Projects', count: usage.totalProjects || 0, fill: 'url(#gradProjects)' },
      { name: 'Tasks', count: usage.totalTasks || 0, fill: 'url(#gradTasks)' },
      { name: 'Attendance Logs', count: usage.totalAttendance || 0, fill: 'url(#gradAttendance)' },
      { name: 'Leave Requests', count: usage.totalLeaves || 0, fill: 'url(#gradLeaves)' }
    ];
  }, [data]);

  if (loading) {
    return (
      <div className="superadmin-container">
        <Skeleton variant="line" height={24} width={150} />
        <Skeleton variant="rect" height={100} style={{ marginTop: '16px' }} />
        <div className="superadmin-stats-grid" style={{ marginTop: '24px' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="superadmin-stat-card" style={{ height: '100px' }}>
              <Skeleton variant="rect" height="100%" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="superadmin-container">
        <button className="back-link-btn" onClick={() => navigate('/superadmin/companies')}>
          <ArrowLeft size={16} />
          <span>Back to Companies</span>
        </button>
        <div className="superadmin-error-container" style={{ marginTop: '24px' }}>
          <div className="error-card">
            <ShieldAlert size={44} className="text-danger mb-2" />
            <h3>Unable to Load Tenant Details</h3>
            <p>{error || 'An unexpected error occurred.'}</p>
          </div>
        </div>
      </div>
    );
  }

  const { company, usage } = data;

  return (
    <div className="superadmin-container">
      {/* Header and Back Link */}
      <div className="superadmin-header flex-header-start">
        <button className="back-link-btn" onClick={() => navigate('/superadmin/companies')}>
          <ArrowLeft size={16} />
          <span>Back to Companies</span>
        </button>
        
        <div className="company-detail-header-row mt-3">
          <div className="detail-brand-title">
            <div className="company-logo-avatar-large">
              {company.settings?.logoUrl ? (
                <img src={company.settings.logoUrl} alt="Logo" className="company-detail-logo-img" />
              ) : (
                <Building2 size={24} style={{ color: 'var(--text-muted)' }} />
              )}
            </div>
            <div>
              <h2 className="syne-heading">{company.name}</h2>
              <span className="subdomain-text">https://{company.subdomain}.saas.com</span>
            </div>
          </div>

          <div className="detail-action-buttons">
            <Button
              variant={company.status === 'Active' ? 'danger' : 'success'}
              onClick={() => setStatusModalOpen(true)}
              icon={company.status === 'Active' ? Ban : ShieldCheck}
              size="sm"
            >
              {company.status === 'Active' ? 'Suspend Access' : 'Activate Access'}
            </Button>
          </div>
        </div>
      </div>

      {/* Subscription & Configuration Grid */}
      <div className="company-detail-info-grid">
        {/* Info Column */}
        <div className="detail-card info-card">
          <h4 className="detail-card-title">Environment Metadata</h4>
          <div className="detail-info-list">
            <div className="info-item">
              <span className="info-label">Tenant ID</span>
              <span className="info-value">{company.id}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Database Server</span>
              <span className="info-value text-xs truncate" style={{ maxWidth: '200px' }} title={company.settings?.dbUri || 'Shared platform database'}>
                {company.settings?.dbUri ? 'Private (Custom Pool)' : 'Shared (Platform DB)'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Current Plan</span>
              <span className="info-value">
                <span className={`plan-badge plan-${company.plan?.toLowerCase()}`}>{company.plan}</span>
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Environment Status</span>
              <span className="info-value">
                <span className={`status-badge-sa status-${company.status?.toLowerCase()}`}>{company.status}</span>
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Trial Expiry</span>
              <span className="info-value">
                {company.trialEndsAt ? new Date(company.trialEndsAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Subscription Expiry</span>
              <span className="info-value">
                {company.subscriptionExpiresAt ? new Date(company.subscriptionExpiresAt).toLocaleDateString() : 'Continuous / Unlimited'}
              </span>
            </div>
          </div>
        </div>

        {/* Real-time Usage Metrics Grid */}
        <div className="detail-card usage-stats-summary">
          <h4 className="detail-card-title">System-scoped Counts</h4>
          <div className="usage-stats-subgrid">
            <div className="usage-stat-mini">
              <Users size={16} className="text-purple-c" />
              <div>
                <span className="mini-count">{usage.totalEmployees}</span>
                <span className="mini-label">Total Staff</span>
              </div>
            </div>
            <div className="usage-stat-mini">
              <Layers size={16} className="text-blue-c" />
              <div>
                <span className="mini-count">{usage.totalProjects}</span>
                <span className="mini-label">Total Projects</span>
              </div>
            </div>
            <div className="usage-stat-mini">
              <CheckSquare size={16} className="text-pink-c" />
              <div>
                <span className="mini-count">{usage.totalTasks}</span>
                <span className="mini-label">Allocated Tasks</span>
              </div>
            </div>
            <div className="usage-stat-mini">
              <CalendarDays size={16} className="text-green-c" />
              <div>
                <span className="mini-count">{usage.totalAttendance}</span>
                <span className="mini-label">Attendance Logs</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="superadmin-chart-section mt-4">
        <h3 className="section-title">Resource Distribution</h3>
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="gradEmployees" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                </linearGradient>
                <linearGradient id="gradProjects" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2}/>
                </linearGradient>
                <linearGradient id="gradTasks" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="5%" stopColor="#f472b6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#ec4899" stopOpacity={0.2}/>
                </linearGradient>
                <linearGradient id="gradAttendance" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.2}/>
                </linearGradient>
                <linearGradient id="gradLeaves" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.2}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" horizontal={false} />
              <XAxis type="number" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
              <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={18}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

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
              variant={company.status === 'Active' ? 'danger' : 'success'}
              onClick={handleStatusChangeSubmit}
            >
              Confirm {company.status === 'Active' ? 'Suspension' : 'Activation'}
            </Button>
          </div>
        }
      >
        <div className="status-modal-content">
          <AlertTriangle size={36} className={company.status === 'Active' ? 'text-danger' : 'text-success'} />
          <h4>Are you absolutely sure?</h4>
          <p>
            You are setting <strong>{company.name}</strong> access to <strong>{company.status === 'Active' ? 'Suspended' : 'Active'}</strong>.
            {company.status === 'Active'
              ? ' This will instantly block all employees of this organization from signing in or reading data.'
              : ' This will restore all standard employees and admins portal access.'}
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default CompanyDetail;
