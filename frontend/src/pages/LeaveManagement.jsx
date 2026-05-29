import React, { useState } from 'react';
import './LeaveManagement.css';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import DataTable from '../components/common/DataTable';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Avatar from '../components/common/Avatar';
import Modal from '../components/common/Modal';
import Skeleton from '../components/common/Skeleton';
import { Check, X, Eye, FileText, CalendarDays } from 'lucide-react';

const LeaveManagement = () => {
  const isLoading = usePageLoading(600);
  const {
    leaveRequests,
    approveLeaveRequest,
    rejectLeaveRequest,
    showConfirm
  } = useApp();

  const [activeTab, setActiveTab] = useState('Pending'); // 'Pending', 'Approved', 'Rejected', 'All'
  
  // Details Modal controls
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [approverNotesInput, setApproverNotesInput] = useState('');

  // Tab calculations
  const pendingRequests = leaveRequests.filter(r => r.status === 'Pending');
  const approvedRequests = leaveRequests.filter(r => r.status === 'Approved');
  const rejectedRequests = leaveRequests.filter(r => r.status === 'Rejected');

  const getFilteredData = () => {
    switch (activeTab) {
      case 'Pending': return pendingRequests;
      case 'Approved': return approvedRequests;
      case 'Rejected': return rejectedRequests;
      default: return leaveRequests;
    }
  };

  const handleRowClick = (leave) => {
    setSelectedLeave(leave);
    setApproverNotesInput(leave.approverNotes || '');
    setDetailModalOpen(true);
  };

  const handleApprove = (id, name, isModal = false) => {
    const action = () => {
      approveLeaveRequest(id, isModal ? approverNotesInput : '');
      if (isModal) setDetailModalOpen(false);
    };

    showConfirm(
      'Approve Leave Request',
      `Are you sure you want to approve this leave request for ${name}?`,
      action,
      'primary'
    );
  };

  const handleReject = (id, name, isModal = false) => {
    const action = () => {
      rejectLeaveRequest(id, isModal ? approverNotesInput : '');
      if (isModal) setDetailModalOpen(false);
    };

    showConfirm(
      'Reject Leave Request',
      `Are you sure you want to reject this leave request for ${name}?`,
      action,
      'danger'
    );
  };

  // Columns definition
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
    { key: 'type', header: 'Leave Type', sortable: true },
    { key: 'fromDate', header: 'From Date', sortable: true },
    { key: 'toDate', header: 'To Date', sortable: true },
    {
      key: 'days',
      header: 'Days',
      sortable: true,
      render: (row) => <strong>{row.days} days</strong>
    },
    {
      key: 'reason',
      header: 'Reason',
      sortable: false,
      render: (row) => <span className="reason-trunc" title={row.reason}>{row.reason}</span>
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => (
        <Badge variant={row.status === 'Approved' ? 'success' : row.status === 'Pending' ? 'warning' : 'danger'}>
          {row.status}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (row) => (
        <div className="table-actions-cell" onClick={(e) => e.stopPropagation()}>
          {row.status === 'Pending' ? (
            <>
              <button
                className="action-btn-mini success-btn"
                onClick={() => handleApprove(row.id, row.employeeName)}
                title="Approve"
              >
                <Check size={14} />
              </button>
              <button
                className="action-btn-mini danger-btn"
                onClick={() => handleReject(row.id, row.employeeName)}
                title="Reject"
              >
                <X size={14} />
              </button>
            </>
          ) : (
            <button
              className="action-btn-mini view-btn"
              onClick={() => handleRowClick(row)}
              title="View Details"
            >
              <Eye size={14} />
            </button>
          )}
        </div>
      )
    }
  ];

  if (isLoading) {
    return (
      <div className="leaves-page grid-gap animate-fade-in">
        <div className="card" style={{ height: '80px' }}><Skeleton variant="rect" height="100%" /></div>
        <div className="card" style={{ height: '400px' }}><Skeleton variant="rect" height="100%" /></div>
      </div>
    );
  }

  return (
    <div className="leaves-page flex-column grid-gap">
      
      {/* Page Title */}
      <div className="page-header-row">
        <div>
          <h2>Leave Request Management</h2>
          <p className="page-desc-text">Manage employee absence filings, sick leaves, and vacation requests</p>
        </div>
      </div>

      {/* Tabs Menu Strip */}
      <div className="tabs-header-strip">
        <div className="tabs-navigation-buttons">
          {[
            { key: 'Pending', label: 'Pending', count: pendingRequests.length, variant: 'warning' },
            { key: 'Approved', label: 'Approved', count: approvedRequests.length, variant: 'success' },
            { key: 'Rejected', label: 'Rejected', count: rejectedRequests.length, variant: 'danger' },
            { key: 'All', label: 'All Requests', count: leaveRequests.length, variant: 'neutral' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`tab-btn-item ${activeTab === tab.key ? 'active' : ''}`}
            >
              <span>{tab.label}</span>
              <span className={`tab-badge-count count-var-${tab.variant}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid List */}
      <div className="card table-wrapper-card">
        <DataTable
          columns={columns}
          data={getFilteredData()}
          loading={isLoading}
          rowsPerPage={10}
          emptyTitle="No Leave Requests"
          emptyDescription={`There are no ${activeTab.toLowerCase()} leave requests right now.`}
          emptyActionText="Clear Filters"
          emptyOnActionClick={() => setActiveTab('All')}
          emptyActionIcon={CalendarDays}
        />
      </div>

      {/* Leave Details Modal dialog */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Leave Request Details"
        size="md"
        footer={
          selectedLeave?.status === 'Pending' ? (
            <div className="modal-actions-wrapper">
              <Button
                variant="secondary"
                onClick={() => handleReject(selectedLeave.id, selectedLeave.employeeName, true)}
                icon={X}
              >
                Reject Request
              </Button>
              <Button
                variant="primary"
                onClick={() => handleApprove(selectedLeave.id, selectedLeave.employeeName, true)}
                icon={Check}
              >
                Approve Request
              </Button>
            </div>
          ) : (
            <Button variant="secondary" onClick={() => setDetailModalOpen(false)}>
              Close Detail
            </Button>
          )
        }
      >
        {selectedLeave && (
          <div className="leave-modal-detail-body animate-fade-in">
            {/* Header info */}
            <div className="leave-detail-profile">
              <Avatar name={selectedLeave.employeeName} size="md" />
              <div>
                <h4 className="detail-profile-name">{selectedLeave.employeeName}</h4>
                <div className="flex-center gap-2 justify-start mt-1">
                  <Badge variant="purple">{selectedLeave.type}</Badge>
                  <span className="text-muted text-xs">Applied on {selectedLeave.appliedDate}</span>
                </div>
              </div>
              <Badge variant={selectedLeave.status === 'Approved' ? 'success' : selectedLeave.status === 'Pending' ? 'warning' : 'danger'}>
                {selectedLeave.status}
              </Badge>
            </div>

            {/* Date timeline cards */}
            <div className="leave-dates-summary">
              <div className="date-block">
                <span className="block-label">From Date</span>
                <strong>{selectedLeave.fromDate}</strong>
              </div>
              <div className="date-block">
                <span className="block-label">To Date</span>
                <strong>{selectedLeave.toDate}</strong>
              </div>
              <div className="date-block block-highlight">
                <span className="block-label">Total Days</span>
                <strong>{selectedLeave.days} Days</strong>
              </div>
            </div>

            {/* Reason details */}
            <div className="leave-reason-section">
              <span className="section-label">Reason for request</span>
              <p className="reason-full-text">{selectedLeave.reason}</p>
            </div>

            {/* Notes Form or Viewer */}
            <div className="leave-notes-section">
              <span className="section-label">Approver Comments</span>
              {selectedLeave.status === 'Pending' ? (
                <textarea
                  placeholder="Add notes or feedback here (e.g. Please submit handover note)..."
                  value={approverNotesInput}
                  onChange={(e) => setApproverNotesInput(e.target.value)}
                  rows={3}
                />
              ) : (
                <p className="approver-notes-display">
                  {selectedLeave.approverNotes || <em>No comments added.</em>}
                </p>
              )}
            </div>

            {/* Request updates history timeline */}
            <div className="leave-history-timeline-section">
              <span className="section-label">Request Status Timeline</span>
              <div className="history-timeline">
                {selectedLeave.history.map((step, idx) => (
                  <div key={idx} className="timeline-node">
                    <div className="timeline-node-line"></div>
                    <span className="timeline-bullet"></span>
                    <div className="timeline-content">
                      <div className="timeline-meta">
                        <strong>{step.status}</strong>
                        <span>{step.date}</span>
                      </div>
                      <p className="timeline-comment">{step.comment}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default LeaveManagement;
