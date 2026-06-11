import React, { useMemo, useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Dot
} from 'recharts';
import { TrendingUp } from 'lucide-react';

const CustomDot = (props) => {
  const { cx, cy, payload } = props;
  const s = (payload?.status || '').toLowerCase();
  let fill = '#10b981';
  if (s === 'absent') fill = '#ef4444';
  else if (s === 'late') fill = '#f59e0b';
  else if (s.includes('leave')) fill = '#8b5cf6';
  return <circle cx={cx} cy={cy} r={4} fill={fill} stroke="var(--bg-card)" strokeWidth={2} />;
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-color)',
        padding: '10px 14px',
        borderRadius: '10px',
        fontSize: '0.78rem',
        color: 'var(--text-primary)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
      }}>
        <div style={{ fontWeight: 700, marginBottom: '4px' }}>{d.fullDate}</div>
        <div style={{ color: 'var(--text-secondary)' }}>Hours: <strong style={{ color: 'var(--color-success)' }}>{d.hours}h</strong></div>
        <div style={{ color: 'var(--text-secondary)' }}>Status: <strong>{d.status}</strong></div>
        {d.punchIn && <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{d.punchIn} → {d.punchOut || '—'}</div>}
      </div>
    );
  }
  return null;
};

export const WeeklyTrendChart = ({ records = [] }) => {
  // Get last 7 days of data
  const chartData = useMemo(() => {
    const today = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const record = records.find(r => r.date === dateStr);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const fullDate = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      days.push({
        day: dayName,
        fullDate,
        date: dateStr,
        hours: record?.totalHours || record?.workingHours || 0,
        status: record?.status || 'Absent',
        punchIn: record?.punchIn || '',
        punchOut: record?.punchOut || ''
      });
    }
    return days;
  }, [records]);

  const avgHours = useMemo(() => {
    const worked = chartData.filter(d => d.hours > 0);
    if (!worked.length) return 0;
    return parseFloat((worked.reduce((s, d) => s + d.hours, 0) / worked.length).toFixed(1));
  }, [chartData]);

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '0.5px solid var(--border-color)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-4)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TrendingUp size={15} style={{ color: 'var(--color-success)' }} />
            Weekly Trend
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>Last 7 days work hours</p>
        </div>
        <div style={{
          background: 'rgba(16,185,129,0.1)',
          border: '1px solid rgba(16,185,129,0.2)',
          borderRadius: '8px',
          padding: '4px 10px',
          fontSize: '0.75rem',
          fontWeight: 700,
          color: 'var(--color-success)'
        }}>
          Avg {avgHours}h/day
        </div>
      </div>

      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={chartData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            domain={[0, 12]}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.05)' }} />
          <ReferenceLine y={8} stroke="rgba(16,185,129,0.25)" strokeDasharray="4 2" label={{ value: '8h', fill: 'var(--text-muted)', fontSize: 9, position: 'right' }} />
          <Line
            type="monotone"
            dataKey="hours"
            stroke="url(#lineGradient)"
            strokeWidth={2.5}
            dot={<CustomDot />}
            activeDot={{ r: 6, fill: 'var(--color-success)', stroke: 'var(--bg-card)', strokeWidth: 2 }}
          />
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WeeklyTrendChart;
