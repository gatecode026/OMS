import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Zap, Clock, CheckCircle, LogIn, LogOut, AlertTriangle } from 'lucide-react';

const formatRelativeTime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr || timeStr === '--:--') return '';
  try {
    // Try to combine date + time into a timestamp
    const dt = new Date(`${dateStr}T${timeStr}`);
    if (isNaN(dt)) return timeStr;
    const diffMs = Date.now() - dt.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return timeStr;
  } catch {
    return timeStr;
  }
};

const TimelineItem = ({ item, isFirst }) => {
  const getIcon = () => {
    if (item.type === 'punchIn') return <LogIn size={13} />;
    if (item.type === 'punchOut') return <LogOut size={13} />;
    if (item.type === 'late') return <AlertTriangle size={13} />;
    return <Clock size={13} />;
  };

  const getColor = () => {
    if (item.type === 'punchIn') return 'var(--color-success)';
    if (item.type === 'punchOut') return 'var(--color-info)';
    if (item.type === 'late') return 'var(--color-warning)';
    return 'var(--text-muted)';
  };

  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', position: 'relative' }}>
      {/* Timeline Line */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: `${getColor()}18`,
          border: `1.5px solid ${getColor()}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: getColor(),
          flexShrink: 0
        }}>
          {getIcon()}
        </div>
        {!isFirst && (
          <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', marginTop: '4px' }} />
        )}
      </div>
      <div style={{ paddingBottom: '16px', flex: 1 }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.label}</div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
          {item.time} · {item.dateLabel}
        </div>
        {item.details && (
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{item.details}</div>
        )}
      </div>
    </div>
  );
};

export const LiveActivityFeed = ({ records = [] }) => {
  const [timelineItems, setTimelineItems] = useState([]);

  const buildTimeline = useCallback(() => {
    const items = [];
    // Build timeline from records (most recent first)
    const sorted = [...records].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
    sorted.forEach(r => {
      const dateLabel = new Date(r.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const s = (r.status || '').toLowerCase();

      if (r.punchOut && r.punchOut !== '--:--') {
        items.push({
          id: `${r.id}-out`,
          type: 'punchOut',
          label: `Punched Out`,
          time: r.punchOut,
          dateLabel,
          details: r.totalHours ? `Total: ${r.totalHours}h worked` : undefined
        });
      }
      if (r.punchIn && r.punchIn !== '--:--') {
        const type = s === 'late' ? 'late' : 'punchIn';
        items.push({
          id: `${r.id}-in`,
          type,
          label: s === 'late' ? `Late Arrival` : `Punched In`,
          time: r.punchIn,
          dateLabel,
          details: s === 'late' ? 'Arrived after shift start (09:30 AM)' : `${r.workMode || 'WFO'} · ${r.source || 'Biometric'}`
        });
      }
      if (s === 'absent') {
        items.push({
          id: `${r.id}-abs`,
          type: 'absent',
          label: 'No Punch Recorded',
          time: '—',
          dateLabel,
          details: 'Marked absent'
        });
      }
    });
    setTimelineItems(items.slice(0, 10));
  }, [records]);

  // Build immediately and every 30 seconds
  useEffect(() => {
    buildTimeline();
    const interval = setInterval(buildTimeline, 30000);
    return () => clearInterval(interval);
  }, [buildTimeline]);

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '0.5px solid var(--border-color)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-4)',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={15} style={{ color: 'var(--color-warning)' }} />
            Activity Timeline
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>Recent punch activity · auto-refresh 30s</p>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '0.68rem',
          color: 'var(--color-success)',
          fontWeight: 600
        }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'var(--color-success)',
            animation: 'pulse-dot 2s infinite'
          }} />
          Live
        </div>
      </div>

      {timelineItems.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem', padding: '20px 0' }}>
          No activity found
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {timelineItems.map((item, i) => (
            <TimelineItem key={item.id} item={item} isFirst={i === timelineItems.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export default LiveActivityFeed;
