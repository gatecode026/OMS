/**
 * @file src/pages/InactiveEmployees.jsx
 * @description Dedicated Enterprise Inactive Employee Directory & Exit Management Panel.
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import Skeleton from '../components/common/Skeleton';
import Badge from '../components/common/Badge';
import {
  Users,
  Search,
  Filter,
  Calendar,
  Building,
  TrendingDown,
  Info,
  X,
  FileText,
  Clock,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Download,
  Eye,
  Award,
  DollarSign,
  ChevronRight,
  UserCheck,
  Activity,
  ArrowUpDown
} from 'lucide-react';
import './InactiveEmployees.css';

const EXIT_REASONS = ['Resignation', 'Termination', 'Contract End', 'Retirement', 'Abandonment', 'Other', '—'];

export default function InactiveEmployees() {
  const isLoadingPage = usePageLoading(600);
  const {
    allEmployees: employees = [],
    departments = [],
    restoreEmployee,
    fetchOpenWork,
    addToast,
    showConfirm,
    currentUserRole
  } = useApp();

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedReason, setSelectedReason] = useState('All');
  const [exitDateFilter, setExitDateFilter] = useState('');
  const [sortField, setSortField] = useState('exitDate');
  const [sortOrder, setSortOrder] = useState('desc');

  // Drawer / View State
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'work', 'exit', 'history'
  const [openWorkStats, setOpenWorkStats] = useState(null);
  const [loadingOpenWork, setLoadingOpenWork] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter inactive employees from raw employees
  const inactiveEmployees = useMemo(() => {
    return employees.filter(e => e.accountStatus === 'Inactive' || e.status === 'Inactive');
  }, [employees]);

  // Statistics KPI computation
  const stats = useMemo(() => {
    const total = inactiveEmployees.length;
    const thisMonthCount = inactiveEmployees.filter(e => {
      const exitDateStr = e.exitInfo?.exitDate;
      if (!exitDateStr) return false;
      const date = new Date(exitDateStr);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;

    const resignations = inactiveEmployees.filter(e => e.exitInfo?.exitReason === 'Resignation').length;
    const terminations = inactiveEmployees.filter(e => e.exitInfo?.exitReason === 'Termination').length;

    const resignationRate = total > 0 ? Math.round((resignations / total) * 100) : 0;
    const terminationRate = total > 0 ? Math.round((terminations / total) * 100) : 0;

    return { total, thisMonthCount, resignationRate, terminationRate };
  }, [inactiveEmployees]);

  // Sorting & Filtering
  const filteredAndSorted = useMemo(() => {
    let result = [...inactiveEmployees];

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        e =>
          (e.name || '').toLowerCase().includes(q) ||
          (e.id || '').toLowerCase().includes(q) ||
          (e.employeeCode || '').toLowerCase().includes(q) ||
          (e.designation || '').toLowerCase().includes(q)
      );
    }

    // Department filter
    if (selectedDept !== 'All') {
      result = result.filter(e => e.department === selectedDept);
    }

    // Exit Reason filter
    if (selectedReason !== 'All') {
      result = result.filter(e => e.exitInfo?.exitReason === selectedReason);
    }

    // Exit Date filter
    if (exitDateFilter) {
      result = result.filter(e => e.exitInfo?.exitDate === exitDateFilter);
    }

    // Sorting
    result.sort((a, b) => {
      let valA, valB;
      if (sortField === 'exitDate') {
        valA = a.exitInfo?.exitDate || '';
        valB = b.exitInfo?.exitDate || '';
      } else if (sortField === 'lastWorkingDay') {
        valA = a.exitInfo?.lastWorkingDay || '';
        valB = b.exitInfo?.lastWorkingDay || '';
      } else if (sortField === 'exitReason') {
        valA = a.exitInfo?.exitReason || '';
        valB = b.exitInfo?.exitReason || '';
      } else {
        valA = a[sortField] || '';
        valB = b[sortField] || '';
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [inactiveEmployees, searchTerm, selectedDept, selectedReason, exitDateFilter, sortField, sortOrder]);

  // Paginated data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSorted.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSorted, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredAndSorted.length / pageSize) || 1;

  // Toggle sort order helper
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Open Drawer and fetch task history details if clicked
  const handleSelectEmployee = async (emp) => {
    setSelectedEmployee(emp);
    setActiveTab('profile');
    setOpenWorkStats(null);
    setLoadingOpenWork(true);
    try {
      const stats = await fetchOpenWork(emp.id);
      setOpenWorkStats(stats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingOpenWork(false);
    }
  };

  // Restore Employee Handler
  const handleRestore = (id, name) => {
    showConfirm(
      `Restore Employee Account?`,
      `Are you sure you want to restore ${name}? This will immediately reactivate their login credentials, allow socket connections, and restore them to active directory dropdowns. Their exit details will be preserved as audit records.`,
      async () => {
        const success = await restoreEmployee(id);
        if (success) {
          if (selectedEmployee && selectedEmployee.id === id) {
            setSelectedEmployee(null);
          }
        }
      },
      'primary'
    );
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredAndSorted.length === 0) {
      addToast('warning', 'No record to export.');
      return;
    }

    const headers = ['ID', 'Name', 'Department', 'Designation', 'Joining Date', 'Last Working Day', 'Exit Date', 'Exit Reason', 'Exit Notes'];
    const rows = filteredAndSorted.map(e => [
      e.id || '',
      e.name || '',
      e.department || '',
      e.designation || '',
      e.joinDate || '',
      e.exitInfo?.lastWorkingDay || '',
      e.exitInfo?.exitDate || '',
      e.exitInfo?.exitReason || '',
      e.exitInfo?.exitNotes || ''
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(r => r.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Inactive_Employees_Registry_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoadingPage) {
    return (
      <div className="inactive-emp-page flex-column grid-gap" style={{ padding: '24px' }}>
        <Skeleton width="200px" height="32px" />
        <div className="inactive-emp-stats-grid">
          <Skeleton height="100px" count={4} />
        </div>
        <Skeleton height="400px" />
      </div>
    );
  }

  return (
    <div className="inactive-emp-page">
      <div className="inactive-emp-header">
        <div className="inactive-emp-title-wrap">
          <TrendingDown size={28} className="title-icon-inactive" />
          <div>
            <h1>Past Employees Directory</h1>
            <p>Monitor exited employee registries, historical assignments, and account deactivation logs.</p>
          </div>
        </div>

        <div className="header-actions">
          <button className="export-registry-btn btn-secondary" onClick={handleExportCSV}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="inactive-emp-stats-grid">
        <div className="inactive-stat-card border-left-danger">
          <div className="stat-icon-wrap bg-danger-light">
            <Users size={20} className="text-danger" />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Past Employees</span>
            <h2 className="stat-val">{stats.total}</h2>
            <span className="stat-subdesc">All-time exited database records</span>
          </div>
        </div>

        <div className="inactive-stat-card border-left-warning">
          <div className="stat-icon-wrap bg-warning-light">
            <Calendar size={20} className="text-warning" />
          </div>
          <div className="stat-content">
            <span className="stat-label">Exited This Month</span>
            <h2 className="stat-val">{stats.thisMonthCount}</h2>
            <span className="stat-subdesc">Voluntary & involuntary exits</span>
          </div>
        </div>

        <div className="inactive-stat-card border-left-info">
          <div className="stat-icon-wrap bg-info-light">
            <FileText size={20} className="text-info" />
          </div>
          <div className="stat-content">
            <span className="stat-label">Resignation Rate</span>
            <h2 className="stat-val">{stats.resignationRate}%</h2>
            <span className="stat-subdesc">Exits due to voluntary resignations</span>
          </div>
        </div>

        <div className="inactive-stat-card border-left-success">
          <div className="stat-icon-wrap bg-success-light">
            <AlertTriangle size={20} className="text-success" />
          </div>
          <div className="stat-content">
            <span className="stat-label font-md">Termination / Exits</span>
            <h2 className="stat-val">{stats.terminationRate}%</h2>
            <span className="stat-subdesc">Contracts expired & terminated</span>
          </div>
        </div>
      </div>

      {/* Filter and Toolbar Area */}
      <div className="card table-wrapper-card mt-3">
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px', padding: '14px 16px', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div className="search-input-wrapper" style={{ flex: '1 1 200px', minWidth: '180px', maxWidth: '320px' }}>
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search ID, name, or role..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="toolbar-search-input"
              style={{ width: '100%' }}
            />
          </div>

          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={e => { setSelectedDept(e.target.value); setCurrentPage(1); }}
            className="filter-select"
            style={{ flex: '0 0 auto', width: '170px' }}
          >
            <option value="All">All Departments</option>
            {departments.map(d => (
              <option key={d.id || d._id} value={d.name}>{d.name}</option>
            ))}
          </select>

          {/* Exit Reason Filter */}
          <select
            value={selectedReason}
            onChange={e => { setSelectedReason(e.target.value); setCurrentPage(1); }}
            className="filter-select"
            style={{ flex: '0 0 auto', width: '170px' }}
          >
            <option value="All">All Exit Reasons</option>
            {EXIT_REASONS.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          {/* Exit Date Filter */}
          <div className="date-filter-wrapper" style={{ flex: '0 0 auto' }}>
            <Calendar size={14} className="date-icon" />
            <input
              type="date"
              value={exitDateFilter}
              onChange={e => { setExitDateFilter(e.target.value); setCurrentPage(1); }}
              className="filter-date-input"
              title="Filter by exit date"
              style={{ width: '155px' }}
            />
            {exitDateFilter && (
              <button className="clear-date-btn" onClick={() => setExitDateFilter('')} title="Clear exit date">
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Inactive Employees Table */}
        <div className="emp-table-scroll">
          <table className="emp-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('id')} className="sortable-th">
                  Employee ID <ArrowUpDown size={12} className="sort-icon-inline" />
                </th>
                <th onClick={() => handleSort('name')} className="sortable-th">
                  Name <ArrowUpDown size={12} className="sort-icon-inline" />
                </th>
                <th>Department</th>
                <th>Designation</th>
                <th>Joining Date</th>
                <th onClick={() => handleSort('lastWorkingDay')} className="sortable-th">
                  Last Working Day <ArrowUpDown size={12} className="sort-icon-inline" />
                </th>
                <th onClick={() => handleSort('exitDate')} className="sortable-th">
                  Exit Date <ArrowUpDown size={12} className="sort-icon-inline" />
                </th>
                <th onClick={() => handleSort('exitReason')} className="sortable-th">
                  Exit Reason <ArrowUpDown size={12} className="sort-icon-inline" />
                </th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="empty-table-cell">
                    <div className="empty-table-msg">
                      <Info size={32} className="text-muted mb-2" />
                      <p>No past employee records match your active search filter settings.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map(row => (
                  <tr key={row.id} className="inactive-row-hover" onClick={() => handleSelectEmployee(row)}>
                    <td>
                      <span className="emp-id-badge">{row.id || row.employeeCode}</span>
                    </td>
                    <td>
                      <div className="emp-name-cell">
                        <span className="emp-name-text text-muted">{row.name}</span>
                        <span className="inactive-tag">Exited</span>
                      </div>
                    </td>
                    <td>{row.department || '—'}</td>
                    <td>{row.designation || '—'}</td>
                    <td>{row.joinDate || '—'}</td>
                    <td>{row.exitInfo?.lastWorkingDay || '—'}</td>
                    <td>{row.exitInfo?.exitDate || '—'}</td>
                    <td>
                      <span className={`exit-reason-pill ${row.exitInfo?.exitReason?.toLowerCase() || ''}`}>
                        {row.exitInfo?.exitReason || '—'}
                      </span>
                    </td>
                    <td>
                      <Badge variant="danger">Inactive</Badge>
                    </td>
                    <td>
                      <div className="table-actions-cell" onClick={e => e.stopPropagation()}>
                        <button
                          className="table-action-icon-btn text-primary-c"
                          onClick={() => handleSelectEmployee(row)}
                          title="View Profile Details"
                        >
                          <Eye size={14} />
                        </button>
                        {(currentUserRole === 'super_admin' || currentUserRole === 'admin' || currentUserRole === 'branch_admin' || currentUserRole === 'hr') && (
                          <button
                            className="table-action-icon-btn text-success"
                            onClick={() => handleRestore(row.id, row.name)}
                            title="Restore Employee Account"
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Toolbar */}
        {filteredAndSorted.length > 0 && (
          <div className="table-pagination flex-row justify-between align-center p-3">
            <span className="pagination-info">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredAndSorted.length)} of {filteredAndSorted.length} entries
            </span>
            <div className="pagination-buttons">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
                className="pagination-nav-btn"
              >
                First
              </button>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="pagination-nav-btn"
              >
                Prev
              </button>
              <span className="current-page-label">Page {currentPage} of {totalPages}</span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="pagination-nav-btn"
              >
                Next
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="pagination-nav-btn"
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Expandable Slideover Employee Detail Drawer */}
      {selectedEmployee && (
        <div className="slideover-backdrop" onClick={() => setSelectedEmployee(null)}>
          <div className="slideover-panel" onClick={e => e.stopPropagation()}>
            <div className="slideover-header">
              <div className="slideover-title-wrap">
                <Users size={20} className="text-muted" />
                <div>
                  <h2>{selectedEmployee.name}</h2>
                  <span className="slideover-subtitle">Exited Employee Profile ({selectedEmployee.id})</span>
                </div>
              </div>
              <button className="slideover-close-btn" onClick={() => setSelectedEmployee(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Slider Tabs */}
            <div className="slideover-tabs">
              <button
                className={`tab-item ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                Profile & Details
              </button>
              <button
                className={`tab-item ${activeTab === 'work' ? 'active' : ''}`}
                onClick={() => setActiveTab('work')}
              >
                Historical Work & Projects
              </button>
              <button
                className={`tab-item ${activeTab === 'exit' ? 'active' : ''}`}
                onClick={() => setActiveTab('exit')}
              >
                Exit Details
              </button>
            </div>

            {/* Slideover Scrollable Content */}
            <div className="slideover-content">
              {activeTab === 'profile' && (
                <div className="tab-pane flex-column grid-gap">
                  <div className="profile-hero-section">
                    <div className="large-avatar-placeholder">
                      {selectedEmployee.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div className="hero-text">
                      <h3>{selectedEmployee.name}</h3>
                      <p>{selectedEmployee.designation} • {selectedEmployee.department}</p>
                      <span className="exited-banner">Currently Inactive</span>
                    </div>
                  </div>

                  <div className="profile-details-grid">
                    <div className="profile-info-item">
                      <span className="info-label">Official Email</span>
                      <span className="info-val">{selectedEmployee.email || '—'}</span>
                    </div>
                    <div className="profile-info-item">
                      <span className="info-label">Contact Number</span>
                      <span className="info-val">{selectedEmployee.phone || '—'}</span>
                    </div>
                    <div className="profile-info-item">
                      <span className="info-label">Branch Agency</span>
                      <span className="info-val">{selectedEmployee.branch || '—'}</span>
                    </div>
                    <div className="profile-info-item">
                      <span className="info-label">Joining Date</span>
                      <span className="info-val">{selectedEmployee.joinDate || '—'}</span>
                    </div>
                    <div className="profile-info-item">
                      <span className="info-label">Employment Type</span>
                      <span className="info-val">{selectedEmployee.employeeType || '—'}</span>
                    </div>
                    <div className="profile-info-item">
                      <span className="info-label">Salary Details</span>
                      <span className="info-val">₹{selectedEmployee.monthlySalary || selectedEmployee.salaryAmount || '—'} / Month</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'work' && (
                <div className="tab-pane flex-column grid-gap">
                  {loadingOpenWork ? (
                    <div className="loading-openwork flex-column align-center justify-center p-5">
                      <div className="loading-spinner"></div>
                      <p className="mt-2 text-muted">Retrieving historical records...</p>
                    </div>
                  ) : (
                    <>
                      <div className="work-summary-tiles">
                        <div className="summary-tile">
                          <span className="tile-num">{openWorkStats?.pendingTasks?.length || 0}</span>
                          <span className="tile-label">Pending Tasks Reassigned</span>
                        </div>
                        <div className="summary-tile">
                          <span className="tile-num">{openWorkStats?.activeProjects?.length || 0}</span>
                          <span className="tile-label">Active Projects Associated</span>
                        </div>
                        <div className="summary-tile">
                          <span className="tile-num">{openWorkStats?.futureEvents?.length || 0}</span>
                          <span className="tile-label">Future Meetings Scrubbed</span>
                        </div>
                      </div>

                      {/* Display Associated Projects */}
                      <div className="drawer-sub-section">
                        <h4>Associated Projects</h4>
                        {openWorkStats?.activeProjects && openWorkStats.activeProjects.length > 0 ? (
                          <div className="associated-list">
                            {openWorkStats.activeProjects.map(proj => (
                              <div key={proj.id} className="associated-item">
                                <Award size={14} className="text-muted" />
                                <div className="item-text">
                                  <span className="item-title">{proj.name}</span>
                                  <span className="item-subtitle">Role: {proj.manager && proj.manager.toLowerCase() === selectedEmployee.name.toLowerCase() ? 'Manager' : 'Leader / Contributor'}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted text-xs p-2 bg-light-card">No associated active projects found.</p>
                        )}
                      </div>

                      {/* Display Reassigned Tasks */}
                      <div className="drawer-sub-section mt-2">
                        <h4>Historical Tasks (Pending Exit Reassignment)</h4>
                        {openWorkStats?.pendingTasks && openWorkStats.pendingTasks.length > 0 ? (
                          <div className="associated-list">
                            {openWorkStats.pendingTasks.map(t => (
                              <div key={t.id} className="associated-item">
                                <FileText size={14} className="text-muted" />
                                <div className="item-text">
                                  <span className="item-title">{t.title}</span>
                                  <span className="item-subtitle">Status: {t.status} | Priority: {t.priority}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted text-xs p-2 bg-light-card">No active pending tasks at deactivation.</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'exit' && (
                <div className="tab-pane flex-column grid-gap">
                  <div className="exit-details-card">
                    <div className="flex-row justify-between align-center mb-2 border-bottompb-2">
                      <span className="exit-bold-label">Exit Date</span>
                      <span className="exit-bold-val">{selectedEmployee.exitInfo?.exitDate || '—'}</span>
                    </div>

                    <div className="exit-info-rows">
                      <div className="exit-row">
                        <span className="row-lbl">Last Working Day</span>
                        <span className="row-val">{selectedEmployee.exitInfo?.lastWorkingDay || '—'}</span>
                      </div>
                      <div className="exit-row">
                        <span className="row-lbl">Exit Reason</span>
                        <span className="row-val font-semibold">{selectedEmployee.exitInfo?.exitReason || '—'}</span>
                      </div>
                      <div className="exit-row flex-column align-start">
                        <span className="row-lbl mb-1">Exit Notes & Remarks</span>
                        <span className="row-val exit-remarks-text">{selectedEmployee.exitInfo?.exitNotes || 'No notes provided at deactivation.'}</span>
                      </div>
                      <div className="exit-row">
                        <span className="row-lbl">Deactivated By</span>
                        <span className="row-val">{selectedEmployee.exitInfo?.deactivatedBy || 'System'}</span>
                      </div>
                      <div className="exit-row">
                        <span className="row-lbl">Deactivation Date</span>
                        <span className="row-val">
                          {selectedEmployee.exitInfo?.deactivatedAt
                            ? new Date(selectedEmployee.exitInfo.deactivatedAt).toLocaleString()
                            : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Audit Timeline */}
                  <div className="exit-audit-timeline-wrap">
                    <h4>Lifecycle Activity Timeline</h4>
                    <div className="audit-timeline">
                      <div className="timeline-item">
                        <div className="bullet-active"></div>
                        <div className="timeline-text">
                          <span className="timeline-action">Account Deactivated</span>
                          <span className="timeline-time">
                            {selectedEmployee.exitInfo?.deactivatedAt
                              ? new Date(selectedEmployee.exitInfo.deactivatedAt).toLocaleDateString()
                              : '—'}
                          </span>
                        </div>
                      </div>
                      {selectedEmployee.exitInfo?.restoredAt && (
                        <div className="timeline-item">
                          <div className="bullet-success"></div>
                          <div className="timeline-text">
                            <span className="timeline-action text-success">Account Restored</span>
                            <span className="timeline-time">
                              {new Date(selectedEmployee.exitInfo.restoredAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="timeline-item">
                        <div className="bullet-mute"></div>
                        <div className="timeline-text">
                          <span className="timeline-action">Employee Registered</span>
                          <span className="timeline-time">{selectedEmployee.joinDate || '—'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Slideover Footer Actions */}
            <div className="slideover-footer">
              {(currentUserRole === 'super_admin' || currentUserRole === 'admin' || currentUserRole === 'branch_admin' || currentUserRole === 'hr') && (
                <button
                  className="btn-success w-full flex-row justify-center align-center py-2"
                  onClick={() => handleRestore(selectedEmployee.id, selectedEmployee.name)}
                >
                  <RotateCcw size={14} className="mr-1" /> Restore Employee Account
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
