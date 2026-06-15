import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Building2, Search, Plus, Eye, Ban, ShieldCheck, Edit3, Calendar, MoreVertical, AlertTriangle } from 'lucide-react';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Skeleton from '../../components/common/Skeleton';
import Modal from '../../components/common/Modal';
import DataTable from '../../components/common/DataTable';
import './SuperAdmin.css';

const CompaniesList = () => {
  const { token, addToast } = useApp();
  const navigate = useNavigate();

  // State
  const [companies, setCompanies] = useState([]);
  const [overviewStats, setOverviewStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, pages: 1 });
  const [currentPage, setCurrentPage] = useState(1);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', plan: 'Basic', subscriptionExpiresAt: '', dbUri: '' });

  // Status Change Dialog State
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusForm, setStatusForm] = useState({ id: '', name: '', newStatus: '' });

  // Fetch Companies
  const fetchCompanies = async (page = 1, searchQuery = '') => {
    try {
      setLoading(true);
      const url = `http://localhost:5000/api/admin/companies?page=${page}&limit=10&search=${encodeURIComponent(searchQuery)}`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch companies list.');
      const result = await res.json();
      if (result.status === 'success') {
        setCompanies(result.data.companies || []);
        setPagination(result.data.pagination || { total: 0, page, limit: 10, pages: 1 });
      }
    } catch (err) {
      console.error(err);
      addToast('danger', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Overview Stats to merge Employees, Active Users, Last Active
  const fetchOverviewStats = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/admin/overview', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const result = await res.json();
        if (result.status === 'success') {
          setOverviewStats(result.data || []);
        }
      }
    } catch (err) {
      console.error('Failed to load real-time analytics for list:', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCompanies(currentPage, search);
      fetchOverviewStats();
    }
  }, [token, currentPage, search]);

  // Handle Search Input Change
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1); // Reset to first page
  };

  // Merge Mongoose Company models with Analytics overview stats
  const mergedCompanies = useMemo(() => {
    return companies.map(c => {
      const stat = overviewStats.find(o => o.companyId === c.id) || {};
      return {
        ...c,
        employees: stat.totalEmployees ?? 0,
        activeEmployees: stat.activeEmployeesCount ?? 0,
        activeUsers7d: stat.last7DaysLoginCount ?? 0,
        lastActive: stat.lastActivityTimestamp || null
      };
    });
  }, [companies, overviewStats]);

  // Open Edit Modal
  const openEditModal = (company) => {
    setSelectedCompany(company);
    setEditForm({
      name: company.name,
      plan: company.plan || 'Basic',
      subscriptionExpiresAt: company.subscriptionExpiresAt ? company.subscriptionExpiresAt.split('T')[0] : '',
      dbUri: company.settings?.dbUri || ''
    });
    setEditModalOpen(true);
  };

  // Submit Edit Form
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      addToast('danger', 'Company name is required.');
      return;
    }

    try {
      // Map payload: settings needs to be flattened or structured properly
      const payload = {
        name: editForm.name,
        plan: editForm.plan,
        subscriptionExpiresAt: editForm.subscriptionExpiresAt,
        settings: {
          ...selectedCompany.settings,
          dbUri: editForm.dbUri.trim()
        }
      };

      const res = await fetch(`http://localhost:5000/api/admin/companies/${selectedCompany.id}`, {
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
        fetchCompanies(currentPage, search);
      } else {
        throw new Error(result.message || 'Failed to update company.');
      }
    } catch (err) {
      addToast('danger', err.message);
    }
  };

  // Open Status Confirmation Modal
  const openStatusModal = (id, name, currentStatus) => {
    const newStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    setStatusForm({ id, name, newStatus });
    setStatusModalOpen(true);
  };

  // Submit Status Change
  const handleStatusChangeSubmit = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/admin/companies/${statusForm.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: statusForm.newStatus })
      });
      const result = await res.json();
      if (result.status === 'success') {
        addToast('success', `${statusForm.name} access status updated to ${statusForm.newStatus}.`);
        setStatusModalOpen(false);
        fetchCompanies(currentPage, search);
      } else {
        throw new Error(result.message || 'Failed to toggle status.');
      }
    } catch (err) {
      addToast('danger', err.message);
    }
  };

  // Columns definition for DataTable
  const columns = [
    {
      header: 'Company Name',
      key: 'name',
      sortable: true,
      render: (row) => (
        <div className="table-company-cell">
          <div className="company-logo-avatar">
            {row.settings?.logoUrl ? (
              <img src={row.settings.logoUrl} alt="Logo" className="company-list-logo-img" />
            ) : (
              <Building2 size={16} style={{ color: 'var(--text-muted)' }} />
            )}
          </div>
          <div>
            <div className="company-name-bold">{row.name}</div>
            <div className="company-id-sub">Tenant ID: {row.id}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Subdomain',
      key: 'subdomain',
      sortable: true,
      render: (row) => <span className="subdomain-tag">https://{row.subdomain}.saas.com</span>
    },
    {
      header: 'Plan',
      key: 'plan',
      sortable: true,
      render: (row) => <span className={`plan-badge plan-${row.plan?.toLowerCase()}`}>{row.plan}</span>
    },
    {
      header: 'Status',
      key: 'status',
      sortable: true,
      render: (row) => (
        <span className={`status-badge-sa status-${row.status?.toLowerCase()}`}>
          {row.status}
        </span>
      )
    },
    {
      header: 'Employees',
      key: 'employees',
      sortable: true,
      render: (row) => (
        <div className="count-col">
          <span className="count-main">{row.employees}</span>
          <span className="count-sub">{row.activeEmployees} active</span>
        </div>
      )
    },
    {
      header: 'Active Users (7-day)',
      key: 'activeUsers7d',
      sortable: true,
      render: (row) => <span className="active-users-count">{row.activeUsers7d}</span>
    },
    {
      header: 'Last Active',
      key: 'lastActive',
      sortable: true,
      render: (row) => (
        <span className="last-active-text">
          {row.lastActive ? new Date(row.lastActive).toLocaleDateString() : 'N/A'}
        </span>
      )
    },
    {
      header: 'Created Date',
      key: 'createdAt',
      sortable: true,
      render: (row) => (
        <span className="created-date-text">
          {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : 'N/A'}
        </span>
      )
    },
    {
      header: 'Actions',
      key: 'actions',
      sortable: false,
      render: (row) => (
        <div className="table-actions-row">
          <button
            onClick={() => navigate(`/superadmin/companies/${row.id}`)}
            className="action-btn-sa btn-view"
            title="View usage details"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={() => openEditModal(row)}
            className="action-btn-sa btn-edit"
            title="Edit Plan / Expiry"
          >
            <Edit3 size={14} />
          </button>
          <button
            onClick={() => openStatusModal(row.id, row.name, row.status)}
            className={`action-btn-sa ${row.status === 'Active' ? 'btn-suspend' : 'btn-activate'}`}
            title={row.status === 'Active' ? 'Suspend Access' : 'Activate Access'}
          >
            {row.status === 'Active' ? <Ban size={14} /> : <ShieldCheck size={14} />}
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="superadmin-container">
      {/* Header */}
      <div className="superadmin-header flex-header">
        <div>
          <h2 className="syne-heading">Tenant Environments</h2>
          <p className="page-desc">
            Monitor plan compliance, toggle suspension locks, and modify global subscription details.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => navigate('/superadmin/companies/create')}
          icon={Plus}
          size="sm"
        >
          Create New Tenant
        </Button>
      </div>

      {/* Filter panel */}
      <div className="superadmin-filters-card">
        <div className="superadmin-search-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search companies by name..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>
        <div className="stats-indicator">
          Showing {mergedCompanies.length} of {pagination.total} Environments
        </div>
      </div>

      {/* DataTable */}
      <div className="superadmin-table-card">
        <DataTable
          columns={columns}
          data={mergedCompanies}
          loading={loading}
          rowsPerPage={10}
          emptyTitle="No Tenant Found"
          emptyDescription="Try adjusting your keywords or register a new company."
          emptyActionText="Create New Company"
          emptyOnActionClick={() => navigate('/superadmin/companies/create')}
          emptyActionIcon={Plus}
        />
        
        {/* Manual Pagination Integration if needed, or DataTable handles client side (DataTable has pagination buttons built-in, but since we fetch server side paginated, we handle page clicks) */}
        {!loading && pagination.pages > 1 && (
          <div className="custom-pagination">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="pg-btn"
            >
              Previous
            </button>
            <span className="pg-info">Page {currentPage} of {pagination.pages}</span>
            <button
              disabled={currentPage === pagination.pages}
              onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
              className="pg-btn"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* ── EDIT PLAN/DETAILS MODAL ── */}
      {selectedCompany && (
        <Modal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title={`Edit Subscription: ${selectedCompany.name}`}
          size="md"
          footer={
            <div className="modal-footer-sa">
              <Button variant="secondary" onClick={() => setEditModalOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleEditSubmit}>Save Subscription</Button>
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
                <option value="Basic">Basic Plan</option>
                <option value="Premium">Premium Plan</option>
                <option value="Enterprise">Enterprise Plan</option>
              </select>
            </div>
            <div className="form-group-sa">
              <label>Subscription Expiration Date</label>
              <input
                type="date"
                value={editForm.subscriptionExpiresAt}
                onChange={e => setEditForm(prev => ({ ...prev, subscriptionExpiresAt: e.target.value }))}
              />
            </div>
            <div className="form-group-sa">
              <label>Dedicated Database URI (Optional)</label>
              <input
                type="text"
                placeholder="mongodb+srv://..."
                value={editForm.dbUri}
                onChange={e => setEditForm(prev => ({ ...prev, dbUri: e.target.value }))}
              />
              <span className="input-hint">Leave blank to share the main default database.</span>
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
              onClick={handleStatusChangeSubmit}
            >
              Confirm {statusForm.newStatus === 'Suspended' ? 'Suspension' : 'Activation'}
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
              ? ' This will instantly block all employees of this organization from signing in or reading data.'
              : ' This will restore all standard employees and admins portal access.'}
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default CompaniesList;
