import React from 'react';

const TABS = [
  { key: 'Pending',  label: 'Pending' },
  { key: 'Approved', label: 'Approved' },
  { key: 'Rejected', label: 'Rejected' },
  { key: 'All',      label: 'All History' },
];

const LeaveFilterTabs = ({ active, onChange, counts = {} }) => {
  return (
    <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--border-color)', overflowX: 'auto' }}>
      {TABS.map(tab => {
        const isActive = active === tab.key;
        const count = counts[tab.key] ?? 0;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: isActive ? '3px solid var(--color-success, #10b981)' : '3px solid transparent',
              color: isActive ? 'var(--color-success, #10b981)' : 'var(--text-secondary)',
              fontWeight: isActive ? 700 : 500,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
              marginBottom: '-1px',
            }}
          >
            {tab.label}
            {count > 0 && (
              <span style={{
                background: isActive ? 'rgba(16,185,129,0.15)' : 'var(--bg-elevated)',
                color: isActive ? 'var(--color-success)' : 'var(--text-muted)',
                borderRadius: '999px',
                padding: '1px 7px',
                fontSize: '0.68rem',
                fontWeight: 700,
              }}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default LeaveFilterTabs;
