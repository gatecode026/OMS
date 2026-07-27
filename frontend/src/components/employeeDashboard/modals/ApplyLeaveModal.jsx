import React, { useState, useMemo } from 'react';
import Modal from '../../common/Modal';
import { useApp } from '../../../context/AppContext';
import { BsCalendar2Date, BsInfoCircle } from 'react-icons/bs';
import { IoSendSharp } from 'react-icons/io5';

const sanitizeYearInput = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    let [year, month, day] = parts;
    if (year.length > 4) {
      year = year.slice(0, 4);
      return `${year}-${month}-${day}`;
    }
  }
  return dateStr;
};

const isValidYYYY = (dateStr) => {
  if (!dateStr) return true;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const yrStr = parts[0];
    const yr = parseInt(yrStr, 10);
    return yrStr.length === 4 && yr >= 1900 && yr <= 2099;
  }
  return true;
};

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
  const { applyLeave, addToast, holidaysList = [], leaveRequests = [], leavePolicyConfigs = [] } = useApp();

  const [type, setType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [customType, setCustomType] = useState('');

  const days = getWorkingDaysDiff(startDate, endDate, holidaysList);

  // Filter policies based on gender restriction and active status
  const activePolicies = useMemo(() => {
    return (leavePolicyConfigs || []).filter(policy => {
      if (!policy.isActive) return false;
      if (policy.genderRestriction && policy.genderRestriction !== 'All') {
        const userGender = currentUser.gender || 'Male';
        if (policy.genderRestriction.toLowerCase() !== userGender.toLowerCase()) {
          return false;
        }
      }
      return true;
    });
  }, [leavePolicyConfigs, currentUser]);

  const selectedPolicy = useMemo(() => {
    return activePolicies.find(p => p.leaveName === type);
  }, [activePolicies, type]);

  const remaining = useMemo(() => {
    if (!selectedPolicy) return null;
    const code = selectedPolicy.leaveCode;
    const fieldName = code === 'ML' ? 'maternityBalance' : `${code.toLowerCase()}Balance`;
    const available = typeof currentUser?.[fieldName] === 'number' ? currentUser[fieldName] : (selectedPolicy.defaultDays || 0);
    const used = leaveRequests
      .filter(l => 
        l.employeeId === currentUser?.id && 
        l.status === 'Approved' && 
        (l.type === selectedPolicy.leaveName || l.type === code || (code === 'PL' && l.type === 'Earned Leave'))
      )
      .reduce((sum, l) => sum + (Number(l.days) || 0), 0);
    return Math.max(0, available - used);
  }, [selectedPolicy, currentUser, leaveRequests]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!type.trim() || !startDate || !endDate) {
      addToast('error', 'Please fill in all required fields.');
      return;
    }

    if (!isValidYYYY(startDate) || !isValidYYYY(endDate)) {
      addToast('error', 'Invalid year format. Please enter a valid 4-digit year (YYYY).');
      return;
    }

    if (type === 'custom' && !customType.trim()) {
      addToast('error', 'Please specify custom Leave Type.');
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

    const finalType = type === 'custom' ? customType : type;

    const leaveData = {
      employeeId: currentUser.id,
      employeeName: currentUser.name,
      department: currentUser.department || 'Administration',
      type: finalType,
      fromDate: startDate,
      toDate: endDate,
      days: days,
      reason: reason || 'Personal reasons',
      appliedDate: new Date().toISOString().split('T')[0],
      attachments: []
    };

    applyLeave(leaveData);
    onClose();

    // Reset
    setType('');
    setCustomType('');
    setStartDate('');
    setEndDate('');
    setReason('');
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    background: '#151824',
    border: '1px solid #282F3E',
    borderRadius: '6px',
    color: '#E2E8F0',
    fontSize: '0.85rem',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s ease',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.7rem',
    fontWeight: '600',
    color: '#707E94',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  };

  const modalTitle = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        background: 'rgba(16,185,129,0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        <BsCalendar2Date size={16} style={{ color: 'var(--color-success, #10b981)' }} />
      </div>
      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Apply for Leave</span>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="lg">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 4px 4px 4px' }}>
        
        {/* Form Fields Row */}
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', width: '100%' }}>
          
          {/* Leave Type */}
          <div style={{ flex: '1.2 1 200px', display: 'flex', flexDirection: 'column' }}>
            <label style={labelStyle}>Leave Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              required
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = 'var(--color-primary, #d946ef)'}
              onBlur={(e) => e.target.style.borderColor = '#282F3E'}
            >
              <option value="">-- Select --</option>
              {activePolicies.map(p => (
                <option key={p.leaveCode} value={p.leaveName}>
                  {p.leaveName} ({p.leaveCode})
                </option>
              ))}
              <option value="custom">Other / Custom</option>
            </select>
            {type === 'custom' && (
              <div style={{ marginTop: '8px' }}>
                <input
                  type="text"
                  placeholder="Enter custom leave type..."
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  required
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = 'var(--color-primary, #d946ef)'}
                  onBlur={(e) => e.target.style.borderColor = '#282F3E'}
                />
              </div>
            )}
          </div>

          {/* From Date */}
          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column' }}>
            <label style={labelStyle}>From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                const val = sanitizeYearInput(e.target.value);
                setStartDate(val);
                if (endDate && endDate < val) {
                  setEndDate('');
                }
              }}
              required
              min={new Date().toISOString().split('T')[0]}
              max="2099-12-31"
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = 'var(--color-primary, #d946ef)'}
              onBlur={(e) => e.target.style.borderColor = '#282F3E'}
            />
          </div>

          {/* To Date */}
          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column' }}>
            <label style={labelStyle}>To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                const val = sanitizeYearInput(e.target.value);
                setEndDate(val);
              }}
              required
              disabled={!startDate}
              min={startDate}
              max="2099-12-31"
              style={{
                ...inputStyle,
                opacity: startDate ? 1 : 0.6,
                cursor: startDate ? 'text' : 'not-allowed'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--color-primary, #d946ef)'}
              onBlur={(e) => e.target.style.borderColor = '#282F3E'}
            />
          </div>

          {/* Working Days */}
          <div style={{ flex: '1 1 120px', display: 'flex', flexDirection: 'column' }}>
            <label style={labelStyle}>Working Days</label>
            <div style={{
              ...inputStyle,
              background: '#1a1d2c',
              color: days > 0 ? 'var(--color-success, #10b981)' : '#707E94',
              fontWeight: '600',
              height: '41px',
              display: 'flex',
              alignItems: 'center',
              border: '1px solid #282F3E',
              cursor: 'default',
              userSelect: 'none'
            }}>
              {days > 0 ? `${days} day${days !== 1 ? 's' : ''}` : '— auto calc'}
            </div>
          </div>

        </div>

        {/* Reason Textarea */}
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', marginBottom: remaining !== null ? '4px' : '0px' }}>
          <label style={labelStyle}>Reason <span style={{ color: '#707E94', fontWeight: '400', textTransform: 'none' }}>(optional)</span></label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Briefly describe your reason for leave..."
            rows={3}
            style={{
              ...inputStyle,
              resize: 'vertical',
              minHeight: '60px',
              fontFamily: 'inherit'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--color-primary, #d946ef)'}
            onBlur={(e) => e.target.style.borderColor = '#282F3E'}
          />
        </div>

        {/* Balance Preview */}
        {remaining !== null && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            background: '#11131c',
            border: '1px solid rgba(245, 158, 11, 0.15)',
            borderRadius: '6px',
            fontSize: '0.8rem',
            color: '#E2E8F0',
            width: '100%',
            boxSizing: 'border-box',
            marginBottom: '4px'
          }}>
            <BsInfoCircle size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
            <span>
              Balance for <strong style={{ color: '#f59e0b', fontWeight: '700' }}>{selectedPolicy.leaveName}</strong> : <strong style={{ color: '#f59e0b', fontWeight: '700' }}>{remaining} day{remaining !== 1 ? 's' : ''} remaining</strong>
            </span>
            {days > 0 && remaining < days && (
              <span style={{ color: 'var(--color-danger, #ef4444)', marginLeft: 'auto', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Insufficient balance
              </span>
            )}
          </div>
        )}

        {/* Footer Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', width: '100%' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 20px',
              background: 'transparent',
              border: '1px solid #282F3E',
              borderRadius: '6px',
              color: '#E2E8F0',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: '600',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{
              padding: '9px 20px',
              background: 'var(--color-success, #10b981)',
              border: 'none',
              borderRadius: '6px',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <IoSendSharp size={13} />
            Submit Request
          </button>
        </div>

      </form>
    </Modal>
  );
};

export default ApplyLeaveModal;
