import React, { useState, useEffect, useRef, useMemo } from 'react';
import './GlobalSearch.css';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { encodeEmployeeId } from '../utils/hashId';
import Avatar from './common/Avatar';
import {
  Search, X, Users, Building2, Network, Briefcase,
  CheckCircle, Calendar, Shield, User, ChevronRight,
  Hash, ArrowUp, ArrowDown, CornerDownLeft
} from 'lucide-react';


const PAGES = [
  { name: 'Dashboard', path: '/', icon: 'hash', desc: 'Analytics & KPI overview' },
  { name: 'Employees', path: '/employees', icon: 'users', desc: 'Manage all staff records' },
  { name: 'Attendance', path: '/attendance', icon: 'calendar', desc: 'Track daily punch-ins' },
  { name: 'Leave Management', path: '/leaves', icon: 'calendar', desc: 'Approve / reject leaves' },
  { name: 'Tasks & Projects', path: '/tasks', icon: 'check', desc: 'Task board & project tracker' },
  { name: 'Payroll', path: '/payroll', icon: 'briefcase', desc: 'Salary disbursement & payslips' },
  { name: 'Departments', path: '/departments', icon: 'building', desc: 'Manage department structure' },
  { name: 'Branches', path: '/branches', icon: 'network', desc: 'Multi-branch management' },
  { name: 'Team Management', path: '/teams', icon: 'users', desc: 'Manage teams, leaders, and projects' },
  { name: 'Roles & Permissions', path: '/permissions', icon: 'shield', desc: 'RBAC access control' },
  { name: 'Security & Audit Logs', path: '/security', icon: 'shield', desc: 'SOC settings and audit logs' },
  { name: 'Reports & Analytics', path: '/reports', icon: 'briefcase', desc: 'Generate data reports' },
  { name: 'Settings', path: '/settings', icon: 'hash', desc: 'System preferences' },
];

const CATEGORY_META = {
  employees: { label: 'Employees', icon: Users, color: '#6366f1' },
  departments: { label: 'Departments', icon: Building2, color: '#10b981' },
  branches: { label: 'Branches', icon: Network, color: '#3b82f6' },
  teams: { label: 'Teams', icon: Users, color: '#f59e0b' },
  tasks: { label: 'Tasks', icon: CheckCircle, color: '#ec4899' },
  leaves: { label: 'Leave Requests', icon: Calendar, color: '#f97316' },
  roles: { label: 'Roles', icon: Shield, color: '#8b5cf6' },
  pages: { label: 'Pages', icon: Hash, color: '#64748b' },
};

const GlobalSearch = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { 
    employees, 
    departments, 
    branches, 
    teams, 
    tasks, 
    leaveRequests, 
    roles, 
    currentUser, 
    currentUserRole, 
    projectsList 
  } = useApp();

  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveFilter('all');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const allowedPages = useMemo(() => {
    if (currentUserRole === 'employee') {
      return [
        { name: 'Dashboard', path: '/', icon: 'hash', desc: 'Personal Workspace' },
        { name: 'Attendance', path: '/attendance', icon: 'calendar', desc: 'My Attendance Logs' },
        { name: 'Leave Management', path: '/leaves', icon: 'calendar', desc: 'My Leave Applications' },
        { name: 'Tasks & Projects', path: '/tasks', icon: 'check', desc: 'My Work Items' },
      ];
    }
    return PAGES;
  }, [currentUserRole]);

  const allowedCategoryMeta = useMemo(() => {
    if (currentUserRole === 'employee') {
      return {
        projects: { label: 'Projects', icon: Briefcase, color: '#3b82f6' },
        tasks: { label: 'Tasks', icon: CheckCircle, color: '#ec4899' },
        leaves: { label: 'Leave Requests', icon: Calendar, color: '#f97316' },
        pages: { label: 'Pages', icon: Hash, color: '#64748b' },
      };
    }
    return CATEGORY_META;
  }, [currentUserRole]);

  const q = query.toLowerCase().trim();

  const results = useMemo(() => {
    if (!q) return {};

    const match = (str) => (str || '').toLowerCase().includes(q);

    if (currentUserRole === 'employee') {
      const myTasks = tasks.filter(t => t.assigneeId === currentUser?.id || t.assignedTo?.includes(currentUser?.name));
      const myLeaves = leaveRequests.filter(l => l.employeeId === currentUser?.id);
      
      const matchedProjects = (projectsList || []).filter(p => {
        const isManager = p.manager?.toLowerCase() === currentUser?.name?.toLowerCase();
        const isLeader = p.leader?.toLowerCase() === currentUser?.name?.toLowerCase();
        const isMember = p.members?.some(m => m?.toLowerCase() === currentUser?.name?.toLowerCase());
        const hasTask = p.tasks?.some(t => 
          (t.assigneeId && t.assigneeId === currentUser?.id) || 
          (t.assigneeName && t.assigneeName.toLowerCase() === currentUser?.name?.toLowerCase())
        );
        return isManager || isLeader || isMember || hasTask;
      }).filter(p => match(p.name));

      return {
        projects: matchedProjects.slice(0, 4),
        tasks: myTasks.filter(t => match(t.title) || match(t.project) || match(t.status)).slice(0, 4),
        leaves: myLeaves.filter(l => match(l.type) || match(l.status)).slice(0, 4),
        pages: allowedPages.filter(p => match(p.name) || match(p.desc)).slice(0, 4),
      };
    }

    return {
      employees: employees.filter(e =>
        match(e.name) || match(e.id) || match(e.designation) ||
        match(e.department) || match(e.email) || match(e.branch) ||
        match(e.role) || match(e.team)
      ).slice(0, 6),

      departments: departments.filter(d =>
        match(d.name) || match(d.head) || match(d.branch)
      ).slice(0, 4),

      branches: branches.filter(b =>
        match(b.name) || match(b.country) || match(b.manager)
      ).slice(0, 4),

      teams: teams.filter(t =>
        match(t.name) || match(t.dept || t.department) || match(t.leader || t.teamLeader)
      ).slice(0, 4),

      tasks: tasks.filter(t =>
        match(t.title) || match(t.project) || match(t.assigneeName) || match(t.status)
      ).slice(0, 4),

      leaves: leaveRequests.filter(l =>
        match(l.employeeName) || match(l.type) || match(l.status) || match(l.department)
      ).slice(0, 4),

      roles: roles.filter(r =>
        match(r.name) || match(r.description)
      ).slice(0, 4),

      pages: PAGES.filter(p =>
        match(p.name) || match(p.desc)
      ).slice(0, 4),
    };
  }, [q, employees, tasks, leaveRequests, roles, projectsList, currentUser, currentUserRole, allowedPages]);

  // Flatten all results for keyboard nav
  const flatResults = useMemo(() => {
    if (!q) return [];
    const allCategories = Object.entries(results);
    const flat = [];
    for (const [cat, items] of allCategories) {
      if (activeFilter !== 'all' && activeFilter !== cat) continue;
      for (const item of items) {
        flat.push({ cat, item });
      }
    }
    return flat;
  }, [results, activeFilter, q]);

  const totalResults = Object.values(results).reduce((s, a) => s + a.length, 0);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (!isOpen) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx(i => Math.min(i + 1, flatResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        const sel = flatResults[selectedIdx];
        if (sel) handleSelect(sel.cat, sel.item);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, flatResults, selectedIdx]);

  // Auto-scroll selected item into view
  useEffect(() => {
    setSelectedIdx(0);
  }, [query, activeFilter]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selectedIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  const handleSelect = (cat, item) => {
    onClose();
    switch (cat) {
      case 'employees': navigate(`/employees/${encodeEmployeeId(item.id)}`); break;
      case 'departments': navigate('/departments'); break;
      case 'branches': navigate('/branches'); break;
      case 'teams': navigate('/teams'); break;
      case 'projects': navigate('/projects'); break;
      case 'tasks': navigate('/tasks'); break;
      case 'leaves': navigate('/leaves'); break;
      case 'roles': navigate('/permissions'); break;
      case 'pages': navigate(item.path); break;
      default: break;
    }
  };

  const getStatusColor = (status) => {
    const map = { Active: '#10b981', Inactive: '#64748b', 'On Leave': '#f59e0b', Pending: '#f97316', Approved: '#10b981', Rejected: '#ef4444', Done: '#10b981', 'In Progress': '#6366f1', 'To Do': '#64748b', 'In Review': '#f59e0b' };
    return map[status] || '#64748b';
  };

  const renderItem = (cat, item, globalIdx) => {
    const isSelected = globalIdx === selectedIdx;
    const base = `gs-result-item ${isSelected ? 'selected' : ''}`;

    switch (cat) {
      case 'employees':
        return (
          <div key={item.id} className={base} data-idx={globalIdx} onClick={() => handleSelect(cat, item)}>
            <Avatar name={item.name} size="sm" src={item.avatar || item.photoUrl} />
            <div className="gs-item-info">
              <span className="gs-item-primary">{item.name}</span>
              <span className="gs-item-secondary">{item.designation} · {item.department} · {item.branch}</span>
            </div>
            <span className="gs-item-tag" style={{ color: getStatusColor(item.status) }}>{item.status}</span>
            <ChevronRight size={14} className="gs-arrow" />
          </div>
        );

      case 'departments':
        return (
          <div key={item.id} className={base} data-idx={globalIdx} onClick={() => handleSelect(cat, item)}>
            <div className="gs-icon-dot" style={{ background: item.color + '20', color: item.color }}>
              <Building2 size={14} />
            </div>
            <div className="gs-item-info">
              <span className="gs-item-primary">{item.name}</span>
              <span className="gs-item-secondary">Head: {item.head} · {item.headCount} employees</span>
            </div>
            <ChevronRight size={14} className="gs-arrow" />
          </div>
        );

      case 'branches':
        return (
          <div key={item.id} className={base} data-idx={globalIdx} onClick={() => handleSelect(cat, item)}>
            <span className="gs-flag">{item.flag}</span>
            <div className="gs-item-info">
              <span className="gs-item-primary">{item.name}</span>
              <span className="gs-item-secondary">Manager: {item.manager} · {item.employeeCount} staff</span>
            </div>
            <ChevronRight size={14} className="gs-arrow" />
          </div>
        );

      case 'teams':
        return (
          <div key={item.id} className={base} data-idx={globalIdx} onClick={() => handleSelect(cat, item)}>
            <div className="gs-icon-dot" style={{ background: '#f59e0b20', color: '#f59e0b' }}>
              <Users size={14} />
            </div>
            <div className="gs-item-info">
              <span className="gs-item-primary">{item.name}</span>
              <span className="gs-item-secondary">TL: {item.leader} · {item.dept} · {item.count} members</span>
            </div>
            <ChevronRight size={14} className="gs-arrow" />
          </div>
        );

      case 'projects':
        return (
          <div key={item.id} className={base} data-idx={globalIdx} onClick={() => handleSelect(cat, item)}>
            <div className="gs-icon-dot" style={{ background: '#3b82f620', color: '#3b82f6' }}>
              <Briefcase size={14} />
            </div>
            <div className="gs-item-info">
              <span className="gs-item-primary">{item.name}</span>
              <span className="gs-item-secondary">Status: {item.status} · Dept: {item.department}</span>
            </div>
            <ChevronRight size={14} className="gs-arrow" />
          </div>
        );

      case 'tasks':
        return (
          <div key={item.id} className={base} data-idx={globalIdx} onClick={() => handleSelect(cat, item)}>
            <div className="gs-icon-dot" style={{ background: '#ec489920', color: '#ec4899' }}>
              <CheckCircle size={14} />
            </div>
            <div className="gs-item-info">
              <span className="gs-item-primary">{item.title}</span>
              <span className="gs-item-secondary">{item.project} · {item.assigneeName}</span>
            </div>
            <span className="gs-item-tag" style={{ color: getStatusColor(item.status) }}>{item.status}</span>
            <ChevronRight size={14} className="gs-arrow" />
          </div>
        );

      case 'leaves':
        return (
          <div key={item.id} className={base} data-idx={globalIdx} onClick={() => handleSelect(cat, item)}>
            <div className="gs-icon-dot" style={{ background: '#f9731620', color: '#f97316' }}>
              <Calendar size={14} />
            </div>
            <div className="gs-item-info">
              <span className="gs-item-primary">{item.employeeName}</span>
              <span className="gs-item-secondary">{item.type} · {item.fromDate} → {item.toDate}</span>
            </div>
            <span className="gs-item-tag" style={{ color: getStatusColor(item.status) }}>{item.status}</span>
            <ChevronRight size={14} className="gs-arrow" />
          </div>
        );

      case 'roles':
        return (
          <div key={item.id} className={base} data-idx={globalIdx} onClick={() => handleSelect(cat, item)}>
            <div className="gs-icon-dot" style={{ background: '#8b5cf620', color: '#8b5cf6' }}>
              <Shield size={14} />
            </div>
            <div className="gs-item-info">
              <span className="gs-item-primary">{item.name}</span>
              <span className="gs-item-secondary">{item.userCount} users · {item.description.slice(0, 50)}…</span>
            </div>
            <ChevronRight size={14} className="gs-arrow" />
          </div>
        );

      case 'pages':
        return (
          <div key={item.path} className={base} data-idx={globalIdx} onClick={() => handleSelect(cat, item)}>
            <div className="gs-icon-dot" style={{ background: '#64748b20', color: '#94a3b8' }}>
              <Hash size={14} />
            </div>
            <div className="gs-item-info">
              <span className="gs-item-primary">{item.name}</span>
              <span className="gs-item-secondary">{item.desc}</span>
            </div>
            <span className="gs-item-tag gs-page-tag">Page</span>
            <ChevronRight size={14} className="gs-arrow" />
          </div>
        );

      default: return null;
    }
  };

  if (!isOpen) return null;

  const filters = ['all', ...Object.keys(allowedCategoryMeta)];
  let globalIdx = 0;

  const visibleCategories = Object.entries(results).filter(([cat, items]) => {
    if (activeFilter !== 'all' && activeFilter !== cat) return false;
    return items.length > 0;
  });

  return (
    <div className="gs-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="gs-modal animate-slide-up">

        {/* Search Input */}
        <div className="gs-header">
          <Search size={18} className="gs-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="gs-input"
            placeholder={
              currentUserRole === 'employee'
                ? "Search tasks, projects, leaves..."
                : "Search employees, branches, departments, teams, tasks…"
            }
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button className="gs-clear-btn" onClick={() => setQuery('')}>
              <X size={16} />
            </button>
          )}
          <button className="gs-close-btn" onClick={onClose}>
            <kbd>Esc</kbd>
          </button>
        </div>

        {/* Category Filters */}
        <div className="gs-filters">
          {filters.map(f => {
            const meta = allowedCategoryMeta[f];
            const count = f === 'all' ? totalResults : (results[f]?.length || 0);
            return (
              <button
                key={f}
                className={`gs-filter-btn ${activeFilter === f ? 'active' : ''}`}
                onClick={() => setActiveFilter(f)}
              >
                {f === 'all' ? 'All' : meta.label}
                {q && count > 0 && <span className="gs-filter-count">{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Results */}
        <div className="gs-body" ref={listRef}>
          {!q ? (
            <div className="gs-empty-state">
              <Search size={40} className="gs-empty-icon" />
              <p className="gs-empty-title">Global Search</p>
              <p className="gs-empty-desc">
                {currentUserRole === 'employee'
                  ? "Search across your tasks, projects, leaves and pages"
                  : "Search across employees, branches, departments, teams, tasks, leaves, roles and pages"}
              </p>
              <div className="gs-quick-nav">
                {allowedPages.slice(0, 6).map(p => (
                  <button key={p.path} className="gs-quick-btn" onClick={() => { navigate(p.path); onClose(); }}>
                    <Hash size={12} />
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          ) : totalResults === 0 ? (
            <div className="gs-empty-state">
              <Search size={36} className="gs-empty-icon" />
              <p className="gs-empty-title">No results for "{query}"</p>
              <p className="gs-empty-desc">
                {currentUserRole === 'employee'
                  ? "Try a different keyword — task title, project name, or status"
                  : "Try a different keyword — employee name, ID, department, or branch"}
              </p>
            </div>
          ) : (
            visibleCategories.map(([cat, items]) => {
              const meta = allowedCategoryMeta[cat];
              const Icon = meta.icon;
              return (
                <div key={cat} className="gs-category-section">
                  <div className="gs-category-header">
                    <Icon size={13} style={{ color: meta.color }} />
                    <span>{meta.label}</span>
                    <span className="gs-cat-count">{items.length}</span>
                  </div>
                  {items.map(item => {
                    const idx = globalIdx++;
                    return renderItem(cat, item, idx);
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer hints */}
        {q && totalResults > 0 && (
          <div className="gs-footer">
            <span className="gs-hint"><ArrowUp size={11} /> <ArrowDown size={11} /> Navigate</span>
            <span className="gs-hint"><CornerDownLeft size={11} /> Select</span>
            <span className="gs-hint"><kbd>Esc</kbd> Close</span>
            <span className="gs-result-count">{totalResults} result{totalResults !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalSearch;
