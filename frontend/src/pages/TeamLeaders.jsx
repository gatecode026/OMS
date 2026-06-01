import React, { useState, useMemo } from 'react';
import './TeamLeaders.css';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import Button from '../components/common/Button';
import Avatar from '../components/common/Avatar';
import Badge from '../components/common/Badge';
import Skeleton from '../components/common/Skeleton';
import Modal from '../components/common/Modal';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell
} from 'recharts';
import {
  Award, Search, User, Mail, Users, CheckCircle2, Clock, ArrowUpRight, Lock, Shield, Plus, Check, Percent
} from 'lucide-react';

const initialLeaders = [
  { id: 'EMP-001', name: 'Rahul Sharma', email: 'rahul.sharma@enterprise.com', team: 'Development Team', dept: 'IT', exp: '8 years senior track', score: 98 },
  { id: 'EMP-002', name: 'Priya Singh', email: 'priya.singh@enterprise.com', team: 'Sales Team A', dept: 'Sales', exp: '6 years lead track', score: 94 },
  { id: 'EMP-003', name: 'Amit Kumar', email: 'amit.kumar@enterprise.com', team: 'Marketing Team', dept: 'Marketing', exp: '5 years execution track', score: 92 },
  { id: 'EMP-004', name: 'Sneha Patel', email: 'sneha.patel@enterprise.com', team: 'HR Operations', dept: 'HR', exp: '7 years management track', score: 89 },
  { id: 'EMP-005', name: 'Vikram Mehta', email: 'vikram.mehta@enterprise.com', team: 'Design Team', dept: 'IT', exp: '6 years creative track', score: 91 },
  { id: 'EMP-006', name: 'Kavita Joshi', email: 'kavita.joshi@enterprise.com', team: 'Finance Team', dept: 'Finance', exp: '7 years analytical track', score: 87 },
  { id: 'EMP-007', name: 'Raj Verma', email: 'raj.verma@enterprise.com', team: 'Support Team', dept: 'Operations', exp: '5 years client-facing track', score: 85 },
  { id: 'EMP-008', name: 'Neha Gupta', email: 'neha.gupta@enterprise.com', team: 'Research Team', dept: 'IT', exp: '4 years research track', score: 93 }
];

const mockPerformanceHistory = [
  { month: 'Jan', rating: 88 },
  { month: 'Feb', rating: 90 },
  { month: 'Mar', rating: 91 },
  { month: 'Apr', rating: 94 },
  { month: 'May', rating: 95 },
  { month: 'Jun', rating: 98 }
];

const TeamLeaders = () => {
  const isLoading = usePageLoading(600);
  const { addToast } = useApp();

  const [leaders, setLeaders] = useState(initialLeaders);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Modals state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [changeModalOpen, setChangeModalOpen] = useState(false);
  const [changeTeamModalOpen, setChangeTeamModalOpen] = useState(false);
  const [permsModalOpen, setPermsModalOpen] = useState(false);
  const [perfModalOpen, setPerfModalOpen] = useState(false);
  const [activeLeader, setActiveLeader] = useState(null);

  // Modal forms state
  const [newLeader, setNewLeader] = useState({ name: '', team: '', dept: 'IT', exp: '', score: 90 });
  const [transferTarget, setTransferTarget] = useState('');
  const [teamTarget, setTeamTarget] = useState('');
  const [selectedPerms, setSelectedPerms] = useState({
    tasks: true,
    attendance: true,
    performance: true,
    transfer: false,
    documents: true
  });

  // Filtered leaders
  const filteredLeaders = useMemo(() => {
    return leaders.filter(l => {
      const matchSearch = l.name.toLowerCase().includes(search.toLowerCase()) ||
                          l.id.toLowerCase().includes(search.toLowerCase()) ||
                          l.team.toLowerCase().includes(search.toLowerCase());
      const matchDept = deptFilter ? l.dept === deptFilter : true;
      return matchSearch && matchDept;
    });
  }, [leaders, search, deptFilter]);

  // Derived stats
  const stats = useMemo(() => {
    const total = leaders.length;
    const avgScore = total > 0 ? Math.round(leaders.reduce((sum, l) => sum + l.score, 0) / total) : 0;
    const highest = total > 0 ? [...leaders].sort((a, b) => b.score - a.score)[0] : null;
    return { total, avgScore, highest };
  }, [leaders]);

  const handleCreateLeader = (e) => {
    e.preventDefault();
    if (!newLeader.name || !newLeader.team || !newLeader.exp) {
      addToast('danger', 'Please fill in all required fields.');
      return;
    }
    const created = {
      id: 'EMP-' + Math.floor(Math.random() * 900 + 100),
      name: newLeader.name,
      email: newLeader.name.toLowerCase().replace(' ', '.') + '@enterprise.com',
      team: newLeader.team,
      dept: newLeader.dept,
      exp: newLeader.exp,
      score: parseInt(newLeader.score) || 90
    };
    setLeaders(prev => [created, ...prev]);
    setAssignModalOpen(false);
    setNewLeader({ name: '', team: '', dept: 'IT', exp: '', score: 90 });
    addToast('success', `${created.name} successfully assigned as Leader!`);
  };

  const handleChangeLeaderSubmit = (e) => {
    e.preventDefault();
    if (!transferTarget) {
      addToast('danger', 'Please specify a transfer candidate.');
      return;
    }
    setLeaders(prev => prev.map(l => {
      if (l.id === activeLeader.id) {
        return {
          ...l,
          name: transferTarget,
          email: transferTarget.toLowerCase().replace(' ', '.') + '@enterprise.com',
          score: 90
        };
      }
      return l;
    }));
    setChangeModalOpen(false);
    addToast('success', `Leadership of ${activeLeader.team} successfully transferred to ${transferTarget}.`);
    setTransferTarget('');
  };

  const handleChangeTeamSubmit = (e) => {
    e.preventDefault();
    if (!teamTarget) {
      addToast('danger', 'Please select a new team.');
      return;
    }
    setLeaders(prev => prev.map(l => {
      if (l.id === activeLeader.id) {
        return {
          ...l,
          team: teamTarget
        };
      }
      return l;
    }));
    setChangeTeamModalOpen(false);
    addToast('success', `Team for ${activeLeader.name} successfully updated to ${teamTarget}.`);
    setTeamTarget('');
  };

  const handleSavePermissions = () => {
    setPermsModalOpen(false);
    addToast('success', `Permissions updated successfully for ${activeLeader.name}.`);
  };

  if (isLoading) {
    return (
      <div className="leaders-page">
        <div className="leaders-stats-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="leader-stat-card" style={{ height: 110 }}>
              <Skeleton variant="rect" height="100%" />
            </div>
          ))}
        </div>
        <div style={{ height: 400, marginTop: 20 }} className="leader-stat-card">
          <Skeleton variant="rect" height="100%" />
        </div>
      </div>
    );
  }

  return (
    <div className="leaders-page">
      {/* Header */}
      <div className="leaders-page-header">
        <div className="header-left">
          <div className="header-icon-wrap">
            <Award size={18} />
          </div>
          <div>
            <h2 className="syne-heading">Team Leader Management</h2>
            <p className="page-desc">
              Monitor leader performances, update permissions, assign new leaders, and manage operational command structures.
            </p>
          </div>
        </div>
        <div>
          <Button variant="primary" onClick={() => setAssignModalOpen(true)} icon={Plus} size="sm">
            Assign Leader
          </Button>
        </div>
      </div>

      {/* Summary Stats Grid */}
      <div className="leaders-stats-grid">
        <div className="leader-stat-card">
          <div className="leader-stat-card-header">
            <div className="leader-stat-icon-box icon-purple">
              <Award size={16} />
            </div>
            <Badge variant="info">Active Roster</Badge>
          </div>
          <div className="leader-stat-value">{stats.total}</div>
          <div>
            <span className="leader-stat-label">Total Leaders</span>
            <div className="leader-stat-desc">Designated team commanders</div>
          </div>
        </div>

        <div className="leader-stat-card">
          <div className="leader-stat-card-header">
            <div className="leader-stat-icon-box icon-blue">
              <Percent size={16} />
            </div>
            <Badge variant="success">Steady</Badge>
          </div>
          <div className="leader-stat-value">{stats.avgScore}%</div>
          <div>
            <span className="leader-stat-label">Avg Performance</span>
            <div className="leader-stat-desc">Overall leader velocity index</div>
          </div>
        </div>

        <div className="leader-stat-card">
          <div className="leader-stat-card-header">
            <div className="leader-stat-icon-box icon-green">
              <CheckCircle2 size={16} />
            </div>
            <Badge variant="success">Top Rank</Badge>
          </div>
          <div className="leader-stat-value">{stats.highest ? stats.highest.score : 0}%</div>
          <div>
            <span className="leader-stat-label">Highest Score</span>
            <div className="leader-stat-desc">Held by {stats.highest ? stats.highest.name : 'N/A'}</div>
          </div>
        </div>

        <div className="leader-stat-card">
          <div className="leader-stat-card-header">
            <div className="leader-stat-icon-box icon-amber">
              <Shield size={16} />
            </div>
            <Badge variant="info">100% Secure</Badge>
          </div>
          <div className="leader-stat-value">Active</div>
          <div>
            <span className="leader-stat-label">Permissions Sync</span>
            <div className="leader-stat-desc">Roles verified in last audit logs</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="leaders-filters-card">
        <div className="leaders-filters-row">
          <div className="leaders-search-wrapper">
            <Search size={16} className="leaders-search-icon" />
            <input
              className="leaders-search-input"
              placeholder="Search by Leader name, ID, or Assigned Team..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="leaders-filter-group">
            <select
              className="leaders-filter-select"
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
            >
              <option value="">All Departments</option>
              <option value="IT">IT (Tech)</option>
              <option value="HR">HR</option>
              <option value="Marketing">Marketing</option>
              <option value="Sales">Sales</option>
              <option value="Finance">Finance</option>
              <option value="Operations">Operations</option>
            </select>
          </div>
          
          <div style={{ justifySelf: 'end' }}>
            <span className="text-muted text-xs">
              Showing {filteredLeaders.length} of {leaders.length} Leaders
            </span>
          </div>
        </div>
      </div>

      {/* Leaders Cards Grid */}
      <div className="leaders-cards-grid">
        {filteredLeaders.map(leader => (
          <div key={leader.id} className="leader-detail-card">
            <div className="leader-card-top">
              <Avatar name={leader.name} size="md" />
              <div className="leader-info-primary">
                <h3 className="leader-name">{leader.name}</h3>
                <span className="leader-id-tag">ID: {leader.id}</span>
              </div>
            </div>

            <div className="leader-card-details">
              <div className="detail-line">
                <strong>Email Contact:</strong>
                <span>{leader.email}</span>
              </div>
              <div className="detail-line">
                <strong>Assigned Team:</strong>
                <span>{leader.team}</span>
              </div>
              <div className="detail-line">
                <strong>Department:</strong>
                <Badge variant={leader.dept === 'IT' ? 'info' : leader.dept === 'Sales' ? 'success' : 'warning'}>
                  {leader.dept}
                </Badge>
              </div>
              <div className="detail-line">
                <strong>Experience:</strong>
                <span>{leader.exp}</span>
              </div>
              <div className="detail-line">
                <strong>Performance Rating:</strong>
                <span className="text-success bold-text">{leader.score}%</span>
              </div>
            </div>

            <div className="leader-card-actions">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setActiveLeader(leader);
                  setChangeModalOpen(true);
                }}
              >
                Change Leader
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setActiveLeader(leader);
                  setTeamTarget(leader.team);
                  setChangeTeamModalOpen(true);
                }}
              >
                Change Team
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setActiveLeader(leader);
                  setSelectedPerms({
                    tasks: true,
                    attendance: true,
                    performance: leader.score >= 90,
                    transfer: false,
                    documents: true
                  });
                  setPermsModalOpen(true);
                }}
              >
                Permissions
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={ArrowUpRight}
                onClick={() => {
                  setActiveLeader(leader);
                  setPerfModalOpen(true);
                }}
              >
                View Performance
              </Button>
            </div>
          </div>
        ))}

        {filteredLeaders.length === 0 && (
          <div className="leader-detail-card" style={{ gridColumn: 'span 3', padding: '60px 0', textAlign: 'center' }}>
            <span className="text-muted text-sm">No team leaders match your active filter settings.</span>
          </div>
        )}
      </div>

      {/* ── Assign Leader Modal ── */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign New Team Leader"
        size="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
            <Button variant="secondary" onClick={() => setAssignModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateLeader}>Assign Role</Button>
          </div>
        }
      >
        <form onSubmit={handleCreateLeader} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="leaders-filter-group">
            <label className="leaders-filter-label">Leader Name *</label>
            <input
              type="text"
              placeholder="e.g. Rahul Sharma"
              style={{ padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none' }}
              value={newLeader.name}
              onChange={e => setNewLeader(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          <div className="leaders-filter-group">
            <label className="leaders-filter-label">Assigned Team *</label>
            <input
              type="text"
              placeholder="e.g. Sales Team B"
              style={{ padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none' }}
              value={newLeader.team}
              onChange={e => setNewLeader(prev => ({ ...prev, team: e.target.value }))}
              required
            />
          </div>
          <div className="leaders-filter-group">
            <label className="leaders-filter-label">Department *</label>
            <select
              className="leaders-filter-select"
              value={newLeader.dept}
              onChange={e => setNewLeader(prev => ({ ...prev, dept: e.target.value }))}
            >
              <option value="IT">IT (Tech)</option>
              <option value="HR">HR</option>
              <option value="Marketing">Marketing</option>
              <option value="Sales">Sales</option>
              <option value="Finance">Finance</option>
              <option value="Operations">Operations</option>
            </select>
          </div>
          <div className="leaders-filter-group">
            <label className="leaders-filter-label">Experience Track *</label>
            <input
              type="text"
              placeholder="e.g. 5 years execution track"
              style={{ padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none' }}
              value={newLeader.exp}
              onChange={e => setNewLeader(prev => ({ ...prev, exp: e.target.value }))}
              required
            />
          </div>
          <div className="leaders-filter-group">
            <label className="leaders-filter-label">Initial Performance Score (%)</label>
            <input
              type="number"
              style={{ padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none' }}
              value={newLeader.score}
              onChange={e => setNewLeader(prev => ({ ...prev, score: e.target.value }))}
            />
          </div>
        </form>
      </Modal>

      {/* ── Change Leader Modal ── */}
      {activeLeader && (
        <Modal
          isOpen={changeModalOpen}
          onClose={() => setChangeModalOpen(false)}
          title={`Change Leader for ${activeLeader.team}`}
          size="md"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
              <Button variant="secondary" onClick={() => setChangeModalOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleChangeLeaderSubmit}>Confirm Transfer</Button>
            </div>
          }
        >
          <form onSubmit={handleChangeLeaderSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p className="text-sm text-secondary" style={{ marginBottom: '8px' }}>
              You are replacing <strong>{activeLeader.name}</strong> as the leader of the <strong>{activeLeader.team}</strong>.
            </p>
            <div className="leaders-filter-group">
              <label className="leaders-filter-label">New Leader Name *</label>
              <input
                type="text"
                placeholder="Enter transfer candidate name"
                style={{ padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none' }}
                value={transferTarget}
                onChange={e => setTransferTarget(e.target.value)}
                required
              />
            </div>
          </form>
        </Modal>
      )}

      {/* ── Change Team Modal ── */}
      {activeLeader && (
        <Modal
          isOpen={changeTeamModalOpen}
          onClose={() => setChangeTeamModalOpen(false)}
          title={`Change Team for ${activeLeader.name}`}
          size="md"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
              <Button variant="secondary" onClick={() => setChangeTeamModalOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleChangeTeamSubmit}>Confirm Team Change</Button>
            </div>
          }
        >
          <form onSubmit={handleChangeTeamSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p className="text-sm text-secondary" style={{ marginBottom: '8px' }}>
              Select a new assigned team for <strong>{activeLeader.name}</strong>. Current: <strong>{activeLeader.team}</strong>.
            </p>
            <div className="leaders-filter-group">
              <label className="leaders-filter-label">Target Team *</label>
              <select
                className="leaders-filter-select"
                value={teamTarget}
                onChange={e => setTeamTarget(e.target.value)}
                required
              >
                <option value="Development Team">Development Team</option>
                <option value="Sales Team A">Sales Team A</option>
                <option value="Marketing Team">Marketing Team</option>
                <option value="HR Operations">HR Operations</option>
                <option value="Design Team">Design Team</option>
                <option value="Finance Team">Finance Team</option>
                <option value="Support Team">Support Team</option>
                <option value="Research Team">Research Team</option>
                <option value="Sales Team B">Sales Team B</option>
                <option value="IT Infrastructure">IT Infrastructure</option>
              </select>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Permissions Modal ── */}
      {activeLeader && (
        <Modal
          isOpen={permsModalOpen}
          onClose={() => setPermsModalOpen(false)}
          title={`Leader Permissions: ${activeLeader.name}`}
          size="md"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
              <Button variant="secondary" onClick={() => setPermsModalOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleSavePermissions}>Save Permissions</Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Lock size={16} className="text-primary-c" />
              <span className="text-sm bold-text">Review and update access levels</span>
            </div>
            <div className="permissions-grid">
              <div className="permission-checkbox-item" onClick={() => setSelectedPerms(prev => ({ ...prev, tasks: !prev.tasks }))}>
                <input type="checkbox" checked={selectedPerms.tasks} readOnly />
                <span className="permission-label">Task Allocation</span>
              </div>
              <div className="permission-checkbox-item" onClick={() => setSelectedPerms(prev => ({ ...prev, attendance: !prev.attendance }))}>
                <input type="checkbox" checked={selectedPerms.attendance} readOnly />
                <span className="permission-label">Attendance Review</span>
              </div>
              <div className="permission-checkbox-item" onClick={() => setSelectedPerms(prev => ({ ...prev, performance: !prev.performance }))}>
                <input type="checkbox" checked={selectedPerms.performance} readOnly />
                <span className="permission-label">Performance Review</span>
              </div>
              <div className="permission-checkbox-item" onClick={() => setSelectedPerms(prev => ({ ...prev, transfer: !prev.transfer }))}>
                <input type="checkbox" checked={selectedPerms.transfer} readOnly />
                <span className="permission-label">Staff Transfer</span>
              </div>
              <div className="permission-checkbox-item" style={{ gridColumn: 'span 2' }} onClick={() => setSelectedPerms(prev => ({ ...prev, documents: !prev.documents }))}>
                <input type="checkbox" checked={selectedPerms.documents} readOnly />
                <span className="permission-label">Document Approvals & SOP updates</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── View Performance Modal ── */}
      {activeLeader && (
        <Modal
          isOpen={perfModalOpen}
          onClose={() => setPerfModalOpen(false)}
          title={`Performance History: ${activeLeader.name}`}
          size="md"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
              <Button variant="secondary" onClick={() => setPerfModalOpen(false)}>Close</Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="leader-perf-chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockPerformanceHistory.map(h => ({ ...h, rating: h.month === 'Jun' ? activeLeader.score : h.rating - (98 - activeLeader.score) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <YAxis domain={[70, 100]} stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                  <Bar dataKey="rating" fill="var(--color-primary)" radius={[4, 4, 0, 0]} barSize={25}>
                    {mockPerformanceHistory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 5 ? '#10b981' : '#8b5cf6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <span className="leaders-filter-label" style={{ marginBottom: 6, display: 'block' }}>Key Achievements & SOP Audits</span>
              <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li>Achieved {activeLeader.score}% department compliance rating in Q2.</li>
                <li>Completed 100% of project milestone schedules under {activeLeader.team}.</li>
                <li>No security or permission violations logged during current sprint.</li>
              </ul>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default TeamLeaders;
