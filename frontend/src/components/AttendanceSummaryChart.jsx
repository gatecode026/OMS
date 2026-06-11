import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const AttendanceSummaryChart = ({ records = [] }) => {
  const [colors, setColors] = useState({
    success: '#10b981',
    danger: '#ef4444',
    warning: '#f59e0b',
    neutral: '#475569'
  });

  // Extract CSS variables dynamically at runtime
  useEffect(() => {
    const rootStyle = getComputedStyle(document.documentElement);
    setColors({
      success: rootStyle.getPropertyValue('--color-success').trim() || '#10b981',
      danger: rootStyle.getPropertyValue('--color-danger').trim() || '#ef4444',
      warning: rootStyle.getPropertyValue('--color-warning').trim() || '#f59e0b',
      neutral: rootStyle.getPropertyValue('--color-slate-600').trim() || '#475569'
    });
  }, []);

  // Format records in chronological order
  const chartData = useMemo(() => {
    // Sort ascending by date
    return [...records]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(r => {
        const d = new Date(r.date);
        return {
          dayLabel: String(d.getDate()).padStart(2, '0'),
          hours: r.totalHours || r.workingHours || 0,
          status: r.status,
          date: r.date,
          punchIn: r.punchIn || '--:--',
          punchOut: r.punchOut || '--:--'
        };
      });
  }, [records]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          background: 'var(--bg-elevated, #1a2133)',
          border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
          padding: '10px',
          borderRadius: '8px',
          fontSize: '0.8rem',
          color: 'var(--text-primary, #f1f5f9)',
          boxShadow: 'var(--shadow-md)'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>{data.date}</div>
          <div style={{ color: 'var(--text-secondary)' }}>Status: <strong>{data.status}</strong></div>
          <div style={{ color: 'var(--text-secondary)' }}>Hours: <strong>{data.hours} hrs</strong></div>
          <div style={{ color: 'var(--text-secondary)' }}>In/Out: <strong>{data.punchIn} - {data.punchOut}</strong></div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card padding-5" style={{
      background: 'var(--bg-card)',
      border: '0.5px solid var(--border-color)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-4)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)'
    }}>
      <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
        Monthly Hours Breakdown
      </h3>
      
      {chartData.length === 0 ? (
        <div style={{
          height: '140px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.8125rem'
        }}>
          No historical data available for this month
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData} barSize={16} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis 
              dataKey="dayLabel" 
              tick={{ fill: 'var(--text-muted)', fontSize: 10 }} 
              axisLine={false} 
              tickLine={false} 
            />
            <YAxis 
              tick={{ fill: 'var(--text-muted)', fontSize: 10 }} 
              axisLine={false} 
              tickLine={false} 
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
            <Bar dataKey="hours" radius={[3, 3, 0, 0]}>
              {chartData.map((entry, index) => {
                const s = (entry.status || '').toLowerCase();
                let barColor = colors.success; // Default present
                
                if (s === 'absent') {
                  barColor = colors.danger;
                } else if (s === 'late') {
                  barColor = colors.warning;
                } else if (s.includes('leave')) {
                  barColor = colors.neutral; // or custom color
                }
                
                return <Cell key={`cell-${index}`} fill={barColor} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default AttendanceSummaryChart;
