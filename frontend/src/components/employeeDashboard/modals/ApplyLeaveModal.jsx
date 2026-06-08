import React, { useState } from 'react';
import Modal from '../../common/Modal';
import { useApp } from '../../../context/AppContext';

const getDaysDiff = (start, end) => {
  if (!start || !end) return 1;
  const d1 = new Date(start);
  const d2 = new Date(end);
  if (d2 < d1) return 0;
  const diffTime = Math.abs(d2 - d1);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
};

const ApplyLeaveModal = ({
  isOpen,
  onClose,
  currentUser = {}
}) => {
  const { applyLeave, addToast } = useApp();
  const [type, setType] = useState('Casual Leave');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [document, setDocument] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!startDate || !endDate || !reason.trim()) {
      addToast('error', 'Please fill in all required fields.');
      return;
    }

    const days = getDaysDiff(startDate, endDate);
    if (days <= 0) {
      addToast('error', 'End date must be on or after start date.');
      return;
    }

    const leaveData = {
      employeeId: currentUser.id,
      employeeName: currentUser.name,
      department: currentUser.department || 'Engineering',
      type: type,
      fromDate: startDate,
      toDate: endDate,
      days: days,
      reason: reason,
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
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="padding-2 border-border"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
          >
            <option value="Casual Leave">Casual Leave</option>
            <option value="Sick Leave">Sick Leave</option>
            <option value="Earned Leave">Earned Leave</option>
          </select>
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
              className="padding-2 border-border"
            />
          </div>
        </div>

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
