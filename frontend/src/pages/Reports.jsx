import React, { useState } from 'react';
import './Reports.css';
import { useApp } from '../context/AppContext';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  AreaChart as AreaIcon, Download, FileText, Users, Clock,
  DollarSign, TrendingUp, Filter, Calendar
} from 'lucide-react';

const headcountData = [
  { month: 'Jan', total: 8, active: 7, onLeave: 1 },
  { month: 'Feb', total: 8, active: 7, onLeave: 1 },
  { month: 'Mar', total: 9, active: 8, onLeave: 1 },
  { month: 'Apr', total: 9, active: 9, onLeave: 0 },
  { month: 'May', total: 10, active: 9, onLeave: 1 }
];

const attendanceTrend = [
  { week: 'W1', rate: 88 }, { week: 'W2', rate: 91 },
  { week: 'W3', rate: 85 }, { week: 'W4', rate: 92 },
  { week: 'W5', rate: 88 }, { week: 'W6', rate: 94 },
  { week: 'W7', rate: 90 }, { week: 'W8', rate: 88 }
];

const payrollData = [
  { month: 'Jan', salary: 48000, bonus: 4000 },
  { month: 'Feb', salary: 48000, bonus: 2000 },
  { month: 'Mar', salary: 50000, bonus: 3500 },
  { month: 'Apr', salary: 50000, bonus: 6000 },
  { month: 'May', salary: 52000, bonus: 4800 }
];

const leaveDistribution = [
  { name: 'Annual Leave', value: 8, color: '#3b82f6' },
  { name: 'Sick Leave', value: 3, color: '#ef4444' },
  { name: 'Casual Leave', value: 5, color: '#f59e0b' },
  { name: 'Maternity', value: 1, color: '#8b5cf6' }
];

const reportTemplates = [
  { id: 1, title: 'Monthly Attendance Summary', category: 'Attendance', icon: Clock, color: '#3b82f6', desc: 'Detailed attendance rates, late arrivals, and absence analysis by department.' },
  { id: 2, title: 'Payroll Processing Report', category: 'Payroll', icon: DollarSign, color: '#10b981', desc: 'Complete payroll breakdown including gross pay, deductions, and net disbursements.' },
  { id: 3, title: 'Workforce Headcount', category: 'Employees', icon: Users, color: '#8b5cf6', desc: 'Current headcount by department, branch, role, and employment status.' },
  { id: 4, title: 'Leave Utilisation Analysis', category: 'Leaves', icon: Calendar, color: '#f59e0b', desc: 'Leave balances, type breakdowns, and pending approvals by employee and team.' },
  { id: 5, title: 'Task Performance KPIs', category: 'Performance', icon: TrendingUp, color: '#ef4444', desc: 'Task completion rates, overdue counts, and team velocity metrics.' },
  { id: 6, title: 'Executive Summary Dashboard', category: 'Overview', icon: AreaIcon, color: '#06b6d4', desc: 'High-level metrics across all modules compiled for leadership review.' }
];

const Reports = () => {
  const { addToast } = useApp();
  const [period, setPeriod] = useState('This Quarter');

  const tooltipStyle = {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-color-dark)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)'
  };

  return (
    <div className="reports-page">

      {/* Header */}
      <div className="reports-header">
        <div>
          <h2 className="perf-title">Reports & Analytics</h2>
          <p className="perf-subtitle">Pre-built reporting templates and data visualisations for leadership insights</p>
        </div>
        <div className="reports-controls">
          <div className="perf-period-selector">
            {['This Month', 'This Quarter', 'This Year'].map(p => (
              <button
                key={p}
                className={`period-btn ${period === p ? 'active' : ''}`}
                onClick={() => setPeriod(p)}
              >
                {p}
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            icon={Download}
            onClick={() => addToast('success', 'Exporting full report PDF...')}
          >
            Export All
          </Button>
        </div>
      </div>

      {/* KPI Summary Row */}
      <div className="reports-kpi-row">
        {[
          { label: 'Total Payroll This Month', value: '₹48,20,000', change: '+4.2%', up: true, color: '#10b981' },
          { label: 'Avg Attendance Rate', value: '91%', change: '+2.1%', up: true, color: '#3b82f6' },
          { label: 'Open Leave Requests', value: '3', change: 'Pending Review', up: null, color: '#f59e0b' },
          { label: 'Task Completion Rate', value: '72%', change: '-8%', up: false, color: '#ef4444' }
        ].map((k, i) => (
          <div key={i} className="card reports-kpi-card">
            <p className="reports-kpi-val" style={{ color: k.color }}>{k.value}</p>
            <p className="reports-kpi-label">{k.label}</p>
            <span
              className="reports-kpi-change"
              style={{
                color: k.up === null ? '#f59e0b' : k.up ? '#10b981' : '#ef4444'
              }}
            >
              {k.up !== null ? (k.up ? '▲' : '▼') : '●'} {k.change}
            </span>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="reports-charts-row">
        <div className="card reports-chart-card reports-chart-wide">
          <div className="perf-chart-head">
            <h3 className="card-title">Workforce Headcount Trend</h3>
            <span className="chart-subtitle">Monthly employee count by status</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={headcountData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="headcountGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: 'var(--text-primary)' }} />
              <Legend />
              <Area type="monotone" dataKey="total" stroke="#3b82f6" fill="url(#headcountGrad)" strokeWidth={2} name="Total" />
              <Area type="monotone" dataKey="active" stroke="#10b981" fill="none" strokeWidth={2} name="Active" strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card reports-chart-card">
          <div className="perf-chart-head">
            <h3 className="card-title">Leave Distribution</h3>
            <span className="chart-subtitle">By leave type this quarter</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={leaveDistribution}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
              >
                {leaveDistribution.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: 'var(--text-primary)' }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="reports-charts-row">
        <div className="card reports-chart-card">
          <div className="perf-chart-head">
            <h3 className="card-title">Attendance Rate Trend</h3>
            <span className="chart-subtitle">Weekly attendance % over 8 weeks</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={attendanceTrend} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="week" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} domain={[70, 100]} />
              <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: 'var(--text-primary)' }} />
              <Bar dataKey="rate" name="Attendance %" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                {attendanceTrend.map((e, i) => (
                  <Cell key={i} fill={e.rate >= 90 ? '#10b981' : e.rate >= 85 ? '#3b82f6' : '#f59e0b'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card reports-chart-card reports-chart-wide">
          <div className="perf-chart-head">
            <h3 className="card-title">Payroll Disbursement</h3>
            <span className="chart-subtitle">Base salary + bonuses per month</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={payrollData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
              <Tooltip
                contentStyle={tooltipStyle}
                itemStyle={{ color: 'var(--text-primary)' }}
                formatter={v => `$${v.toLocaleString()}`}
              />
              <Legend />
              <Bar dataKey="salary" name="Base Salary" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
              <Bar dataKey="bonus" name="Bonus" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Report Templates */}
      <div className="reports-templates-section">
        <div className="reports-templates-header">
          <div>
            <h3 className="card-title">Pre-Built Report Templates</h3>
            <span className="chart-subtitle">Generate and export formatted reports for sharing</span>
          </div>
        </div>

        <div className="reports-templates-grid">
          {reportTemplates.map(tmpl => {
            const Icon = tmpl.icon;
            return (
              <div key={tmpl.id} className="card report-tmpl-card">
                <div className="report-tmpl-icon" style={{ background: `${tmpl.color}20`, color: tmpl.color }}>
                  <Icon size={22} />
                </div>
                <div className="report-tmpl-info">
                  <h4 className="report-tmpl-title">{tmpl.title}</h4>
                  <p className="report-tmpl-desc">{tmpl.desc}</p>
                  <Badge variant="neutral">{tmpl.category}</Badge>
                </div>
                <button
                  className="report-tmpl-btn"
                  onClick={() => addToast('success', `Generating "${tmpl.title}" report...`)}
                >
                  <Download size={14} />
                  Generate
                </button>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

export default Reports;
