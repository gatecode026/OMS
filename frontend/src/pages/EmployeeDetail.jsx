import { useState, useMemo, useRef } from 'react';
import './EmployeeDetail.css';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Avatar from '../components/common/Avatar';
import Button from '../components/common/Button';
import {
  ArrowLeft, Edit2, Trash2, User, Briefcase, Calendar, Shield,
  FileText, Activity, CheckSquare, BarChart2, Download, Upload,
  ChevronDown, ChevronUp, Clock, TrendingUp, CheckCircle,
  Building2, Lock
} from 'lucide-react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtDate = (str) => {
  if (!str) return '—';
  const d = new Date(str);
  return `${String(d.getDate()).padStart(2,'0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
const fmtTime = (t) => t || '—';

const fmtDob = (dateStr) => {
  if (!dateStr) return '15/08/1996';
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
};

const calculateExpiry = (dateStr) => {
  if (!dateStr) return '31 Dec 2031';
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + 5);
  return fmtDate(d.toISOString());
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

const getBranchAddress = (branchName) => {
  const name = (branchName || '').toLowerCase().trim();
  if (name.includes('delhi')) return 'Connaught Place, New Delhi - 110001';
  if (name.includes('mumbai')) return 'Bandra Kurla Complex, Mumbai - 400051';
  if (name.includes('bangalore') || name.includes('bengaluru')) return 'MG Road, Bangalore - 560001';
  return 'Malviya Nagar, Jaipur, Rajasthan 302017';
};

const TABS = [
  { id: 'personal', label: 'Personal Info', icon: User },
  { id: 'professional', label: 'Professional', icon: Briefcase },
  { id: 'workplace', label: 'Workplace', icon: Building2 },
  { id: 'attendance', label: 'Attendance', icon: Calendar },
  { id: 'leaves', label: 'Leave History', icon: Clock },
  { id: 'reports', label: 'Work Reports', icon: FileText },
  { id: 'tasks', label: 'Task History', icon: CheckSquare },
  { id: 'performance', label: 'Performance', icon: BarChart2 },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'permissions', label: 'Permissions', icon: Shield },
  { id: 'security', label: 'Security Info', icon: Lock },
  { id: 'payroll', label: 'Payroll Summary', icon: TrendingUp },
  { id: 'logs', label: 'Activity Logs', icon: Activity },
];

// ── Status Badge helpers ─────────────────────────────────────────────────────
const taskStatusClass = (s) => {
  const m = { 'Done': 'ts-done', 'In Progress': 'ts-inprog', 'To Do': 'ts-todo', 'Overdue': 'ts-overdue', 'In Review': 'ts-review', 'Cancelled': 'ts-cancelled' };
  return m[s] || 'ts-todo';
};
const leaveStatusClass = (s) => ({ 'Approved': 'ls-approved', 'Rejected': 'ls-rejected', 'Pending': 'ls-pending' }[s] || 'ls-pending');
const attDayClass = (s) => {
  if (!s) return '';
  if (s === 'Present') return 'day-present';
  if (s === 'Absent') return 'day-absent';
  if (s === 'Late') return 'day-late';
  if (s === 'Work From Home') return 'day-wfh';
  if (s === 'On Leave' || s === 'Leave' || s.includes('Leave')) return 'day-leave';
  return '';
};

// ── Mini SVG Line Chart ──────────────────────────────────────────────────────
const LineChart = ({ data }) => {
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
      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
        <line key={i} x1="16" x2={w - 16} y1={h - (pct * (h - 24)) - 8} y2={h - (pct * (h - 24)) - 8}
          stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      ))}
      <path d={`${pathD} L ${pts[pts.length - 1].x} ${h - 8} L ${pts[0].x} ${h - 8} Z`}
        fill="url(#lineGrad)" />
      <path d={pathD} fill="none" stroke="#d946ef" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="#d946ef" />
          <circle cx={p.x} cy={p.y} r="2" fill="white" />
          <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.5)">{data[i]}</text>
        </g>
      ))}
      {months.map((m, i) => (
        <text key={m} x={(i / (months.length - 1)) * (w - 32) + 16} y={h + 16}
          textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.35)">{m}</text>
      ))}
    </svg>
  );
};

// ─── Attendance Calendar ──────────────────────────────────────────────────────
const AttendanceCalendar = ({ history, leaveHistory = [] }) => {
  const [month, setMonth] = useState(4);
  const year = 2026;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayMap = {};
  history.forEach(r => {
    const d = new Date(r.date);
    if (d.getMonth() === month && d.getFullYear() === year) {
      let status = r.status;
      if (status === 'On Leave' || status === 'Leave') {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const foundLeave = leaveHistory.find(l => 
          l.status === 'Approved' && 
          dateStr >= l.fromDate && 
          dateStr <= l.toDate
        );
        status = foundLeave ? foundLeave.type : 'On Leave';
      }
      dayMap[d.getDate()] = status;
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

// ─── Segment Bar Chart for Performance ───────────────────────────────────────
const SegmentBar = ({ att, task, report, leave }) => (
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

const EmployeeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { employees, showConfirm, deactivateEmployee, activateEmployee, addToast, updateEmployee } = useApp();

  const emp = useMemo(() => employees.find(e => e.id === id), [employees, id]);

  const activeTab = new URLSearchParams(location.search).get('tab') || 'personal';

  const [expandedReport, setExpandedReport] = useState(null);
  const [showIdCard, setShowIdCard] = useState(false);
  const idCardRef = useRef(null);
  
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
  
  const handleActivate = () => {
    showConfirm('Activate Employee', `Are you sure you want to activate ${emp.name}?`, () => {
      activateEmployee(emp.id);
    }, 'primary');
  };

  const handleApproveLeave = (leaveId) => {
    const updatedHistory = leaveHistory.map(l => {
      if (l.id === leaveId) {
        return { ...l, status: 'Approved', approvedBy: 'Aarav Sharma (Manager)', approvedDate: new Date().toISOString().split('T')[0] };
      }
      return l;
    });
    updateEmployee(emp.id, { leaveHistory: updatedHistory });
    addToast('success', 'Leave request approved successfully.');
  };

  const handleRejectLeave = (leaveId) => {
    const updatedHistory = leaveHistory.map(l => {
      if (l.id === leaveId) {
        return { ...l, status: 'Rejected', approvedBy: 'Aarav Sharma (Manager)', approvedDate: new Date().toISOString().split('T')[0] };
      }
      return l;
    });
    updateEmployee(emp.id, { leaveHistory: updatedHistory });
    addToast('warning', 'Leave request rejected.');
  };

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
      addToast('error', 'Failed to download ID card.');
    }
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
          <Button variant="primary" icon={Edit2} onClick={() => navigate(`/employees?edit=${emp.id}`)}>Edit Profile</Button>
          <Button variant="secondary" icon={CheckSquare} onClick={() => navigate('/tasks')}>Assign Task</Button>
          <Button variant="secondary" icon={Download} onClick={() => setShowIdCard(true)}>ID Card</Button>
          <Button variant="secondary" icon={FileText} onClick={() => navigate('/work-reports')}>View Reports</Button>
          {emp.status === 'Inactive' ? (
            <Button variant="success" icon={CheckCircle} onClick={handleActivate}>Activate</Button>
          ) : (
            <Button variant="ghost" icon={Trash2} onClick={handleDelete}>Delete</Button>
          )}
        </div>
      </div>

      {/* ── Tab Strip ── */}
      <div className="ed-tabs-strip">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} className={`ed-tab-btn${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => navigate(`?tab=${tab.id}`, { replace: true })}>
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ── */}
      <div className="card ed-tab-content">

        {/* ── Personal Info with ALL missing fields ── */}
        {activeTab === 'personal' && (
          <div className="ed-tab-body">
            <div className="ed-section-title-row"><h3>Personal Information</h3></div>
            <div className="ed-fields-grid">
              {[
                ['Full Name', `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.name],
                ['First Name', emp.firstName || emp.name?.split(' ')[0] || '—'],
                ['Last Name', emp.lastName || emp.name?.split(' ').slice(1).join(' ') || '—'],
                ['Date of Birth', fmtDate(emp.dob)],
                ['Gender', emp.gender || '—'],
                ['Blood Group', emp.bloodGroup || '—'],
                ['Marital Status', emp.maritalStatus || '—'],
                ['Personal Email', emp.personalEmail || '—'],
                ['Official Email', emp.workEmail || emp.email || '—'],
                ['Phone Number', emp.phone || '—'],
                ['Alternate Phone', emp.alternatePhone || '—'],
              ].map(([label, val]) => (
                <div key={label} className="ed-field-card">
                  <span className="ed-field-label">{label}</span>
                  <span className="ed-field-value">{val || '—'}</span>
                </div>
              ))}
            </div>

            {/* Address Section */}
            <div className="ed-section-title-row" style={{ marginTop: 'var(--spacing-4)' }}><h3>Address Details</h3></div>
            <div className="ed-fields-grid">
              {[
                ['City', emp.city || '—'],
                ['State', emp.state || '—'],
                ['Country', emp.country || 'India'],
                ['ZIP / Postal Code', emp.zipCode || '—'],
              ].map(([label, val]) => (
                <div key={label} className="ed-field-card">
                  <span className="ed-field-label">{label}</span>
                  <span className="ed-field-value">{val || '—'}</span>
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

            {/* Emergency Contact Section */}
            <div className="ed-section-title-row" style={{ marginTop: 'var(--spacing-4)' }}><h3>Emergency Contact</h3></div>
            <div className="ed-fields-grid">
              {[
                ['Contact Name', emp.emergencyContactName || '—'],
                ['Phone Number', emp.emergencyContactPhone || '—'],
                ['Alternate Phone', emp.emergencyContactPhoneAlt || '—'],
                ['Relation', emp.emergencyContactRelation || '—'],
                ['Address', emp.emergencyContactAddress || '—'],
              ].map(([label, val]) => (
                <div key={label} className="ed-field-card">
                  <span className="ed-field-label">{label}</span>
                  <span className="ed-field-value">{val || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Professional Info with ALL missing fields ── */}
        {activeTab === 'professional' && (
          <div className="ed-tab-body">
            <div className="ed-section-title-row"><h3>Professional Information</h3></div>
            <div className="ed-fields-grid">
              {[
                ['Employee ID', emp.id],
                ['Employee Type', emp.employeeType || 'Full Time'],
                ['Employment Status', emp.employmentStatus || 'Active'],
                ['Designation', emp.designation || emp.role],
                ['Department', emp.department],
                ['Branch / Agency', emp.branch],
                ['Branch Address', emp.branchAddress || getBranchAddress(emp.branch)],
                ['Team', emp.team || emp.teamName || '—'],
                ['Team Leader', emp.teamLeader || '—'],
                ['Project Manager', emp.projectManager || '—'],
                ['Joining Date', fmtDate(emp.joinDate)],
                ['Probation End Date', emp.probationEndDate ? fmtDate(emp.probationEndDate) : '—'],
                ['Contract End Date', emp.contractEndDate ? fmtDate(emp.contractEndDate) : '—'],
                ['Work Location', emp.workLocation || emp.branch || '—'],
                ['Reporting Manager', emp.reportingManager || emp.teamLeader || '—'],
                ['Company Name', emp.companyName || 'OM Enterprise'],
              ].map(([label, val]) => (
                <div key={label} className="ed-field-card">
                  <span className="ed-field-label">{label}</span>
                  <span className="ed-field-value">{val || '—'}</span>
                </div>
              ))}
            </div>
            
            {/* Bank Details Section */}
            <div className="ed-section-title-row" style={{ marginTop: 'var(--spacing-5)' }}><h3>Bank Details</h3></div>
            <div className="ed-fields-grid">
              {[
                ['Bank Name', emp.bankName || '—'],
                ['Account Number', emp.bankAccountNumber || '—'],
                ['IFSC Code', emp.bankIfscCode || '—'],
                ['UPI ID', emp.bankUpiId || '—'],
              ].map(([label, val]) => (
                <div key={label} className="ed-field-card">
                  <span className="ed-field-label">{label}</span>
                  <span className="ed-field-value">{val || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Workplace Tab (NEW) ── */}
        {activeTab === 'workplace' && (
          <div className="ed-tab-body">
            <div className="ed-section-title-row"><h3>Workplace Configuration</h3></div>
            
            {/* Work Mode */}
            <div className="workplace-section">
              <h4>Work Mode</h4>
              <div className="ed-fields-grid">
                {[
                  ['Work Mode', emp.workMode || 'Work From Office'],
                  ['Work Location', emp.workLocation || emp.branch || '—'],
                  ['Reporting Manager', emp.reportingManager || emp.teamLeader || '—'],
                ].map(([label, val]) => (
                  <div key={label} className="ed-field-card">
                    <span className="ed-field-label">{label}</span>
                    <span className="ed-field-value">{val || '—'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Shift Configuration */}
            <div className="workplace-section">
              <h4>Shift Configuration</h4>
              <div className="ed-fields-grid">
                {[
                  ['Shift Type', emp.shiftType || emp.shift || 'Morning Shift'],
                  ['Shift Timing', emp.shiftTiming || '09:00 AM - 06:00 PM'],
                  ['Punch In Time', emp.punchInTime || '09:00 AM'],
                  ['Punch Out Time', emp.punchOutTime || '06:00 PM'],
                  ['Attendance Rule', emp.attendanceRule || 'Standard 9-6'],
                  ['Weekly Off Days', emp.weeklyOffDays?.length ? emp.weeklyOffDays.join(', ') : 'Sunday'],
                  ['Overtime Eligibility', emp.overtimeEligibility ? '✅ Enabled' : '❌ Disabled'],
                ].map(([label, val]) => (
                  <div key={label} className="ed-field-card">
                    <span className="ed-field-label">{label}</span>
                    <span className="ed-field-value">{val || '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Attendance History ── */}
        {activeTab === 'attendance' && (
          <div className="ed-tab-body">
            <div className="ed-section-title-row"><h3>Attendance History</h3></div>
            <AttendanceCalendar history={attHistory} leaveHistory={leaveHistory} />
            <div className="att-summary-cards">
              {[
                { label: 'Present Days', val: presentDays, cls: 'att-sum-green' },
                { label: 'Absent Days', val: absentDays, cls: 'att-sum-red' },
                { label: 'Late Days', val: lateDays, cls: 'att-sum-amber' },
                { label: 'Leave Days', val: leaveDays, cls: 'att-sum-purple' },
              ].map(c => (
                <div key={c.label} className={`att-sum-card ${c.cls}`}><span className="att-sum-val">{c.val}</span><span className="att-sum-label">{c.label}</span></div>
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
                      <td>
                        <span className={`att-badge ${attDayClass(r.status)}`}>
                          {r.status === 'On Leave' || r.status === 'Leave'
                            ? (leaveHistory.find(l => l.status === 'Approved' && r.date >= l.fromDate && r.date <= l.toDate)?.type || 'On Leave')
                            : r.status}
                        </span>
                      </td>
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
              {[
                ['Casual Leave', 12],
                ['Sick Leave', 10],
                ['Paid Leave', 20],
                ['Unpaid Leave', 30],
                ...(emp.gender === 'Female' && emp.maritalStatus === 'Married' ? [['Maternity Leave', 180]] : []),
              ].map(([type, allowed]) => {
                const taken = leaveHistory.filter(l => 
                  l.type === type || 
                  (type === 'Paid Leave' && (l.type === 'Annual Leave' || l.type === 'Paid Leave (Annual)'))
                ).length;
                return (
                  <div key={type} className="leave-bal-card" style={{ minWidth: '180px' }}>
                    <div className="lbc-type">{type}</div>
                    <div className="lbc-stats">
                      <span><strong>{allowed}</strong> allowed</span>
                      <span className="lbc-taken"><strong>{taken}</strong> taken</span>
                      <span className="lbc-rem"><strong>{Math.max(0, allowed - taken)}</strong> left</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <table className="ed-table">
              <thead><tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th><th>Actions / Approved By</th></tr></thead>
              <tbody>
                {leaveHistory.map((l, i) => (
                  <tr key={i}>
                    <td>{l.type}</td>
                    <td>{fmtDate(l.fromDate)}</td>
                    <td>{fmtDate(l.toDate)}</td>
                    <td>{l.days}</td>
                    <td className="td-reason" title={l.reason}>{l.reason?.slice(0, 30)}{l.reason?.length > 30 ? '…' : ''}</td>
                    <td><span className={`leave-badge ${leaveStatusClass(l.status)}`}>{l.status}</span></td>
                    <td>
                      {l.status === 'Pending' ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="leave-action-btn btn-approve" onClick={() => handleApproveLeave(l.id)} title="Approve">✓ Approve</button>
                          <button className="leave-action-btn btn-reject" onClick={() => handleRejectLeave(l.id)} title="Reject">✕ Reject</button>
                        </div>
                      ) : (
                        l.approvedBy || '—'
                      )}
                    </td>
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
              ].map((r, i) => {
                const expanded = expandedReport === i;
                return (
                  <div key={i} className={`report-card ${expanded ? 'report-expanded' : ''}`}>
                    <div className="report-card-header" onClick={() => setExpandedReport(expanded ? null : i)}>
                      <div className="report-card-left"><span className="report-date">{fmtDate(r.date)}</span><span className="report-summary">{r.summary}</span></div>
                      <div className="report-card-right"><span className={`rpt-status ${r.status === 'Acknowledged' ? 'rpt-ack' : 'rpt-pending'}`}>{r.status}</span>{expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</div>
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
            <div className="perf-score-card">
              <div className="perf-score-main"><span className="perf-score-number">{perf.overall}</span><span className="perf-score-denom">/100</span></div>
              <div className="perf-score-label">Overall Performance Score</div>
              <SegmentBar att={perf.attendance} task={perf.taskCompletion} report={perf.reportSubmission} leave={perf.leaveDiscipline} />
            </div>
            <div className="perf-compare-row">
              <div className="perf-mini-stat"><span className="pms-label">This Employee</span><span className="pms-val primary-val">{perf.overall}</span></div>
              <div className="perf-mini-stat"><span className="pms-label">Team Average</span><span className="pms-val">{Math.round(perf.overall * 0.94)}</span></div>
              <div className="perf-mini-stat"><span className="pms-label">Dept Average</span><span className="pms-val">{Math.round(perf.overall * 0.92)}</span></div>
            </div>
            <div className="perf-chart-card"><div className="perf-chart-title">6-Month Performance Trend</div><LineChart data={perf.monthly} /></div>
            <div className="perf-dimensions">
              {[
                { label: 'Attendance', val: perf.attendance, color: '#22c55e' },
                { label: 'Task Completion', val: perf.taskCompletion, color: '#3b82f6' },
                { label: 'Report Submission', val: perf.reportSubmission, color: '#a855f7' },
                { label: 'Leave Discipline', val: perf.leaveDiscipline, color: '#f59e0b' },
              ].map(d => (
                <div key={d.label} className="perf-dim-row">
                  <span className="perf-dim-label">{d.label}</span>
                  <div className="perf-dim-bar-track"><div className="perf-dim-bar-fill" style={{ width: `${d.val}%`, background: d.color }} /></div>
                  <span className="perf-dim-val" style={{ color: d.color }}>{d.val}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Documents ── */}
        {activeTab === 'documents' && (
          <div className="ed-tab-body">
            <div className="ed-section-title-row"><h3>Uploaded Documents</h3><button className="upload-doc-btn" onClick={() => addToast('info', 'Upload modal coming soon.')}><Upload size={14} /> Upload Document</button></div>
            <div className="doc-cards-grid">
              {documents.map((doc, i) => (
                <div key={i} className="doc-card">
                  <div className={`doc-file-icon ${doc.fileType === 'pdf' ? 'doc-pdf' : 'doc-img'}`}><FileText size={28} /></div>
                  <div className="doc-info"><span className="doc-category">{doc.category}</span><span className="doc-filename">{doc.fileName}</span><span className="doc-date">{fmtDate(doc.uploadDate)}</span></div>
                  <div className="doc-actions"><button className="doc-action-btn" onClick={() => addToast('success', `Downloading ${doc.fileName}`)}><Download size={14} /></button><button className="doc-action-btn doc-delete-btn" onClick={() => addToast('warning', 'Document removed.')}><Trash2 size={14} /></button></div>
                </div>
              ))}
              {documents.length === 0 && <p className="text-muted">No documents uploaded.</p>}
            </div>
          </div>
        )}

        {/* ── Permissions Matrix (NEW) ── */}
        {activeTab === 'permissions' && (
          <div className="ed-tab-body">
            <div className="ed-section-title-row"><h3>Permission Matrix</h3></div>
            <div className="perm-matrix-view">
              <table className="perm-view-table">
                <thead>
                  <tr>
                    <th>Module</th>
                    <th>View</th>
                    <th>Create</th>
                    <th>Edit</th>
                    <th>Delete</th>
                    <th>Approve</th>
                    <th>Export</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(emp.permissions || {
                    dashboard: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
                    employees: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
                    attendance: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
                    leaves: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
                    projects: { view: true, create: false, edit: false, delete: false, approve: false, export: false },
                    payroll: { view: false, create: false, edit: false, delete: false, approve: false, export: false }
                  }).map(([module, perms]) => (
                    <tr key={module}>
                      <td className="perm-module">{module.charAt(0).toUpperCase() + module.slice(1)}</td>
                      {['view', 'create', 'edit', 'delete', 'approve', 'export'].map(action => (
                        <td key={action} className="perm-cell">
                          {perms[action] ? '✓' : '✗'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ed-section-title-row" style={{ marginTop: 'var(--spacing-5)' }}><h3>Role Information</h3></div>
            <div className="ed-fields-grid">
              {[
                ['Role', emp.role || 'Employee'],
                ['Role ID', emp.roleId || 'employee'],
                ['Username', emp.username || emp.email?.split('@')[0] || '—'],
                ['Official Email', emp.officialEmail || emp.workEmail || emp.email || '—'],
              ].map(([label, val]) => (
                <div key={label} className="ed-field-card">
                  <span className="ed-field-label">{label}</span>
                  <span className="ed-field-value">{val || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Security Information (with missing fields) ── */}
        {activeTab === 'security' && (
          <div className="ed-tab-body">
            <div className="ed-section-title-row"><h3>Security Configuration</h3></div>
            <div className="ed-fields-grid">
              {[
                ['Two-Factor Authentication (2FA)', emp.twoFactorAuth ? '✅ Enabled' : '❌ Disabled'],
                ['Multi-Device Login', emp.multiDeviceLogin ? '✅ Allowed' : '❌ Not Allowed'],
                ['IP Restriction', emp.ipRestriction || 'Not configured (All IPs allowed)'],
                ['Login Activity Tracking', emp.loginActivityTracking || 'Enabled'],
                ['Session Timeout', emp.sessionTimeout || '30 minutes'],
              ].map(([label, val]) => (
                <div key={label} className="ed-field-card">
                  <span className="ed-field-label">{label}</span>
                  <span className="ed-field-value">{val || '—'}</span>
                </div>
              ))}
            </div>
            <div className="ed-section-title-row" style={{ marginTop: 'var(--spacing-4)' }}><h3>Recent Activity</h3></div>
            <div className="ed-fields-grid">
              {[
                ['Last Login Timestamp', emp.securityInfo?.lastLogin || emp.lastLogin || '2026-05-29 08:06:17'],
                ['Last Login Device', emp.securityInfo?.loginDevice || emp.lastLoginDevice || 'MacBook Pro (Chrome/OSX)'],
                ['Last Login Location (IP)', emp.securityInfo?.loginLocation || emp.lastLoginIp || 'Jaipur HQ (192.168.1.120)'],
                ['Failed Login Attempts', emp.securityInfo?.failedAttempts || 0],
              ].map(([label, val]) => (
                <div key={label} className="ed-field-card">
                  <span className="ed-field-label">{label}</span>
                  <span className="ed-field-value">{val || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Payroll Summary ── */}
        {activeTab === 'payroll' && (
          <div className="ed-tab-body">
            <div className="ed-section-title-row"><h3>Payroll Summary</h3></div>
            <div className="ed-fields-grid">
              {[
                ['Salary Type', emp.salaryType || 'Monthly Fixed'],
                ['Monthly Salary', `₹${(emp.monthlySalary || emp.salaryAmount || 35000).toLocaleString('en-IN')}`],
                ['Basic Salary', `₹${(emp.salaryAmount || 25000).toLocaleString('en-IN')}`],
                ['Allowances', `₹${(emp.salaryAllowances || 8000).toLocaleString('en-IN')}`],
                ['Deductions', `₹${(emp.salaryDeductions || 2000).toLocaleString('en-IN')}`],
                ['PAN Number', emp.panNumber || '—'],
                ['Aadhaar Number', emp.aadhaarNumber || '—'],
                ['Tax Details', emp.taxDetails || 'Standard deduction (Old Regime)'],
                ['Salary Dispatch Status', emp.payrollSummary?.salaryStatus || 'Dispatched'],
                ['Last Payout Date', fmtDate(emp.payrollSummary?.lastSalaryDate || '2026-05-01')],
                ['Upcoming Payout', fmtDate(emp.payrollSummary?.upcomingPayrollDate || '2026-06-01')],
              ].map(([label, val]) => (
                <div key={label} className="ed-field-card">
                  <span className="ed-field-label">{label}</span>
                  <span className="ed-field-value">{val || '—'}</span>
                </div>
              ))}
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

      {/* ── ID Card Modal ── */}
      {showIdCard && (
        <div className="id-card-overlay" onClick={() => setShowIdCard(false)}>
          <div className="id-card-modal" onClick={e => e.stopPropagation()}>
            <button className="id-card-close" onClick={() => setShowIdCard(false)}>✕</button>
            <div className="id-card-render-wrapper" ref={idCardRef}>
              <div className="id-card-front">
                <div className="id-card-front-header-bg"><div className="id-card-watermark"></div></div>
                <div className="id-card-front-pink-bg"></div>
                <div className="id-card-logo-area">
                  <svg viewBox="0 0 100 100" width="22" height="22" className="id-card-logo-svg"><polygon points="50,15 85,50 50,85 15,50" fill="none" stroke="#ffffff" strokeWidth="8" /><polygon points="50,28 72,50 50,72 28,50" fill="var(--color-primary)" /></svg>
                  <div className="id-card-company-title">{emp.companyName || 'OM ENTERPRISE'}</div>
                  <div className="id-card-company-subtitle">{emp.branch ? (emp.branch.toLowerCase().includes('branch') ? emp.branch : `${emp.branch} Branch`) : 'Office Management'}</div>
                </div>
                <div className="id-card-photo-wrap"><Avatar name={emp.name} size="xl" className="id-card-photo-img" /></div>
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
                <div className="id-card-back-bullets">
                  <div className="id-card-bullet-row"><span className="id-bullet-dot"></span><p>This card is the official property of {emp.companyName || 'OM Enterprise'} and must be returned on demand.</p></div>
                  <div className="id-card-bullet-row"><span className="id-bullet-dot"></span><p>If found, please return to the HR Department or dynamic branch address below immediately.</p></div>
                  <div className="id-card-bullet-row"><span className="id-bullet-dot"></span><p style={{ fontWeight: 600 }}>Branch Address: {emp.branchAddress || getBranchAddress(emp.branch)}</p></div>
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
                    <svg viewBox="0 0 100 100" width="40" height="40" className="id-card-qr-svg"><rect x="0" y="0" width="28" height="28" fill="#0f172a" /><rect x="4" y="4" width="20" height="20" fill="#ffffff" /><rect x="8" y="8" width="12" height="12" fill="var(--color-primary)" /><rect x="72" y="0" width="28" height="28" fill="#0f172a" /><rect x="76" y="4" width="20" height="20" fill="#ffffff" /><rect x="80" y="8" width="12" height="12" fill="var(--color-primary)" /><rect x="0" y="72" width="28" height="28" fill="#0f172a" /><rect x="4" y="76" width="20" height="20" fill="#ffffff" /><rect x="8" y="80" width="12" height="12" fill="var(--color-primary)" /><rect x="36" y="4" width="8" height="8" fill="#0f172a" /><rect x="52" y="4" width="8" height="8" fill="#0f172a" /><rect x="44" y="12" width="16" height="8" fill="#0f172a" /><rect x="36" y="24" width="8" height="8" fill="#0f172a" /><rect x="4" y="36" width="8" height="8" fill="#0f172a" /><rect x="16" y="44" width="8" height="8" fill="#0f172a" /><rect x="24" y="36" width="8" height="8" fill="#0f172a" /><rect x="36" y="36" width="16" height="16" fill="var(--color-primary)" /><rect x="40" y="40" width="8" height="8" fill="#ffffff" /><rect x="60" y="36" width="8" height="8" fill="#0f172a" /><rect x="56" y="48" width="8" height="8" fill="#0f172a" /><rect x="36" y="56" width="8" height="8" fill="#0f172a" /><rect x="48" y="60" width="8" height="8" fill="#0f172a" /><rect x="76" y="36" width="8" height="8" fill="#0f172a" /><rect x="84" y="44" width="12" height="8" fill="#0f172a" /><rect x="72" y="56" width="8" height="16" fill="#0f172a" /><rect x="88" y="60" width="8" height="8" fill="var(--color-primary)" /><rect x="36" y="76" width="12" height="8" fill="#0f172a" /><rect x="52" y="72" width="8" height="16" fill="#0f172a" /><rect x="64" y="80" width="8" height="8" fill="var(--color-primary)" /><rect x="76" y="76" width="12" height="8" fill="#0f172a" /><rect x="84" y="84" width="12" height="8" fill="#0f172a" /></svg>
                    <span className="id-qr-label">SCAN ME</span>
                  </div>
                </div>
                <div className="id-card-back-signature-area">
                  <div className="id-signature-font">{emp.reportingManager || emp.teamLeader || 'Vikram Singh'}</div>
                  <div className="id-signature-line"></div>
                  <div className="id-signature-label">Authorized Signatory</div>
                </div>
                <div className="id-card-back-bottom-bg"><div className="id-card-watermark"></div></div>
                <div className="id-card-back-pink-bg"></div>
              </div>
            </div>
            <button className="id-card-download-btn" onClick={downloadIdCard}><Download size={16} /> Download ID Cards</button>
          </div>
        </div>
      )}

    </div>
  );
};

export default EmployeeDetail;