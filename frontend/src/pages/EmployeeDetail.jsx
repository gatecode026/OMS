import React, { useState, useMemo } from 'react';
import './EmployeeDetail.css';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Avatar from '../components/common/Avatar';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import {
  ArrowLeft, Edit2, Trash2, User, Briefcase, Calendar, Phone, Mail,
  MapPin, Shield, FileText, Activity, CheckSquare, BarChart2, Download,
  Upload, Copy, ChevronDown, ChevronUp, Clock, Star, Trophy, AlertTriangle,
  TrendingUp, CheckCircle, XCircle, File, Image, FileMinus
} from 'lucide-react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtDate = (str) => {
  if (!str) return '—';
  const d = new Date(str);
  return `${String(d.getDate()).padStart(2,'0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
const fmtTime = (t) => t || '—';

const TABS = [
  { id: 'personal', label: 'Personal Info', icon: User },
  { id: 'professional', label: 'Professional', icon: Briefcase },
  { id: 'attendance', label: 'Attendance', icon: Calendar },
  { id: 'leaves', label: 'Leave History', icon: Clock },
  { id: 'reports', label: 'Work Reports', icon: FileText },
  { id: 'tasks', label: 'Task History', icon: CheckSquare },
  { id: 'performance', label: 'Performance', icon: BarChart2 },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'logs', label: 'Activity Logs', icon: Activity },
];

// ── Status Badge helpers ─────────────────────────────────────────────────────
const taskStatusClass = (s) => {
  const m = { 'Done': 'ts-done', 'In Progress': 'ts-inprog', 'To Do': 'ts-todo', 'Overdue': 'ts-overdue', 'In Review': 'ts-review', 'Cancelled': 'ts-cancelled' };
  return m[s] || 'ts-todo';
};
const leaveStatusClass = (s) => ({ 'Approved': 'ls-approved', 'Rejected': 'ls-rejected', 'Pending': 'ls-pending' }[s] || 'ls-pending');
const attDayClass = (s) => ({ 'Present': 'day-present', 'Absent': 'day-absent', 'Late': 'day-late', 'On Leave': 'day-leave', 'Work From Home': 'day-wfh' }[s] || '');

// ── Mini SVG Line Chart ──────────────────────────────────────────────────────
const LineChart = ({ data, label }) => {
  const min = Math.min(...data) - 5;
  const max = Math.max(...data) + 5;
  const range = max - min || 1;
  const w = 320, h = 90;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * (w - 32) + 16,
    y: h - ((v - min) / range) * (h - 24) - 8
  }));
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const months = ['Dec','Jan','Feb','Mar','Apr','May'];
  return (
    <svg viewBox={`0 0 ${w} ${h + 20}`} className="perf-chart-svg">
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d946ef" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#d946ef" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
        <line key={i} x1="16" x2={w - 16} y1={h - (pct * (h - 24)) - 8} y2={h - (pct * (h - 24)) - 8}
          stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      ))}
      {/* Fill area */}
      <path d={`${pathD} L ${pts[pts.length - 1].x} ${h - 8} L ${pts[0].x} ${h - 8} Z`}
        fill="url(#lineGrad)" />
      {/* Line */}
      <path d={pathD} fill="none" stroke="#d946ef" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots */}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="#d946ef" />
          <circle cx={p.x} cy={p.y} r="2" fill="white" />
          <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.5)">{data[i]}</text>
        </g>
      ))}
      {/* Month labels */}
      {months.map((m, i) => (
        <text key={m} x={(i / (months.length - 1)) * (w - 32) + 16} y={h + 16}
          textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.35)">{m}</text>
      ))}
    </svg>
  );
};

// ── Attendance Calendar ──────────────────────────────────────────────────────
const AttendanceCalendar = ({ history }) => {
  const [month, setMonth] = useState(4); // May (0-indexed)
  const year = 2026;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayMap = {};
  history.forEach(r => {
    const d = new Date(r.date);
    if (d.getMonth() === month && d.getFullYear() === year) {
      dayMap[d.getDate()] = r.status;
    }
  });
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);

  const today = new Date();
  return (
    <div className="att-calendar">
      <div className="cal-nav">
        <button onClick={() => setMonth(m => Math.max(0, m - 1))}>‹</button>
        <span>{MONTHS[month]} {year}</span>
        <button onClick={() => setMonth(m => Math.min(11, m + 1))}>›</button>
      </div>
      <div className="cal-weekdays">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d} className="cal-wday">{d}</div>)}
      </div>
      <div className="cal-grid">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const status = dayMap[day];
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          return (
            <div key={day} className={`cal-day ${status ? attDayClass(status) : ''} ${isToday ? 'cal-today' : ''}`} title={status || ''}>
              {day}
            </div>
          );
        })}
      </div>
      <div className="cal-legend">
        {[['Present','day-present'],['Absent','day-absent'],['Late','day-late'],['On Leave','day-leave'],['WFH','day-wfh']].map(([l, c]) => (
          <span key={l} className="legend-item"><span className={`legend-dot ${c}`}></span>{l}</span>
        ))}
      </div>
    </div>
  );
};

// ── EmployeeDetail Page ──────────────────────────────────────────────────────
const EmployeeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { employees, showConfirm, deactivateEmployee, addToast, updateEmployee } = useApp();

  const emp = useMemo(() => employees.find(e => e.id === id), [employees, id]);

  const [activeTab, setActiveTab] = useState('personal');
  const [expandedReport, setExpandedReport] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});

  if (!emp) return (
    <div className="ed-not-found">
      <p>Employee not found.</p>
      <Button variant="secondary" onClick={() => navigate('/employees')} icon={ArrowLeft}>Back to Directory</Button>
    </div>
  );

  const perf = emp.performanceScore || { overall: 78, attendance: 82, taskCompletion: 75, reportSubmission: 80, leaveDiscipline: 73, monthly: [70,73,76,78,80,78] };
  const attHistory = emp.attendanceHistory || [];
  const leaveHistory = emp.leaveHistory || [];
  const taskHistory = emp.taskHistory || [];
  const documents = emp.documents || [];
  const activityLog = emp.activityLog || [];

  const presentDays = attHistory.filter(r => r.status === 'Present').length;
  const absentDays = attHistory.filter(r => r.status === 'Absent').length;
  const lateDays = attHistory.filter(r => r.status === 'Late').length;
  const leaveDays = attHistory.filter(r => r.status === 'On Leave').length;

  const handleDelete = () => {
    showConfirm('Deactivate Employee', `Are you sure you want to deactivate ${emp.name}?`, () => {
      deactivateEmployee(emp.id);
      navigate('/employees');
    }, 'danger');
  };

  const SegmentBar = ({ att, task, report, leave }) => {
    return (
      <div className="segment-bar-wrapper">
        <div className="segment-bar">
          <div className="seg att-seg" style={{ width: `${att * 0.3}%` }} title={`Attendance: ${att}% (30%)`} />
          <div className="seg task-seg" style={{ width: `${task * 0.35}%` }} title={`Tasks: ${task}% (35%)`} />
          <div className="seg report-seg" style={{ width: `${report * 0.2}%` }} title={`Reports: ${report}% (20%)`} />
          <div className="seg leave-seg" style={{ width: `${leave * 0.15}%` }} title={`Leave: ${leave}% (15%)`} />
        </div>
        <div className="seg-labels">
          <span className="seg-label att-lbl">Attendance 30%</span>
          <span className="seg-label task-lbl">Tasks 35%</span>
          <span className="seg-label report-lbl">Reports 20%</span>
          <span className="seg-label leave-lbl">Leave Discipline 15%</span>
        </div>
      </div>
    );
  };

  return (
    <div className="employee-detail-page">
      {/* ── Header ── */}
      <div className="ed-header-bar">
        <button className="ed-back-btn" onClick={() => navigate('/employees')}>
          <ArrowLeft size={16} /> Back to Directory
        </button>
      </div>

      <div className="card ed-profile-card">
        <div className="ed-profile-left">
          <Avatar name={emp.name} size="xl" />
          <div className="ed-profile-info">
            <h1 className="ed-name">{emp.name}</h1>
            <p className="ed-designation">{emp.designation || emp.role}</p>
            <div className="ed-badges">
              <span className="preview-dept-badge">{emp.department}</span>
              <span className="preview-branch-badge">{emp.branch}</span>
              <span className={`acc-badge ${emp.accountStatus === 'Active' ? 'acc-active' : emp.accountStatus === 'Disabled' ? 'acc-disabled' : 'acc-suspended'}`}>
                {emp.accountStatus || 'Active'}
              </span>
            </div>
          </div>
        </div>
        <div className="ed-profile-actions">
          <Button variant="primary" icon={Edit2} onClick={() => navigate('/employees')}>Edit Profile</Button>
          <Button variant="secondary" icon={CheckSquare} onClick={() => navigate('/tasks')}>Assign Task</Button>
          <Button variant="secondary" icon={FileText} onClick={() => navigate('/work-reports')}>View Reports</Button>
          <Button variant="ghost" icon={Trash2} onClick={handleDelete}>Delete</Button>
        </div>
      </div>

      {/* ── Tab Strip ── */}
      <div className="ed-tabs-strip">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} className={`ed-tab-btn${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}>
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ── */}
      <div className="card ed-tab-content">

        {/* ── Personal Info ── */}
        {activeTab === 'personal' && (
          <div className="ed-tab-body">
            <div className="ed-section-title-row">
              <h3>Personal Information</h3>
            </div>
            <div className="ed-fields-grid">
              {[
                ['Full Name', emp.name], ['Date of Birth', fmtDate(emp.dob)],
                ['Gender', emp.gender], ['Nationality', emp.nationality || '—'],
                ['Personal Email', emp.personalEmail || '—'], ['Phone Number', emp.phone],
                ['Emergency Contact', emp.emergencyContactName || '—'], ['Emergency Phone', emp.emergencyContactPhone || '—'],
              ].map(([label, val]) => (
                <div key={label} className="ed-field-card">
                  <span className="ed-field-label">{label}</span>
                  <span className="ed-field-value">{val}</span>
                </div>
              ))}
              <div className="ed-field-card ed-field-full">
                <span className="ed-field-label">Current Address</span>
                <span className="ed-field-value">{emp.currentAddress || emp.homeAddress || '—'}</span>
              </div>
              <div className="ed-field-card ed-field-full">
                <span className="ed-field-label">Permanent Address</span>
                <span className="ed-field-value">{emp.permanentAddress || emp.homeAddress || '—'}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Professional Info ── */}
        {activeTab === 'professional' && (
          <div className="ed-tab-body">
            <div className="ed-section-title-row"><h3>Professional Information</h3></div>
            <div className="ed-fields-grid">
              {[
                ['Employee ID', emp.id], ['Designation', emp.designation || emp.role],
                ['Department', emp.department], ['Branch', emp.branch],
                ['Team', emp.team || '—'], ['Team Leader', emp.teamLeader || '—'],
                ['Project Manager', emp.projectManager || '—'], ['Joining Date', fmtDate(emp.joinDate)],
                ['Employment Type', emp.employmentType || 'Full-Time'], ['Work Location', emp.workLocation || emp.branch],
              ].map(([label, val]) => (
                <div key={label} className="ed-field-card">
                  <span className="ed-field-label">{label}</span>
                  <span className="ed-field-value">{val}</span>
                </div>
              ))}
            </div>
            {/* Org Node */}
            <div className="org-node-wrapper">
              <div className="org-node-box manager-node">
                <span className="org-role">Reports To</span>
                <span className="org-name">{emp.teamLeader || 'Aarav Sharma'}</span>
              </div>
              <div className="org-connector"></div>
              <div className="org-node-box self-node">
                <span className="org-role">{emp.designation || emp.role}</span>
                <span className="org-name">{emp.name}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Attendance History ── */}
        {activeTab === 'attendance' && (
          <div className="ed-tab-body">
            <div className="ed-section-title-row"><h3>Attendance History</h3></div>
            <AttendanceCalendar history={attHistory} />
            <div className="att-summary-cards">
              {[
                { label: 'Present Days', val: presentDays, cls: 'att-sum-green' },
                { label: 'Absent Days', val: absentDays, cls: 'att-sum-red' },
                { label: 'Late Days', val: lateDays, cls: 'att-sum-amber' },
                { label: 'Leave Days', val: leaveDays, cls: 'att-sum-purple' },
              ].map(c => (
                <div key={c.label} className={`att-sum-card ${c.cls}`}>
                  <span className="att-sum-val">{c.val}</span>
                  <span className="att-sum-label">{c.label}</span>
                </div>
              ))}
            </div>
            <div className="punch-table-wrapper">
              <table className="ed-table">
                <thead><tr><th>Date</th><th>Punch In</th><th>Punch Out</th><th>Hours</th><th>Status</th></tr></thead>
                <tbody>
                  {attHistory.slice(0, 15).map((r, i) => (
                    <tr key={i}>
                      <td>{fmtDate(r.date)}</td>
                      <td>{fmtTime(r.punchIn)}</td>
                      <td>{fmtTime(r.punchOut)}</td>
                      <td>{r.totalHours ? `${r.totalHours}h` : '—'}</td>
                      <td><span className={`att-badge ${attDayClass(r.status)}`}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Leave History ── */}
        {activeTab === 'leaves' && (
          <div className="ed-tab-body">
            <div className="ed-section-title-row"><h3>Leave History</h3></div>
            <div className="leave-balance-strip">
              {[['Casual Leave', 12, leaveHistory.filter(l => l.type === 'Casual Leave').length],
                ['Sick Leave', 10, leaveHistory.filter(l => l.type === 'Sick Leave').length],
                ['Annual Leave', 20, leaveHistory.filter(l => l.type === 'Annual Leave').length],
              ].map(([type, allowed, taken]) => (
                <div key={type} className="leave-bal-card">
                  <div className="lbc-type">{type}</div>
                  <div className="lbc-stats">
                    <span><strong>{allowed}</strong> allowed</span>
                    <span className="lbc-taken"><strong>{taken}</strong> taken</span>
                    <span className="lbc-rem"><strong>{Math.max(0, allowed - taken)}</strong> left</span>
                  </div>
                </div>
              ))}
            </div>
            <table className="ed-table" style={{ marginTop: 16 }}>
              <thead><tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th><th>Approved By</th></tr></thead>
              <tbody>
                {leaveHistory.map((l, i) => (
                  <tr key={i}>
                    <td>{l.type}</td>
                    <td>{fmtDate(l.fromDate)}</td>
                    <td>{fmtDate(l.toDate)}</td>
                    <td>{l.days}</td>
                    <td className="td-reason" title={l.reason}>{l.reason?.slice(0, 30)}{l.reason?.length > 30 ? '…' : ''}</td>
                    <td><span className={`leave-badge ${leaveStatusClass(l.status)}`}>{l.status}</span></td>
                    <td>{l.approvedBy || '—'}</td>
                  </tr>
                ))}
                {leaveHistory.length === 0 && <tr><td colSpan={7} className="td-empty">No leave records found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Daily Work Reports ── */}
        {activeTab === 'reports' && (
          <div className="ed-tab-body">
            <div className="ed-section-title-row"><h3>Daily Work Reports</h3></div>
            <div className="reports-list">
              {[
                { date: '2026-05-28', summary: 'Completed UI review and API integration tests.', status: 'Acknowledged', tasks: ['API integration testing for module A', 'UI review for dashboard changes'], hours: '8.5h', blockers: 'None', plan: 'Deploy to staging tomorrow morning.' },
                { date: '2026-05-27', summary: 'Fixed critical bug in auth flow and reviewed PRs.', status: 'Pending Review', tasks: ['Fixed auth bug #334', 'Reviewed 3 pull requests'], hours: '9h', blockers: 'Waiting for DB migration sign-off.', plan: 'Continue with API integration.' },
                { date: '2026-05-26', summary: 'Team standup, sprint planning, and documentation.', status: 'Flagged', tasks: ['Sprint planning session', 'Updated technical docs'], hours: '7.5h', blockers: 'Dependency on external API delayed.', plan: 'Pick up blocked tasks.' },
              ].map((r, i) => {
                const expanded = expandedReport === i;
                return (
                  <div key={i} className={`report-card ${expanded ? 'report-expanded' : ''}`}>
                    <div className="report-card-header" onClick={() => setExpandedReport(expanded ? null : i)}>
                      <div className="report-card-left">
                        <span className="report-date">{fmtDate(r.date)}</span>
                        <span className="report-summary">{r.summary}</span>
                      </div>
                      <div className="report-card-right">
                        <span className={`rpt-status ${r.status === 'Acknowledged' ? 'rpt-ack' : r.status === 'Flagged' ? 'rpt-flag' : 'rpt-pending'}`}>{r.status}</span>
                        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>
                    </div>
                    {expanded && (
                      <div className="report-card-body">
                        <div className="report-section"><strong>Tasks Worked On:</strong><ul>{r.tasks.map((t, j) => <li key={j}>{t}</li>)}</ul></div>
                        <div className="report-row"><span className="report-label">Total Hours:</span><span>{r.hours}</span></div>
                        <div className="report-row"><span className="report-label">Blockers:</span><span>{r.blockers}</span></div>
                        <div className="report-row"><span className="report-label">Next Day Plan:</span><span>{r.plan}</span></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Task History ── */}
        {activeTab === 'tasks' && (
          <div className="ed-tab-body">
            <div className="ed-section-title-row"><h3>Task History</h3></div>
            <table className="ed-table">
              <thead><tr><th>Task Title</th><th>Project</th><th>Assigned</th><th>Due</th><th>Completed</th><th>Priority</th><th>Status</th></tr></thead>
              <tbody>
                {taskHistory.map((t, i) => (
                  <tr key={i}>
                    <td className="td-bold">{t.title}</td>
                    <td>{t.project}</td>
                    <td>{fmtDate(t.assignedDate)}</td>
                    <td>{fmtDate(t.dueDate)}</td>
                    <td>{t.completionDate ? fmtDate(t.completionDate) : <span className="text-muted">—</span>}</td>
                    <td><span className={`priority-badge p-${(t.priority || 'Medium').toLowerCase()}`}>{t.priority}</span></td>
                    <td><span className={`task-status-badge ${taskStatusClass(t.status)}`}>{t.status}</span></td>
                  </tr>
                ))}
                {taskHistory.length === 0 && <tr><td colSpan={7} className="td-empty">No task records.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Performance ── */}
        {activeTab === 'performance' && (
          <div className="ed-tab-body">
            <div className="ed-section-title-row"><h3>Performance Reports</h3></div>
            {/* Score Card */}
            <div className="perf-score-card">
              <div className="perf-score-main">
                <span className="perf-score-number">{perf.overall}</span>
                <span className="perf-score-denom">/100</span>
              </div>
              <div className="perf-score-label">Overall Performance Score</div>
              <SegmentBar att={perf.attendance} task={perf.taskCompletion} report={perf.reportSubmission} leave={perf.leaveDiscipline} />
            </div>

            {/* Comparison Row */}
            <div className="perf-compare-row">
              <div className="perf-mini-stat">
                <span className="pms-label">This Employee</span>
                <span className="pms-val primary-val">{perf.overall}</span>
              </div>
              <div className="perf-mini-stat">
                <span className="pms-label">Team Average</span>
                <span className="pms-val">{Math.round(perf.overall * 0.94)}</span>
              </div>
              <div className="perf-mini-stat">
                <span className="pms-label">Dept Average</span>
                <span className="pms-val">{Math.round(perf.overall * 0.92)}</span>
              </div>
            </div>

            {/* Trend Chart */}
            <div className="perf-chart-card">
              <div className="perf-chart-title">6-Month Performance Trend</div>
              <LineChart data={perf.monthly} />
            </div>

            {/* Dimension Breakdown */}
            <div className="perf-dimensions">
              {[
                { label: 'Attendance', val: perf.attendance, color: '#22c55e' },
                { label: 'Task Completion', val: perf.taskCompletion, color: '#3b82f6' },
                { label: 'Report Submission', val: perf.reportSubmission, color: '#a855f7' },
                { label: 'Leave Discipline', val: perf.leaveDiscipline, color: '#f59e0b' },
              ].map(d => (
                <div key={d.label} className="perf-dim-row">
                  <span className="perf-dim-label">{d.label}</span>
                  <div className="perf-dim-bar-track">
                    <div className="perf-dim-bar-fill" style={{ width: `${d.val}%`, background: d.color }} />
                  </div>
                  <span className="perf-dim-val" style={{ color: d.color }}>{d.val}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Documents ── */}
        {activeTab === 'documents' && (
          <div className="ed-tab-body">
            <div className="ed-section-title-row">
              <h3>Uploaded Documents</h3>
              <button className="upload-doc-btn" onClick={() => addToast('info', 'Upload modal coming soon.')}>
                <Upload size={14} /> Upload Document
              </button>
            </div>
            <div className="doc-cards-grid">
              {documents.map((doc, i) => (
                <div key={i} className="doc-card">
                  <div className={`doc-file-icon ${doc.fileType === 'pdf' ? 'doc-pdf' : 'doc-img'}`}>
                    <FileText size={28} />
                  </div>
                  <div className="doc-info">
                    <span className="doc-category">{doc.category}</span>
                    <span className="doc-filename">{doc.fileName}</span>
                    <span className="doc-date">{fmtDate(doc.uploadDate)}</span>
                  </div>
                  <div className="doc-actions">
                    <button className="doc-action-btn" title="Download" onClick={() => addToast('success', `Downloading ${doc.fileName}`)}>
                      <Download size={14} />
                    </button>
                    <button className="doc-action-btn doc-delete-btn" title="Delete" onClick={() => addToast('warning', 'Document removed.')}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {documents.length === 0 && <p className="text-muted">No documents uploaded.</p>}
            </div>
          </div>
        )}

        {/* ── Activity Logs ── */}
        {activeTab === 'logs' && (
          <div className="ed-tab-body">
            <div className="ed-section-title-row"><h3>Activity Logs</h3></div>
            <table className="ed-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Field Changed</th>
                  <th>Old Value</th>
                  <th>New Value</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {activityLog.map((log, i) => (
                  <tr key={i}>
                    <td className="td-mono td-sm">{log.timestamp}</td>
                    <td>{log.actor}</td>
                    <td><span className={`action-type-badge at-${(log.actionType || '').toLowerCase().replace(/ /g, '-')}`}>{log.actionType}</span></td>
                    <td>{log.fieldChanged}</td>
                    <td className="td-old-val">{log.oldValue}</td>
                    <td className="td-new-val">{log.newValue}</td>
                    <td className="td-mono td-sm td-ip">{log.ip}</td>
                  </tr>
                ))}
                {activityLog.length === 0 && <tr><td colSpan={7} className="td-empty">No activity logs.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
};

export default EmployeeDetail;
