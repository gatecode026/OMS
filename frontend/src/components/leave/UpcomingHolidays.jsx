import React, { useState } from 'react';
import { MdExpandMore, MdHolidayVillage, MdFlag, MdCelebration, MdStarBorder } from 'react-icons/md';
import { BsCalendarEvent } from 'react-icons/bs';

const TYPE_ICON = {
  National: { Icon: MdFlag,          color: 'var(--color-warning, #f59e0b)',  bg: 'rgba(245,158,11,0.12)' },
  Festival:  { Icon: MdCelebration,   color: 'var(--color-success, #10b981)', bg: 'rgba(16,185,129,0.12)' },
  Optional:  { Icon: MdStarBorder,    color: 'var(--color-info, #3b82f6)',    bg: 'rgba(59,130,246,0.12)' },
};

const DEFAULT_TYPE = { Icon: MdHolidayVillage, color: 'var(--text-muted, #94a3b8)', bg: 'rgba(148,163,184,0.1)' };

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
};

const UpcomingHolidays = ({ holidays = [] }) => {
  const [open, setOpen] = useState(true);

  const upcoming = holidays
    .filter(h => new Date(h.date) >= new Date())
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 8);

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
    }}>
      {/* Collapsible Header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 18px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BsCalendarEvent size={15} style={{ color: 'var(--color-info, #3b82f6)' }} />
          Upcoming Holidays
          <span style={{
            background: 'var(--bg-elevated)', borderRadius: '999px',
            padding: '1px 8px', fontSize: '0.68rem',
            color: 'var(--text-muted)', fontWeight: 600,
          }}>
            {upcoming.length}
          </span>
        </span>
        <MdExpandMore
          size={20}
          style={{
            color: 'var(--text-muted)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.25s ease',
          }}
        />
      </button>

      {open && (
        <div style={{ borderTop: '1px solid var(--border-color)', padding: '6px 0' }}>
          {upcoming.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
              No upcoming holidays
            </div>
          ) : (
            upcoming.map((h, i) => {
              const cfg = TYPE_ICON[h.type] || DEFAULT_TYPE;
              const { Icon, color, bg } = cfg;
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 18px',
                    borderBottom: i < upcoming.length - 1 ? '1px solid var(--border-color)' : 'none',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Icon box */}
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={16} style={{ color }} />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {h.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{fmtDate(h.date)}</div>
                  </div>

                  {/* Type badge */}
                  <span style={{
                    fontSize: '0.67rem', fontWeight: 700,
                    color, background: bg,
                    borderRadius: '4px', padding: '2px 7px',
                    flexShrink: 0, whiteSpace: 'nowrap',
                  }}>
                    {h.type || 'Holiday'}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default UpcomingHolidays;
