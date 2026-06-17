import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { encodeCompanyId } from '../../../utils/hashId';
import { 
  Building2, Eye, Ban, ShieldCheck, Edit3, Database,
  Search, ShieldAlert, CheckCircle2, AlertTriangle, AlertCircle
} from 'lucide-react';
import Badge from '../../../components/common/Badge';

const TenantManagementTable = ({ 
  stats = [], 
  loading = false, 
  onRefresh, 
  token, 
  addToast,
  onOpenEditModal,
  onOpenStatusModal
}) => {
  const navigate = useNavigate();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dbFilter, setDbFilter] = useState('All');
  const [healthFilter, setHealthFilter] = useState('All');
  const [storageFilter, setStorageFilter] = useState('All');



  // Compute stats details
  const mergedTenants = React.useMemo(() => {
    return stats.map(c => {
      // Determine Health based on task completion and error status
      let health = 'Healthy';
      if (c.status === 'Suspended') health = 'Critical';
      else if (c.error === 'unreachable') health = 'Critical';
      else if (c.totalTasks > 0 && (c.completedTasksCount / c.totalTasks) < 0.25) health = 'Warning';
      
      // Map Plan to uppercase PRO/BASIC/ENTERPRISE
      let planBadge = 'BASIC';
      if (c.plan?.toLowerCase() === 'premium' || c.plan?.toLowerCase() === 'pro') planBadge = 'PRO';
      else if (c.plan?.toLowerCase() === 'enterprise') planBadge = 'ENTERPRISE';

      // Determine Subscription status
      let subStatus = 'ACTIVE';
      if (c.status === 'Suspended') subStatus = 'SUSPENDED';
      else if (c.plan === 'Basic' && new Date(c.trialEndsAt) < new Date()) subStatus = 'EXPIRED';
      else if (c.subscriptionExpiresAt && new Date(c.subscriptionExpiresAt) < new Date()) subStatus = 'EXPIRED';
      else if (c.plan === 'Basic') subStatus = 'TRIAL';

      return {
        ...c,
        planLabel: planBadge,
        dbType: c.isCustomDb ? 'DEDICATED' : 'SHARED',
        health,
        subStatus
      };
    });
  }, [stats]);

  // Filter Logic
  const filteredTenants = React.useMemo(() => {
    return mergedTenants.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            t.companyId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (t.companyCode && t.companyCode.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesPlan = planFilter === 'All' || t.planLabel === planFilter;
      const matchesStatus = statusFilter === 'All' || t.subStatus === statusFilter;
      const matchesDb = dbFilter === 'All' || t.dbType === dbFilter;
      const matchesHealth = healthFilter === 'All' || t.health === healthFilter;

      let matchesStorage = true;
      if (storageFilter !== 'All') {
        const usage = t.storageUsedMB || 0;
        if (storageFilter === 'Low') matchesStorage = usage < 10;
        else if (storageFilter === 'Medium') matchesStorage = usage >= 10 && usage < 50;
        else if (storageFilter === 'High') matchesStorage = usage >= 50;
      }

      return matchesSearch && matchesPlan && matchesStatus && matchesDb && matchesHealth && matchesStorage;
    });
  }, [mergedTenants, searchQuery, planFilter, statusFilter, dbFilter, healthFilter, storageFilter]);



  // Helpers for badge variants
  const getSubStatusVariant = (status) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'TRIAL': return 'info';
      case 'SUSPENDED': return 'danger';
      case 'OVERDUE': return 'warning';
      case 'EXPIRED': return 'secondary';
      default: return 'primary';
    }
  };

  const getHealthVariant = (health) => {
    switch (health) {
      case 'Healthy': return 'success';
      case 'Warning': return 'warning';
      case 'Critical': return 'danger';
      default: return 'primary';
    }
  };

  return (
    <div className="cc-table-section">
      <div className="cc-table-header-row">
        <h3 className="section-title">Tenant Management Console</h3>
        
        {/* Table Filters Deck */}
        <div className="cc-filters-grid">
          <div className="cc-search-field">
            <Search size={14} className="cc-search-icon" />
            <input 
              type="text" 
              placeholder="Search by company, code..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="cc-filter-input"
            />
          </div>

          <select value={planFilter} onChange={e => setPlanFilter(e.target.value)} className="cc-filter-select">
            <option value="All">All Plans</option>
            <option value="BASIC">Basic</option>
            <option value="PRO">Pro</option>
            <option value="ENTERPRISE">Enterprise</option>
          </select>

          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="cc-filter-select">
            <option value="All">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="TRIAL">Trial</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="EXPIRED">Expired</option>
          </select>

          <select value={dbFilter} onChange={e => setDbFilter(e.target.value)} className="cc-filter-select">
            <option value="All">All DB Types</option>
            <option value="SHARED">Shared</option>
            <option value="DEDICATED">Dedicated</option>
          </select>

          <select value={healthFilter} onChange={e => setHealthFilter(e.target.value)} className="cc-filter-select">
            <option value="All">All Health</option>
            <option value="Healthy">Healthy</option>
            <option value="Warning">Warning</option>
            <option value="Critical">Critical</option>
          </select>

          <select value={storageFilter} onChange={e => setStorageFilter(e.target.value)} className="cc-filter-select">
            <option value="All">All Storage</option>
            <option value="Low">&lt; 10 MB</option>
            <option value="Medium">10 - 50 MB</option>
            <option value="High">&gt; 50 MB</option>
          </select>
        </div>
      </div>

      <div className="table-responsive">
        <table className="superadmin-diagnostic-table cc-density-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Code</th>
              <th>Plan</th>
              <th>Database</th>
              <th>Employees</th>
              <th>Active Users</th>
              <th>Last Active</th>
              <th>Storage</th>
              <th>Health</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} className="text-center" style={{ padding: '60px 0' }}>
                  <RefreshCw size={24} className="animate-spin text-muted" />
                  <div style={{ marginTop: '10px', color: 'var(--text-muted)' }}>Loading tenants list...</div>
                </td>
              </tr>
            ) : filteredTenants.map((row) => (
              <tr key={row.companyId} className={`tenant-row status-${row.status?.toLowerCase()}`}>
                <td>
                  <div className="td-company-info">
                    <span className="company-name-bold">{row.name}</span>
                    <span className="company-id-sub">ID: {row.companyId}</span>
                  </div>
                </td>
                <td>
                  <span className="subdomain-tag font-mono">{row.companyCode || (row.name || '').substring(0, 3).toUpperCase()}</span>
                </td>
                <td>
                  <span className={`plan-badge plan-${row.plan?.toLowerCase()}`}>{row.planLabel}</span>
                </td>
                <td>
                  <span className={`db-badge db-${row.dbType.toLowerCase()}`}>
                    <Database size={11} style={{ marginRight: '4px' }} />
                    {row.dbType}
                  </span>
                </td>
                <td>
                  <div className="td-headcount">
                    <span className="count-main">{row.totalEmployees ?? 0}</span>
                  </div>
                </td>
                <td>
                  <span className="active-users-count">{row.activeEmployeesCount ?? 0}</span>
                </td>
                <td>
                  <span className="last-active-text">
                    {row.lastActivityTimestamp ? new Date(row.lastActivityTimestamp).toLocaleDateString() : 'N/A'}
                  </span>
                </td>
                <td>
                  <span className="storage-text">{row.storageUsedMB ? `${row.storageUsedMB.toFixed(1)} MB` : '12.5 MB'}</span>
                </td>
                <td>
                  <Badge variant={getHealthVariant(row.health)}>{row.health}</Badge>
                </td>
                <td>
                  <Badge variant={getSubStatusVariant(row.subStatus)}>{row.subStatus}</Badge>
                </td>
                <td align="right">
                  <div className="table-actions-row justify-end">
                    <button
                      onClick={() => navigate(`/superadmin/companies/${encodeCompanyId(row.companyId)}`)}
                      className="action-btn-sa btn-view"
                      title="View Tenant"
                    >
                      <Eye size={13} />
                    </button>
                    <button
                      onClick={() => onOpenEditModal(row)}
                      className="action-btn-sa btn-edit"
                      title="Edit Tenant"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      onClick={() => onOpenStatusModal(row.companyId, row.name, row.status)}
                      className={`action-btn-sa ${row.status === 'Active' ? 'btn-suspend' : 'btn-activate'}`}
                      title={row.status === 'Active' ? 'Suspend Tenant' : 'Activate Tenant'}
                    >
                      {row.status === 'Active' ? <Ban size={13} /> : <ShieldCheck size={13} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && filteredTenants.length === 0 && (
              <tr>
                <td colSpan={11} className="no-data-cell text-center" style={{ padding: '60px 0', color: 'var(--text-muted)' }}>
                  No companies matching selected filters were found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>


    </div>
  );
};

export default TenantManagementTable;
