import React, { useState } from 'react';
import './Attendance.css';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import DataTable from '../components/common/DataTable';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Avatar from '../components/common/Avatar';
import Skeleton from '../components/common/Skeleton';
import Modal from '../components/common/Modal';
import { Download, Calendar, Filter, Edit2 } from 'lucide-react';

const Attendance = () => {
  const isLoading = usePageLoading(600);
  const { attendance, updateAttendanceRecord, addToast } = useApp();

  const [dateFilter, setDateFilter] = useState('2026-05-29');
  const [deptFilter, setDeptFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');

  // Edit record states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [editFormData, setEditFormData] = useState({
    date: '',
    punchIn: '',
    punchOut: '',
    totalHours: 0,
    status: 'Present'
  });

  const handleOpenEdit = (record) => {
    setSelectedRecord(record);
    setEditFormData({
      date: record.date || '',
      punchIn: record.punchIn || '',
      punchOut: record.punchOut || '',
      totalHours: record.totalHours || 0,
      status: record.status || 'Present'
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = () => {
    if (!selectedRecord) return;
    updateAttendanceRecord(selectedRecord.id, editFormData);
    setEditModalOpen(false);
  };

  // Summaries Calculations
  const filteredAttendance = attendance.filter(a => {
    const matchesDate = dateFilter ? a.date === dateFilter : true;
    const matchesDept = deptFilter ? a.department === deptFilter : true;
    const matchesBranch = branchFilter ? a.branch === branchFilter : true;
    return matchesDate && matchesDept && matchesBranch;
  });

  const totalRecords = filteredAttendance.length;
  const totalPresent = filteredAttendance.filter(a => a.status === 'Present').length;
  const totalLate = filteredAttendance.filter(a => a.status === 'Late').length;
  const totalAbsent = filteredAttendance.filter(a => a.status === 'Absent').length;
  const totalHalfDay = filteredAttendance.filter(a => a.status === 'Half Day').length;

  const handleExport = () => {
    addToast('success', `Export generated! attendance_report_${dateFilter || 'all'}.csv downloaded successfully.`);
  };

  // Table Columns
  const columns = [
    {
      key: 'employeeName',
      header: 'Employee',
      sortable: true,
      render: (row) => (
        <div className="flex-center gap-3 justify-start">
          <Avatar name={row.employeeName} size="sm" />
          <span className="emp-name-bold">{row.employeeName}</span>
        </div>
      )
    },
    { key: 'date', header: 'Date', sortable: true },
    { key: 'punchIn', header: 'Punch In', sortable: true },
    { key: 'punchOut', header: 'Punch Out', sortable: true },
    {
      key: 'totalHours',
      header: 'Total Hours',
      sortable: true,
      render: (row) => <span>{row.totalHours > 0 ? `${row.totalHours} hrs` : '--'}</span>
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => {
        let variant = 'neutral';
        if (row.status === 'Present') variant = 'success';
        else if (row.status === 'Late') variant = 'warning';
        else if (row.status === 'Absent') variant = 'danger';
        else if (row.status === 'Half Day') variant = 'info';

        return <Badge variant={variant}>{row.status}</Badge>;
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <button
          className="circle-action-btn btn-success-circle"
          onClick={() => handleOpenEdit(row)}
          title="Edit Log"
          style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Edit2 size={12} />
        </button>
      )
    }
  ];

  if (isLoading) {
    return (
      <div className="attendance-page grid-gap">
        <div className="card" style={{ height: '80px' }}><Skeleton variant="rect" height="100%" /></div>
        <div className="stats-row">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card skeleton-card" style={{ height: '100px' }}>
              <Skeleton variant="rect" height="100%" />
            </div>
          ))}
        </div>
        <div className="card" style={{ height: '340px' }}><Skeleton variant="rect" height="100%" /></div>
      </div>
    );
  }

  return (
    <div className="attendance-page flex-column grid-gap">
      
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h2>Attendance Log Ledger</h2>
          <p className="page-desc-text">Track clock-in, clock-out metrics and regional branch presence</p>
        </div>
        <Button variant="secondary" onClick={handleExport} icon={Download}>
          Export Report
        </Button>
      </div>

      {/* Filter Options */}
      <div className="card filters-card">
        <div className="attendance-filters-row">
          <div className="attendance-date-input">
            <Calendar size={16} className="date-icon" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>

          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
            <option value="">All Departments</option>
            <option value="Engineering">Engineering</option>
            <option value="Marketing">Marketing</option>
            <option value="Sales">Sales</option>
            <option value="Operations">Operations</option>
            <option value="Human Resources">Human Resources</option>
          </select>

          <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
            <option value="">All Branches</option>
            <option value="Jaipur">Jaipur</option>
            <option value="Delhi">Delhi</option>
            <option value="Mumbai">Mumbai</option>
            <option value="Bangalore">Bangalore</option>
          </select>
        </div>
      </div>

      {/* Summary Stats Cards Grid */}
      <div className="stats-row attendance-stats-row">
        <div className="card attendance-stat-item border-success">
          <span className="stat-label">Total Present</span>
          <h3 className="stat-num text-success">{totalPresent}</h3>
          <span className="stat-desc-sub">{totalHalfDay} Half Days included</span>
        </div>
        <div className="card attendance-stat-item border-warning">
          <span className="stat-label">Late Arrivals</span>
          <h3 className="stat-num text-warning">{totalLate}</h3>
          <span className="stat-desc-sub">Grace period allowed: 15m</span>
        </div>
        <div className="card attendance-stat-item border-danger">
          <span className="stat-label">Total Absent</span>
          <h3 className="stat-num text-danger">{totalAbsent}</h3>
          <span className="stat-desc-sub">Unexcused leaves flagged</span>
        </div>
        <div className="card attendance-stat-item border-info">
          <span className="stat-label">Total Logs</span>
          <h3 className="stat-num text-info">{totalRecords}</h3>
          <span className="stat-desc-sub">Processed in period</span>
        </div>
      </div>

      {/* Attendance Analytics Card Group */}
      <div className="stats-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginTop: '0', gap: 'var(--spacing-4)' }}>
        <div className="card attendance-stat-item" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', padding: 'var(--spacing-4)' }}>
          <span className="stat-label" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Avg Login Time</span>
          <h3 className="stat-num" style={{ fontSize: '1.25rem', margin: '4px 0', color: 'var(--text-primary)', fontWeight: 700 }}>09:12 AM</h3>
          <span className="stat-desc-sub" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Within grace limit</span>
        </div>
        <div className="card attendance-stat-item" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', padding: 'var(--spacing-4)' }}>
          <span className="stat-label" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Avg Logout Time</span>
          <h3 className="stat-num" style={{ fontSize: '1.25rem', margin: '4px 0', color: 'var(--text-primary)', fontWeight: 700 }}>06:05 PM</h3>
          <span className="stat-desc-sub" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Standard shift check</span>
        </div>
        <div className="card attendance-stat-item" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', padding: 'var(--spacing-4)' }}>
          <span className="stat-label" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Total Working Hours</span>
          <h3 className="stat-num" style={{ fontSize: '1.25rem', margin: '4px 0', color: 'var(--color-success)', fontWeight: 700 }}>184.5 hrs</h3>
          <span className="stat-desc-sub" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Cumulated this month</span>
        </div>
        <div className="card attendance-stat-item" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', padding: 'var(--spacing-4)' }}>
          <span className="stat-label" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Overtime Hours</span>
          <h3 className="stat-num" style={{ fontSize: '1.25rem', margin: '4px 0', color: 'var(--color-primary)', fontWeight: 700 }}>12.4 hrs</h3>
          <span className="stat-desc-sub" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Approved calculations</span>
        </div>
        <div className="card attendance-stat-item" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', padding: 'var(--spacing-4)' }}>
          <span className="stat-label" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Break Hours</span>
          <h3 className="stat-num" style={{ fontSize: '1.25rem', margin: '4px 0', color: 'var(--text-secondary)', fontWeight: 700 }}>22.0 hrs</h3>
          <span className="stat-desc-sub" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>1 hr daily policy limit</span>
        </div>
        <div className="card attendance-stat-item" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', padding: 'var(--spacing-4)' }}>
          <span className="stat-label" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Monthly Trend</span>
          <h3 className="stat-num" style={{ fontSize: '1.25rem', margin: '4px 0', color: 'var(--color-success)', fontWeight: 700 }}>+2.4%</h3>
          <span className="stat-desc-sub" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Higher compliance rate</span>
        </div>
      </div>

      {/* Table grid split layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--spacing-6)', alignItems: 'start' }}>
        
        {/* Table card */}
        <div className="card table-wrapper-card" style={{ flex: 2, height: 'max-content' }}>
          <DataTable
            columns={columns}
            data={filteredAttendance}
            loading={isLoading}
            rowsPerPage={10}
            emptyTitle="No Attendance Records Found"
            emptyDescription="Try selecting another date or adjusting filters."
          />
        </div>

        {/* Attendance Alerts Side Panel */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 'var(--spacing-5)', height: '100%', flex: 1 }}>
          <div className="widget-header" style={{ marginBottom: '16px' }}>
            <span className="widget-title" style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>Attendance Alerts & Flags</span>
            <Badge variant="danger">Critical</Badge>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.04)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <strong style={{ fontSize: '0.8125rem', color: 'var(--color-danger)' }}>Frequent Late Arrivals</strong>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>3 Flagged</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Vikram Singh and Rajesh Kumar checked in late more than 3 times this week.
              </p>
            </div>

            <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.04)', border: '1px solid rgba(245, 158, 11, 0.1)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <strong style={{ fontSize: '0.8125rem', color: 'var(--color-warning)' }}>Missing Punch Records</strong>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>1 Flagged</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Rajesh Kumar has a missing clock-out record for yesterday.
              </p>
            </div>

            <div style={{ padding: '12px', background: 'rgba(168, 85, 247, 0.04)', border: '1px solid rgba(168, 85, 247, 0.1)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <strong style={{ fontSize: '0.8125rem', color: 'var(--color-purple)' }}>Consecutive Absence Alert</strong>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>1 Flagged</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Meena Sharma has been absent for 3 consecutive working days.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Edit Attendance Record Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Edit Attendance Log: ${selectedRecord?.employeeName}`}
        size="md"
        footer={
          <div className="modal-actions-wrapper">
            <Button variant="secondary" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleEditSubmit}>
              Save Changes
            </Button>
          </div>
        }
      >
        {selectedRecord && (
          <div className="create-task-form-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            <div className="form-field" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
              <div>
                <label>Employee Name</label>
                <input
                  type="text"
                  value={selectedRecord.employeeName}
                  disabled
                  style={{ opacity: 0.7, cursor: 'not-allowed', background: 'rgba(255,255,255,0.02)' }}
                />
              </div>
              <div>
                <label>Branch / Office</label>
                <input
                  type="text"
                  value={selectedRecord.branch}
                  disabled
                  style={{ opacity: 0.7, cursor: 'not-allowed', background: 'rgba(255,255,255,0.02)' }}
                />
              </div>
            </div>
            
            <div className="form-field" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
              <div>
                <label>Punch In Time</label>
                <input
                  type="text"
                  placeholder="e.g. 09:00"
                  value={editFormData.punchIn}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, punchIn: e.target.value }))}
                />
              </div>
              <div>
                <label>Punch Out Time</label>
                <input
                  type="text"
                  placeholder="e.g. 18:00"
                  value={editFormData.punchOut}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, punchOut: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-field" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
              <div>
                <label>Total Hours</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 8.5"
                  value={editFormData.totalHours}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, totalHours: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <label>Status</label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value }))}
                  style={{ width: '100%', height: '38px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 10px', color: 'var(--text-primary)' }}
                >
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Absent">Absent</option>
                  <option value="Half Day">Half Day</option>
                </select>
              </div>
            </div>

            <div className="form-field">
              <label>Date</label>
              <input
                type="date"
                value={editFormData.date}
                onChange={(e) => setEditFormData(prev => ({ ...prev, date: e.target.value }))}
                style={{ width: '100%', height: '38px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 10px', color: 'var(--text-primary)' }}
              />
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default Attendance;
