import React from 'react';
import { MdBeachAccess, MdLocalHospital, MdDateRange, MdChildCare, MdPeople, MdAssignment } from 'react-icons/md';

const TYPE_CONFIG = {
  CL:        { label: 'Casual Leave',    Icon: MdBeachAccess,    accent: '#10b981' },
  SL:        { label: 'Sick Leave',      Icon: MdLocalHospital,  accent: '#f59e0b' },
  PL:        { label: 'Paid Leave',      Icon: MdDateRange,      accent: '#3b82f6' },
  EL:        { label: 'Earned Leave',    Icon: MdDateRange,      accent: '#3b82f6' },
  ML:        { label: 'Maternity Leave', Icon: MdChildCare,      accent: '#ec4899' },
  Maternity: { label: 'Maternity',       Icon: MdChildCare,      accent: '#ec4899' },
  UL:        { label: 'Unpaid Leave',    Icon: MdAssignment,     accent: '#94a3b8' },
  Paternity: { label: 'Paternity',       Icon: MdPeople,         accent: '#8b5cf6' },
  Other:     { label: 'Other',           Icon: MdAssignment,     accent: '#94a3b8' },
};

const getConfig = (type) =>
  TYPE_CONFIG[type] || { label: type, Icon: MdAssignment, accent: '#94a3b8' };

const LeaveBalanceCard = ({ type, total = 0, used = 0, label }) => {
  const remaining = Math.max(0, total - used);
  const config = getConfig(type);
  const { Icon, accent, label: defaultLabel } = config;
  const displayLabel = label || defaultLabel;
  const pct = total > 0 ? Math.round((remaining / total) * 100) : 0; // remaining percentage is better for remaining bar

  const remainingColor =
    remaining === 0 ? 'var(--color-danger, #ef4444)'
    : remaining <= 2 ? 'var(--color-warning, #f59e0b)'
    : accent;

  return (
    <div
      style={{
        flex: '1 1 180px',
        minWidth: '160px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '18px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'default',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = `0 12px 32px rgba(0,0,0,0.15)`;
        e.currentTarget.style.borderColor = accent;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = 'var(--border-color)';
      }}
    >
      {/* Top accent stripe */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
        background: accent, borderRadius: 0,
      }} />

      {/* Icon + label row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginTop: '4px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px',
          background: `${accent}1a`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={17} style={{ color: accent }} />
        </div>
        <span style={{
          fontSize: '0.75rem', fontWeight: 700,
          color: 'var(--text-primary)',
          textTransform: 'uppercase', letterSpacing: '0.04em',
          lineHeight: 1.2,
        }}>
          {displayLabel}
        </span>
      </div>

      {/* Remaining count */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
        <span style={{ fontSize: '2.2rem', fontWeight: 800, color: remainingColor, lineHeight: 1 }}>
          {remaining}
        </span>
        <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)', fontWeight: 500 }}>days left</span>
      </div>

      {/* Progress bar */}
      <div>
        <div style={{
          height: '5px', background: 'var(--bg-elevated)',
          borderRadius: '99px', overflow: 'hidden', marginBottom: '5px',
        }}>
          <div style={{
            height: '100%', width: `${pct}%`,
            background: accent, borderRadius: '99px',
            transition: 'width 0.6s ease',
          }} />
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
          <span>{used} used</span>
          <span>{total} total</span>
        </div>
      </div>
    </div>
  );
};

export default LeaveBalanceCard;
