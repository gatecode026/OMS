import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp, normalizeEmployee } from '../context/AppContext';
import { decodeEmployeeId } from '../utils/hashId';
import {
  ArrowLeft, User, Briefcase, Mail, Phone, Calendar, MapPin,
  Clock, CheckCircle, XCircle, AlertTriangle, TrendingUp,
  Activity, ChevronRight, BarChart2, Home, RefreshCw, Edit2,
  Shield, Star, Coffee, LogIn, LogOut, Building2, UserCheck, Download
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell
} from 'recharts';
import './EmployeeProfile.css';

// ID Card Helpers
const fmtDob = (dateStr) => {
  if (!dateStr) return '15/08/1996';
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const calculateExpiry = (dateStr) => {
  if (!dateStr) return '31 Dec 2031';
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + 5);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

const renderName = (fullname) => {
  if (!fullname) return '';
  const parts = fullname.trim().split(' ');
  if (parts.length === 1) return <span className="id-name-dark">{parts[0]}</span>;
  return (
    <>
      <span className="id-name-dark">{parts[0]} </span>
      <span className="id-name-accent">{parts.slice(1).join(' ')}</span>
    </>
  );
};

const getBranchAddress = (branchName, branchesList = []) => {
  const name = (branchName || '').toLowerCase().trim();
  const foundBranch = (branchesList || []).find(b =>
    (b.name || '').toLowerCase().trim() === name ||
    (b.id || '').toLowerCase().trim() === name ||
    (b.code || '').toLowerCase().trim() === name ||
    (b.branchCode || '').toLowerCase().trim() === name
  );
  if (foundBranch) {
    const addr = [foundBranch.address, foundBranch.city, foundBranch.state, foundBranch.zipCode].filter(Boolean).join(', ');
    if (addr) return addr;
  }
  return branchName || '—';
};

// ─── Skeleton Component ───────────────────────────────────────────────────────
const Skeleton = ({ height = 16, width = '100%', style = {} }) => (
  <div className="ep-skeleton" style={{ height, width, ...style }} />
);

// ─── Avatar ───────────────────────────────────────────────────────────────────
const Avatar = ({ name = '', size = 72, src = '', className = '' }) => {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const isNumberSize = typeof size === 'number';
  const inlineStyle = isNumberSize
    ? { width: size, height: size, fontSize: size * 0.36, overflow: 'hidden', padding: 0 }
    : { overflow: 'hidden', padding: 0 };
  return (
    <div className={`ep-avatar ${className}`} style={inlineStyle}>
      {src ? (
        <img
          src={src}
          alt={name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
          className="avatar-img"
        />
      ) : (
        <span style={!isNumberSize ? { fontSize: '1.5rem' } : undefined}>{initials || '?'}</span>
      )}
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
const LeaveBalanceBar = ({ label, used, total, variant }) => {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  return (
    <div className="ep-leave-row">
      <div className="ep-leave-meta">
        <span className="ep-leave-label">{label}</span>
        <span className="ep-leave-count">{used}/{total}</span>
      </div>
      <div className="ep-leave-track">
        <div className={`ep-leave-fill ep-leave-${variant}`} style={{ width: `${pct}%` }} />
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

// ─── Credential Item ─────────────────────────────────────────────────────────
const CredentialItem = ({ label, value }) => {
  const [reveal, setReveal] = useState(false);
  const displayVal = value || 'Not Provided';
  const maskValue = (val) => {
    if (!val || val === 'Not Provided') return 'Not Provided';
    if (val.length <= 4) return '••••';
    return '•••• •••• ' + val.slice(-4);
  };
  return (
    <div className="ep-credential-item">
      <div className="ep-cred-meta">
        <span className="ep-cred-label">{label}</span>
        <button
          className="ep-cred-toggle-btn"
          onClick={() => setReveal(!reveal)}
          title={reveal ? "Hide credential" : "Show credential"}
        >
          {reveal ? '👁️' : '🔒'}
        </button>
      </div>
      <span className="ep-cred-value">
        {reveal ? displayVal : maskValue(displayVal)}
      </span>
    </div>
  );
};

// ─── Main EmployeeProfile Page ────────────────────────────────────────────────
const EmployeeProfile = () => {
  const { id: encodedId } = useParams();
  const navigate = useNavigate();
  const { employees, attendance, currentUserId, currentUserRole, addToast, token, tasks, dailyReports, branches } = useApp();

  // Decode the obfuscated URL param back to the real employee ID
  const decodedId = encodedId ? decodeEmployeeId(encodedId) : null;

  // Resolve which employee to show: regular employees can only see their own details
  const empId = currentUserRole === 'employee' ? currentUserId : (decodedId || currentUserId);
  const empFromContext = useMemo(() => employees.find(e => e.id === empId), [employees, empId]);

  const [fullEmp, setFullEmp] = useState(null);
  const [profileTab, setProfileTab] = useState('overview');
  const [activeTab, setActiveTab] = useState('week');
  const [loading, setLoading] = useState(true);
  const [showIdCard, setShowIdCard] = useState(false);
  const idCardRef = useRef(null);

  useEffect(() => {
    if (!empId || !token) return;
    fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/employees/${empId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(result => {
        if (result.status === 'success' && result.data) {
          setFullEmp(normalizeEmployee(result.data));
        }
      })
      .catch(err => console.error('Failed to fetch full employee details:', err));
  }, [empId, token]);

  const emp = fullEmp || empFromContext;

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, [empId]);

  const downloadIdCard = async () => {
    if (!idCardRef.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(idCardRef.current, { scale: 3, backgroundColor: null, allowTaint: false, useCORS: true });
      const link = document.createElement('a');
      link.download = `${emp.id}_ID_Card.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to download ID card:', err);
      addToast('danger', 'Failed to download ID card.');
    }
  };

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
  const presentDays = empAttendance.filter(a => a.status === 'Present' || a.status === 'WFH' || a.status === 'Late').length;
  const absentDays = empAttendance.filter(a => a.status === 'Absent').length;
  const lateDays = empAttendance.filter(a => a.status === 'Late').length;
  const avgHours = empAttendance.length > 0
    ? (empAttendance.reduce((s, a) => s + (a.totalHours || 0), 0) / empAttendance.filter(a => a.totalHours > 0).length || 0).toFixed(1)
    : 0;

  // ── Derived performance calculations ──
  const totalExpectedDays = useMemo(() => {
    return empAttendance.filter(a => !(a.status || '').toLowerCase().includes('leave')).length;
  }, [empAttendance]);

  const attendanceRate = useMemo(() => {
    if (totalExpectedDays === 0) return 0;
    const score = Math.round(((presentDays + lateDays * 0.8) / totalExpectedDays) * 100);
    return Math.min(100, Math.max(0, score));
  }, [presentDays, lateDays, totalExpectedDays]);

  const empTasks = useMemo(() => {
    return (tasks || []).filter(t => t.assigneeId === empId);
  }, [tasks, empId]);

  const completedTasks = useMemo(() => {
    return empTasks.filter(t => t.completed || t.status === 'Done' || t.status === 'Completed').length;
  }, [empTasks]);

  const taskCompletionRate = useMemo(() => {
    if (empTasks.length === 0) return 0;
    const rate = Math.round((completedTasks / empTasks.length) * 100);
    return Math.min(100, Math.max(0, rate));
  }, [completedTasks, empTasks.length]);

  const empReports = useMemo(() => {
    return (dailyReports || []).filter(r => r.employeeId === empId);
  }, [dailyReports, empId]);

  const reportSubmissionRate = useMemo(() => {
    const expected = presentDays + lateDays;
    if (expected === 0) {
      return 0;
    }
    const rate = Math.round((empReports.length / expected) * 100);
    return Math.min(100, Math.max(0, rate));
  }, [presentDays, lateDays, empReports.length]);

  const overallScore = useMemo(() => {
    const score = Math.round(attendanceRate * 0.4 + taskCompletionRate * 0.3 + reportSubmissionRate * 0.3);
    return Math.min(100, Math.max(0, score));
  }, [attendanceRate, taskCompletionRate, reportSubmissionRate]);

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
    sick: leaveHistory.filter(l => l.type === 'Sick Leave' && l.status === 'Approved').length,
    earned: leaveHistory.filter(l => l.type === 'Paid Leave' && l.status === 'Approved').length,
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

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmtDate = (str) => {
    if (!str) return '—';
    const d = new Date(str);
    return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
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
        <span className="ep-bread-current">{loading ? '…' : emp?.name}</span>
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
            <Avatar name={emp.name} size={72} src={emp.avatar || emp.photoUrl || ''} />
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
                { label: 'Absent', value: absentDays, type: 'danger' },
                { label: 'Avg Hrs', value: `${avgHours}h`, type: 'info' },
                { label: 'Late', value: lateDays, type: 'warning' },
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
              <div className="ep-hero-actions-row">
                <button className="ep-idcard-btn" onClick={() => setShowIdCard(true)}>
                  <Download size={13} /> ID Card
                </button>
                {(currentUserRole !== 'employee' && emp.status !== 'Inactive' && emp.accountStatus !== 'Inactive') && (
                  <button className="ep-edit-btn" onClick={() => navigate(`/employees?edit=${emp.id}`)}>
                    <Edit2 size={13} /> Edit
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Tabs Navigation ── */}
      <div className="ep-tabs-nav">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart2 },
          { id: 'personal', label: 'Personal Details', icon: User },
          { id: 'attendance', label: 'Attendance & Leaves', icon: Activity },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`ep-profile-tab-btn ${profileTab === tab.id ? 'active' : ''}`}
              onClick={() => setProfileTab(tab.id)}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tabbed Body Contents ── */}
      {profileTab === 'overview' && (
        <div className="ep-body ep-overview-tab-grid">
          {/* LEFT COLUMN: Company Info, Today's Timeline */}
          <div className="ep-col-left-wide">
            {/* Exit Details Card */}
            {(emp.status === 'Inactive' || emp.accountStatus === 'Inactive') && (
              <div className="card ep-info-card border-danger" style={{ borderLeft: '4px solid var(--color-danger, #ef4444)', marginBottom: '16px' }}>
                <div className="ep-card-header ep-header-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-danger, #ef4444)' }}>
                  <AlertTriangle size={15} /> Exit Details (Inactive Profile)
                </div>
                <div className="ep-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Exit Date</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{emp.exitInfo?.exitDate || '—'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Last Working Day</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{emp.exitInfo?.lastWorkingDay || '—'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Exit Reason</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{emp.exitInfo?.exitReason || '—'}</strong>
                  </div>
                  {emp.exitInfo?.exitNotes && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'var(--bg-elevated)', padding: '10px', borderRadius: '6px', marginTop: '6px' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>Exit Notes:</span>
                      <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>{emp.exitInfo.exitNotes}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

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
                    { icon: Building2, label: 'Department', value: emp.department },
                    { icon: Briefcase, label: 'Designation', value: emp.designation || emp.role },
                    { icon: UserCheck, label: 'Reporting Manager', value: emp.reportingManager || emp.teamLeader || '—' },
                    { icon: Shield, label: 'Employee ID', value: emp.id },
                    { icon: Clock, label: 'Shift Timing', value: emp.shiftTiming || '09:30 AM - 06:00 PM' },
                    { icon: MapPin, label: 'Work Mode', value: emp.workMode || 'Work From Office' },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="ep-info-row">
                      <div className="ep-info-icon"><Icon size={13} /></div>
                      <div className="ep-info-content">
                        <span className="ep-info-label">{label}</span>
                        <span className="ep-info-value">{value || '—'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Today's Timeline */}
            <div className="card ep-right-card">
              <div className="ep-card-header ep-header-info">
                <Clock size={15} /> Today's Timeline
              </div>
              <div className="ep-card-body">
                {loading ? <Skeleton height={100} /> : <TodayTimeline todayRecord={todayRecord} />}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Performance, Recent Activity, Upcoming Leaves */}
          <div className="ep-col-right-narrow">
            {/* Performance */}
            <div className="card ep-right-card">
              <div className="ep-card-header ep-header-success">
                <Star size={15} /> Performance
              </div>
              <div className="ep-card-body">
                {loading ? <Skeleton height={60} /> : (
                  <div className="ep-perf-mini">
                    <div className="ep-perf-user-header">
                      <Avatar name={emp.name} size={42} src={emp.avatar || emp.photoUrl || ''} />
                      <div className="ep-perf-user-info">
                        <span className="ep-perf-user-name">{emp.name}</span>
                        <span className="ep-perf-user-role">{emp.designation || emp.role}</span>
                      </div>
                    </div>
                    <div className="ep-perf-score">{overallScore}</div>
                    <div className="ep-perf-label">Overall Score / 100</div>
                    <div className="ep-perf-bars">
                      {[
                        { label: 'Attendance', val: attendanceRate },
                        { label: 'Tasks', val: taskCompletionRate },
                        { label: 'Reports', val: reportSubmissionRate },
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

            {/* Recent Activity */}
            <div className="card ep-right-card">
              <div className="ep-card-header ep-header-primary">
                <Activity size={15} /> Recent Activity
              </div>
              <div className="ep-card-body">
                {loading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[1, 2, 3].map(i => <Skeleton key={i} height={32} />)}
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
          </div>
        </div>
      )}

      {profileTab === 'personal' && (
        <div className="ep-body ep-personal-tab-grid">
          {/* LEFT: Identity Details, National Identities */}
          <div className="ep-col-left-half">
            {/* Identity Details */}
            <div className="card ep-info-card">
              <div className="ep-card-header ep-header-info">
                <User size={15} /> Identity & Demographics
              </div>
              <div className="ep-card-body ep-identity-body">
                <div className="ep-identity-header">
                  <Avatar name={emp.name} size={90} src={emp.avatar || emp.photoUrl || ''} />
                  <div className="ep-identity-meta">
                    <h3 className="ep-identity-name">{`${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.name}</h3>
                    <p className="ep-identity-role">{emp.designation || emp.role} · {emp.department}</p>
                    <span className="ep-identity-id-badge">ID: {emp.id}</span>
                  </div>
                </div>
                <div className="ep-personal-grid">
                  {[
                    { label: 'First Name', val: emp.firstName || emp.name?.split(' ')[0] || '—' },
                    { label: 'Last Name', val: emp.lastName || emp.name?.split(' ').slice(1).join(' ') || '—' },
                    { label: 'Date of Birth', val: fmtDate(emp.dob) },
                    { label: 'Gender', val: emp.gender },
                    { label: 'Marital Status', val: emp.maritalStatus },
                    { label: 'Nationality', val: emp.nationality },
                    { label: 'Blood Group', val: emp.bloodGroup, highlight: true },
                  ].map(item => (
                    <div key={item.label} className="ep-detail-item">
                      <span className="ep-detail-lbl">{item.label}</span>
                      <span className={`ep-detail-val ${item.highlight ? 'highlight-blood' : ''}`}>{item.val || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* National Credentials */}
            <div className="card ep-info-card">
              <div className="ep-card-header ep-header-warning">
                <Shield size={15} /> National Credentials
              </div>
              <div className="ep-card-body ep-credentials-grid">
                <CredentialItem label="Aadhaar Number" value={emp.aadhaarNumber} />
                <CredentialItem label="PAN Number" value={emp.panNumber} />
              </div>
            </div>
          </div>

          {/* RIGHT: Contact Channels, Address Details, Emergency Contacts */}
          <div className="ep-col-right-half">
            {/* Contact Channels */}
            <div className="card ep-info-card">
              <div className="ep-card-header ep-header-primary">
                <Mail size={15} /> Contact Channels
              </div>
              <div className="ep-card-body ep-personal-grid">
                {[
                  { label: 'Personal Email', val: emp.personalEmail },
                  { label: 'Official Email', val: emp.workEmail || emp.email },
                  { label: 'Phone Number', val: emp.phone },
                  { label: 'Alternate Phone', val: emp.alternatePhone },
                ].map(item => (
                  <div key={item.label} className="ep-detail-item">
                    <span className="ep-detail-lbl">{item.label}</span>
                    <span className="ep-detail-val">{item.val || '—'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Address Details */}
            <div className="card ep-info-card">
              <div className="ep-card-header ep-header-success">
                <MapPin size={15} /> Address Details
              </div>
              <div className="ep-card-body ep-personal-grid">
                {[
                  { label: 'City', val: emp.city || (typeof emp.currentAddress === 'object' ? emp.currentAddress?.city : '') },
                  { label: 'State', val: emp.state || (typeof emp.currentAddress === 'object' ? emp.currentAddress?.state : '') },
                  { label: 'Country', val: emp.country || (typeof emp.currentAddress === 'object' ? emp.currentAddress?.country : '') || 'India' },
                  { label: 'ZIP / Postal Code', val: emp.zipCode || (typeof emp.currentAddress === 'object' ? emp.currentAddress?.pincode : '') },
                  { label: 'Current Address', val: typeof emp.currentAddress === 'object' && emp.currentAddress ? [emp.currentAddress.line1, emp.currentAddress.city, emp.currentAddress.state, emp.currentAddress.country].filter(Boolean).join(', ') + (emp.currentAddress.pincode ? ` - ${emp.currentAddress.pincode}` : '') : (emp.currentAddress || emp.homeAddress || '—'), fullWidth: true },
                  { label: 'Permanent Address', val: typeof emp.permanentAddress === 'object' && emp.permanentAddress ? [emp.permanentAddress.line1, emp.permanentAddress.city, emp.permanentAddress.state, emp.permanentAddress.country].filter(Boolean).join(', ') + (emp.permanentAddress.pincode ? ` - ${emp.permanentAddress.pincode}` : '') : (emp.permanentAddress || emp.homeAddress || '—'), fullWidth: true },
                ].map(item => (
                  <div key={item.label} className={`ep-detail-item ${item.fullWidth ? 'full-width' : ''}`}>
                    <span className="ep-detail-lbl">{item.label}</span>
                    <span className="ep-detail-val">{item.val || '—'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Emergency Contacts */}
            <div className="card ep-info-card">
              <div className="ep-card-header ep-header-danger">
                <Phone size={15} /> Emergency Contacts
              </div>
              <div className="ep-card-body ep-personal-grid">
                {[
                  { label: 'Contact Person', val: emp.emergencyContactName },
                  { label: 'Relationship', val: emp.emergencyContactRelation },
                  { label: 'Mobile Number', val: emp.emergencyContactPhone },
                  { label: 'Alternate Mobile', val: emp.emergencyContactPhoneAlt },
                  { label: 'Address', val: emp.emergencyContactAddress, fullWidth: true },
                ].map(item => (
                  <div key={item.label} className={`ep-detail-item ${item.fullWidth ? 'full-width' : ''}`}>
                    <span className="ep-detail-lbl">{item.label}</span>
                    <span className="ep-detail-val">{item.val || '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {profileTab === 'attendance' && (
        <div className="ep-body ep-attendance-tab-grid">
          {/* LEFT: Attendance Feed */}
          <div className="ep-col-left-wide">
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
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} height={40} />)}
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

          {/* RIGHT: Leave Balance */}
          <div className="ep-col-right-narrow">
            {/* Leave Balance */}
            <div className="card ep-info-card">
              <div className="ep-card-header ep-header-success">
                <CheckCircle size={15} /> Leave Balance
              </div>
              {loading ? (
                <div className="ep-card-body"><Skeleton height={40} /><Skeleton height={40} /></div>
              ) : (
                <div className="ep-card-body ep-leave-body">
                  <LeaveBalanceBar label="Casual Leave" used={leaveCounts.casual} total={12} variant="casual" />
                  <LeaveBalanceBar label="Sick Leave" used={leaveCounts.sick} total={10} variant="sick" />
                  <LeaveBalanceBar label="Earned Leave" used={leaveCounts.earned} total={20} variant="earned" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── ID Card Modal ── */}
      {showIdCard && (
        <div className="id-card-overlay" onClick={() => setShowIdCard(false)}>
          <div className="id-card-modal" onClick={e => e.stopPropagation()}>
            <button className="id-card-close" onClick={() => setShowIdCard(false)}>✕</button>
            <div className="id-card-render-wrapper" ref={idCardRef}>
              <div className="id-card-front">
                <div className="id-card-front-header-bg"></div>
                <div className="id-card-front-pink-bg"></div>
                <div className="id-card-watermark"></div>
                <div className="id-card-badge">OFFICIAL ID</div>
                <div className="id-card-chip">
                  <svg viewBox="0 0 40 30" width="30" height="22">
                    <rect width="40" height="30" rx="4" fill="#D97706" opacity="0.9" />
                    <rect x="2" y="2" width="36" height="26" rx="3" fill="#F59E0B" />
                    <path d="M2 10 H38 M2 20 H38 M14 2 V28 M26 2 V28" stroke="#B45309" strokeWidth="1.2" />
                    <rect x="14" y="10" width="12" height="10" rx="2" fill="#FEF3C7" opacity="0.85" />
                  </svg>
                </div>
                <div className="id-card-logo-area">
                  <svg viewBox="0 0 100 100" width="22" height="22" className="id-card-logo-svg"><polygon points="50,15 85,50 50,85 15,50" fill="none" stroke="#FFFFFF" strokeWidth="8" /><polygon points="50,28 72,50 50,72 28,50" fill="#FFFFFF" /></svg>
                  <div className="id-card-company-title">{emp.companyName || 'Corporate Enterprise'}</div>
                  <div className="id-card-company-subtitle">{emp.branch ? (emp.branch.toLowerCase().includes('branch') ? emp.branch : `${emp.branch} Branch`) : (emp.officeLocation || 'Main Headquarters')}</div>
                </div>
                <div className="id-card-photo-wrap"><Avatar name={emp.name} size="xl" className="id-card-photo-img" src={emp.avatar || emp.photoUrl} /></div>
                <div className="id-card-name-area"><h2 className="id-card-emp-name">{renderName(emp.name)}</h2><p className="id-card-emp-role">{emp.designation || emp.role}</p></div>
                <div className="id-card-details-grid">
                  <div className="id-detail-label">ID NO</div><div className="id-detail-colon">:</div><div className="id-detail-value">{emp.id}</div>
                  <div className="id-detail-label">Dept.</div><div className="id-detail-colon">:</div><div className="id-detail-value">{emp.department}</div>
                  <div className="id-detail-label">Deg.</div><div className="id-detail-colon">:</div><div className="id-detail-value">{emp.designation || emp.role}</div>
                  <div className="id-detail-label">DOB</div><div className="id-detail-colon">:</div><div className="id-detail-value">{fmtDob(emp.dob)}</div>
                  <div className="id-detail-label">Blood</div><div className="id-detail-colon">:</div><div className="id-detail-value">{emp.bloodGroup || '—'}</div>
                  <div className="id-detail-label">Email</div><div className="id-detail-colon">:</div><div className="id-detail-value" title={emp.workEmail || emp.email}>{emp.workEmail || emp.email}</div>
                </div>
              </div>
              <div className="id-card-back">
                <div className="id-card-back-bottom-bg"></div>
                <div className="id-card-back-pink-bg"></div>
                <div className="id-card-back-bullets">
                  <div className="id-card-bullet-row"><span className="id-bullet-dot"></span><p>This card is the official property of {emp.companyName || 'Corporate Enterprise'} and must be returned on demand.</p></div>
                  <div className="id-card-bullet-row"><span className="id-bullet-dot"></span><p>If found, please return to the HR Department or dynamic branch address below immediately.</p></div>
                  <div className="id-card-bullet-row"><span className="id-bullet-dot"></span><p style={{ fontWeight: 600 }}>Branch Address: {emp.branchAddress || getBranchAddress(emp.branch, branches)}</p></div>
                </div>
                <div className="id-card-back-middle">
                  <div className="id-card-back-dates">
                    <div className="id-date-row"><span className="id-date-label">Join Date:</span><span className="id-date-val">{fmtDate(emp.joinDate)}</span></div>
                    <div className="id-date-row"><span className="id-date-label">Expire Date:</span><span className="id-date-val">{emp.contractEndDate ? fmtDate(emp.contractEndDate) : calculateExpiry(emp.joinDate)}</span></div>
                    <div className="id-card-barcode-area">
                      <svg viewBox="0 0 100 20" className="id-card-barcode-svg"><rect x="0" y="0" width="3" height="20" fill="#0f172a" /><rect x="5" y="0" width="1" height="20" fill="#0f172a" /><rect x="8" y="0" width="2" height="20" fill="#0f172a" /><rect x="12" y="0" width="4" height="20" fill="#0f172a" /><rect x="18" y="0" width="1" height="20" fill="#0f172a" /><rect x="21" y="0" width="2" height="20" fill="#0f172a" /><rect x="25" y="0" width="3" height="20" fill="#0f172a" /><rect x="30" y="0" width="1" height="20" fill="#0f172a" /><rect x="33" y="0" width="2" height="20" fill="#0f172a" /><rect x="37" y="0" width="5" height="20" fill="#0f172a" /><rect x="44" y="0" width="1" height="20" fill="#0f172a" /><rect x="47" y="0" width="3" height="20" fill="#0f172a" /><rect x="52" y="0" width="2" height="20" fill="#0f172a" /><rect x="56" y="0" width="4" height="20" fill="#0f172a" /><rect x="62" y="0" width="1" height="20" fill="#0f172a" /><rect x="65" y="0" width="2" height="20" fill="#0f172a" /><rect x="69" y="0" width="3" height="20" fill="#0f172a" /><rect x="74" y="0" width="1" height="20" fill="#0f172a" /><rect x="77" y="0" width="2" height="20" fill="#0f172a" /><rect x="81" y="0" width="5" height="20" fill="#0f172a" /><rect x="88" y="0" width="1" height="20" fill="#0f172a" /><rect x="91" y="0" width="3" height="20" fill="#0f172a" /><rect x="96" y="0" width="2" height="20" fill="#0f172a" /></svg>
                      <div className="id-card-barcode-text">*{emp.id}*</div>
                    </div>
                  </div>
                  <div className="id-card-back-qr">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(JSON.stringify({ employeeId: emp.id, companyId: emp.companyId || 'COMP-A' }))}`} alt="QR Code" width="95" height="95" className="id-card-qr-img" style={{ display: 'block', borderRadius: '4px' }} />
                    <span className="id-qr-label">SCAN ME</span>
                  </div>
                </div>
                <div className="id-card-back-signature-area">
                  <div className="id-signature-font">{emp.reportingManager || emp.teamLeader || 'Authorized Signatory'}</div>
                  <div className="id-signature-line"></div>
                  <div className="id-signature-label">Authorized Signatory</div>
                </div>
              </div>
            </div>
            <button className="id-card-download-btn" onClick={downloadIdCard}><Download size={16} /> Download ID Card</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeProfile;
