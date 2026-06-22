import React, { useState } from 'react';
import Modal from '../../common/Modal';
import { useApp } from '../../../context/AppContext';

const getWorkingDaysDiff = (start, end, holidays = []) => {
  if (!start || !end) return 0;
  if (start === end) return 1;
  const d1 = new Date(start);
  const d2 = new Date(end);
  if (d2 < d1) return 0;
  let count = 0;
  const cur = new Date(d1);
  const holidaySet = new Set(holidays.map(h => h.date));
  while (cur <= d2) {
    const day = cur.getUTCDay();
    const dateStr = cur.toISOString().split('T')[0];
    if (day !== 0 && !holidaySet.has(dateStr)) count++;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
};

const ApplyLeaveModal = ({
  isOpen,
  onClose,
  currentUser = {}
}) => {
  const { applyLeave, addToast, holidaysList = [], leaveRequests = [] } = useApp();

  const [type, setType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [document, setDocument] = useState(null);

  const days = getWorkingDaysDiff(startDate, endDate, holidaysList);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!type.trim() || !startDate || !endDate || !reason.trim()) {
      addToast('error', 'Please fill in all required fields.');
      return;
    }

    if (days <= 0) {
      addToast('error', 'End date must be on or after start date and contain at least 1 working day.');
      return;
    }

    // Check for overlapping approved/pending leaves
    const myLeaves = leaveRequests.filter(l => l.employeeId === currentUser.id);
    const hasOverlap = myLeaves.some(l => {
      if (l.status !== 'Approved' && l.status !== 'Pending') return false;
      return l.fromDate <= endDate && startDate <= l.toDate;
    });

    if (hasOverlap) {
      addToast('error', 'You already have an approved or pending leave request that overlaps with this date range.');
      return;
    }

    const leaveData = {
      employeeId: currentUser.id,
      employeeName: currentUser.name,
      department: currentUser.department || '',
      type: type,
      fromDate: startDate,
      toDate: endDate,
      days: days,
      reason: reason,
      appliedDate: new Date().toISOString().split('T')[0],
      attachments: document ? [document.name] : []
    };

    applyLeave(leaveData);
    onClose();

    // Reset
    setStartDate('');
    setEndDate('');
    setReason('');
    setDocument(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Apply for Leave">
      <form onSubmit={handleSubmit} className="flex-column gap-4 padding-4">
        {/* Leave Type */}
        <div className="flex-column gap-1">
          <label className="text-xs text-text-muted bold-text uppercase">Leave Type *</label>
          <input
            type="text"
            value={type}
            onChange={(e) => setType(e.target.value)}
            placeholder="e.g. Casual Leave, Sick Leave, Paid Leave..."
            required
            className="padding-2 border-border"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
          />
        </div>

        {/* Dates */}
        <div className="flex-row gap-3 flex-wrap">
          <div className="flex-column flex-1 gap-1">
            <label className="text-xs text-text-muted bold-text uppercase">Start Date *</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              min={new Date().toISOString().split('T')[0]}
              className="padding-2 border-border"
            />
          </div>

          <div className="flex-column flex-1 gap-1">
            <label className="text-xs text-text-muted bold-text uppercase">End Date *</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              min={startDate || new Date().toISOString().split('T')[0]}
              className="padding-2 border-border"
            />
          </div>
        </div>

        {startDate && endDate && (
          <div className="text-xs bold-text" style={{ color: days > 0 ? 'var(--color-success, #10b981)' : 'var(--color-danger, #ef4444)', marginTop: '-8px' }}>
            Working Days: {days} {days === 1 ? 'day' : 'days'}
          </div>
        )}

        {/* Reason */}
        <div className="flex-column gap-1">
          <label className="text-xs text-text-muted bold-text uppercase">Reason for Leave *</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Please explain the reason for your leave application..."
            required
            rows={3}
            className="padding-2 border-border"
          />
        </div>

        {/* Supporting Document */}
        <div className="flex-column gap-1">
          <label className="text-xs text-text-muted bold-text uppercase">Supporting Document (Optional)</label>
          <input
            type="file"
            onChange={(e) => setDocument(e.target.files[0])}
            className="padding-2 border-border text-xs"
            style={{ padding: '8px 12px' }}
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex-row justify-end gap-3 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="padding-2 text-xs bold-text bg-surface border border-border rounded px-4 transition-all"
            style={{ cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="padding-2 text-xs bold-text bg-primary-500 hover:bg-primary-hover text-white rounded px-5 transition-all"
            style={{ border: 'none', cursor: 'pointer', background: 'var(--color-primary)' }}
          >
            Apply Leave
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ApplyLeaveModal;
