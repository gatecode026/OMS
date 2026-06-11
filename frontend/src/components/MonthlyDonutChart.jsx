import React, { useMemo, useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Calendar } from 'lucide-react';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-color)',
        padding: '8px 12px',
        borderRadius: '8px',
        fontSize: '0.78rem',
        color: 'var(--text-primary)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
      }}>
        <strong>{d.name}</strong>: {d.value} day{d.value !== 1 ? 's' : ''}
      </div>
    );
  }
  return null;
};

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export const MonthlyDonutChart = ({ records = [] }) => {
  const [colors, setColors] = useState({
    success: '#10b981',
    danger: '#ef4444',
    warning: '#f59e0b',
    purple: '#8b5cf6',
    info: '#3b82f6'
  });

  useEffect(() => {
    const root = getComputedStyle(document.documentElement);
    setColors({
      success: root.getPropertyValue('--color-success').trim() || '#10b981',
      danger: root.getPropertyValue('--color-danger').trim() || '#ef4444',
      warning: root.getPropertyValue('--color-warning').trim() || '#f59e0b',
      purple: root.getPropertyValue('--color-purple').trim() || '#8b5cf6',
      info: root.getPropertyValue('--color-info').trim() || '#3b82f6'
    });
  }, []);

  const data = useMemo(() => {
    let present = 0, absent = 0, late = 0, leave = 0, wfh = 0;
    records.forEach(r => {
      const s = (r.status || '').toLowerCase();
      if (s === 'present' || s === 'overtime') present++;
      else if (s === 'absent') absent++;
      else if (s === 'late') late++;
      else if (s.includes('leave')) leave++;
      else if (s === 'wfh' || s === 'work from home') wfh++;
    });
    return [
      { name: 'Present', value: present, color: colors.success },
      { name: 'Absent', value: absent, color: colors.danger },
      { name: 'Late', value: late, color: colors.warning },
      { name: 'On Leave', value: leave, color: colors.purple },
      { name: 'WFH', value: wfh, color: colors.info }
    ].filter(d => d.value > 0);
  }, [records, colors]);

  const totalDays = data.reduce((s, d) => s + d.value, 0);

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
      <div>
        <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={15} style={{ color: 'var(--color-info)' }} />
          Monthly Status
        </h3>
        <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>Attendance breakdown this month</p>
      </div>

      {data.length === 0 ? (
        <div style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          No data for this period
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <ResponsiveContainer width={130} height={130}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={58}
                paddingAngle={2}
                dataKey="value"
                labelLine={false}
                label={renderCustomLabel}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
            {data.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{d.name}</span>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{d.value}d</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '4px', marginTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Total</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{totalDays}d</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthlyDonutChart;
