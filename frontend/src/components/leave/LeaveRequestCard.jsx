import React from 'react';
import { MdBeachAccess, MdLocalHospital, MdDateRange, MdChildCare, MdPeople, MdAssignment, MdOutlineCancel } from 'react-icons/md';
import { BsCalendarRange, BsClockHistory, BsFileText } from 'react-icons/bs';
import { FiClock } from 'react-icons/fi';

const STATUS_CONFIG = {
  Pending:  { color: 'var(--color-warning, #f59e0b)',  bg: 'rgba(245,158,11,0.1)',  border: 'var(--color-warning, #f59e0b)' },
  Approved: { color: 'var(--color-success, #10b981)',  bg: 'rgba(16,185,129,0.1)',  border: 'var(--color-success, #10b981)' },
  Rejected: { color: 'var(--color-danger, #ef4444)',   bg: 'rgba(239,68,68,0.1)',   border: 'var(--color-danger, #ef4444)' },
  Cancelled:{ color: 'var(--text-muted, #94a3b8)',     bg: 'rgba(148,163,184,0.1)', border: 'var(--text-muted, #94a3b8)' },
};

const TYPE_CONFIG = {
  CL:        { label: 'Casual Leave',   Icon: MdBeachAccess,   color: '#10b981' },
  SL:        { label: 'Sick Leave',     Icon: MdLocalHospital,  color: '#f59e0b' },
  PL:        { label: 'Earned Leave',   Icon: MdDateRange,      color: '#3b82f6' },
  EL:        { label: 'Earned Leave',   Icon: MdDateRange,      color: '#3b82f6' },
  Maternity: { label: 'Maternity Leave',Icon: MdChildCare,      color: '#8b5cf6' },
  Paternity: { label: 'Paternity Leave',Icon: MdPeople,         color: '#8b5cf6' },
  Other:     { label: 'Other Leave',    Icon: MdAssignment,     color: '#94a3b8' },
};

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const LeaveRequestCard = ({ leave, onCancel }) => {
  const sc = STATUS_CONFIG[leave.status] || STATUS_CONFIG.Pending;
  const tc = TYPE_CONFIG[leave.type] || { label: leave.type, Icon: MdAssignment, color: '#94a3b8' };
  const { Icon: TypeIcon, label: typeLabel, color: typeColor } = tc;

  return (
    <div
      style={{
        display: 'flex',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(2px)'; e.currentTarget.style.borderColor = sc.border; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
    >
      {/* Left accent bar */}
      <div style={{ width: '4px', background: sc.border, flexShrink: 0, borderRadius: 0 }} />

      {/* Card body */}
      <div style={{ flex: 1, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <div style={{
              width: '30px', height: '30px', borderRadius: '8px',
              background: `${typeColor}1a`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <TypeIcon size={16} style={{ color: typeColor }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
              {typeLabel}
            </span>
          </div>

          {/* Status badge */}
          <span style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '3px 10px',
            borderRadius: '999px',
            fontSize: '0.7rem', fontWeight: 700,
            background: sc.bg,
            color: sc.color,
            border: `1px solid ${sc.border}`,
            flexShrink: 0,
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: sc.color, display: 'inline-block' }} />
            {leave.status}
          </span>
        </div>

        {/* Details row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
            <BsCalendarRange size={13} style={{ flexShrink: 0 }} />
            <span>{fmtDate(leave.fromDate)} – {fmtDate(leave.toDate)}</span>
            <span style={{
              background: 'var(--bg-elevated)', borderRadius: '4px',
              padding: '1px 6px', fontSize: '0.68rem', color: 'var(--text-muted)',
            }}>
              {leave.days} day{leave.days !== 1 ? 's' : ''}
            </span>
          </div>

          {leave.reason && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
              <BsFileText size={12} style={{ flexShrink: 0 }} />
              <span>{leave.reason}</span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            <FiClock size={12} style={{ flexShrink: 0 }} />
            <span>Applied: {fmtDate(leave.appliedDate)}</span>
          </div>
        </div>

        {/* Rejection reason */}
        {leave.status === 'Rejected' && leave.rejectionReason && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '6px',
            padding: '8px 10px',
            background: 'rgba(239,68,68,0.07)',
            borderRadius: '6px',
            border: '1px solid rgba(239,68,68,0.2)',
          }}>
            <MdOutlineCancel size={14} style={{ color: 'var(--color-danger)', flexShrink: 0, marginTop: '1px' }} />
            <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem' }}>
              Rejection reason: {leave.rejectionReason}
            </span>
          </div>
        )}

        {/* Cancel button for pending */}
        {leave.status === 'Pending' && onCancel && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => onCancel(leave.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '5px 13px',
                background: 'transparent',
                color: 'var(--color-danger)',
                border: '1px solid var(--color-danger, #ef4444)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontSize: '0.75rem', fontWeight: 600,
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <MdOutlineCancel size={14} /> Cancel Request
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaveRequestCard;
