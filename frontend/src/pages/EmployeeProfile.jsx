import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  ArrowLeft, User, Briefcase, Mail, Phone, Calendar, MapPin,
  Clock, CheckCircle, XCircle, AlertTriangle, TrendingUp,
  Activity, ChevronRight, BarChart2, Home, RefreshCw, Edit2,
  Shield, Star, Coffee, LogIn, LogOut
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell
} from 'recharts';
import './EmployeeProfile.css';

// ─── Skeleton Component ───────────────────────────────────────────────────────
const Skeleton = ({ height = 16, width = '100%', style = {} }) => (
  <div className="ep-skeleton" style={{ height, width, ...style }} />
);

// ─── Avatar ───────────────────────────────────────────────────────────────────
const Avatar = ({ name = '', size = 72 }) => {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div className="ep-avatar" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials || '?'}
    </div>
  );
};

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const s = (status || '').toLowerCase();
  let cls = 'ep-badge ep-badge-neutral';
  if (s === 'present' || s === 'wfh' || s === 'work from home') cls = 'ep-badge ep-badge-success';
  else if (s === 'late') cls = 'ep-badge ep-badge-warning';
  else if (s === 'absent') cls = 'ep-badge ep-badge-danger';
  else if (s.includes('leave')) cls = 'ep-badge ep-badge-info';
  return <span className={cls}>{status || '—'}</span>;
};

// ─── Attendance Row ───────────────────────────────────────────────────────────
const AttendanceRow = ({ record, index }) => {
  const s = (record.status || '').toLowerCase();
  let accentCls = '';
  if (s === 'present' || s === 'wfh') accentCls = 'ep-row-success';
  else if (s === 'late') accentCls = 'ep-row-warning';
  else if (s === 'absent') accentCls = 'ep-row-danger';
  const d = new Date(record.date);
  const dayStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return (
    <div className={`ep-att-row ${accentCls} ${index % 2 === 0 ? 'ep-row-even' : 'ep-row-odd'}`}>
      <span className="ep-att-dot" />
      <span className="ep-att-date">{dayStr}</span>
      <span className="ep-att-time">{record.punchIn || '--:--'}</span>
      <span className="ep-att-time">{record.punchOut || '--:--'}</span>
      <span className="ep-att-hours">{record.totalHours ? `${record.totalHours}h` : '—'}</span>
      <StatusBadge status={record.status} />
    </div>
  );
};

// ─── Leave Balance Bar ────────────────────────────────────────────────────────
const LeaveBalanceBar = ({ label, used, total }) => {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  return (
    <div className="ep-leave-row">
      <div className="ep-leave-meta">
        <span className="ep-leave-label">{label}</span>
        <span className="ep-leave-count">{used}/{total}</span>
      </div>
      <div className="ep-leave-track">
        <div className="ep-leave-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

// ─── Today's Timeline ─────────────────────────────────────────────────────────
const TodayTimeline = ({ todayRecord }) => {
  const events = [];
  if (todayRecord?.punchIn) events.push({ icon: LogIn, label: 'Punch In', time: todayRecord.punchIn, type: 'success' });
  if (todayRecord?.breakStart) events.push({ icon: Coffee, label: 'Break Start', time: todayRecord.breakStart, type: 'warning' });
  if (todayRecord?.breakEnd) events.push({ icon: Coffee, label: 'Break End', time: todayRecord.breakEnd, type: 'info' });
  if (todayRecord?.punchOut) events.push({ icon: LogOut, label: 'Punch Out', time: todayRecord.punchOut, type: 'danger' });

  if (events.length === 0) {
    return <div className="ep-timeline-empty">No activity recorded today</div>;
  }

  return (
    <div className="ep-timeline">
      {events.map((ev, i) => {
        const Icon = ev.icon;
        return (
          <div key={i} className="ep-timeline-item">
            <div className={`ep-timeline-dot ep-dot-${ev.type}`}>
              <Icon size={12} />
            </div>
            {i < events.length - 1 && <div className="ep-timeline-line" />}
            <div className="ep-timeline-content">
              <span className="ep-timeline-label">{ev.label}</span>
              <span className="ep-timeline-time">{ev.time}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Activity Log ─────────────────────────────────────────────────────────────
const ActivityLog = ({ logs = [] }) => {
  if (!logs.length) return <div className="ep-empty-msg">No recent activity</div>;
  return (
    <div className="ep-activity-list">
      {logs.slice(0, 5).map((log, i) => (
        <div key={i} className="ep-activity-item">
          <Activity size={13} className="ep-activity-icon" />
          <div className="ep-activity-content">
            <span className="ep-activity-text">{log.action || log.description || log}</span>
            <span className="ep-activity-time">{log.timestamp || log.date || ''}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Main EmployeeProfile Page ────────────────────────────────────────────────
const EmployeeProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { employees, attendance, currentUserId, currentUserRole } = useApp();

  // Resolve which employee to show: regular employees can only see their own details
  const empId = currentUserRole === 'employee' ? currentUserId : (id || currentUserId);
  const emp = useMemo(() => employees.find(e => e.id === empId), [employees, empId]);

  const [activeTab, setActiveTab] = useState('week');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, [empId]);

  // ── Derived attendance data ──
  const today = new Date().toISOString().split('T')[0];
  const empAttendance = useMemo(() =>
    attendance.filter(a => a.employeeId === empId).sort((a, b) => new Date(b.date) - new Date(a.date)),
    [attendance, empId]);

  const todayRecord = useMemo(() =>
    empAttendance.find(a => a.date === today), [empAttendance, today]);

  const filteredAttendance = useMemo(() => {
    const now = new Date();
    if (activeTab === 'today') return empAttendance.filter(a => a.date === today);
    if (activeTab === 'week') {
      const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
      return empAttendance.filter(a => new Date(a.date) >= weekAgo);
    }
    const monthAgo = new Date(now); monthAgo.setDate(now.getDate() - 30);
    return empAttendance.filter(a => new Date(a.date) >= monthAgo);
  }, [empAttendance, activeTab, today]);

  // ── Stats ──
  const presentDays = empAttendance.filter(a => a.status === 'Present' || a.status === 'WFH').length;
  const absentDays  = empAttendance.filter(a => a.status === 'Absent').length;
  const lateDays    = empAttendance.filter(a => a.status === 'Late').length;
  const avgHours    = empAttendance.length > 0
    ? (empAttendance.reduce((s, a) => s + (a.totalHours || 0), 0) / empAttendance.filter(a => a.totalHours > 0).length || 0).toFixed(1)
    : 0;

  // ── Weekly bar chart data ──
  const weeklyChartData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const now = new Date();
    return days.map((day, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - now.getDay() + i + 1);
      const dateStr = d.toISOString().split('T')[0];
      const rec = empAttendance.find(a => a.date === dateStr);
      return { day, hours: rec?.totalHours || 0, status: rec?.status || '' };
    });
  }, [empAttendance]);

  // ── Leave balance ──
  const leaveHistory = emp?.leaveHistory || [];
  const leaveCounts = {
    casual: leaveHistory.filter(l => l.type === 'Casual Leave' && l.status === 'Approved').length,
    sick:   leaveHistory.filter(l => l.type === 'Sick Leave'   && l.status === 'Approved').length,
    earned: leaveHistory.filter(l => l.type === 'Paid Leave'   && l.status === 'Approved').length,
  };

  // ── Activity logs ──
  const activityLogs = emp?.activityLog || [];

  // ── Upcoming leaves ──
  const upcomingLeaves = leaveHistory.filter(l => {
    return l.status === 'Approved' && new Date(l.fromDate) > new Date();
  }).slice(0, 3);

  // ── Not found ──
  if (!loading && !emp) {
    return (
      <div className="ep-error">
        <XCircle size={32} />
        <p>Employee not found.</p>
        <button className="ep-retry-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} /> Go Back
        </button>
      </div>
    );
  }

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const fmtDate = (str) => {
    if (!str) return '—';
    const d = new Date(str);
    return `${String(d.getDate()).padStart(2,'0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  };

  return (
    <div className="ep-page">

      {/* ── Breadcrumb ── */}
      <nav className="ep-breadcrumb">
        <button onClick={() => navigate('/')} className="ep-bread-link"><Home size={13} /> Home</button>
        <ChevronRight size={13} className="ep-bread-sep" />
        {currentUserRole === 'employee' ? (
          <button onClick={() => navigate('/employee-dashboard')} className="ep-bread-link">Employee Dashboard</button>
        ) : (
          <button onClick={() => navigate('/employees')} className="ep-bread-link">Employees</button>
        )}
        <ChevronRight size={13} className="ep-bread-sep" />
        <span className="ep-bread-current">{loading ? '…' : emp?.id}</span>
      </nav>

      {/* ── Hero Card ── */}
      <div className="ep-hero card">
        {loading ? (
          <div className="ep-hero-inner">
            <Skeleton height={72} width={72} style={{ borderRadius: '50%' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Skeleton height={22} width={200} />
              <Skeleton height={14} width={160} />
            </div>
          </div>
        ) : (
          <div className="ep-hero-inner">
            {/* Avatar + Info */}
            <Avatar name={emp.name} size={72} />
            <div className="ep-hero-info">
              <h1 className="ep-hero-name">{emp.name}</h1>
              <p className="ep-hero-sub">{emp.designation || emp.role} · {emp.department}</p>
              <div className="ep-hero-badges">
                <span className="ep-active-badge">● Active</span>
                <span className="ep-dept-badge">{emp.branch}</span>
              </div>
            </div>

            {/* Stat Pills */}
            <div className="ep-hero-stats">
              {[
                { label: 'Present', value: presentDays, type: 'success' },
                { label: 'Absent',  value: absentDays,  type: 'danger'  },
                { label: 'Avg Hrs', value: `${avgHours}h`, type: 'info' },
                { label: 'Late',    value: lateDays,    type: 'warning' },
              ].map(s => (
                <div key={s.label} className={`ep-stat-pill ep-pill-${s.type}`}>
                  <span className="ep-stat-num">{s.value}</span>
                  <span className="ep-stat-lbl">{s.label}</span>
                </div>
              ))}
            </div>

            {/* ID + Join */}
            <div className="ep-hero-meta">
              <div className="ep-meta-row"><Shield size={13} /><span>{emp.id}</span></div>
              <div className="ep-meta-row"><Calendar size={13} /><span>{fmtDate(emp.joinDate)}</span></div>
              {(currentUserRole !== 'employee') && (
                <button className="ep-edit-btn" onClick={() => navigate(`/employees?edit=${emp.id}`)}>
                  <Edit2 size={13} /> Edit
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Three-Column Body ── */}
      <div className="ep-body">

        {/* ── LEFT COLUMN ── */}
        <div className="ep-col-left">

          {/* Personal Info */}
          <div className="card ep-info-card">
            <div className="ep-card-header ep-header-info">
              <User size={15} /> Personal Info
            </div>
            {loading ? (
              <div className="ep-card-body"><Skeleton height={14} /><Skeleton height={14} /><Skeleton height={14} /></div>
            ) : (
              <div className="ep-card-body">
                {[
                  { icon: Calendar, label: 'Date of Birth', value: fmtDate(emp.dob) },
                  { icon: User,     label: 'Gender',        value: emp.gender || '—' },
                  { icon: Mail,     label: 'Email',         value: emp.email || emp.workEmail || '—' },
                  { icon: Phone,    label: 'Phone',         value: emp.phone || '—' },
                  { icon: MapPin,   label: 'City',          value: emp.city || '—' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="ep-info-row">
                    <div className="ep-info-icon"><Icon size={13} /></div>
                    <div className="ep-info-content">
                      <span className="ep-info-label">{label}</span>
                      <span className="ep-info-value">{value}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Company Info */}
          <div className="card ep-info-card">
            <div className="ep-card-header ep-header-primary">
              <Briefcase size={15} /> Company Info
            </div>
            {loading ? (
              <div className="ep-card-body"><Skeleton height={14} /><Skeleton height={14} /><Skeleton height={14} /></div>
            ) : (
              <div className="ep-card-body">
                {[
                  { label: 'Department',        value: emp.department },
                  { label: 'Designation',       value: emp.designation || emp.role },
                  { label: 'Reporting Manager', value: emp.reportingManager || emp.teamLeader || '—' },
                  { label: 'Employee ID',       value: emp.id },
                  { label: 'Shift Timing',      value: emp.shiftTiming || '09:30 AM - 06:00 PM' },
                  { label: 'Work Mode',         value: emp.workMode || 'Work From Office' },
                ].map(({ label, value }) => (
                  <div key={label} className="ep-info-row">
                    <div className="ep-info-content" style={{ paddingLeft: 0 }}>
                      <span className="ep-info-label">{label}</span>
                      <span className="ep-info-value">{value || '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Leave Balance */}
          <div className="card ep-info-card">
            <div className="ep-card-header ep-header-success">
              <CheckCircle size={15} /> Leave Balance
            </div>
            {loading ? (
              <div className="ep-card-body"><Skeleton height={40} /><Skeleton height={40} /></div>
            ) : (
              <div className="ep-card-body ep-leave-body">
                <LeaveBalanceBar label="Casual Leave"  used={leaveCounts.casual} total={12} />
                <LeaveBalanceBar label="Sick Leave"    used={leaveCounts.sick}   total={10} />
                <LeaveBalanceBar label="Earned Leave"  used={leaveCounts.earned} total={20} />
              </div>
            )}
          </div>
        </div>

        {/* ── CENTER COLUMN ── */}
        <div className="ep-col-center">
          <div className="card ep-att-card">
            {/* Filter Tabs */}
            <div className="ep-att-header">
              <h3 className="ep-att-title"><Activity size={16} /> Attendance Feed</h3>
              <div className="ep-att-tabs">
                {['today', 'week', 'month'].map(tab => (
                  <button
                    key={tab}
                    className={`ep-tab-btn ${activeTab === tab ? 'ep-tab-active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab === 'today' ? 'Today' : tab === 'week' ? 'This Week' : 'This Month'}
                  </button>
                ))}
              </div>
            </div>

            {/* Table Header */}
            <div className="ep-att-table-head">
              <span />
              <span>Date</span>
              <span>Punch In</span>
              <span>Punch Out</span>
              <span>Hours</span>
              <span>Status</span>
            </div>

            {/* Rows */}
            {loading ? (
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1,2,3,4].map(i => <Skeleton key={i} height={40} />)}
              </div>
            ) : filteredAttendance.length > 0 ? (
              <div className="ep-att-rows">
                {filteredAttendance.map((rec, i) => (
                  <AttendanceRow key={rec.id || i} record={rec} index={i} />
                ))}
              </div>
            ) : (
              <div className="ep-att-empty">No attendance records for this period</div>
            )}

            {/* Weekly Bar Chart */}
            <div className="ep-chart-section">
              <h4 className="ep-chart-title"><BarChart2 size={14} /> Weekly Hours</h4>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={weeklyChartData} barSize={24} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <XAxis dataKey="day" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 12 }}
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    formatter={(v) => [`${v}h`, 'Hours']}
                  />
                  <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                    {weeklyChartData.map((entry, i) => {
                      const s = (entry.status || '').toLowerCase();
                      let color = 'var(--color-success)';
                      if (s === 'late') color = 'var(--color-warning)';
                      else if (s === 'absent') color = 'var(--color-danger)';
                      else if (!entry.hours) color = 'var(--color-neutral-light)';
                      return <Cell key={i} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="ep-col-right">

          {/* Today's Timeline */}
          <div className="card ep-right-card">
            <div className="ep-card-header ep-header-info">
              <Clock size={15} /> Today's Timeline
            </div>
            <div className="ep-card-body">
              {loading ? <Skeleton height={100} /> : <TodayTimeline todayRecord={todayRecord} />}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card ep-right-card">
            <div className="ep-card-header ep-header-primary">
              <Activity size={15} /> Recent Activity
            </div>
            <div className="ep-card-body">
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[1,2,3].map(i => <Skeleton key={i} height={32} />)}
                </div>
              ) : (
                <ActivityLog logs={activityLogs} />
              )}
            </div>
          </div>

          {/* Upcoming Leaves */}
          <div className="card ep-right-card">
            <div className="ep-card-header ep-header-warning">
              <Calendar size={15} /> Upcoming Leaves
            </div>
            <div className="ep-card-body">
              {loading ? <Skeleton height={60} /> : upcomingLeaves.length > 0 ? (
                <div className="ep-upcoming-list">
                  {upcomingLeaves.map((l, i) => (
                    <div key={i} className="ep-upcoming-item">
                      <div className="ep-upcoming-dates">
                        <span>{fmtDate(l.fromDate)}</span>
                        <span className="ep-upcoming-to">→</span>
                        <span>{fmtDate(l.toDate)}</span>
                      </div>
                      <span className="ep-badge ep-badge-warning">{l.type}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="ep-empty-msg">No upcoming leaves</div>
              )}
            </div>
          </div>

          {/* Performance mini */}
          <div className="card ep-right-card">
            <div className="ep-card-header ep-header-success">
              <Star size={15} /> Performance
            </div>
            <div className="ep-card-body">
              {loading ? <Skeleton height={60} /> : (
                <div className="ep-perf-mini">
                  <div className="ep-perf-score">{emp?.performanceScore?.overall || 78}</div>
                  <div className="ep-perf-label">Overall Score / 100</div>
                  <div className="ep-perf-bars">
                    {[
                      { label: 'Attendance',    val: emp?.performanceScore?.attendance || 82 },
                      { label: 'Tasks',         val: emp?.performanceScore?.taskCompletion || 75 },
                      { label: 'Reports',       val: emp?.performanceScore?.reportSubmission || 80 },
                    ].map(p => (
                      <div key={p.label} className="ep-perf-bar-row">
                        <span>{p.label}</span>
                        <div className="ep-perf-bar-track">
                          <div className="ep-perf-bar-fill" style={{ width: `${p.val}%` }} />
                        </div>
                        <span className="ep-perf-pct">{p.val}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default EmployeeProfile;
