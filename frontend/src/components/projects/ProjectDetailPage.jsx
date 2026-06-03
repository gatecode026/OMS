import React, { useState, useMemo } from 'react';
import {
  ArrowLeft, Edit2, Download, Briefcase, Calendar, DollarSign, Users,
  CheckSquare, FileText, AlertTriangle, TrendingUp, Clock, Plus,
  Trash2, CheckCircle, XCircle, MessageSquare, Video, Folder,
  Shield, Activity, Target, BarChart2, Upload, Eye, ChevronRight,
  Bell, Zap, Star, Flag
} from 'lucide-react';
import Avatar from '../common/Avatar';
import {
  ResponsiveContainer, RadialBarChart, RadialBar, PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid
} from 'recharts';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatCurrency = (val) => {
  if (!val && val !== 0) return '$0';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
};

const daysBetween = (d1, d2) => {
  const a = new Date(d1), b = new Date(d2);
  return Math.ceil(Math.abs(b - a) / (1000 * 60 * 60 * 24));
};

const getStatusColor = (status) => {
  const map = {
    'In Progress': '#3b82f6', 'Active': '#10b981', 'Completed': '#10b981',
    'Planning': '#f59e0b', 'Pending': '#f59e0b', 'Delayed': '#ef4444',
    'On Hold': '#94a3b8', 'Cancelled': '#64748b'
  };
  return map[status] || '#94a3b8';
};

const getPriorityColor = (priority) => {
  const map = { Critical: '#ef4444', High: '#f59e0b', Medium: '#3b82f6', Low: '#10b981', Urgent: '#ef4444' };
  return map[priority] || '#94a3b8';
};

const Badge = ({ color, children, style = {} }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
    borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700,
    background: color + '22', color: color, border: `1px solid ${color}44`,
    ...style
  }}>{children}</span>
);

// ─── Circular Progress Ring ───────────────────────────────────────────────────
const CircularProgress = ({ value, size = 100, stroke = 8, color = '#d946ef' }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
        strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        fill="var(--text-primary)" fontSize="1.1rem" fontWeight="700">{value}%</text>
    </svg>
  );
};

// ─── Section Wrapper ──────────────────────────────────────────────────────────
const Section = ({ title, icon: Icon, children, action }) => (
  <div style={{
    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-lg)', padding: '20px', display: 'flex',
    flexDirection: 'column', gap: 16
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
        {Icon && <Icon size={16} style={{ color: 'var(--color-primary)' }} />} {title}
      </h3>
      {action}
    </div>
    {children}
  </div>
);

const StatMini = ({ label, value, color }) => (
  <div style={{
    background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
    padding: '10px 14px', textAlign: 'center', border: '1px solid var(--border-color)'
  }}>
    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: color || 'var(--text-primary)' }}>{value}</div>
    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const ProjectDetailPage = ({ project: initialProject, onBack, onEdit, allProjects, setProjects }) => {
  const [project, setProjectLocal] = useState(initialProject);
  const [commTab, setCommTab] = useState('discussions');
  const [discussions, setDiscussions] = useState([
    { id: 1, author: project.manager, msg: 'Kickoff meeting scheduled for next Monday. Please review the project charter before then.', ts: '2 hours ago' },
    { id: 2, author: project.leader, msg: 'Design mockups are ready for review. Shared in the Design Files folder.', ts: '1 day ago' },
    { id: 3, author: (project.members || [])[2] || 'Team Member', msg: 'API integration is 80% complete. Will finish by EOD tomorrow.', ts: '2 days ago' }
  ]);
  const [newMsg, setNewMsg] = useState('');

  const [meetings, setMeetings] = useState([
    { id: 1, title: 'Sprint Planning — Week 3', date: '2026-06-05', time: '10:00 AM', attendees: project.members?.slice(0, 3) || [], notes: 'Review backlog and assign sprint tasks.', actions: ['Finalize sprint tasks', 'Update Jira board'] },
    { id: 2, title: 'Client Review Call', date: '2026-06-08', time: '3:00 PM', attendees: [project.manager, project.leader], notes: 'Demo current milestone deliverables to client.', actions: ['Prepare demo environment', 'Send pre-call agenda'] }
  ]);
  const [meetingForm, setMeetingForm] = useState({ title: '', date: '', time: '', notes: '' });
  const [showMeetingForm, setShowMeetingForm] = useState(false);

  const [files, setFiles] = useState([
    { id: 1, name: 'Project_Charter.pdf', type: 'PDF', size: '2.4 MB', by: project.manager, date: '2026-01-20', folder: 'Project Documents' },
    { id: 2, name: 'UI_Mockups_v2.fig', type: 'FIGMA', size: '8.1 MB', by: project.leader, date: '2026-02-10', folder: 'Design Files' },
    { id: 3, name: 'Budget_Tracker_Q1.xlsx', type: 'XLSX', size: '0.9 MB', by: project.manager, date: '2026-03-01', folder: 'Reports' }
  ]);

  // Risk state
  const [risks, setRisks] = useState([
    { id: 'r1', level: 'High', title: 'Budget overrun risk', desc: 'Current spending is 15% above projections.', resolved: false },
    { id: 'r2', level: 'Medium', title: 'Resource shortage — backend engineers', desc: '2 engineers on leave next week.', resolved: false },
    { id: 'r3', level: 'Low', title: 'Minor scope creep in UI requirements', desc: 'Client requested 3 new screens not in original scope.', resolved: false }
  ]);

  // Task state (local copy for this project)
  const [tasks, setTasks] = useState(project.tasks || []);
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', assignedTo: '', priority: 'Medium', startDate: '', dueDate: '', description: '' });

  // Milestone state
  const [milestones] = useState([
    { id: 'm1', name: 'Project Kickoff & Requirements', dueDate: '2026-01-25', status: 'Completed', completion: 100 },
    { id: 'm2', name: 'UI/UX Design Phase Complete', dueDate: '2026-02-28', status: 'Completed', completion: 100 },
    { id: 'm3', name: 'Backend API Development Done', dueDate: '2026-04-15', status: 'In Progress', completion: 70 },
    { id: 'm4', name: 'Integration Testing Complete', dueDate: '2026-05-30', status: 'Pending', completion: 0 },
    { id: 'm5', name: 'Production Deployment', dueDate: '2026-07-15', status: 'Pending', completion: 0 }
  ]);

  // Expense state
  const [expenses, setExpenses] = useState([
    { id: 'e1', category: 'Software Licenses', amount: 12000, date: '2026-02-01', approvedBy: project.manager },
    { id: 'e2', category: 'Cloud Infrastructure', amount: 8500, date: '2026-03-15', approvedBy: project.manager },
    { id: 'e3', category: 'Design Tools', amount: 3200, date: '2026-04-01', approvedBy: project.leader },
    { id: 'e4', category: 'Team Training', amount: 4800, date: '2026-04-20', approvedBy: project.manager }
  ]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ category: '', amount: '', date: '', approvedBy: '' });

  // Activity feed (per-project)
  const [activityFeed, setActivityFeed] = useState([
    { id: 1, icon: '✅', msg: `Task "Implement RBAC Auth" marked complete by ${project.manager}`, ts: '10 min ago' },
    { id: 2, icon: '📄', msg: 'Document "UI_Mockups_v2.fig" uploaded to Design Files', ts: '2 hrs ago' },
    { id: 3, icon: '💰', msg: `Budget updated — Cloud Infrastructure expense of $8,500 added`, ts: '1 day ago' },
    { id: 4, icon: '👥', msg: `Team member ${(project.members || [])[2] || 'New Member'} added to project`, ts: '2 days ago' },
    { id: 5, icon: '🎯', msg: 'Milestone "UI/UX Design Phase" marked as Completed', ts: '3 days ago' },
    { id: 6, icon: '⚠️', msg: 'Risk alert: Budget overrun risk flagged by system', ts: '4 days ago' }
  ]);

  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses]);
  const budget = project.budget || 100000;
  const usedBudgetPct = Math.min(Math.round((totalExpenses / budget) * 100), 100);
  const remainingBudget = budget - totalExpenses;

  const taskStats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter(t => t.completed).length;
    const overdue = tasks.filter(t => t.overdue && !t.completed).length;
    return { total, done, pending: total - done, overdue };
  }, [tasks]);

  // Gantt bar for timeline
  const start = new Date(project.startDate || '2026-01-01');
  const end = new Date(project.deadline || '2026-12-31');
  const today = new Date('2026-06-03');
  const totalDays = daysBetween(project.startDate, project.deadline);
  const elapsedDays = Math.max(0, Math.min(daysBetween(project.startDate, '2026-06-03'), totalDays));
  const elapsedPct = Math.round((elapsedDays / totalDays) * 100);

  // Resource data for charts
  const resourceData = (project.members || []).map((m, i) => ({
    name: m.split(' ')[0], hours: [45, 38, 52, 30, 44, 35][i % 6], completed: [38, 30, 45, 22, 40, 28][i % 6]
  }));

  const utilizationData = [
    { name: 'Utilized', value: project.productivityScore || 82, fill: '#d946ef' },
    { name: 'Available', value: 100 - (project.productivityScore || 82), fill: 'rgba(255,255,255,0.05)' }
  ];

  const performanceGauges = [
    { name: 'Team Productivity', value: project.productivityScore || 82, fill: '#d946ef' },
    { name: 'Task Completion', value: Math.round((taskStats.done / Math.max(taskStats.total, 1)) * 100) || 0, fill: '#10b981' },
    { name: 'Project Delivery', value: project.progress || 0, fill: '#3b82f6' },
    { name: 'Resource Efficiency', value: Math.round(((project.productivityScore || 82) + project.progress) / 2), fill: '#f59e0b' }
  ];

  const milestoneStatusColor = { Completed: '#10b981', 'In Progress': '#3b82f6', Pending: '#94a3b8' };

  const handleAddTask = (e) => {
    e.preventDefault();
    const newTask = { id: `t-new-${Date.now()}`, ...taskForm, completed: false };
    setTasks(prev => [...prev, newTask]);
    setActivityFeed(prev => [{ id: Date.now(), icon: '📋', msg: `Task "${taskForm.title}" added to project`, ts: 'just now' }, ...prev]);
    setTaskForm({ title: '', assignedTo: '', priority: 'Medium', startDate: '', dueDate: '', description: '' });
    setShowAddTask(false);
  };

  const handleAddExpense = (e) => {
    e.preventDefault();
    const newExp = { id: `e-${Date.now()}`, ...expenseForm, amount: Number(expenseForm.amount) };
    setExpenses(prev => [...prev, newExp]);
    setActivityFeed(prev => [{ id: Date.now(), icon: '💰', msg: `Expense "${expenseForm.category}" of $${expenseForm.amount} added`, ts: 'just now' }, ...prev]);
    setExpenseForm({ category: '', amount: '', date: '', approvedBy: '' });
    setShowAddExpense(false);
  };

  const handleToggleTask = (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleDeleteTask = (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleSendMessage = () => {
    if (!newMsg.trim()) return;
    setDiscussions(prev => [{ id: Date.now(), author: project.manager, msg: newMsg, ts: 'just now' }, ...prev]);
    setActivityFeed(prev => [{ id: Date.now(), icon: '💬', msg: `New discussion message posted by ${project.manager}`, ts: 'just now' }, ...prev]);
    setNewMsg('');
  };

  const handleAddMeeting = (e) => {
    e.preventDefault();
    setMeetings(prev => [{ id: Date.now(), ...meetingForm, attendees: project.members?.slice(0, 2) || [], actions: [] }, ...prev]);
    setMeetingForm({ title: '', date: '', time: '', notes: '' });
    setShowMeetingForm(false);
  };

  const handleDeleteExpense = (id) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const handleResolveRisk = (id) => {
    setRisks(prev => prev.map(r => r.id === id ? { ...r, resolved: true } : r));
    setActivityFeed(prev => [{ id: Date.now(), icon: '🛡️', msg: 'Risk alert resolved and archived', ts: 'just now' }, ...prev]);
  };

  const RISK_COLOR = { High: '#ef4444', Medium: '#f59e0b', Low: '#10b981' };

  const inp = {
    background: 'var(--bg-elevated)', border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
    padding: '8px 12px', fontSize: '0.83rem', width: '100%', outline: 'none'
  };

  const btn = (variant = 'primary') => ({
    padding: '8px 16px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
    fontSize: '0.82rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6,
    border: variant === 'primary' ? 'none' : '1px solid var(--border-color)',
    background: variant === 'primary' ? 'var(--color-primary)' : 'var(--bg-elevated)',
    color: variant === 'primary' ? '#fff' : 'var(--text-secondary)',
    transition: 'all 0.15s'
  });

  const colCard = { background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '12px 16px', border: '1px solid var(--border-color)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '0 0 40px', animation: 'fadeIn 0.3s ease' }}>

      {/* Breadcrumb + Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={onBack} style={{ ...btn('outline'), padding: '6px 12px' }}>
            <ArrowLeft size={14} /> Back
          </button>
          <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Project Management</span>
          <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600 }}>{project.name}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onEdit} style={btn('outline')}><Edit2 size={13} /> Edit Project</button>
          <button style={btn('outline')}><Download size={13} /> Export PDF</button>
        </div>
      </div>

      {/* SECTION A: Project Overview */}
      <Section title="Project Overview" icon={Briefcase}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Left */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{project.name}</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{project.id} • {project.workflowStage || 'Development'}</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Badge color={getStatusColor(project.status)}>{project.status}</Badge>
              <Badge color={getPriorityColor(project.priority)}>{project.priority} Priority</Badge>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 8 }}>
              <CircularProgress value={project.progress || 0} size={110} stroke={10} color="var(--color-primary)" />
              <p style={{ margin: '8px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>Overall Completion</p>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{project.description || 'No description provided.'}</p>
          </div>
          {/* Right */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              ['Client Name', project.client || 'Internal'],
              ['Client Company', project.clientCompany || project.client || 'Internal'],
              ['Department', project.department],
              ['Branch / Agency', project.branch || 'Head Office'],
              ['Category', project.category || 'IT'],
              ['Est. Budget', formatCurrency(budget)],
              ['Actual Budget', formatCurrency(totalExpenses)],
              ['Remaining', formatCurrency(remainingBudget)]
            ].map(([label, val]) => (
              <div key={label} style={colCard}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* SECTION B: Timeline */}
      <Section title="Project Timeline" icon={Calendar}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          {[
            ['Start Date', project.startDate],
            ['End Date', project.deadline],
            ['Est. Completion', project.estimatedCompletion || project.deadline],
            ['Duration', `${totalDays} days`]
          ].map(([l, v]) => (
            <div key={l} style={colCard}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{l}</div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>{v}</div>
            </div>
          ))}
        </div>
        {/* Gantt Bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 6 }}>
            <span>{project.startDate}</span>
            <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>▼ Today (Day {elapsedDays})</span>
            <span>{project.deadline}</span>
          </div>
          <div style={{ position: 'relative', height: 20, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-full)', overflow: 'visible' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${project.progress}%`, background: 'linear-gradient(90deg, var(--color-primary), #3b82f6)', borderRadius: 'var(--radius-full)', transition: 'width 0.5s' }} />
            <div style={{ position: 'absolute', top: -4, left: `${elapsedPct}%`, transform: 'translateX(-50%)', width: 2, height: 28, background: 'var(--color-warning)', borderRadius: 2 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 6 }}>
            <span>Elapsed: {elapsedDays} days ({elapsedPct}%)</span>
            <span>Remaining: {totalDays - elapsedDays} days</span>
          </div>
        </div>
      </Section>

      {/* SECTION C: Team */}
      <Section title="Project Team" icon={Users}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Manager + Leader */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[{ label: 'Project Manager', name: project.manager, designation: 'Project Manager' }, { label: 'Team Leader', name: project.leader, designation: 'Team Leader' }].map(({ label, name, designation }) => (
              <div key={label} style={{ ...colCard, display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar name={name} size="md" />
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{label}</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{designation}</div>
                </div>
              </div>
            ))}
          </div>
          {/* Team Members */}
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', fontWeight: 600 }}>Team Members ({(project.members || []).length})</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {(project.members || []).map((m, i) => (
                <div key={i} style={{ ...colCard, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar name={m} size="xs" />
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{m.split(' ')[0]}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{['Engineer', 'Designer', 'Analyst', 'Dev', 'QA', 'PM'][i % 6]}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* SECTION D: Milestones */}
      <Section title="Milestones" icon={Target}>
        {/* SVG Milestone Timeline */}
        <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
          <svg width={Math.max(700, milestones.length * 160)} height={70}>
            <line x1={60} y1={30} x2={Math.max(700, milestones.length * 160) - 60} y2={30} stroke="rgba(255,255,255,0.08)" strokeWidth={3} />
            {milestones.map((m, i) => {
              const x = 60 + (i / (milestones.length - 1)) * (Math.max(700, milestones.length * 160) - 120);
              const col = milestoneStatusColor[m.status];
              return (
                <g key={m.id}>
                  <circle cx={x} cy={30} r={12} fill={col + '33'} stroke={col} strokeWidth={2} />
                  {m.status === 'Completed' && <text x={x} y={35} textAnchor="middle" fill={col} fontSize={12} fontWeight="bold">✓</text>}
                  {m.status !== 'Completed' && <circle cx={x} cy={30} r={5} fill={col} />}
                  <text x={x} y={55} textAnchor="middle" fill="var(--text-muted)" fontSize={9}>{m.name.split(' ').slice(0, 2).join(' ')}</text>
                  <text x={x} y={66} textAnchor="middle" fill="var(--text-muted)" fontSize={9}>{m.dueDate}</text>
                </g>
              );
            })}
          </svg>
        </div>
        {/* Milestones Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                {['Milestone', 'Due Date', 'Status', 'Completion'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {milestones.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>{m.name}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{m.dueDate}</td>
                  <td style={{ padding: '10px 12px' }}><Badge color={milestoneStatusColor[m.status]}>{m.status}</Badge></td>
                  <td style={{ padding: '10px 12px', minWidth: 120 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: 'var(--bg-elevated)', borderRadius: 999 }}>
                        <div style={{ width: `${m.completion}%`, height: '100%', background: milestoneStatusColor[m.status], borderRadius: 999, transition: 'width 0.5s' }} />
                      </div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', minWidth: 32 }}>{m.completion}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* SECTION E: Tasks */}
      <Section title="Task Management" icon={CheckSquare}
        action={<button onClick={() => setShowAddTask(!showAddTask)} style={btn('primary')}><Plus size={13} /> Add Task</button>}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12 }}>
          <StatMini label="Total Tasks" value={taskStats.total} />
          <StatMini label="Assigned" value={taskStats.total} color="#3b82f6" />
          <StatMini label="Completed" value={taskStats.done} color="#10b981" />
          <StatMini label="Pending" value={taskStats.pending} color="#f59e0b" />
          <StatMini label="Overdue" value={taskStats.overdue} color="#ef4444" />
        </div>
        {showAddTask && (
          <form onSubmit={handleAddTask} style={{ ...colCard, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Task Title *</label>
              <input style={inp} required value={taskForm.title} onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))} placeholder="Enter task title..." />
            </div>
            {[['assignedTo', 'Assigned To', project.members || [], true], ['priority', 'Priority', ['Low', 'Medium', 'High', 'Critical'], true], ['startDate', 'Start Date', [], false, 'date'], ['dueDate', 'Due Date', [], false, 'date']].map(([k, label, opts, isSelect, type]) => (
              <div key={k}>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{label}</label>
                {isSelect ? (
                  <select style={inp} value={taskForm[k]} onChange={e => setTaskForm(p => ({ ...p, [k]: e.target.value }))}>
                    {opts.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input style={inp} type={type || 'text'} value={taskForm[k]} onChange={e => setTaskForm(p => ({ ...p, [k]: e.target.value }))} />
                )}
              </div>
            ))}
            <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowAddTask(false)} style={btn('outline')}>Cancel</button>
              <button type="submit" style={btn('primary')}>Add Task</button>
            </div>
          </form>
        )}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                {['Task', 'Assigned To', 'Priority', 'Due Date', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 500, color: t.completed ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: t.completed ? 'line-through' : 'none' }}>{t.title}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{t.assignedTo || project.leader}</td>
                  <td style={{ padding: '10px 12px' }}><Badge color={getPriorityColor(t.priority)}>{t.priority}</Badge></td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{t.dueDate}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <Badge color={t.completed ? '#10b981' : t.overdue ? '#ef4444' : '#f59e0b'}>
                      {t.completed ? 'Completed' : t.overdue ? 'Overdue' : 'In Progress'}
                    </Badge>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => handleToggleTask(t.id)} style={{ ...btn('outline'), padding: '4px 8px', fontSize: '0.72rem' }}>
                        {t.completed ? <XCircle size={12} /> : <CheckCircle size={12} />}
                      </button>
                      <button onClick={() => handleDeleteTask(t.id)} style={{ ...btn('outline'), padding: '4px 8px', fontSize: '0.72rem', color: 'var(--color-danger)' }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* SECTION F: Resource Management */}
      <Section title="Resource Management" icon={Users}>
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20 }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', fontWeight: 600 }}>Resource Utilization</div>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={utilizationData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" startAngle={90} endAngle={-270}>
                  {utilizationData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ textAlign: 'center', marginTop: -20 }}>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-primary)' }}>{project.productivityScore || 82}%</span>
              <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>Utilized</p>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', fontWeight: 600 }}>Workload Distribution</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={resourceData} layout="vertical">
                <XAxis type="number" stroke="var(--text-muted)" fontSize={10} />
                <YAxis dataKey="name" type="category" width={70} stroke="var(--text-muted)" fontSize={10} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }} />
                <Bar dataKey="hours" name="Total Hrs" fill="rgba(217,70,239,0.5)" radius={[0, 4, 4, 0]} />
                <Bar dataKey="completed" name="Completed Hrs" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                {['Employee', 'Designation', 'Assigned Hrs', 'Completed Hrs', 'Utilization %'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resourceData.map((r, i) => {
                const pct = Math.round((r.completed / r.hours) * 100);
                return (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '10px 12px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar name={(project.members || [])[i] || r.name} size="xs" /><span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{(project.members || [])[i] || r.name}</span></div></td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{['Engineer', 'Designer', 'Analyst', 'Dev', 'QA', 'PM'][i % 6]}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{r.hours}h</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{r.completed}h</td>
                    <td style={{ padding: '10px 12px', minWidth: 120 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: 'var(--bg-elevated)', borderRadius: 999 }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--color-primary)', borderRadius: 999 }} />
                        </div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', minWidth: 32 }}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {/* SECTION G: Budget Tracking */}
      <Section title="Budget Tracking" icon={DollarSign}
        action={<button onClick={() => setShowAddExpense(!showAddExpense)} style={btn('primary')}><Plus size={13} /> Add Expense</button>}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          <StatMini label="Est. Budget" value={formatCurrency(budget)} color="#3b82f6" />
          <StatMini label="Used Budget" value={formatCurrency(totalExpenses)} color="#f59e0b" />
          <StatMini label="Remaining" value={formatCurrency(remainingBudget)} color={remainingBudget < 0 ? '#ef4444' : '#10b981'} />
          <StatMini label="Utilization" value={`${usedBudgetPct}%`} color={usedBudgetPct > 90 ? '#ef4444' : 'var(--color-primary)'} />
        </div>
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 6 }}>Budget Utilization Progress</div>
          <div style={{ height: 10, background: 'var(--bg-elevated)', borderRadius: 999 }}>
            <div style={{ width: `${usedBudgetPct}%`, height: '100%', background: usedBudgetPct > 90 ? '#ef4444' : 'linear-gradient(90deg, var(--color-primary), #3b82f6)', borderRadius: 999, transition: 'width 0.5s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            <span>$0</span><span>{formatCurrency(budget)}</span>
          </div>
        </div>
        {showAddExpense && (
          <form onSubmit={handleAddExpense} style={{ ...colCard, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[['category', 'Category', false, 'text'], ['amount', 'Amount ($)', false, 'number'], ['date', 'Date', false, 'date'], ['approvedBy', 'Approved By', true, null]].map(([k, label, isSelect, type]) => (
              <div key={k}>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{label}</label>
                {isSelect ? (
                  <select style={inp} value={expenseForm[k]} onChange={e => setExpenseForm(p => ({ ...p, [k]: e.target.value }))}>
                    <option value="">Select...</option>
                    {(project.members || [project.manager]).map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                ) : (
                  <input style={inp} type={type} required={k !== 'date'} value={expenseForm[k]} onChange={e => setExpenseForm(p => ({ ...p, [k]: e.target.value }))} placeholder={label} />
                )}
              </div>
            ))}
            <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowAddExpense(false)} style={btn('outline')}>Cancel</button>
              <button type="submit" style={btn('primary')}>Add Expense</button>
            </div>
          </form>
        )}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                {['Category', 'Amount', 'Date', 'Approved By', 'Action'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {expenses.map(exp => (
                <tr key={exp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>{exp.category}</td>
                  <td style={{ padding: '10px 12px', color: '#f59e0b', fontWeight: 700 }}>{formatCurrency(exp.amount)}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{exp.date}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{exp.approvedBy}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <button onClick={() => handleDeleteExpense(exp.id)} style={{ ...btn('outline'), padding: '4px 8px', color: 'var(--color-danger)' }}><Trash2 size={12} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* SECTION H: Communication Center */}
      <Section title="Communication Center" icon={MessageSquare}>
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-color)', marginBottom: 16 }}>
          {[['discussions', 'Discussions', MessageSquare], ['meetings', 'Meetings', Video], ['files', 'File Sharing', Folder]].map(([id, label, Icon]) => (
            <button key={id} onClick={() => setCommTab(id)} style={{
              padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
              color: commTab === id ? 'var(--color-primary)' : 'var(--text-muted)',
              fontWeight: commTab === id ? 700 : 400, borderBottom: commTab === id ? '2px solid var(--color-primary)' : '2px solid transparent',
              fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6
            }}><Icon size={14} /> {label}</button>
          ))}
        </div>
        {commTab === 'discussions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input style={{ ...inp, flex: 1 }} placeholder="Write a message or update..." value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} />
              <button onClick={handleSendMessage} style={btn('primary')}>Send</button>
            </div>
            {discussions.map(d => (
              <div key={d.id} style={{ ...colCard, display: 'flex', gap: 12 }}>
                <Avatar name={d.author} size="xs" />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{d.author}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{d.ts}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.83rem', color: 'var(--text-secondary)' }}>{d.msg}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        {commTab === 'meetings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button onClick={() => setShowMeetingForm(!showMeetingForm)} style={{ ...btn('primary'), alignSelf: 'flex-start' }}><Plus size={13} /> Schedule Meeting</button>
            {showMeetingForm && (
              <form onSubmit={handleAddMeeting} style={{ ...colCard, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ gridColumn: '1/-1' }}><label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Meeting Title</label><input style={inp} required value={meetingForm.title} onChange={e => setMeetingForm(p => ({ ...p, title: e.target.value }))} /></div>
                <div><label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Date</label><input style={inp} type="date" value={meetingForm.date} onChange={e => setMeetingForm(p => ({ ...p, date: e.target.value }))} /></div>
                <div><label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Time</label><input style={inp} type="time" value={meetingForm.time} onChange={e => setMeetingForm(p => ({ ...p, time: e.target.value }))} /></div>
                <div style={{ gridColumn: '1/-1' }}><label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Notes</label><textarea style={{ ...inp, minHeight: 60 }} value={meetingForm.notes} onChange={e => setMeetingForm(p => ({ ...p, notes: e.target.value }))} /></div>
                <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowMeetingForm(false)} style={btn('outline')}>Cancel</button>
                  <button type="submit" style={btn('primary')}>Schedule</button>
                </div>
              </form>
            )}
            {meetings.map(m => (
              <div key={m.id} style={colCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{m.title}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.date} • {m.time}</span>
                </div>
                <p style={{ margin: '0 0 8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{m.notes}</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(m.attendees || []).map((a, i) => <span key={i} style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--bg-app)', padding: '2px 8px', borderRadius: 999 }}>{a}</span>)}
                </div>
                {(m.actions || []).length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 4 }}>ACTION ITEMS</div>
                    {m.actions.map((ac, i) => <div key={i} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', padding: '2px 0' }}>• {ac}</div>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {commTab === 'files' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={btn('primary')}><Upload size={13} /> Upload File</button>
            </div>
            {['Project Documents', 'Design Files', 'Contracts', 'Reports'].map(folder => (
              <div key={folder} style={{ ...colCard }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Folder size={14} style={{ color: '#f59e0b' }} />
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{folder}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({files.filter(f => f.folder === folder).length} files)</span>
                </div>
                {files.filter(f => f.folder === folder).map(f => (
                  <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderTop: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileText size={13} style={{ color: 'var(--color-primary)' }} />
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{f.name}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{f.type} • {f.size} • {f.by}</div>
                      </div>
                    </div>
                    <button style={{ ...btn('outline'), padding: '4px 8px' }}><Download size={12} /></button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* SECTION I: Project Documents */}
      <Section title="Project Documents" icon={FileText}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                {['File Name', 'Category', 'Format', 'Date', 'Size', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {files.map(f => (
                <tr key={f.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>{f.name}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{f.folder}</td>
                  <td style={{ padding: '10px 12px' }}><Badge color="#3b82f6">{f.type}</Badge></td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{f.date}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{f.size}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button style={{ ...btn('outline'), padding: '4px 8px' }}><Download size={12} /></button>
                      <button onClick={() => setFiles(prev => prev.filter(x => x.id !== f.id))} style={{ ...btn('outline'), padding: '4px 8px', color: 'var(--color-danger)' }}><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* SECTION J: Risk Management */}
      <Section title="Risk Management" icon={Shield}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 10, fontWeight: 700, textTransform: 'uppercase' }}>Risk Monitor</div>
            {[
              { label: 'Overdue Tasks', value: taskStats.overdue, color: '#ef4444' },
              { label: 'Budget Overrun', value: usedBudgetPct > 90 ? 'YES' : 'None', color: usedBudgetPct > 90 ? '#ef4444' : '#10b981' },
              { label: 'Resource Shortage', value: 'None', color: '#10b981' },
              { label: 'Client Escalations', value: 0, color: '#10b981' }
            ].map(({ label, value, color }) => (
              <div key={label} style={{ ...colCard, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>{label}</span>
                <Badge color={color}>{value}</Badge>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 10, fontWeight: 700, textTransform: 'uppercase' }}>Active Risk Alerts</div>
            {risks.filter(r => !r.resolved).map(r => (
              <div key={r.id} style={{ ...colCard, marginBottom: 8, borderLeft: `3px solid ${RISK_COLOR[r.level]}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Badge color={RISK_COLOR[r.level]}>{r.level}</Badge>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>{r.title}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{r.desc}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={() => handleResolveRisk(r.id)} style={{ ...btn('primary'), padding: '4px 12px', fontSize: '0.75rem' }}>Resolve</button>
                  <button style={{ ...btn('outline'), padding: '4px 12px', fontSize: '0.75rem', color: '#ef4444' }}>Escalate</button>
                </div>
              </div>
            ))}
            {risks.filter(r => !r.resolved).length === 0 && (
              <div style={{ ...colCard, textAlign: 'center', color: '#10b981' }}>✅ No active risk alerts</div>
            )}
          </div>
        </div>
      </Section>

      {/* SECTION K: Team Performance Analytics */}
      <Section title="Team Performance Analytics" icon={TrendingUp}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
          {performanceGauges.map(g => (
            <div key={g.name} style={{ ...colCard, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ position: 'relative', width: 100, height: 100 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" barSize={10} data={[{ value: g.value, fill: g.fill }]} startAngle={90} endAngle={-270}>
                    <RadialBar background={{ fill: 'rgba(255,255,255,0.04)' }} dataKey="value" />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: g.fill }}>{g.value}%</div>
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>{g.name}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* SECTION L: Activity Feed */}
      <Section title="Recent Project Activity" icon={Activity}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {activityFeed.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '1.1rem' }}>{a.icon}</span>
              <span style={{ flex: 1, fontSize: '0.83rem', color: 'var(--text-secondary)' }}>{a.msg}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{a.ts}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};

export default ProjectDetailPage;
