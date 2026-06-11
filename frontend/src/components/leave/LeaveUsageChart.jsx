import React, { useMemo, useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MdBarChart } from 'react-icons/md';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const getCssVar = (v) => {
  if (typeof document === 'undefined') return '#10b981';
  return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || '#10b981';
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-color)',
      padding: '10px 14px',
      borderRadius: '8px',
      fontSize: '0.78rem',
      color: 'var(--text-primary)',
      boxShadow: '0 6px 24px rgba(0,0,0,0.3)',
    }}>
      <div style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: p.fill, flexShrink: 0 }} />
          <span style={{ color: 'var(--text-secondary)' }}>{p.name}:</span>
          <strong>{p.value} day{p.value !== 1 ? 's' : ''}</strong>
        </div>
      ))}
    </div>
  );
};

const LeaveUsageChart = ({ leaveRequests = [] }) => {
  const [colors, setColors] = useState({ success: '#10b981', warning: '#f59e0b', info: '#3b82f6' });

  useEffect(() => {
    setColors({
      success: getCssVar('--color-success') || '#10b981',
      warning: getCssVar('--color-warning') || '#f59e0b',
      info:    getCssVar('--color-info')    || '#3b82f6',
    });
  }, []);

  const currentYear = new Date().getFullYear();

  const chartData = useMemo(() => {
    return MONTHS.map((month, idx) => {
      const monthLeaves = (leaveRequests || []).filter(r => {
        if (!r.fromDate || r.status === 'Rejected' || r.status === 'Cancelled') return false;
        const d = new Date(r.fromDate);
        return d.getFullYear() === currentYear && d.getMonth() === idx;
      });

      return {
        month,
        Casual:  monthLeaves.filter(r => ['CL', 'Casual Leave'].includes(r.type)).reduce((s, r) => s + (r.days || 0), 0),
        Sick:    monthLeaves.filter(r => ['SL', 'Sick Leave'].includes(r.type)).reduce((s, r) => s + (r.days || 0), 0),
        Earned:  monthLeaves.filter(r => ['PL', 'EL', 'Paid Leave', 'Earned Leave'].includes(r.type)).reduce((s, r) => s + (r.days || 0), 0),
      };
    });
  }, [leaveRequests, currentYear]);

  const hasData = chartData.some(d => d.Casual + d.Sick + d.Earned > 0);

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MdBarChart size={18} style={{ color: colors.info }} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Leave Usage — {currentYear}
            </h3>
            <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>Monthly breakdown by leave type</p>
          </div>
        </div>
        {/* Legend */}
        <div style={{ display: 'flex', gap: '14px', fontSize: '0.72rem' }}>
          {[['Casual', colors.success], ['Sick', colors.warning], ['Earned', colors.info]].map(([name, col]) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: col }} />
              <span style={{ color: 'var(--text-muted)' }}>{name}</span>
            </div>
          ))}
        </div>
      </div>

      {!hasData ? (
        <div style={{ textAlign: 'center', padding: '44px 0', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
          <MdBarChart size={40} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.3 }} />
          No leave usage recorded for {currentYear}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} barSize={9} margin={{ top: 0, right: 0, left: -22, bottom: 0 }} barCategoryGap="35%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.025)' }} />
            <Bar dataKey="Casual" fill={colors.success} radius={[3,3,0,0]} />
            <Bar dataKey="Sick"   fill={colors.warning} radius={[3,3,0,0]} />
            <Bar dataKey="Earned" fill={colors.info}    radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default LeaveUsageChart;
