import React, { useState, useMemo, useReducer } from 'react';
import { useApp } from '../context/AppContext';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  RadialBarChart, RadialBar, XAxis, YAxis, Tooltip, Legend, CartesianGrid
} from 'recharts';
import {
  Plus, Eye, Edit2, Trash2, X, Search, Filter, Download, ChevronRight,
  ArrowLeft, CheckCircle, XCircle, Clock, AlertTriangle, Bell, Activity,
  FileText, Folder, Upload, MessageSquare, Users, Shield, BarChart2,
  ToggleLeft, ToggleRight, ChevronUp, ChevronDown, ArrowRight, Zap, Target,
  TrendingUp, Flag, Star
} from 'lucide-react';

// ─── Seed Team ──────────────────────────────────────────────────────────────
const TEAM = [];

// ─── Seed Workflows ──────────────────────────────────────────────────────────
const SEED_WORKFLOWS = [];

const SEED_NOTIFICATIONS = [];

const SEED_ACTIVITY = [];

const AUTOMATION_RULES = [
  { id: 'ar1', name: 'Auto Task Assignment', enabled: true, desc: 'Automatically assigns tasks to the next stage assignee upon stage completion.' },
  { id: 'ar2', name: 'Auto Notifications', enabled: true, desc: 'Sends email/in-app notifications for every stage status change.' },
  { id: 'ar3', name: 'Auto Approvals', enabled: false, desc: 'Auto-approves stages with no rejections within 48 hours.' },
  { id: 'ar4', name: 'Auto Escalations', enabled: true, desc: 'Escalates to Super Admin if approval is pending for more than 5 days.' },
  { id: 'ar5', name: 'Deadline Reminders', enabled: true, desc: 'Sends reminders 24 hours before each stage deadline.' }
];

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getStatusColor = (s) => ({
  'Active': '#10b981', 'In Progress': '#3b82f6', 'Pending Approval': '#f59e0b',
  'Under Review': '#8b5cf6', 'Delayed': '#ef4444', 'Cancelled': '#64748b',
  'Completed': '#10b981', 'Approved': '#10b981', 'Rejected': '#ef4444', 'Pending': '#f59e0b'
}[s] || '#64748b');

const getPriorityColor = (p) => ({ Critical: '#ef4444', High: '#f59e0b', Medium: '#3b82f6', Low: '#10b981' }[p] || '#94a3b8');

const Badge = ({ color, children, small }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', padding: small ? '2px 8px' : '3px 10px',
    borderRadius: 999, fontSize: small ? '0.68rem' : '0.72rem', fontWeight: 700,
    background: color + '22', color, border: `1px solid ${color}44`, whiteSpace: 'nowrap'
  }}>{children}</span>
);

const StatusDot = ({ status }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
    <span style={{ width: 8, height: 8, borderRadius: '50%', background: getStatusColor(status), display: 'inline-block', boxShadow: `0 0 6px ${getStatusColor(status)}` }} />
    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{status}</span>
  </span>
);

const inp = { background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', padding: '9px 12px', fontSize: '0.83rem', width: '100%', outline: 'none', boxSizing: 'border-box' };
const card = { background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 };
const secHdr = { fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-color)', paddingBottom: 8, marginBottom: 4 };
const rowItem = { background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '10px 14px', border: '1px solid var(--border-color)' };
const btnPrimary = { padding: '8px 16px', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: 'var(--color-primary)', color: '#fff' };
const btnOutline = { padding: '8px 14px', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid var(--border-color)', background: 'var(--bg-elevated)', color: 'var(--text-secondary)' };
const btnDanger = { padding: '6px 12px', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5, border: 'none', background: '#ef444422', color: '#ef4444' };

// ─── CircularProgress ─────────────────────────────────────────────────────────
const CircleProgress = ({ value, color = '#d946ef', size = 80, stroke = 7 }) => {
  const r = (size - stroke) / 2, circ = 2 * Math.PI * r, offset = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="var(--text-primary)" fontSize="0.85rem" fontWeight="700">{value}%</text>
    </svg>
  );
};

// ─── Tooltip (custom) ─────────────────────────────────────────────────────────
const ChartTip = { contentStyle: { background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12 } };

// ─── Section Component ────────────────────────────────────────────────────────
const Sec = ({ title, icon: Icon, action, children }) => (
  <div style={card}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
      <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
        {Icon && <Icon size={16} style={{ color: 'var(--color-primary)' }} />}{title}
      </h3>
      {action}
    </div>
    {children}
  </div>
);

// ──────────────────────────────────────────────────────────────────────────────
// WORKFLOW DETAIL PAGE
// ──────────────────────────────────────────────────────────────────────────────
const WorkflowDetailPage = ({ workflow: wfInit, onBack, onEdit, employees }) => {
  const [wf, setWf] = useState(wfInit);

  const TEAM = useMemo(() => {
    if (employees && employees.length > 0) {
      return employees.map(e => e.name);
    }
    return [];
  }, [employees]);
  const [commTab, setCommTab] = useState('discussions');
  const [comments, setComments] = useState([
    { id: 1, author: wfInit.createdBy, msg: 'Workflow has been created and stages assigned.', ts: '2 hrs ago' },
    { id: 2, author: wfInit.assignedTo, msg: 'All stage owners have been notified.', ts: '3 hrs ago' }
  ]);
  const [newComment, setNewComment] = useState('');
  const [automations, setAutomations] = useState(AUTOMATION_RULES);
  const [triggers, setTriggers] = useState([
    { id: 't1', name: 'Task Completed', enabled: true, action: 'Notify next stage assignee', lastTriggered: '2 hrs ago' },
    { id: 't2', name: 'Document Uploaded', enabled: true, action: 'Request document review', lastTriggered: '1 day ago' },
    { id: 't3', name: 'Project Created', enabled: false, action: 'Create default workflow', lastTriggered: 'Never' }
  ]);
  const [activity, setActivity] = useState(SEED_ACTIVITY.slice(0, 5));
  const [approvals, setApprovals] = useState(wfInit.approvals);
  const [remarks, setRemarks] = useState({});
  const [showAddStageForm, setShowAddStageForm] = useState(false);
  const [stageForm, setStageForm] = useState({ name: '', assignedTo: '', startDate: '', dueDate: '' });
  const [documents, setDocuments] = useState(wfInit.documents || []);
  const [stageNotifications, setStageNotifications] = useState([
    { id: 'sn1', msg: `Stage "${wfInit.stages[0]?.name}" completed`, ts: '2 hrs ago' },
    { id: 'sn2', msg: 'Approval request sent to Project Manager', ts: '1 day ago' }
  ]);
  const [deadlineAlerts] = useState([
    { id: 'da1', msg: `Due Date: ${wfInit.dueDate}`, severity: 'warning' },
    { id: 'da2', msg: `Stage "${wfInit.stages.find(s => s.status === 'In Progress')?.name || ''}" deadline approaching`, severity: 'danger' }
  ]);

  const handleApprove = (level) => {
    const today = new Date().toISOString().split('T')[0];
    setApprovals(prev => prev.map(a => a.level === level ? { ...a, status: 'Approved', date: today, remarks: remarks[level] || 'Approved.' } : a));
    setActivity(prev => [{ id: Date.now(), icon: '✅', msg: `Level ${level} approval completed`, ts: 'just now' }, ...prev]);
  };

  const handleReject = (level) => {
    const today = new Date().toISOString().split('T')[0];
    setApprovals(prev => prev.map(a => a.level === level ? { ...a, status: 'Rejected', date: today, remarks: remarks[level] || 'Rejected.' } : a));
    setActivity(prev => [{ id: Date.now(), icon: '❌', msg: `Level ${level} approval rejected`, ts: 'just now' }, ...prev]);
  };

  const handleEscalate = (level) => {
    setApprovals(prev => prev.map(a => a.level === level ? { ...a, status: 'Escalated', remarks: 'Escalated to Super Admin' } : a));
    setActivity(prev => [{ id: Date.now(), icon: '🔔', msg: `Level ${level} escalated to Super Admin`, ts: 'just now' }, ...prev]);
  };

  const markStageComplete = (stageId) => {
    setWf(prev => ({ ...prev, stages: prev.stages.map(s => s.id === stageId ? { ...s, status: 'Completed', completion: 100 } : s) }));
    setActivity(prev => [{ id: Date.now(), icon: '✅', msg: `Stage marked complete`, ts: 'just now' }, ...prev]);
  };

  const addComment = () => {
    if (!newComment.trim()) return;
    setComments(prev => [{ id: Date.now(), author: wf.createdBy, msg: newComment, ts: 'just now' }, ...prev]);
    setActivity(prev => [{ id: Date.now(), icon: '💬', msg: `Comment added by ${wf.createdBy}`, ts: 'just now' }, ...prev]);
    setNewComment('');
  };

  const handleAddStage = (e) => {
    e.preventDefault();
    const newStage = { id: `s-${Date.now()}`, ...stageForm, status: 'Pending', completion: 0 };
    setWf(prev => ({ ...prev, stages: [...prev.stages, newStage], totalSteps: prev.totalSteps + 1 }));
    setStageForm({ name: '', assignedTo: '', startDate: '', dueDate: '' });
    setShowAddStageForm(false);
    setActivity(prev => [{ id: Date.now(), icon: '📋', msg: `New stage "${newStage.name}" added`, ts: 'just now' }, ...prev]);
  };

  const stageStats = useMemo(() => ({
    total: wf.stages.length,
    completed: wf.stages.filter(s => s.status === 'Completed').length,
    pending: wf.stages.filter(s => s.status === 'Pending').length,
    inProgress: wf.stages.filter(s => s.status === 'In Progress').length,
    delayed: wf.stages.filter(s => s.status === 'Delayed').length
  }), [wf.stages]);

  const approvalStats = useMemo(() => ({
    pending: approvals.filter(a => a.status === 'Pending').length,
    approved: approvals.filter(a => a.status === 'Approved').length,
    rejected: approvals.filter(a => a.status === 'Rejected').length,
    escalated: approvals.filter(a => a.status === 'Escalated').length
  }), [approvals]);

  const STAGE_TYPES = ['Task Stage', 'Approval Stage', 'Review Stage', 'Notification Stage', 'Document Upload Stage', 'Decision Stage', 'Completion Stage'];

  const miniCard = (label, val, color) => (
    <div style={{ ...rowItem, textAlign: 'center' }}>
      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: color || 'var(--text-primary)' }}>{val}</div>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 48, animation: 'fadeIn 0.3s ease' }}>
      {/* Breadcrumb + Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={onBack} style={btnOutline}><ArrowLeft size={13} /> Back</button>
          <ChevronRight size={13} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Workflow Management</span>
          <ChevronRight size={13} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>{wf.name}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onEdit} style={btnOutline}><Edit2 size={13} /> Edit Workflow</button>
          <button style={btnOutline}><Download size={13} /> Export PDF</button>
        </div>
      </div>

      {/* SECTION A: Workflow Overview */}
      <Sec title="Workflow Overview" icon={Activity}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>{wf.name}</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>{wf.id} • {wf.type}</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Badge color={getStatusColor(wf.status)}>{wf.status}</Badge>
              <Badge color={getPriorityColor(wf.priority)}>{wf.priority} Priority</Badge>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <CircleProgress value={wf.progress} size={110} stroke={10} color="var(--color-primary)" />
              <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Overall Completion</p>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{wf.description}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[['Workflow Owner', wf.createdBy], ['Department', wf.department], ['Branch / Agency', wf.branch], ['Category', wf.category], ['Assigned To', wf.assignedTo], ['Client', wf.client || 'Internal'], ['Start Date', wf.stages[0]?.startDate || '—'], ['Due Date', wf.dueDate], ['Total Steps', wf.totalSteps], ['Est. Duration', `${wf.estimatedDays} days`]].map(([l, v]) => (
              <div key={l} style={rowItem}>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l}</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </Sec>

      {/* SECTION B: Workflow Stages Table */}
      <Sec title="Workflow Stages" icon={Target} action={<button onClick={() => setShowAddStageForm(!showAddStageForm)} style={btnPrimary}><Plus size={13} /> Add Stage</button>}>
        {showAddStageForm && (
          <form onSubmit={handleAddStage} style={{ ...rowItem, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Stage Name *</label><input style={inp} required value={stageForm.name} onChange={e => setStageForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Manager Review" /></div>
            <div><label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Assigned To *</label>
              <select style={inp} value={stageForm.assignedTo} onChange={e => setStageForm(p => ({ ...p, assignedTo: e.target.value }))}>
                <option value="">Select person...</option>
                {TEAM.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Start Date</label><input style={inp} type="date" value={stageForm.startDate} onChange={e => setStageForm(p => ({ ...p, startDate: e.target.value }))} /></div>
            <div><label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Due Date</label><input style={inp} type="date" value={stageForm.dueDate} onChange={e => setStageForm(p => ({ ...p, dueDate: e.target.value }))} /></div>
            <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowAddStageForm(false)} style={btnOutline}>Cancel</button>
              <button type="submit" style={btnPrimary}>Add Stage</button>
            </div>
          </form>
        )}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                {['Stage Name', 'Assigned To', 'Start Date', 'Due Date', 'Status', 'Completion', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {wf.stages.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{s.assignedTo}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{s.startDate}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{s.dueDate}</td>
                  <td style={{ padding: '10px 12px' }}><Badge color={getStatusColor(s.status)} small>{s.status}</Badge></td>
                  <td style={{ padding: '10px 12px', minWidth: 110 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 5, background: 'var(--bg-app)', borderRadius: 999 }}>
                        <div style={{ width: `${s.completion}%`, height: '100%', background: getStatusColor(s.status), borderRadius: 999, transition: 'width 0.5s' }} />
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.completion}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {s.status !== 'Completed' && <button onClick={() => markStageComplete(s.id)} style={{ ...btnPrimary, padding: '4px 10px', fontSize: '0.72rem' }}><CheckCircle size={11} /> Complete</button>}
                      <button style={{ ...btnOutline, padding: '4px 8px' }}><Edit2 size={11} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Sec>

      {/* SECTION C: Workflow Builder (Visual Step Indicator) */}
      <Sec title="Workflow Builder — Visual Stage Flow" icon={Zap}>
        <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, minWidth: wf.stages.length * 160 }}>
            {wf.stages.map((s, i) => (
              <React.Fragment key={s.id}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 140 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: getStatusColor(s.status) + '22', border: `2px solid ${getStatusColor(s.status)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, color: getStatusColor(s.status) }}>{i + 1}</div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', maxWidth: 120 }}>{s.name}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{s.assignedTo?.split(' ')[0]}</div>
                    <Badge color={getStatusColor(s.status)} small>{s.status}</Badge>
                  </div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: 999 }}>
                    {STAGE_TYPES[i % STAGE_TYPES.length]}
                  </div>
                </div>
                {i < wf.stages.length - 1 && <ArrowRight size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </Sec>

      {/* SECTION D: Approval Workflow Management */}
      <Sec title="Approval Workflow Management" icon={Shield}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 8 }}>
          {[['Pending', approvalStats.pending, '#f59e0b'], ['Approved', approvalStats.approved, '#10b981'], ['Rejected', approvalStats.rejected, '#ef4444'], ['Escalated', approvalStats.escalated, '#8b5cf6']].map(([l, v, c]) => miniCard(l + ' Approvals', v, c))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {approvals.map(a => (
            <div key={a.level} style={{ ...rowItem, borderLeft: `3px solid ${getStatusColor(a.status)}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Level {a.level}</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{a.role}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Approver: {a.approver}</div>
                  {a.date && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Date: {a.date}</div>}
                  {a.remarks && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 2 }}>"{a.remarks}"</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  <Badge color={getStatusColor(a.status)}>{a.status}</Badge>
                  {a.status === 'Pending' && (
                    <>
                      <textarea
                        placeholder="Remarks..."
                        style={{ ...inp, minHeight: 40, width: 180, fontSize: '0.75rem', resize: 'none' }}
                        value={remarks[a.level] || ''}
                        onChange={e => setRemarks(p => ({ ...p, [a.level]: e.target.value }))}
                      />
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => handleApprove(a.level)} style={{ ...btnPrimary, padding: '5px 12px', fontSize: '0.75rem' }}><CheckCircle size={12} /> Approve</button>
                        <button onClick={() => handleReject(a.level)} style={{ ...btnDanger, padding: '5px 12px' }}><XCircle size={12} /> Reject</button>
                        <button onClick={() => handleEscalate(a.level)} style={{ ...btnOutline, padding: '5px 12px', fontSize: '0.75rem', color: '#8b5cf6' }}><Bell size={12} /> Escalate</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Sec>

      {/* SECTION E: Department Workflow Analytics */}
      <Sec title="Department Workflow Analytics" icon={BarChart2}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                {['Department', 'Active Workflows', 'Completed', 'Delayed', 'Efficiency'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DEPT_ANALYTICS.map(d => (
                <tr key={d.department} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-primary)' }}>{d.department}</td>
                  <td style={{ padding: '10px 12px', color: '#3b82f6', fontWeight: 600 }}>{d.active}</td>
                  <td style={{ padding: '10px 12px', color: '#10b981', fontWeight: 600 }}>{d.completed}</td>
                  <td style={{ padding: '10px 12px', color: '#ef4444', fontWeight: 600 }}>{d.delayed}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 5, background: 'var(--bg-app)', borderRadius: 999 }}>
                        <div style={{ width: `${d.efficiency}%`, height: '100%', background: '#10b981', borderRadius: 999 }} />
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10b981' }}>{d.efficiency}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={DEPT_ANALYTICS}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
            <XAxis dataKey="department" stroke="var(--text-muted)" fontSize={11} />
            <YAxis stroke="var(--text-muted)" fontSize={11} />
            <Tooltip {...ChartTip} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="active" name="Active" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="delayed" name="Delayed" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Sec>

      {/* SECTION F: Employee Workflow Tracking */}
      <Sec title="Employee Workflow Tracking" icon={Users}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 4 }}>
          {miniCard('Assigned Workflows', wf.totalSteps, '#3b82f6')}
          {miniCard('Completed', stageStats.completed, '#10b981')}
          {miniCard('Avg. Completion', `${wf.estimatedDays}d`, '#f59e0b')}
          {miniCard('Productivity Impact', `${wf.progress}%`, '#d946ef')}
        </div>
        <div>
          <div style={secHdr}>Pending Actions</div>
          {wf.stages.filter(s => s.status !== 'Completed').map(s => (
            <div key={s.id} style={{ ...rowItem, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{s.name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Assigned: {s.assignedTo} • Due: {s.dueDate}</div>
              </div>
              <button onClick={() => markStageComplete(s.id)} style={{ ...btnPrimary, padding: '5px 12px', fontSize: '0.75rem' }}><CheckCircle size={12} /> Complete</button>
            </div>
          ))}
        </div>
      </Sec>

      {/* SECTION G: Workflow Automation Center */}
      <Sec title="Workflow Automation Center" icon={Zap}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <div style={secHdr}>Automation Rules</div>
            {automations.map(a => (
              <div key={a.id} style={{ ...rowItem, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem', marginBottom: 3 }}>{a.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{a.desc}</div>
                </div>
                <button onClick={() => setAutomations(prev => prev.map(x => x.id === a.id ? { ...x, enabled: !x.enabled } : x))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: a.enabled ? '#10b981' : 'var(--text-muted)', marginLeft: 10 }}>
                  {a.enabled ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
                </button>
              </div>
            ))}
          </div>
          <div>
            <div style={secHdr}>Trigger Conditions</div>
            {triggers.map(t => (
              <div key={t.id} style={{ ...rowItem, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={t.enabled} onChange={() => setTriggers(prev => prev.map(x => x.id === t.id ? { ...x, enabled: !x.enabled } : x))} />
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{t.name}</span>
                  </label>
                  <Badge color={t.enabled ? '#10b981' : '#64748b'} small>{t.enabled ? 'Active' : 'Inactive'}</Badge>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Action: {t.action}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>Last triggered: {t.lastTriggered}</div>
              </div>
            ))}
          </div>
        </div>
      </Sec>

      {/* SECTION H: Communication Center */}
      <Sec title="Workflow Communication Center" icon={MessageSquare}>
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-color)' }}>
          {[['discussions', 'Discussions'], ['notifications', 'Notifications'], ['activity', 'Activity Feed']].map(([id, label]) => (
            <button key={id} onClick={() => setCommTab(id)} style={{ padding: '9px 16px', border: 'none', background: 'none', cursor: 'pointer', color: commTab === id ? 'var(--color-primary)' : 'var(--text-muted)', fontWeight: commTab === id ? 700 : 400, borderBottom: commTab === id ? '2px solid var(--color-primary)' : '2px solid transparent', fontSize: '0.85rem' }}>{label}</button>
          ))}
        </div>
        {commTab === 'discussions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input style={{ ...inp, flex: 1 }} placeholder="Write a message..." value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && addComment()} />
              <button onClick={addComment} style={btnPrimary}>Send</button>
            </div>
            {comments.map(c => (
              <div key={c.id} style={{ ...rowItem, display: 'flex', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>{c.author?.[0]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{c.author}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{c.ts}</span>
                  </div>
                  <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{c.msg}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        {commTab === 'notifications' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={secHdr}>Stage Updates</div>
            {stageNotifications.map(n => (
              <div key={n.id} style={{ ...rowItem, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>🔔 {n.msg}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{n.ts}</span>
              </div>
            ))}
            <div style={secHdr}>Deadline Alerts</div>
            {deadlineAlerts.map(d => (
              <div key={d.id} style={{ ...rowItem, borderLeft: `3px solid ${d.severity === 'danger' ? '#ef4444' : '#f59e0b'}` }}>
                <span style={{ fontSize: '0.82rem', color: d.severity === 'danger' ? '#ef4444' : '#f59e0b' }}>⚠️ {d.msg}</span>
              </div>
            ))}
          </div>
        )}
        {commTab === 'activity' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {activity.map(a => (
              <div key={a.id} style={{ ...rowItem, display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: '1.1rem' }}>{a.icon}</span>
                <span style={{ flex: 1, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{a.msg}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{a.ts}</span>
              </div>
            ))}
          </div>
        )}
      </Sec>

      {/* SECTION I: Document Management */}
      <Sec title="Workflow Document Management" icon={FileText} action={<button style={btnPrimary}><Upload size={13} /> Upload</button>}>
        {documents.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px', fontSize: '0.85rem' }}>No documents uploaded yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  {['File Name', 'Category', 'Format', 'Date', 'Size', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {documents.map(d => (
                  <tr key={d.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>{d.name}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{d.category}</td>
                    <td style={{ padding: '10px 12px' }}><Badge color="#3b82f6" small>{d.format}</Badge></td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{d.date}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{d.size}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button style={{ ...btnOutline, padding: '4px 8px' }}><Download size={12} /></button>
                        <button onClick={() => setDocuments(prev => prev.filter(x => x.id !== d.id))} style={{ ...btnDanger, padding: '4px 8px' }}><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Sec>

      {/* SECTION J: Workflow Progress Panel */}
      <Sec title="Workflow Progress Panel" icon={TrendingUp}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12 }}>
          {miniCard('Total Stages', stageStats.total)}
          {miniCard('Completed', stageStats.completed, '#10b981')}
          {miniCard('In Progress', stageStats.inProgress, '#3b82f6')}
          {miniCard('Pending', stageStats.pending, '#f59e0b')}
          {miniCard('Delayed', stageStats.delayed, '#ef4444')}
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>
            <span>Overall Progress</span><span>{wf.progress}%</span>
          </div>
          <div style={{ height: 10, background: 'var(--bg-elevated)', borderRadius: 999 }}>
            <div style={{ width: `${wf.progress}%`, height: '100%', background: 'linear-gradient(90deg, var(--color-primary), #3b82f6)', borderRadius: 999, transition: 'width 0.5s' }} />
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'flex', gap: 0, minWidth: wf.stages.length * 130, marginTop: 8 }}>
            {wf.stages.map((s, i) => (
              <React.Fragment key={s.id}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: 4 }}>Stage {i + 1}</div>
                  <div style={{ height: 8, background: getStatusColor(s.status), borderRadius: 4, margin: '0 4px' }} title={s.name} />
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 4 }}>{s.name.split(' ')[0]}</div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </Sec>

      {/* SECTION K: Workflow Participants */}
      <Sec title="Workflow Participants" icon={Users}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <div style={secHdr}>Workflow Leadership</div>
            {[{ label: 'Workflow Owner', name: wf.createdBy }, { label: 'Assigned To', name: wf.assignedTo }].map(({ label, name }) => (
              <div key={label} style={{ ...rowItem, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: '0.85rem', flexShrink: 0 }}>{name?.[0]}</div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{label}</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{name}</div>
                </div>
              </div>
            ))}
            <div style={secHdr}>Approvers</div>
            {approvals.map(a => (
              <div key={a.level} style={{ ...rowItem, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: getStatusColor(a.status), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', color: '#fff', fontWeight: 700 }}>{a.approver?.[0]}</div>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{a.approver}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>L{a.level}: {a.role}</div>
                  </div>
                </div>
                <Badge color={getStatusColor(a.status)} small>{a.status}</Badge>
              </div>
            ))}
          </div>
          <div>
            <div style={secHdr}>Assigned Employees ({wf.members.length})</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {wf.members.map((m, i) => (
                <div key={i} style={{ ...rowItem, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: `hsl(${i * 60},60%,45%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: '0.8rem', flexShrink: 0 }}>{m[0]}</div>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{m.split(' ')[0]}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{['Leader', 'Member', 'Analyst', 'Dev'][i % 4]}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Sec>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// MAIN WORKFLOWS PAGE
// ──────────────────────────────────────────────────────────────────────────────
const Workflows = () => {
  const { addToast, employees } = useApp();

  const [workflows, setWorkflows] = useState(SEED_WORKFLOWS);

  const TEAM = useMemo(() => {
    if (employees && employees.length > 0) {
      return employees.map(e => e.name);
    }
    return [];
  }, [employees]);

  // Recharts Chart Data (Dynamic useMemos based on workflows state)
  const DEPT_ANALYTICS = useMemo(() => {
    const depts = {};
    workflows.forEach(w => {
      const dept = w.department || 'IT';
      if (!depts[dept]) {
        depts[dept] = { department: dept, active: 0, completed: 0, delayed: 0, total: 0 };
      }
      depts[dept].total += 1;
      if (w.status === 'Active' || w.status === 'In Progress') depts[dept].active += 1;
      else if (w.status === 'Completed') depts[dept].completed += 1;
      else if (w.status === 'Delayed') depts[dept].delayed += 1;
    });
    
    const result = Object.keys(depts).map(dept => {
      const d = depts[dept];
      const efficiency = d.total > 0 ? Math.round((d.completed / d.total) * 100) : 100;
      return {
        department: d.department,
        active: d.active,
        completed: d.completed,
        delayed: d.delayed,
        efficiency
      };
    });

    return result.length > 0 ? result : [
      { department: 'IT', active: 0, completed: 0, delayed: 0, efficiency: 100 },
      { department: 'Marketing', active: 0, completed: 0, delayed: 0, efficiency: 100 },
      { department: 'Sales', active: 0, completed: 0, delayed: 0, efficiency: 100 },
      { department: 'HR', active: 0, completed: 0, delayed: 0, efficiency: 100 }
    ];
  }, [workflows]);

  const MONTHLY_DATA = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const total = workflows.length;
    const completedCount = workflows.filter(w => w.status === 'Completed').length;
    return months.map((m, idx) => {
      const created = Math.round(total * (idx + 1) / 6);
      const completed = Math.min(created, Math.round(completedCount * (idx + 1) / 6));
      return {
        month: m,
        created,
        completed
      };
    });
  }, [workflows]);

  const PIE_DATA = useMemo(() => {
    const counts = { 'Approved': 0, 'Pending': 0, 'Rejected': 0, 'Escalated': 0 };
    workflows.forEach(w => {
      (w.approvals || []).forEach(a => {
        if (counts[a.status] !== undefined) {
          counts[a.status] += 1;
        } else if (a.status === 'Pending Approval') {
          counts['Pending'] += 1;
        }
      });
    });
    const result = Object.keys(counts).map(key => ({
      name: key,
      value: counts[key]
    }));
    return result.some(item => item.value > 0) ? result : [
      { name: 'Approved', value: 0 }, { name: 'Pending', value: 0 },
      { name: 'Rejected', value: 0 }, { name: 'Escalated', value: 0 }
    ];
  }, [workflows]);

  const EFFICIENCY_DATA = useMemo(() => {
    const depts = {};
    workflows.forEach(w => {
      const dept = w.department || 'IT';
      if (!depts[dept]) {
        depts[dept] = { total: 0, completed: 0 };
      }
      depts[dept].total += 1;
      if (w.status === 'Completed') depts[dept].completed += 1;
    });
    
    const result = Object.keys(depts).map(dept => ({
      name: dept,
      efficiency: depts[dept].total > 0 ? Math.round((depts[dept].completed / depts[dept].total) * 100) : 100
    }));
    
    return result.length > 0 ? result : [
      { name: 'IT', efficiency: 100 },
      { name: 'Marketing', efficiency: 100 },
      { name: 'Sales', efficiency: 100 },
      { name: 'HR', efficiency: 100 }
    ];
  }, [workflows]);

  const PRODUCTIVITY_DATA = useMemo(() => {
    const total = workflows.length;
    const completed = workflows.filter(w => w.status === 'Completed').length;
    const delayed = workflows.filter(w => w.status === 'Delayed').length;
    
    const prod = total > 0 ? Math.round(((total - delayed) / total) * 100) : 100;
    const eff = total > 0 ? Math.round((completed / total) * 100) : 100;
    const onTime = total > 0 ? Math.round(((completed) / (completed + delayed || 1)) * 100) : 100;
    
    return [
      { name: 'Team Productivity', value: prod, fill: '#d946ef' },
      { name: 'Workflow Efficiency', value: eff, fill: '#10b981' },
      { name: 'On-Time Delivery', value: onTime, fill: '#3b82f6' },
      { name: 'Approval Rate', value: 100, fill: '#f59e0b' }
    ];
  }, [workflows]);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'detail'
  const [selectedWf, setSelectedWf] = useState(null);
  const [activeModal, setActiveModal] = useState(null); // 'create' | 'delete' | 'assignModal' | 'approvalConfig' | 'stage'
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [cardFilter, setCardFilter] = useState(null);
  const [notifications, setNotifications] = useState(SEED_NOTIFICATIONS);
  const [globalActivity, setGlobalActivity] = useState(SEED_ACTIVITY);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: 'id', dir: 'asc' });
  const [filters, setFilters] = useState({ search: '', status: '', priority: '', department: '', dateRange: '' });
  const [showAnalytics, setShowAnalytics] = useState(true);

  const [createForm, setCreateForm] = useState({
    name: '', code: '', category: 'HR', department: 'IT', description: '',
    owner: '', deptHead: '', manager: '', leader: '',
    assignedEmployees: [], startDate: '', dueDate: '', priority: 'Medium',
    approvalReqs: [], notifRules: []
  });

  const PER_PAGE = 10;

  // ─── Summary Stats ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = workflows.length;
    const active = workflows.filter(w => w.status === 'Active').length;
    const completed = workflows.filter(w => w.status === 'Completed').length;
    const pending = workflows.filter(w => w.status === 'Pending Approval').length;
    const delayed = workflows.filter(w => w.status === 'Delayed').length;
    const efficiency = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, active, completed, pending, delayed, efficiency };
  }, [workflows]);

  // ─── Filtered + Sorted Workflows ──────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...workflows];
    if (cardFilter) list = list.filter(w => w.status === cardFilter);
    const { search, status, priority, department } = filters;
    if (search) list = list.filter(w => [w.name, w.id, w.department, w.createdBy].some(v => v?.toLowerCase().includes(search.toLowerCase())));
    if (status) list = list.filter(w => w.status === status);
    if (priority) list = list.filter(w => w.priority === priority);
    if (department) list = list.filter(w => w.department === department);
    list.sort((a, b) => {
      let va = a[sortConfig.key], vb = b[sortConfig.key];
      if (typeof va === 'string') return sortConfig.dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortConfig.dir === 'asc' ? va - vb : vb - va;
    });
    return list;
  }, [workflows, cardFilter, filters, sortConfig]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const pageItems = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const handleSort = (key) => setSortConfig(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
  const SortIcon = ({ k }) => sortConfig.key === k ? (sortConfig.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ChevronUp size={12} style={{ opacity: 0.3 }} />;

  const handleView = (wf) => { setSelectedWf(wf); setViewMode('detail'); };
  const handleBack = () => { setViewMode('list'); setSelectedWf(null); };

  const handleEdit = (wf) => {
    setCreateForm({
      name: wf.name, code: wf.id, category: wf.category, department: wf.department,
      description: wf.description, owner: wf.createdBy, deptHead: wf.assignedTo,
      manager: wf.assignedTo, leader: wf.assignedTo, assignedEmployees: wf.members || [],
      startDate: wf.stages[0]?.startDate || '', dueDate: wf.dueDate, priority: wf.priority,
      approvalReqs: [], notifRules: [], editId: wf.id
    });
    setActiveModal('create');
  };

  const handleDelete = (wf) => { setDeleteTarget(wf); setActiveModal('delete'); };

  const confirmDelete = () => {
    setWorkflows(prev => prev.filter(w => w.id !== deleteTarget.id));
    setGlobalActivity(prev => [{ id: Date.now(), icon: '🗑️', msg: `Workflow "${deleteTarget.name}" deleted`, ts: 'just now' }, ...prev]);
    addToast && addToast('success', `Workflow "${deleteTarget.name}" deleted.`);
    setActiveModal(null); setDeleteTarget(null);
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (createForm.editId) {
      setWorkflows(prev => prev.map(w => w.id === createForm.editId ? {
        ...w, name: createForm.name, category: createForm.category, department: createForm.department,
        description: createForm.description, createdBy: createForm.owner, assignedTo: createForm.leader,
        dueDate: createForm.dueDate, priority: createForm.priority
      } : w));
      addToast && addToast('success', 'Workflow updated successfully!');
    } else {
      const newId = `WF-${String(workflows.length + 1).padStart(3, '0')}`;
      const newWf = {
        id: newId, name: createForm.name, type: createForm.category, department: createForm.department,
        branch: 'Head Office', createdBy: createForm.owner || TEAM[0] || '', assignedTo: createForm.leader || TEAM[1] || '',
        stage: 'Initial', totalSteps: 3, progress: 0, dueDate: createForm.dueDate,
        status: 'Active', priority: createForm.priority, category: createForm.category,
        description: createForm.description, approvalLevel: 1, client: 'Internal', estimatedDays: 14,
        stages: [
          { id: 's1', name: 'Initial Stage', assignedTo: createForm.leader || TEAM[0] || '', startDate: createForm.startDate, dueDate: createForm.dueDate, status: 'Pending', completion: 0 },
          { id: 's2', name: 'Review Stage', assignedTo: createForm.manager || TEAM[1] || '', startDate: '', dueDate: '', status: 'Pending', completion: 0 },
          { id: 's3', name: 'Final Approval', assignedTo: createForm.deptHead || TEAM[2] || '', startDate: '', dueDate: '', status: 'Pending', completion: 0 }
        ],
        approvals: [
          { level: 1, role: 'Team Leader Approval', approver: createForm.leader || TEAM[4] || '', status: 'Pending', date: '', remarks: '' },
          { level: 2, role: 'Project Manager Approval', approver: createForm.manager || TEAM[2] || '', status: 'Pending', date: '', remarks: '' },
          { level: 3, role: 'Department Head Approval', approver: createForm.deptHead || TEAM[7] || '', status: 'Pending', date: '', remarks: '' },
          { level: 4, role: 'Super Admin Approval', approver: TEAM[9] || '', status: 'Pending', date: '', remarks: '' }
        ],
        members: createForm.assignedEmployees.length ? createForm.assignedEmployees : [TEAM[0], TEAM[1]].filter(Boolean),
        documents: []
      };
      setWorkflows(prev => [...prev, newWf]);
      setGlobalActivity(prev => [{ id: Date.now(), icon: '🚀', msg: `Workflow "${newWf.name}" created by ${newWf.createdBy}`, ts: 'just now' }, ...prev]);
      addToast && addToast('success', `Workflow "${newWf.name}" created!`);
    }
    setActiveModal(null);
    setCreateForm({ name: '', code: '', category: 'HR', department: 'IT', description: '', owner: '', deptHead: '', manager: '', leader: '', assignedEmployees: [], startDate: '', dueDate: '', priority: 'Medium', approvalReqs: [], notifRules: [] });
  };

  const toggleChip = (arr, val, setter, field) => {
    setter(prev => ({ ...prev, [field]: prev[field].includes(val) ? prev[field].filter(x => x !== val) : [...prev[field], val] }));
  };

  const exportCSV = () => {
    const hdr = ['ID', 'Name', 'Type', 'Department', 'Branch', 'Owner', 'Assigned To', 'Stage', 'Steps', 'Progress%', 'Due Date', 'Status', 'Priority'];
    const rows = filtered.map(w => [w.id, `"${w.name}"`, w.type, w.department, w.branch, w.createdBy, w.assignedTo, w.stage, w.totalSteps, `${w.progress}%`, w.dueDate, w.status, w.priority].join(','));
    const content = 'data:text/csv;charset=utf-8,' + [hdr.join(','), ...rows].join('\n');
    const link = document.createElement('a'); link.setAttribute('href', encodeURI(content)); link.setAttribute('download', 'workflows_export.csv'); document.body.appendChild(link); link.click(); document.body.removeChild(link);
    addToast && addToast('success', 'CSV exported!');
  };

  const dismissNotif = (id) => setNotifications(prev => prev.filter(n => n.id !== id));

  const notifTypeStyle = { danger: { bg: '#ef444411', border: '#ef444433', icon: '🔴', color: '#ef4444' }, warning: { bg: '#f59e0b11', border: '#f59e0b33', icon: '🟡', color: '#f59e0b' }, success: { bg: '#10b98111', border: '#10b98133', icon: '🟢', color: '#10b981' }, info: { bg: '#3b82f611', border: '#3b82f633', icon: '🔵', color: '#3b82f6' } };

  // ─── If Detail View ───────────────────────────────────────────────────────
  if (viewMode === 'detail' && selectedWf) {
    return (
      <div style={{ padding: '24px', background: 'var(--bg-app)', minHeight: '100vh', fontFamily: 'var(--font-sans)' }}>
        <WorkflowDetailPage
          workflow={selectedWf}
          onBack={handleBack}
          onEdit={() => handleEdit(selectedWf)}
          employees={employees}
        />
      </div>
    );
  }

  // ─── List View ────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 24, background: 'var(--bg-app)', minHeight: '100vh', fontFamily: 'var(--font-sans)', animation: 'fadeIn 0.3s ease' }}>

      {/* PAGE HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>Workflow Management</h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Create, manage, automate, and optimize department-wise workflows, approval processes, and task pipelines.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' }} />
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>SYSTEM ACTIVE</span>
          </div>
        </div>
      </div>

      {/* NOTIFICATIONS */}
      {notifications.length > 0 && (
        <div style={{ ...card, gap: 10, borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}><Bell size={14} /> Workflow Alerts & Notifications</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
            {notifications.map(n => {
              const s = notifTypeStyle[n.type] || notifTypeStyle.info;
              return (
                <div key={n.id} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 'var(--radius-md)', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: s.color, marginBottom: 2 }}>{s.icon} {n.title}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{n.msg}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>{n.ts}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => { const wf = workflows.find(w => w.id === n.wfId); if (wf) handleView(wf); }} style={{ ...btnOutline, padding: '3px 8px', fontSize: '0.7rem' }}>View</button>
                    <button onClick={() => dismissNotif(n.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={14} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* QUICK ACTIONS */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {[
          { label: 'Create Workflow', icon: Plus, action: () => setActiveModal('create'), primary: true },
          { label: 'Add Stage', icon: Target, action: () => setActiveModal('stage') },
          { label: 'Assign Workflow', icon: Users, action: () => setActiveModal('assignModal') },
          { label: 'Configure Approval', icon: Shield, action: () => setActiveModal('approvalConfig') },
          { label: 'Export CSV', icon: Download, action: exportCSV },
          { label: 'View Analytics', icon: BarChart2, action: () => setShowAnalytics(p => !p) }
        ].map(({ label, icon: Icon, action, primary }) => (
          <button key={label} onClick={action} style={primary ? btnPrimary : btnOutline}><Icon size={13} /> {label}</button>
        ))}
      </div>

      {/* SUMMARY CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 14 }}>
        {[
          { label: 'Total Workflows', val: stats.total, filter: null, color: '#d946ef', icon: Activity },
          { label: 'Active', val: stats.active, filter: 'Active', color: '#10b981', icon: CheckCircle },
          { label: 'Completed', val: stats.completed, filter: 'Completed', color: '#3b82f6', icon: CheckCircle },
          { label: 'Pending Approval', val: stats.pending, filter: 'Pending Approval', color: '#f59e0b', icon: Clock },
          { label: 'Delayed', val: stats.delayed, filter: 'Delayed', color: '#ef4444', icon: AlertTriangle },
          { label: 'Efficiency Rate', val: `${stats.efficiency}%`, filter: null, color: '#10b981', icon: TrendingUp }
        ].map(({ label, val, filter, color, icon: Icon }) => {
          const active = cardFilter === filter;
          return (
            <div key={label} onClick={() => { setCardFilter(active ? null : filter); setCurrentPage(1); }}
              style={{ ...card, gap: 8, cursor: 'pointer', borderColor: active ? color : 'var(--border-color)', borderLeft: filter === 'Delayed' ? `4px solid ${color}` : undefined, transform: active ? 'translateY(-2px)' : 'none', transition: 'all 0.2s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
                <Icon size={15} style={{ color }} />
              </div>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: filter === 'Delayed' || label === 'Efficiency Rate' ? color : 'var(--text-primary)' }}>{val}</span>
            </div>
          );
        })}
      </div>

      {/* STATUS LEGEND */}
      <div style={{ ...card, flexDirection: 'row', flexWrap: 'wrap', gap: 16, padding: '12px 20px' }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status Legend:</span>
        {[['Active', '#10b981'], ['In Progress', '#3b82f6'], ['Pending Approval', '#f59e0b'], ['Under Review', '#8b5cf6'], ['Delayed', '#ef4444'], ['Cancelled', '#64748b'], ['Completed', '#10b981']].map(([s, c]) => (
          <StatusDot key={s} status={s} />
        ))}
      </div>

      {/* ANALYTICS PANEL */}
      {showAnalytics && (
        <div style={{ ...card }}>
          <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 12, marginBottom: 4 }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}><BarChart2 size={16} style={{ color: 'var(--color-primary)' }} /> Workflow Performance Dashboard</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
            {/* Line Chart */}
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' }}>Completion Rate Over Time</div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={MONTHLY_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={10} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} />
                  <Tooltip {...ChartTip} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="created" name="Created" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="completed" name="Completed" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {/* Bar Chart */}
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' }}>Department-wise Analysis</div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={DEPT_ANALYTICS}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="department" stroke="var(--text-muted)" fontSize={10} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} />
                  <Tooltip {...ChartTip} />
                  <Bar dataKey="active" name="Active" fill="#d946ef" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed" name="Done" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Pie */}
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' }}>Approval Process Breakdown</div>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={PIE_DATA} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 9 }}>
                    {PIE_DATA.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...ChartTip} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Efficiency Bar */}
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' }}>Task Flow Efficiency</div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={EFFICIENCY_DATA} layout="vertical">
                  <XAxis type="number" domain={[0, 100]} stroke="var(--text-muted)" fontSize={10} />
                  <YAxis dataKey="name" type="category" width={70} stroke="var(--text-muted)" fontSize={10} />
                  <Tooltip {...ChartTip} />
                  <Bar dataKey="efficiency" name="Efficiency %" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Radial */}
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' }}>Team Productivity</div>
              <ResponsiveContainer width="100%" height={160}>
                <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" barSize={12} data={PRODUCTIVITY_DATA}>
                  <RadialBar background={{ fill: 'rgba(255,255,255,0.04)' }} dataKey="value" label={{ position: 'insideStart', fill: '#fff', fontSize: 9 }} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 10 }} />
                  <Tooltip {...ChartTip} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            {/* KPI stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>KPI Widgets</div>
              {[['Avg. Completion Time', '12.4 days', '#d946ef'], ['On-Time Delivery Rate', '84%', '#10b981'], ['Active Automations', '4 / 5', '#3b82f6'], ['Pending Escalations', '2', '#f59e0b']].map(([l, v, c]) => (
                <div key={l} style={{ ...rowItem, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{l}</span>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: c }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SEARCH & FILTERS */}
      <div style={{ ...card, flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: '14px 20px' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input style={{ ...inp, paddingLeft: 32 }} placeholder="Search workflows, ID, department, owner..." value={filters.search} onChange={e => { setFilters(p => ({ ...p, search: e.target.value })); setCurrentPage(1); }} />
        </div>
        {[
          ['status', 'Status', ['', 'Active', 'In Progress', 'Pending Approval', 'Under Review', 'Delayed', 'Cancelled', 'Completed']],
          ['priority', 'Priority', ['', 'Low', 'Medium', 'High', 'Critical']],
          ['department', 'Department', ['', 'IT', 'HR', 'Sales', 'Marketing', 'Finance']],
          ['dateRange', 'Date Range', ['', 'Today', 'Weekly', 'Monthly', 'Quarterly']]
        ].map(([key, label, opts]) => (
          <select key={key} style={{ ...inp, width: 'auto', flex: '0 1 150px' }} value={filters[key]} onChange={e => { setFilters(p => ({ ...p, [key]: e.target.value })); setCurrentPage(1); }}>
            {opts.map(o => <option key={o} value={o}>{o || label}</option>)}
          </select>
        ))}
        <button onClick={() => { setFilters({ search: '', status: '', priority: '', department: '', dateRange: '' }); setCardFilter(null); setCurrentPage(1); }} style={btnOutline}>Reset</button>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', alignSelf: 'center' }}>Showing <strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong> of {workflows.length}</span>
      </div>

      {/* WORKFLOW TABLE */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}><Activity size={16} style={{ color: 'var(--color-primary)' }} /> Workflow Directory</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setActiveModal('create')} style={btnPrimary}><Plus size={13} /> Create Workflow</button>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: 90 }} />  {/* WF ID */}
              <col style={{ width: 190 }} /> {/* Name */}
              <col style={{ width: 140 }} /> {/* Type */}
              <col style={{ width: 110 }} /> {/* Dept */}
              <col style={{ width: 120 }} /> {/* Branch */}
              <col style={{ width: 120 }} /> {/* Created By */}
              <col style={{ width: 120 }} /> {/* Assigned To */}
              <col style={{ width: 140 }} /> {/* Stage */}
              <col style={{ width: 60 }} />  {/* Steps */}
              <col style={{ width: 110 }} /> {/* Progress */}
              <col style={{ width: 100 }} /> {/* Due Date */}
              <col style={{ width: 130 }} /> {/* Status */}
              <col style={{ width: 110 }} /> {/* Actions */}
            </colgroup>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                {[['id', 'WF ID'], ['name', 'Workflow Name'], ['type', 'Type'], ['department', 'Department'], ['branch', 'Branch'], ['createdBy', 'Created By'], ['assignedTo', 'Assigned To'], ['stage', 'Current Stage'], ['totalSteps', 'Steps'], ['progress', 'Progress'], ['dueDate', 'Due Date'], ['status', 'Status'], [null, 'Actions']].map(([k, h]) => (
                  <th key={h} onClick={() => k && handleSort(k)} style={{ padding: '9px 12px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap', cursor: k ? 'pointer' : 'default', userSelect: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{h}{k && <SortIcon k={k} />}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageItems.length > 0 ? pageItems.map(w => (
                <tr key={w.id}
                  onClick={(e) => { if (e.target.closest('button')) return; handleView(w); }}
                  style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--color-primary)', whiteSpace: 'nowrap' }}>{w.id}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 190 }} title={w.name}>{w.name}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={w.type}>{w.type}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{w.department}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{w.branch}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{w.createdBy}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{w.assignedTo}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={w.stage}>{w.stage}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', textAlign: 'center' }}>{w.totalSteps}</td>
                  <td style={{ padding: '10px 12px', minWidth: 110 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ flex: 1, height: 5, background: 'var(--bg-app)', borderRadius: 999 }}>
                        <div style={{ width: `${w.progress}%`, height: '100%', background: w.status === 'Delayed' ? '#ef4444' : 'var(--color-primary)', borderRadius: 999 }} />
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', minWidth: 30 }}>{w.progress}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{w.dueDate}</td>
                  <td style={{ padding: '10px 12px' }}><Badge color={getStatusColor(w.status)} small>{w.status}</Badge></td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button onClick={() => handleView(w)} title="View" style={{ ...btnOutline, padding: '5px 8px', color: '#3b82f6' }}><Eye size={13} /></button>
                      <button onClick={() => handleEdit(w)} title="Edit" style={{ ...btnOutline, padding: '5px 8px', color: '#f59e0b' }}><Edit2 size={13} /></button>
                      <button onClick={() => handleDelete(w)} title="Delete" style={{ ...btnOutline, padding: '5px 8px', color: '#ef4444' }}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={13} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No workflows found matching filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Page {currentPage} of {totalPages}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={btnOutline}>Previous</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => setCurrentPage(n)} style={{ ...btnOutline, background: n === currentPage ? 'var(--color-primary)' : 'var(--bg-elevated)', color: n === currentPage ? '#fff' : 'var(--text-secondary)', border: 'none', width: 32, height: 32, padding: 0, justifyContent: 'center' }}>{n}</button>
              ))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={btnOutline}>Next</button>
            </div>
          </div>
        )}
      </div>

      {/* ACTIVITY LOGS */}
      <div style={card}>
        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}><Activity size={16} style={{ color: 'var(--color-primary)' }} /> Recent Workflow Activities</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {globalActivity.slice(0, 10).map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '1rem' }}>{a.icon}</span>
              <span style={{ flex: 1, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{a.msg}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{a.ts}</span>
            </div>
          ))}
        </div>
      </div>

      {/* REPORTS & EXPORTS */}
      <div style={card}>
        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={16} style={{ color: 'var(--color-primary)' }} /> Reports & Exports</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {[['Workflow Summary Report', 'PDF'], ['Workflow Completion Report', 'PDF'], ['Delayed Workflow Report', 'PDF'], ['Approval Report', 'PDF'], ['Department Analytics', 'XLSX'], ['Employee Workflow Performance', 'CSV']].map(([name, fmt]) => (
            <div key={name} style={{ ...rowItem, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.83rem', color: 'var(--text-primary)' }}>{name}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Format: {fmt}</div>
              </div>
              <button onClick={exportCSV} style={{ ...btnOutline, padding: '5px 10px', fontSize: '0.75rem' }}><Download size={12} /></button>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ ...card, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, padding: '12px 20px' }}>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Total Workflows: <strong style={{ color: 'var(--text-primary)' }}>{stats.total}</strong></span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Active: <strong style={{ color: '#10b981' }}>{stats.active}</strong></span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Last Updated: <strong style={{ color: 'var(--text-primary)' }}>Just Now</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' }} />
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#10b981' }}>Workflow Management System Active</span>
        </div>
      </div>

      {/* ── MODALS ── */}

      {/* CREATE/EDIT WORKFLOW MODAL */}
      {activeModal === 'create' && (
        <div onClick={e => e.target === e.currentTarget && setActiveModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{createForm.editId ? 'Edit Workflow' : 'Create New Workflow'}</h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateSubmit}>
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Basic Info */}
                <div>
                  <div style={secHdr}>Basic Information</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ gridColumn: '1/-1' }}><label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Workflow Name *</label><input style={inp} required value={createForm.name} onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Employee Onboarding Workflow" /></div>
                    <div><label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Workflow Code</label><input style={inp} value={createForm.code} onChange={e => setCreateForm(p => ({ ...p, code: e.target.value }))} placeholder={`WF-${String(workflows.length + 1).padStart(3, '0')}`} /></div>
                    <div><label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Category</label>
                      <select style={inp} value={createForm.category} onChange={e => setCreateForm(p => ({ ...p, category: e.target.value }))}>
                        {['HR', 'IT', 'Finance', 'Operations', 'Marketing', 'Sales'].map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div><label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Department</label>
                      <select style={inp} value={createForm.department} onChange={e => setCreateForm(p => ({ ...p, department: e.target.value }))}>
                        {['IT', 'HR', 'Sales', 'Marketing', 'Finance'].map(d => <option key={d}>{d}</option>)}
                      </select>
                    </div>
                    <div style={{ gridColumn: '1/-1' }}><label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Description</label><textarea style={{ ...inp, minHeight: 70, resize: 'vertical' }} value={createForm.description} onChange={e => setCreateForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe the workflow purpose and process..." /></div>
                  </div>
                </div>
                {/* Assignment */}
                <div>
                  <div style={secHdr}>Workflow Assignment</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[['owner', 'Workflow Owner'], ['deptHead', 'Department Head'], ['manager', 'Project Manager'], ['leader', 'Team Leader']].map(([k, l]) => (
                      <div key={k}><label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{l}</label>
                        <select style={inp} value={createForm[k]} onChange={e => setCreateForm(p => ({ ...p, [k]: e.target.value }))}>
                          <option value="">Select {l}...</option>
                          {(employees || TEAM).map(emp => {
                            const name = typeof emp === 'string' ? emp : emp.name;
                            return <option key={name} value={name}>{name}{typeof emp !== 'string' ? ` (${emp.designation || ''})` : ''}</option>;
                          })}
                        </select>
                      </div>
                    ))}
                    <div style={{ gridColumn: '1/-1' }}>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                        Assigned Employees (multi-select) — {createForm.assignedEmployees.length} selected
                      </label>
                      <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: 6, padding: 4, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                        {(employees && employees.length > 0 ? employees : TEAM.map(t => ({ name: t, designation: 'Staff', id: t }))).map(emp => {
                          const name = typeof emp === 'string' ? emp : emp.name;
                          const designation = typeof emp === 'string' ? '' : (emp.designation || emp.position || 'Staff');
                          const empId = typeof emp === 'string' ? emp : (emp.id || emp.employeeId || emp);
                          const sel = createForm.assignedEmployees.includes(name);
                          return (
                            <span
                              key={empId}
                              onClick={() => setCreateForm(p => ({ ...p, assignedEmployees: sel ? p.assignedEmployees.filter(x => x !== name) : [...p.assignedEmployees, name] }))}
                              title={`${name} — ${designation}`}
                              style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', padding: '5px 12px', borderRadius: 8, fontSize: '0.75rem', cursor: 'pointer', background: sel ? 'var(--color-primary)' : 'var(--bg-card)', color: sel ? '#fff' : 'var(--text-secondary)', border: `1px solid ${sel ? 'var(--color-primary)' : 'var(--border-color)'}`, userSelect: 'none', transition: 'all 0.15s', lineHeight: 1.4 }}
                            >
                              <span style={{ fontWeight: sel ? 700 : 500 }}>{name}</span>
                              {designation && <span style={{ fontSize: '0.62rem', opacity: 0.75, marginTop: 1 }}>{designation}</span>}
                            </span>
                          );
                        })}
                      </div>
                      {createForm.assignedEmployees.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', alignSelf: 'center' }}>Selected:</span>
                          {createForm.assignedEmployees.map(n => (
                            <span key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, background: 'var(--color-primary)', color: '#fff', fontSize: '0.72rem', fontWeight: 600 }}>
                              {n}
                              <span onClick={() => setCreateForm(p => ({ ...p, assignedEmployees: p.assignedEmployees.filter(x => x !== n) }))} style={{ cursor: 'pointer', lineHeight: 1 }}>×</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {/* Config */}
                <div>
                  <div style={secHdr}>Workflow Configuration</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div><label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Start Date</label><input style={inp} type="date" value={createForm.startDate} onChange={e => setCreateForm(p => ({ ...p, startDate: e.target.value }))} /></div>
                    <div><label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Due Date</label><input style={inp} type="date" value={createForm.dueDate} onChange={e => setCreateForm(p => ({ ...p, dueDate: e.target.value }))} /></div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Priority Level</label>
                      <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                        {['Low', 'Medium', 'High', 'Critical'].map(p => (
                          <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.82rem', color: createForm.priority === p ? getPriorityColor(p) : 'var(--text-secondary)' }}>
                            <input type="radio" name="priority" value={p} checked={createForm.priority === p} onChange={e => setCreateForm(prev => ({ ...prev, priority: e.target.value }))} />
                            {p}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Approval Requirements</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 5 }}>
                        {['Team Leader Approval', 'Project Manager Approval', 'Department Head Approval', 'Super Admin Approval'].map(a => (
                          <label key={a} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            <input type="checkbox" checked={createForm.approvalReqs.includes(a)} onChange={() => setCreateForm(p => ({ ...p, approvalReqs: p.approvalReqs.includes(a) ? p.approvalReqs.filter(x => x !== a) : [...p.approvalReqs, a] }))} />
                            {a}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Notification Rules</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 5 }}>
                        {['Email', 'SMS', 'In-App', 'All'].map(n => (
                          <label key={n} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            <input type="checkbox" checked={createForm.notifRules.includes(n)} onChange={() => setCreateForm(p => ({ ...p, notifRules: p.notifRules.includes(n) ? p.notifRules.filter(x => x !== n) : [...p.notifRules, n] }))} />
                            {n}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: '1px solid var(--border-color)' }}>
                <button type="button" onClick={() => setActiveModal(null)} style={btnOutline}>Cancel</button>
                <button type="submit" style={btnPrimary}>{createForm.editId ? 'Update Workflow' : 'Save Workflow'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {activeModal === 'delete' && deleteTarget && (
        <div onClick={e => e.target === e.currentTarget && setActiveModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 420, padding: 28, boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#ef444422', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={20} style={{ color: '#ef4444' }} /></div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Delete Workflow</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>This action cannot be undone.</div>
              </div>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
              Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>"{deleteTarget.name}"</strong>? All stages, approvals, and documents will be permanently removed.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setActiveModal(null)} style={btnOutline}>Cancel</button>
              <button onClick={confirmDelete} style={{ ...btnPrimary, background: '#ef4444' }}>Confirm Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN WORKFLOW MODAL */}
      {activeModal === 'assignModal' && (
        <div onClick={e => e.target === e.currentTarget && setActiveModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 480, padding: 28, boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>Assign Workflow</h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Select Workflow</label>
                <select style={inp}><option value="">Select a workflow...</option>{workflows.map(w => <option key={w.id} value={w.id}>{w.id} — {w.name}</option>)}</select>
              </div>
              <div><label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Assign To</label>
                <select style={inp}><option value="">Select employee...</option>{TEAM.map(t => <option key={t} value={t}>{t}</option>)}</select>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setActiveModal(null)} style={btnOutline}>Cancel</button>
                <button onClick={() => { addToast && addToast('success', 'Workflow assigned!'); setActiveModal(null); }} style={btnPrimary}>Assign</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* APPROVAL CONFIG MODAL */}
      {activeModal === 'approvalConfig' && (
        <div onClick={e => e.target === e.currentTarget && setActiveModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 520, padding: 28, boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>Configure Approval Flow</h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[['Level 1', 'Team Leader Approval'], ['Level 2', 'Project Manager Approval'], ['Level 3', 'Department Head Approval'], ['Level 4', 'Super Admin Approval']].map(([l, r]) => (
                <div key={l} style={rowItem}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem', marginBottom: 6 }}>{l}: {r}</div>
                  <select style={inp}><option value="">Select approver...</option>{TEAM.map(t => <option key={t}>{t}</option>)}</select>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button onClick={() => setActiveModal(null)} style={btnOutline}>Cancel</button>
                <button onClick={() => { addToast && addToast('success', 'Approval flow configured!'); setActiveModal(null); }} style={btnPrimary}>Save Configuration</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD STAGE MODAL */}
      {activeModal === 'stage' && (
        <div onClick={e => e.target === e.currentTarget && setActiveModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 480, padding: 28, boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>Add Workflow Stage</h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Workflow</label><select style={inp}><option>Select workflow...</option>{workflows.map(w => <option key={w.id}>{w.id} — {w.name}</option>)}</select></div>
              <div><label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Stage Name</label><input style={inp} placeholder="e.g. Manager Approval" /></div>
              <div><label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Stage Type</label><select style={inp}>{['Task Stage', 'Approval Stage', 'Review Stage', 'Notification Stage', 'Document Upload Stage', 'Decision Stage', 'Completion Stage'].map(t => <option key={t}>{t}</option>)}</select></div>
              <div><label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Assigned To</label><select style={inp}><option>Select person...</option>{TEAM.map(t => <option key={t}>{t}</option>)}</select></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Start Date</label><input style={inp} type="date" /></div>
                <div><label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Due Date</label><input style={inp} type="date" /></div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setActiveModal(null)} style={btnOutline}>Cancel</button>
                <button onClick={() => { addToast && addToast('success', 'Stage added!'); setActiveModal(null); }} style={btnPrimary}>Add Stage</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workflows;
