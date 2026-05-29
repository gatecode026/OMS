import React, { useState } from 'react';
import './Performance.css';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import Badge from '../components/common/Badge';
import Avatar from '../components/common/Avatar';
import Skeleton from '../components/common/Skeleton';
import {
  TrendingUp, Award, Target, BarChart3, ChevronDown, Star, Zap, AlertTriangle
} from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  LineChart, Line, Legend, AreaChart, Area
} from 'recharts';

const deptPerformance = [
  { name: 'Operations', score: 95, employees: 1, trend: '+3%', color: '#ef4444' },
  { name: 'Sales', score: 92, employees: 2, trend: '+7%', color: '#10b981' },
  { name: 'Engineering', score: 88, employees: 4, trend: '+2%', color: '#3b82f6' },
  { name: 'HR', score: 85, employees: 1, trend: '+5%', color: '#f59e0b' },
  { name: 'Marketing', score: 79, employees: 2, trend: '-1%', color: '#8b5cf6' }
];

const monthlyTrend = [
  { month: 'Jan', overall: 78, engineering: 80, sales: 82, marketing: 72 },
  { month: 'Feb', overall: 80, engineering: 82, sales: 84, marketing: 75 },
  { month: 'Mar', overall: 82, engineering: 83, sales: 86, marketing: 76 },
  { month: 'Apr', overall: 84, engineering: 85, sales: 88, marketing: 77 },
  { month: 'May', overall: 88, engineering: 88, sales: 92, marketing: 79 }
];

const topEmployees = [
  { name: 'Aarav Sharma', dept: 'Operations', score: 98, kpi: 'Strategic Execution', badge: '🥇' },
  { name: 'Marcus Vance', dept: 'Sales', score: 95, kpi: 'Revenue Generation', badge: '🥈' },
  { name: 'Elena Rostova', dept: 'Engineering', score: 92, kpi: 'Technical Delivery', badge: '🥉' },
  { name: 'Aiko Tanaka', dept: 'Marketing', score: 87, kpi: 'Campaign ROI', badge: '⭐' },
  { name: 'Carlos Mendez', dept: 'Sales', score: 84, kpi: 'Client Retention', badge: '⭐' },
  { name: 'Sophia Laurent', dept: 'HR', score: 82, kpi: 'Talent Acquisition', badge: '⭐' }
];

const radarData = [
  { subject: 'Attendance', A: 92, fullMark: 100 },
  { subject: 'Task Delivery', A: 88, fullMark: 100 },
  { subject: 'Team Collab', A: 85, fullMark: 100 },
  { subject: 'Innovation', A: 78, fullMark: 100 },
  { subject: 'Communication', A: 90, fullMark: 100 },
  { subject: 'Leadership', A: 72, fullMark: 100 }
];

const kpiData = [
  { kpi: 'Task Completion', current: 88, target: 90 },
  { kpi: 'Attendance Rate', current: 92, target: 95 },
  { kpi: 'Client Satisfaction', current: 87, target: 85 },
  { kpi: 'Revenue vs Target', current: 94, target: 100 },
  { kpi: 'Onboarding Speed', current: 79, target: 80 }
];

const Performance = () => {
  const isLoading = usePageLoading(600);
  const [period, setPeriod] = useState('Q2 2026');
  const [activeDept, setActiveDept] = useState('All');

  const tooltipStyle = {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-color-dark)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)'
  };

  if (isLoading) {
    return (
      <div className="performance-page">
        {[1, 2, 3].map(i => (
          <div key={i} className="card" style={{ height: 280 }}>
            <Skeleton variant="rect" height="100%" width="100%" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="performance-page">

      {/* Header */}
      <div className="perf-header">
        <div>
          <h2 className="perf-title">Performance Analytics</h2>
          <p className="perf-subtitle">Organisation-wide KPI tracking and team performance insights</p>
        </div>
        <div className="perf-period-selector">
          <button
            className={`period-btn ${period === 'Q1 2026' ? 'active' : ''}`}
            onClick={() => setPeriod('Q1 2026')}
          >
            Q1 2026
          </button>
          <button
            className={`period-btn ${period === 'Q2 2026' ? 'active' : ''}`}
            onClick={() => setPeriod('Q2 2026')}
          >
            Q2 2026
          </button>
        </div>
      </div>

      {/* Top KPI Stats */}
      <div className="perf-stats-grid">
        {[
          { label: 'Overall Score', value: '88%', icon: Award, color: '#10b981', change: '+4%', up: true },
          { label: 'KPIs On Target', value: '3/5', icon: Target, color: '#3b82f6', change: 'This Quarter', up: true },
          { label: 'Top Performer', value: 'Aarav Sharma', icon: Star, color: '#f59e0b', change: 'Score: 98', up: true },
          { label: 'Needs Attention', value: '1 Dept', icon: AlertTriangle, color: '#ef4444', change: 'Marketing', up: false }
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="card perf-stat-card">
              <div className="perf-stat-icon" style={{ background: `${s.color}20`, color: s.color }}>
                <Icon size={20} />
              </div>
              <div className="perf-stat-info">
                <p className="perf-stat-val">{s.value}</p>
                <p className="perf-stat-label">{s.label}</p>
                <span
                  className="perf-stat-change"
                  style={{ color: s.up ? '#10b981' : '#ef4444' }}
                >
                  {s.up ? '▲' : '▼'} {s.change}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="perf-charts-row">
        {/* Monthly Trend Line */}
        <div className="card perf-chart-card perf-chart-wide">
          <div className="perf-chart-head">
            <h3 className="card-title">Performance Trend</h3>
            <span className="chart-subtitle">Monthly scores by department</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} domain={[60, 100]} />
              <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: 'var(--text-primary)' }} />
              <Legend />
              <Line type="monotone" dataKey="overall" stroke="#64748b" strokeWidth={2} dot={false} name="Overall" />
              <Line type="monotone" dataKey="engineering" stroke="#3b82f6" strokeWidth={2} dot={false} name="Engineering" />
              <Line type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2} dot={false} name="Sales" />
              <Line type="monotone" dataKey="marketing" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Marketing" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Radar Chart */}
        <div className="card perf-chart-card">
          <div className="perf-chart-head">
            <h3 className="card-title">Competency Radar</h3>
            <span className="chart-subtitle">Average across all teams</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.08)" />
              <PolarAngleAxis dataKey="subject" stroke="var(--text-muted)" fontSize={10} />
              <Radar name="Org" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Department Scores Bar Chart + Table */}
      <div className="perf-bottom-row">
        <div className="card perf-dept-chart">
          <div className="perf-chart-head">
            <h3 className="card-title">Department Scores</h3>
            <span className="chart-subtitle">Comparative performance this quarter</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={deptPerformance}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 30, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" stroke="var(--text-muted)" fontSize={11} tickLine={false} domain={[0, 100]} />
              <YAxis type="category" dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} width={80} />
              <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: 'var(--text-primary)' }} />
              <Bar dataKey="score" name="Score" radius={[0, 4, 4, 0]}>
                {deptPerformance.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* KPI Progress */}
        <div className="card perf-kpi-panel">
          <div className="perf-chart-head">
            <h3 className="card-title">KPI Progress</h3>
            <span className="chart-subtitle">Current vs Target benchmarks</span>
          </div>
          <div className="kpi-list">
            {kpiData.map((kpi, i) => {
              const pct = Math.round((kpi.current / kpi.target) * 100);
              const onTarget = kpi.current >= kpi.target;
              return (
                <div key={i} className="kpi-item">
                  <div className="kpi-item-header">
                    <span className="kpi-name">{kpi.kpi}</span>
                    <div className="kpi-values">
                      <span className="kpi-current" style={{ color: onTarget ? '#10b981' : '#f59e0b' }}>
                        {kpi.current}%
                      </span>
                      <span className="kpi-separator">/</span>
                      <span className="kpi-target">{kpi.target}%</span>
                    </div>
                  </div>
                  <div className="kpi-bar-bg">
                    <div
                      className="kpi-bar-fill"
                      style={{
                        width: `${Math.min(kpi.current, 100)}%`,
                        background: onTarget ? '#10b981' : '#f59e0b'
                      }}
                    />
                    {/* Target marker */}
                    <div
                      className="kpi-target-marker"
                      style={{ left: `${kpi.target}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Performers Table */}
      <div className="card perf-top-table">
        <div className="perf-chart-head">
          <h3 className="card-title">Top Performers Leaderboard</h3>
          <span className="chart-subtitle">{period} rankings</span>
        </div>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Employee</th>
                <th>Department</th>
                <th>Key KPI</th>
                <th>Score</th>
                <th>Rating</th>
              </tr>
            </thead>
            <tbody>
              {topEmployees.map((emp, i) => (
                <tr key={emp.name} className="animate-fade-in">
                  <td>
                    <span className="rank-badge">{i + 1}</span>
                  </td>
                  <td>
                    <div className="flex-center gap-3 justify-start">
                      <span className="rank-emoji">{emp.badge}</span>
                      <Avatar name={emp.name} size="sm" />
                      <span className="bold-text">{emp.name}</span>
                    </div>
                  </td>
                  <td>
                    <Badge variant="neutral">{emp.dept}</Badge>
                  </td>
                  <td className="text-muted">{emp.kpi}</td>
                  <td>
                    <div className="perf-score-cell">
                      <div
                        className="perf-mini-bar"
                        style={{
                          width: `${emp.score}%`,
                          background: emp.score >= 90 ? '#10b981' : emp.score >= 80 ? '#3b82f6' : '#f59e0b'
                        }}
                      />
                      <span className="perf-score-num">{emp.score}</span>
                    </div>
                  </td>
                  <td>
                    <Badge variant={emp.score >= 90 ? 'success' : emp.score >= 80 ? 'primary' : 'warning'}>
                      {emp.score >= 90 ? 'Excellent' : emp.score >= 80 ? 'Good' : 'Average'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default Performance;
