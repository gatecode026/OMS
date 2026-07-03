import React, { useState, useEffect } from 'react';
import { MdClose, MdCheckCircle, MdError, MdBeachAccess, MdLocalHospital, MdDateRange, MdChildCare, MdPeople, MdAssignment } from 'react-icons/md';
import { BsCalendar2Date, BsInfoCircle } from 'react-icons/bs';
import { IoSendSharp } from 'react-icons/io5';
import { useApp } from '../../context/AppContext';

const LEAVE_TYPES = [
  { code: 'CL',        label: 'Casual Leave',    Icon: MdBeachAccess },
  { code: 'SL',        label: 'Sick Leave',       Icon: MdLocalHospital },
  { code: 'PL',        label: 'Earned Leave',     Icon: MdDateRange },
  { code: 'Maternity', label: 'Maternity Leave',  Icon: MdChildCare },
  { code: 'Paternity', label: 'Paternity Leave',  Icon: MdPeople },
  { code: 'Other',     label: 'Other',            Icon: MdAssignment },
];

const diffWorkingDays = (from, to, holidays = []) => {
  if (!from || !to) return 0;
  if (from === to) return 1;
  const start = new Date(from);
  const end = new Date(to);
  if (isNaN(start) || isNaN(end) || end < start) return 0;
  let count = 0;
  const cur = new Date(start);
  const holidaySet = new Set(holidays.map(h => h.date));
  while (cur <= end) {
    const day = cur.getUTCDay();
    const dateStr = cur.toISOString().split('T')[0];
    if (day !== 0 && !holidaySet.has(dateStr)) count++;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
};

const ApplyLeavePanel = ({ open, onClose, onSubmit, balances = [], holidays = [], editingLeave = null }) => {
  const { leaveRequests = [], currentUser, leavePolicyConfigs = [] } = useApp();
  const [form, setForm] = useState({ type: '', from: '', to: '', reason: '' });
  const [customType, setCustomType] = useState('');
  const [days, setDays] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const activePolicies = React.useMemo(() => {
    return leavePolicyConfigs && leavePolicyConfigs.length > 0
      ? leavePolicyConfigs.filter(p => p.isActive)
      : [
          { leaveCode: 'CL', leaveName: 'Casual Leave' },
          { leaveCode: 'SL', leaveName: 'Sick Leave' },
          { leaveCode: 'PL', leaveName: 'Paid Leave' },
          { leaveCode: 'ML', leaveName: 'Maternity Leave' },
          { leaveCode: 'UL', leaveName: 'Unpaid Leave' },
          { leaveCode: 'Other', leaveName: 'Other' }
        ];
  }, [leavePolicyConfigs]);

  useEffect(() => {
    const calculatedDays = diffWorkingDays(form.from, form.to, holidays);
    setDays(calculatedDays);
    
    if (form.from && form.to) {
      const myLeaves = leaveRequests.filter(l => l.employeeId === currentUser?.id && l.id !== editingLeave?.id);
      const overlap = myLeaves.some(l => {
        if (l.status !== 'Approved' && l.status !== 'Pending') return false;
        return l.fromDate <= form.to && form.from <= l.toDate;
      });
      if (overlap) {
        setError('You already have an approved or pending leave request that overlaps with this date range.');
      } else {
        setError('');
      }
    } else {
      setError('');
    }
  }, [form.from, form.to, holidays, leaveRequests, currentUser, editingLeave]);

  useEffect(() => {
    if (open) {
      if (editingLeave) {
        const typeCode = editingLeave.type === 'Casual Leave' ? 'CL' : 
                         editingLeave.type === 'Sick Leave' ? 'SL' : 
                         editingLeave.type === 'Earned Leave' || editingLeave.type === 'PL' ? 'PL' : 
                         editingLeave.type;
        
        const isStandard = ['CL', 'SL', 'PL', 'ML', 'Paternity', 'Other'].includes(typeCode) || 
                           activePolicies.some(p => p.leaveCode === typeCode);
        
        if (isStandard) {
          setForm({
            type: typeCode,
            from: editingLeave.fromDate,
            to: editingLeave.toDate,
            reason: editingLeave.reason || '',
          });
          setCustomType('');
        } else {
          setForm({
            type: 'custom',
            from: editingLeave.fromDate,
            to: editingLeave.toDate,
            reason: editingLeave.reason || '',
          });
          setCustomType(editingLeave.type);
        }
      } else {
        setForm({ type: '', from: '', to: '', reason: '' });
        setCustomType('');
      }
    } else {
      setForm({ type: '', from: '', to: '', reason: '' });
      setCustomType('');
      setDays(0);
      setSuccess(false);
      setError('');
    }
  }, [open, editingLeave, activePolicies]);

  const selectedBalance = balances.find(b => {
    const t = (form.type || '').trim().toLowerCase();
    return b.type.toLowerCase() === t || (b.label || '').toLowerCase() === t;
  });
  const remaining = selectedBalance ? Math.max(0, (selectedBalance.total || 0) - (selectedBalance.used || 0)) : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.type || !form.type.trim()) { setError('Please select Leave Type.'); return; }
    if (form.type === 'custom' && (!customType || !customType.trim())) { setError('Please specify custom Leave Type.'); return; }
    if (!form.from || !form.to) { setError('Please select From and To dates.'); return; }
    if (days <= 0) { setError('Date range has 0 working days. Please adjust.'); return; }

    const today = new Date().toISOString().split('T')[0];
    if (form.from < today) {
      setError('Start date cannot be before today.');
      return;
    }

    if (days > 365) {
      setError('Leave request range cannot exceed 365 days.');
      return;
    }

    if (form.type !== 'UL' && form.type !== 'Other' && form.type !== 'custom' && remaining !== null && remaining < days) {
      setError('Insufficient leave balance for the selected leave type.');
      return;
    }

    const myLeaves = leaveRequests.filter(l => l.employeeId === currentUser?.id && l.id !== editingLeave?.id);
    const hasOverlap = myLeaves.some(l => {
      if (l.status !== 'Approved' && l.status !== 'Pending') return false;
      return l.fromDate <= form.to && form.from <= l.toDate;
    });

    if (hasOverlap) {
      setError('You already have an approved or pending leave request that overlaps with this date range.');
      return;
    }

    const finalType = form.type === 'custom' ? customType : form.type;

    setSubmitting(true);
    try {
      await onSubmit({ type: finalType, fromDate: form.from, toDate: form.to, days, reason: form.reason });
      setSuccess(true);
      setTimeout(() => { setSuccess(false); onClose(); }, 1800);
    } catch (err) {
      setError(err?.message || 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const inputStyle = {
    width: '100%', padding: '9px 12px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontSize: '0.84rem',
    boxSizing: 'border-box',
    outline: 'none',
    fontFamily: 'inherit',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.72rem', fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: '5px',
    textTransform: 'uppercase', letterSpacing: '0.04em',
  };

  const SelectedTypeIcon = LEAVE_TYPES.find(t => t.code === form.type)?.Icon || MdAssignment;
  const selectedTypeLabel = LEAVE_TYPES.find(t => t.code === form.type)?.label || form.type;

  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-lg)',
      padding: '22px 24px',
      marginBottom: '4px',
      animation: 'slideDown 0.25s ease',
    }}>
      <style>{`@keyframes slideDown { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BsCalendar2Date size={16} style={{ color: 'var(--color-success, #10b981)' }} />
          </div>
          <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {editingLeave ? 'Edit Leave Request' : 'Apply for Leave'}
          </h3>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', display: 'flex', borderRadius: '6px' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <MdClose size={20} />
        </button>
      </div>

      {success ? (
        <div style={{ textAlign: 'center', padding: '28px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <MdCheckCircle size={48} style={{ color: 'var(--color-success, #10b981)' }} />
          <p style={{ margin: 0, fontWeight: 700, color: 'var(--color-success)', fontSize: '0.95rem' }}>
            {editingLeave ? 'Leave request updated!' : 'Leave request submitted!'}
          </p>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>Your request is pending approval.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: '14px', marginBottom: '14px' }}>
            {/* Leave Type */}
            <div>
              <label style={labelStyle}>Leave Type</label>
              <select
                value={form.type}
                onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                style={inputStyle}
                required
              >
                <option value="">-- Select --</option>
                {activePolicies.map(p => (
                  <option key={p.leaveCode} value={p.leaveCode}>
                    {p.leaveName} ({p.leaveCode})
                  </option>
                ))}
                <option value="custom">Other / Custom</option>
              </select>
              {form.type === 'custom' && (
                <div style={{ marginTop: '8px' }}>
                  <input
                    type="text"
                    placeholder="Enter custom leave type..."
                    value={customType}
                    onChange={e => setCustomType(e.target.value)}
                    style={inputStyle}
                    required
                  />
                </div>
              )}
            </div>

            {/* From Date */}
            <div>
              <label style={labelStyle}>From Date</label>
              <input
                type="date"
                value={form.from}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => {
                  const val = e.target.value;
                  setForm(p => {
                    const next = { ...p, from: val };
                    if (p.to && p.to < val) {
                      next.to = '';
                    }
                    return next;
                  });
                }}
                style={inputStyle}
              />
            </div>

            {/* To Date */}
            <div>
              <label style={labelStyle}>To Date</label>
              <input
                type="date"
                value={form.to}
                disabled={!form.from}
                min={form.from}
                onChange={e => setForm(p => ({ ...p, to: e.target.value }))}
                style={{
                  ...inputStyle,
                  opacity: form.from ? 1 : 0.6,
                  cursor: form.from ? 'text' : 'not-allowed'
                }}
              />
            </div>

            {/* Auto-calc days */}
            <div>
              <label style={labelStyle}>Working Days</label>
              <div style={{
                ...inputStyle,
                background: 'var(--bg-elevated)',
                color: days > 0 ? 'var(--color-success)' : 'var(--text-muted)',
                fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px'
              }}>
                {days > 0 ? `${days} day${days !== 1 ? 's' : ''}` : '— auto calc'}
              </div>
            </div>
          </div>

          {/* Reason */}
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Reason <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
            <textarea
              rows={3}
              value={form.reason}
              onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
              placeholder="Briefly describe your reason for leave..."
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {/* Balance preview */}
          {remaining !== null && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: '0.78rem',
              color: remaining > 2 ? 'var(--color-success)' : remaining > 0 ? 'var(--color-warning)' : 'var(--color-danger)',
              marginBottom: '14px', padding: '9px 12px',
              background: 'var(--bg-card)', borderRadius: '7px',
            }}>
              <BsInfoCircle size={14} style={{ flexShrink: 0 }} />
              Balance for <strong style={{ marginLeft: '3px' }}>{selectedTypeLabel}</strong>:&nbsp;
              <strong>{remaining} day{remaining !== 1 ? 's' : ''} remaining</strong>
              {days > 0 && remaining < days && (
                <span style={{ color: 'var(--color-danger)', marginLeft: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MdError size={13} /> Insufficient balance
                </span>
              )}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-danger)', fontSize: '0.8rem', marginBottom: '12px' }}>
              <MdError size={15} /> {error}
            </div>
          )}

          {/* Footer buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '8px 18px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '8px 20px',
                background: 'var(--color-success, #10b981)', color: '#fff',
                border: 'none', borderRadius: 'var(--radius-md)',
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontSize: '0.82rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: '7px',
                opacity: submitting ? 0.7 : 1, transition: 'opacity 0.2s',
              }}
            >
              <IoSendSharp size={14} />
              {submitting ? 'Submitting…' : (editingLeave ? 'Update Request' : 'Submit Request')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ApplyLeavePanel;
