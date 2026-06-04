import React, { useState, useMemo } from 'react';
import './Announcements.css';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import DataTable from '../components/common/DataTable';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Avatar from '../components/common/Avatar';
import Skeleton from '../components/common/Skeleton';
import {
  Megaphone,
  Plus,
  Pin,
  Clock,
  Eye,
  Trash2,
  CheckCircle,
  FileText,
  AlertTriangle,
  Send,
  MessageSquare,
  ThumbsUp,
  Download,
  Users,
  Building,
  Calendar,
  ShieldAlert,
  Sliders,
  Database,
  Search,
  Filter,
  Check,
  X,
  Copy,
  Mail,
  Flame,
  FileDown,
  Info,
  ExternalLink,
  Laptop
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const Announcements = () => {
  const isLoading = usePageLoading(600);
  const { employees, showConfirm, currentUserRole } = useApp();

  // Selected view perspective override
  const [perspective, setPerspective] = useState(currentUserRole || 'super_admin');

  // Sub-navigation tabs
  const [activeTab, setActiveTab] = useState('board');

  // Categorization inside notice board
  const [boardCategory, setBoardCategory] = useState('All');

  // --- Search & Filters ---
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Creation/Edit modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '', category: 'Company', priority: 'Medium', description: '', publishDate: '', expiryDate: '',
    audienceType: 'All', targetAudience: 'All Employees', deliveryChannels: ['Dashboard']
  });

  // Selected announcement for detail view & comments
  const [selectedAnn, setSelectedAnn] = useState(null);
  const [newCommentText, setNewCommentText] = useState('');

  // Page toast alerts
  const [pageToasts, setPageToasts] = useState([]);
  const addPageToast = (type, message) => {
    const id = Date.now();
    setPageToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setPageToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // --- Seed Data inside local state for full interactivity ---
  const [announcements, setAnnouncements] = useState([
    {
      id: 'ANN-001',
      title: 'Q2 CEO Virtual Townhall Meeting',
      description: 'Join us for our Q2 Townhall where Sarah Connor will share H1 financial performance, strategic milestones, and H2 organizational expansion roadmap. Live Q&A session will take place during the last 20 minutes. Please submit questions beforehand.',
      category: 'Company',
      priority: 'High',
      publishedBy: 'Sarah Connor',
      publishedByRole: 'Super Admin',
      publishDate: '2026-05-28',
      expiryDate: '2026-06-10',
      audienceType: 'All',
      targetAudience: 'All Employees',
      views: 312,
      acknowledgements: 245,
      status: 'Published',
      pinned: true,
      deliveryChannels: ['Dashboard', 'Email'],
      attachments: ['Townhall_Q2_Agenda.pdf', 'Q2_SlideDeck_Preview.pptx'],
      acknowledgedUsers: ['EMP-2026-001', 'EMP-2026-002', 'EMP-2026-003'],
      comments: [
        { id: 1, user: 'Vikram Singh', role: 'Engineering Manager', avatar: '', text: 'Looking forward to the H2 expansion details! Will the product roadmap be discussed?', timestamp: '2 days ago' },
        { id: 2, user: 'Neha Verma', role: 'HR Manager', avatar: '', text: 'Please ensure questions are posted in Slido by June 4th evening.', timestamp: '1 day ago' }
      ],
      likes: 34,
      likedBy: ['EMP-2026-001']
    },
    {
      id: 'ANN-002',
      title: 'New Remote Work Guidelines & Office Core Days',
      description: 'HR is publishing the revised hybrid work guidelines effective June 15th, 2026. Employees are required to spend 2 core days in their respective branches (Tuesdays & Thursdays). Detailed exceptions policies are uploaded here.',
      category: 'HR',
      priority: 'Critical',
      publishedBy: 'Sophia Laurent',
      publishedByRole: 'HR Manager',
      publishDate: '2026-05-30',
      expiryDate: '2026-12-31',
      audienceType: 'All',
      targetAudience: 'All Employees',
      views: 450,
      acknowledgements: 395,
      status: 'Published',
      pinned: true,
      deliveryChannels: ['Dashboard', 'Email', 'Push'],
      attachments: ['Hybrid_Guidelines_2026.pdf'],
      acknowledgedUsers: ['EMP-2026-002', 'EMP-2026-003'],
      comments: [
        { id: 1, user: 'Arjun Mehta', role: 'Developer', avatar: '', text: 'Are the core days mandatory for regional teams as well?', timestamp: '3 days ago' }
      ],
      likes: 56,
      likedBy: []
    },
    {
      id: 'ANN-003',
      title: 'Upcoming System Maintenance & Downtime Window',
      description: 'The core production databases and internal HR system will undergo maintenance on Saturday, June 6th, between 12:00 AM and 04:00 AM IST. All modules will be offline. Please save your sprint commits beforehand.',
      category: 'Emergency',
      priority: 'Critical',
      publishedBy: 'Aarav Sharma',
      publishedByRole: 'Admin',
      publishDate: '2026-06-02',
      expiryDate: '2026-06-07',
      audienceType: 'Department',
      targetAudience: 'Engineering',
      views: 180,
      acknowledgements: 165,
      status: 'Published',
      pinned: false,
      deliveryChannels: ['Dashboard', 'Push'],
      attachments: [],
      acknowledgedUsers: ['EMP-2026-001'],
      comments: [],
      likes: 12,
      likedBy: []
    },
    {
      id: 'ANN-004',
      title: 'Q2 Performance Bonus Distribution Schedule',
      description: 'Schedules for bonus dispersals have been confirmed. Financial payouts will be processed with the June 2026 monthly payroll cycle. Please review the criteria targets linked in the performance tracker portal.',
      category: 'HR',
      priority: 'High',
      publishedBy: 'Sophia Laurent',
      publishedByRole: 'HR Manager',
      publishDate: '2026-06-03',
      expiryDate: '2026-06-30',
      audienceType: 'All',
      targetAudience: 'All Employees',
      views: 289,
      acknowledgements: 210,
      status: 'Published',
      pinned: false,
      deliveryChannels: ['Dashboard', 'Email'],
      attachments: ['Bonus_Distribution_Criteria.xlsx'],
      acknowledgedUsers: [],
      comments: [],
      likes: 45,
      likedBy: []
    },
    {
      id: 'ANN-005',
      title: 'Launch of Q3 Sales Kickoff Campaign',
      description: 'Next quarter sales roadmap and objectives kickoff scheduled for July 1st. Event details and guest speakers agenda details are attached.',
      category: 'Project',
      priority: 'Medium',
      publishedBy: 'Elena Rostova',
      publishedByRole: 'Department Manager',
      publishDate: '2026-06-15',
      expiryDate: '2026-07-02',
      audienceType: 'Department',
      targetAudience: 'Sales',
      views: 0,
      acknowledgements: 0,
      status: 'Scheduled',
      pinned: false,
      deliveryChannels: ['Dashboard'],
      attachments: ['Q3_Kickoff_Details.pdf'],
      acknowledgedUsers: [],
      comments: [],
      likes: 0,
      likedBy: []
    }
  ]);

  // Active Emergency Banner state
  const [activeEmergencyAlert, setActiveEmergencyAlert] = useState({
    isActive: true,
    title: 'URGENT: Bangalore Branch Closure Due to Heavy Rainfall',
    description: 'Due to severe weather warnings in Bangalore, our physical office is closed today, June 4th. All employees are advised to work from home. Stay safe!',
    date: 'June 04, 2026'
  });

  // Employee tracking logs
  const [trackingLogs, setTrackingLogs] = useState([
    { employeeId: 'EMP-2026-001', employeeName: 'Aarav Sharma', department: 'Operations', viewTime: '2026-06-04 10:15', readStatus: 'Viewed', ackStatus: 'Acknowledged', device: 'Chrome / Windows 11' },
    { employeeId: 'EMP-2026-002', employeeName: 'Vikram Singh', department: 'Engineering', viewTime: '2026-06-04 09:30', readStatus: 'Viewed', ackStatus: 'Acknowledged', device: 'Safari / macOS' },
    { employeeId: 'EMP-2026-003', employeeName: 'Ananya Gupta', department: 'Engineering', viewTime: '2026-06-04 11:05', readStatus: 'Viewed', ackStatus: 'Acknowledged', device: 'Chrome / Linux' },
    { employeeId: 'EMP-2026-004', employeeName: 'Rohit Sharma', department: 'Sales', viewTime: '—', readStatus: 'Not Viewed', ackStatus: 'Pending', device: '—' },
    { employeeId: 'EMP-2026-005', employeeName: 'Priya Patel', department: 'Marketing', viewTime: '2026-06-03 16:45', readStatus: 'Viewed', ackStatus: 'Pending', device: 'iOS App' },
    { employeeId: 'EMP-2026-006', employeeName: 'Arjun Mehta', department: 'Engineering', viewTime: '—', readStatus: 'Not Viewed', ackStatus: 'Pending', device: '—' }
  ]);

  // Compliance operations audit logs
  const [auditLogs, setAuditLogs] = useState([
    { id: 'COMM-001', user: 'Sarah Connor', action: 'Created Announcement - Townhall Meeting', timestamp: '2026-05-28 14:30', prevVal: 'None', newVal: 'ANN-001' },
    { id: 'COMM-002', user: 'Sophia Laurent', action: 'Published Policy - Remote Work Guidelines', timestamp: '2026-05-30 10:00', prevVal: 'Draft', newVal: 'ANN-002 (Critical)' },
    { id: 'COMM-003', user: 'Aarav Sharma', action: 'Scheduled Announcement - Q3 Kickoff', timestamp: '2026-06-01 11:15', prevVal: 'Draft', newVal: 'ANN-005 Scheduled' },
    { id: 'COMM-004', user: 'Sophia Laurent', action: 'Triggered Emergency Banner - Bangalore Rain', timestamp: '2026-06-04 07:15', prevVal: 'None', newVal: 'Active Banner' }
  ]);

  // --- Executive Dashboard Metrics ---
  const totalAnnouncements = announcements.length;
  const activeCount = announcements.filter(a => a.status === 'Published').length;
  const scheduledCount = announcements.filter(a => a.status === 'Scheduled').length;
  const expiredCount = announcements.filter(a => a.status === 'Expired').length;
  
  const readRate = 84; // 84% read rate
  const ackRate = 72;  // 72% acknowledgement rate
  const unreadCount = announcements.filter(a => a.status === 'Published' && !a.acknowledgedUsers.includes('EMP-2026-001')).length;
  const totalReach = 450; // Total targeted employees

  // Priority highlight map
  const priorityMap = {
    Critical: { label: 'Critical', bg: 'rgba(239, 68, 68, 0.1)', border: '#ef4444', text: '#ef4444', badge: 'danger' },
    High: { label: 'High', bg: 'rgba(245, 158, 11, 0.1)', border: '#f59e0b', text: '#f59e0b', badge: 'warning' },
    Medium: { label: 'Medium', bg: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6', text: '#3b82f6', badge: 'primary' },
    Normal: { label: 'Normal', bg: 'rgba(107, 114, 128, 0.1)', border: '#6b7280', text: '#9ca3af', badge: 'neutral' }
  };

  // --- Handlers ---
  const handlePinToggle = (id) => {
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, pinned: !a.pinned } : a));
    addPageToast('success', 'Notice pin status updated.');
  };

  const handleDuplicate = (ann) => {
    const duplicated = {
      ...ann,
      id: `ANN-${Date.now().toString().slice(-3)}`,
      title: `${ann.title} (Copy)`,
      publishDate: new Date().toISOString().split('T')[0],
      status: 'Draft',
      views: 0,
      acknowledgements: 0,
      acknowledgedUsers: [],
      comments: []
    };
    setAnnouncements(prev => [...prev, duplicated]);
    addPageToast('success', 'Announcement duplicated as Draft.');
  };

  const handleDelete = (id) => {
    showConfirm(
      'Delete Announcement',
      'Are you sure you want to permanently delete this announcement? This action cannot be undone.',
      () => {
        setAnnouncements(prev => prev.filter(a => a.id !== id));
        addPageToast('warning', 'Announcement deleted successfully.');
        setAuditLogs(prev => [
          { id: `COMM-${Date.now().toString().slice(-3)}`, user: 'Super Admin', action: `Deleted Announcement ${id}`, timestamp: 'Just now', prevVal: 'Published', newVal: 'Deleted' },
          ...prev
        ]);
      },
      'danger'
    );
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    const newAnn = {
      ...createForm,
      id: `ANN-${Date.now().toString().slice(-3)}`,
      publishedBy: 'Aarav Sharma',
      publishedByRole: 'Admin',
      status: createForm.publishDate ? 'Scheduled' : 'Published',
      publishDate: createForm.publishDate || new Date().toISOString().split('T')[0],
      views: 0,
      acknowledgements: 0,
      pinned: false,
      attachments: [],
      acknowledgedUsers: [],
      comments: [],
      likes: 0,
      likedBy: []
    };
    setAnnouncements(prev => [newAnn, ...prev]);
    addPageToast('success', `Announcement ${newAnn.status === 'Scheduled' ? 'scheduled' : 'published'} successfully.`);
    setShowCreateModal(false);
    setAuditLogs(prev => [
      { id: `COMM-${Date.now().toString().slice(-3)}`, user: 'Admin', action: `Created Announcement - ${newAnn.title}`, timestamp: 'Just now', prevVal: 'None', newVal: newAnn.id },
      ...prev
    ]);
  };

  const handleEmergencyTrigger = (type) => {
    setActiveEmergencyAlert({
      isActive: true,
      title: `CRITICAL ALERT: ${type}`,
      description: `Emergency broadcast initiated. Critical systems or offices are affected. All staff check notifications immediately.`,
      date: 'Just Now'
    });
    addPageToast('success', 'Emergency Alert Broadcasted Organization-Wide.');
    setAuditLogs(prev => [
      { id: `COMM-${Date.now().toString().slice(-3)}`, user: 'Admin', action: `Triggered Emergency alert: ${type}`, timestamp: 'Just now', prevVal: 'Inactive', newVal: 'Active Banner' },
      ...prev
    ]);
  };

  const handleAcknowledge = (id) => {
    setAnnouncements(prev => prev.map(a => {
      if (a.id === id) {
        if (a.acknowledgedUsers.includes('EMP-2026-001')) return a;
        return {
          ...a,
          acknowledgements: a.acknowledgements + 1,
          acknowledgedUsers: [...a.acknowledgedUsers, 'EMP-2026-001']
        };
      }
      return a;
    }));

    // Update tracking log
    setTrackingLogs(prev => prev.map(log => {
      if (log.employeeId === 'EMP-2026-001') {
        return {
          ...log,
          ackStatus: 'Acknowledged',
          viewTime: new Date().toISOString().replace('T', ' ').slice(0, 16)
        };
      }
      return log;
    }));

    addPageToast('success', 'Policy / Announcement Acknowledged.');
    
    // update detail overlay state
    if (selectedAnn && selectedAnn.id === id) {
      setSelectedAnn(prev => ({
        ...prev,
        acknowledgements: prev.acknowledgements + 1,
        acknowledgedUsers: [...prev.acknowledgedUsers, 'EMP-2026-001']
      }));
    }
  };

  const handleLike = (id) => {
    setAnnouncements(prev => prev.map(a => {
      if (a.id === id) {
        const hasLiked = a.likedBy.includes('EMP-2026-001');
        const nextLikedBy = hasLiked ? a.likedBy.filter(u => u !== 'EMP-2026-001') : [...a.likedBy, 'EMP-2026-001'];
        return {
          ...a,
          likes: hasLiked ? a.likes - 1 : a.likes + 1,
          likedBy: nextLikedBy
        };
      }
      return a;
    }));

    if (selectedAnn && selectedAnn.id === id) {
      const hasLiked = selectedAnn.likedBy.includes('EMP-2026-001');
      setSelectedAnn(prev => ({
        ...prev,
        likes: hasLiked ? prev.likes - 1 : prev.likes + 1,
        likedBy: hasLiked ? prev.likedBy.filter(u => u !== 'EMP-2026-001') : [...prev.likedBy, 'EMP-2026-001']
      }));
    }
  };

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    const newComment = {
      id: Date.now(),
      user: 'Aarav Sharma',
      role: 'Super Admin',
      text: newCommentText,
      timestamp: 'Just now'
    };
    
    setAnnouncements(prev => prev.map(a => {
      if (a.id === selectedAnn.id) {
        return {
          ...a,
          comments: [...a.comments, newComment]
        };
      }
      return a;
    }));

    setSelectedAnn(prev => ({
      ...prev,
      comments: [...prev.comments, newComment]
    }));

    setNewCommentText('');
    addPageToast('success', 'Comment posted.');
  };

  const handleDeleteComment = (annId, commentId) => {
    setAnnouncements(prev => prev.map(a => {
      if (a.id === annId) {
        return {
          ...a,
          comments: a.comments.filter(c => c.id !== commentId)
        };
      }
      return a;
    }));

    if (selectedAnn && selectedAnn.id === annId) {
      setSelectedAnn(prev => ({
        ...prev,
        comments: prev.comments.filter(c => c.id !== commentId)
      }));
    }
    addPageToast('info', 'Comment deleted by moderator.');
  };

  // Filter Notice Board cards
  const filteredBoardData = useMemo(() => {
    return announcements.filter(a => {
      if (a.status !== 'Published') return false;
      
      const matchesCat = boardCategory === 'All' ? true : a.category === boardCategory;
      const matchesPerspective = perspective === 'employee'
        ? (a.audienceType === 'All' || (a.audienceType === 'Department' && a.targetAudience === 'Operations'))
        : true;

      return matchesCat && matchesPerspective;
    });
  }, [announcements, boardCategory, perspective]);

  // Filter management center records
  const filteredManagementData = useMemo(() => {
    return announcements.filter(row => {
      const matchesSearch = row.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            row.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            row.publishedBy.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCat = filterCategory ? row.category === filterCategory : true;
      const matchesPriority = filterPriority ? row.priority === filterPriority : true;
      const matchesStatus = filterStatus ? row.status === filterStatus : true;

      return matchesSearch && matchesCat && matchesPriority && matchesStatus;
    });
  }, [announcements, searchQuery, filterCategory, filterPriority, filterStatus]);

  // Recharts Chart Mock Series
  const reachTrendsSeries = [
    { name: 'Jan', reach: 240, read: 180 },
    { name: 'Feb', reach: 300, read: 240 },
    { name: 'Mar', reach: 350, read: 290 },
    { name: 'Apr', reach: 410, read: 360 },
    { name: 'May', reach: 430, read: 380 },
    { name: 'Jun', reach: totalReach, read: 395 }
  ];

  const deptEngagementData = [
    { name: 'IT', read: 92, ack: 88 },
    { name: 'Engineering', read: 90, ack: 84 },
    { name: 'HR', read: 95, ack: 92 },
    { name: 'Operations', read: 84, ack: 72 },
    { name: 'Sales', read: 78, ack: 60 }
  ];

  const branchReachData = [
    { name: 'Delhi HQ', value: 240 },
    { name: 'Bangalore Office', value: 120 },
    { name: 'Mumbai Branch', value: 90 }
  ];

  const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

  if (isLoading) {
    return (
      <div className="announcements-page grid-gap">
        <div className="card" style={{ height: '80px' }}><Skeleton variant="rect" height="100%" /></div>
        <div className="stats-row">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card skeleton-card" style={{ height: '100px' }}>
              <Skeleton variant="rect" height="100%" />
            </div>
          ))}
        </div>
        <div className="card" style={{ height: '340px' }}><Skeleton variant="rect" height="100%" /></div>
      </div>
    );
  }

  return (
    <div className="announcements-page flex-column grid-gap">
      
      {/* Toast Alert Feed */}
      <div className="page-toast-container">
        {pageToasts.map(t => (
          <div key={t.id} className={`page-toast border-left-${t.type === 'success' ? 'success' : t.type === 'warning' ? 'warning' : 'info'}`}>
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Emergency Flash Banner */}
      {activeEmergencyAlert.isActive && (
        <div className="emergency-flash-banner animate-slide-up flex-center justify-between">
          <div className="flex-center gap-3">
            <div className="emergency-icon-ring"><Flame size={20} className="text-danger" /></div>
            <div>
              <strong className="emergency-banner-title">{activeEmergencyAlert.title}</strong>
              <p className="emergency-banner-desc font-xsmall text-muted mb-0">{activeEmergencyAlert.description} • {activeEmergencyAlert.date}</p>
            </div>
          </div>
          <div className="flex-center gap-2">
            <button className="flex-center gap-1 font-xsmall badge badge-danger py-1 cursor-pointer" onClick={() => addPageToast('info', 'Karnataka Disaster Response SMS Broadcast completed.')}><ExternalLink size={10} /> SMS Blast</button>
            <button className="action-circle-btn text-muted" onClick={() => setActiveEmergencyAlert(prev => ({ ...prev, isActive: false }))}><X size={14} /></button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="page-header-row announcements-page-header">
        <div>
          <h2>Corporate Notices & Communications</h2>
          <p className="page-desc-text font-small">Centralized digital notice board, emergency broadcast engine, and policy compliance trackers</p>
        </div>

        <div className="flex-center gap-3 wrap-content">
          <div className="flex-center gap-1 perspective-container">
            <span className="text-muted font-small uppercase font-semibold">Perspective:</span>
            <select
              value={perspective}
              onChange={(e) => {
                setPerspective(e.target.value);
                addPageToast('info', `Switched perspective to: ${e.target.value.toUpperCase()}`);
              }}
              className="payroll-selector perspective-select"
            >
              <option value="employee">Employee View</option>
              <option value="team_leader">Team Leader</option>
              <option value="department_manager">Dept Manager</option>
              <option value="branch_admin">HR Manager</option>
              <option value="super_admin">Admin / Super Admin</option>
            </select>
          </div>

          {perspective !== 'employee' && (
            <Button variant="primary" onClick={() => setShowCreateModal(true)} icon={Plus}>
              New Announcement
            </Button>
          )}
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="card tab-bar-card overflow-x-auto">
        <div className="payroll-tabs-list">
          <button onClick={() => setActiveTab('board')} className={`tab-btn ${activeTab === 'board' ? 'active' : ''}`}><Megaphone size={16} />Digital Notice Board</button>
          {perspective !== 'employee' && <button onClick={() => setActiveTab('management')} className={`tab-btn ${activeTab === 'management' ? 'active' : ''}`}><Sliders size={16} />Management Center</button>}
          <button onClick={() => setActiveTab('analytics')} className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}><AreaChart size={16} />Reach & Engagement</button>
          {perspective !== 'employee' && <button onClick={() => setActiveTab('emergency')} className={`tab-btn ${activeTab === 'emergency' ? 'active' : ''}`}><ShieldAlert size={16} />Emergency Hub</button>}
          {perspective !== 'employee' && <button onClick={() => setActiveTab('tracking')} className={`tab-btn ${activeTab === 'tracking' ? 'active' : ''}`}><Users size={16} />Compliance Audits</button>}
        </div>
      </div>

      {/* ==================== TAB CONTENT: Notice Board ==================== */}
      {activeTab === 'board' && (
        <div className="flex-column grid-gap animate-fade-in">
          {/* Sub Categories filters */}
          <div className="flex-center justify-between border-bottom pb-2">
            <div className="flex-center gap-2 overflow-x-auto">
              {['All', 'Company', 'HR', 'Project', 'Event', 'Emergency'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setBoardCategory(cat)}
                  className={`board-category-chip ${boardCategory === cat ? 'active' : ''}`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <span className="font-xsmall text-muted font-semibold">{filteredBoardData.length} Notices Available</span>
          </div>

          {/* Grid Layout of Board Cards */}
          <div className="announcements-grid-layout">
            {filteredBoardData.length > 0 ? (
              filteredBoardData.map(ann => {
                const priorityConfig = priorityMap[ann.priority] || priorityMap.Normal;
                const hasAcknowledgeRequired = ann.priority === 'Critical';
                const alreadyAcknowledged = ann.acknowledgedUsers.includes('EMP-2026-001');

                return (
                  <div
                    key={ann.id}
                    className={`notice-board-card card animate-fade-in ${ann.pinned ? 'pinned-highlight' : ''}`}
                    style={{ borderTop: `4px solid ${priorityConfig.border}` }}
                  >
                    <div className="flex-center justify-between pb-2 border-bottom">
                      <div className="flex-center gap-2">
                        <Badge variant={priorityConfig.badge}>{ann.priority} Priority</Badge>
                        <span className="badge badge-secondary font-xsmall">{ann.category}</span>
                      </div>
                      <div className="flex-center gap-1">
                        {ann.pinned && <Pin size={14} className="text-primary spin-rotate" />}
                        <span className="font-xsmall text-muted"><Clock size={11} /> {ann.publishDate}</span>
                      </div>
                    </div>

                    <h3 className="notice-title-bold mt-2 cursor-pointer" onClick={() => setSelectedAnn(ann)}>
                      {ann.title}
                    </h3>
                    
                    <p className="notice-description-preview">
                      {ann.description.substring(0, 180)}...
                    </p>

                    {ann.attachments.length > 0 && (
                      <div className="attachments-list-chips">
                        {ann.attachments.map((file, idx) => (
                          <span key={idx} className="file-chip font-xsmall flex-center gap-1" onClick={() => addPageToast('success', `Downloading file: ${file}`)}>
                            <FileText size={12} /> {file}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex-center justify-between border-top pt-3 mt-3">
                      {/* Author Info */}
                      <div className="flex-center gap-2">
                        <Avatar name={ann.publishedBy} size="xs" />
                        <div className="flex-column font-xsmall">
                          <strong>{ann.publishedBy}</strong>
                          <span className="text-muted">{ann.publishedByRole}</span>
                        </div>
                      </div>

                      {/* Engagement Counters & Actions */}
                      <div className="flex-center gap-3">
                        <span className="views-count flex-center gap-1 font-xsmall text-muted"><Eye size={12} /> {ann.views + (alreadyAcknowledged ? 1 : 0)}</span>
                        
                        <button
                          className={`feedback-reaction-btn ${ann.likedBy.includes('EMP-2026-001') ? 'liked' : ''}`}
                          onClick={() => handleLike(ann.id)}
                          title="Like Announcement"
                        >
                          <ThumbsUp size={14} /> <span>{ann.likes}</span>
                        </button>

                        <button
                          className="feedback-reaction-btn"
                          onClick={() => setSelectedAnn(ann)}
                          title="View comments"
                        >
                          <MessageSquare size={14} /> <span>{ann.comments.length}</span>
                        </button>

                        {hasAcknowledgeRequired && (
                          <Button
                            variant={alreadyAcknowledged ? 'secondary' : 'primary'}
                            size="sm"
                            disabled={alreadyAcknowledged}
                            onClick={() => handleAcknowledge(ann.id)}
                            icon={CheckCircle}
                          >
                            {alreadyAcknowledged ? 'Acknowledged' : 'Acknowledge Policy'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="card text-center p-8 text-muted width-full grid-span-full">
                <Megaphone size={48} className="text-muted opacity-3 mb-2" />
                <h3>No Announcements Posted</h3>
                <p>There are no active notices published in the {boardCategory} category.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB CONTENT: MANAGEMENT CENTER ==================== */}
      {activeTab === 'management' && perspective !== 'employee' && (
        <div className="flex-column grid-gap animate-fade-in">
          {/* Table Filters */}
          <div className="card filter-wrapper-card flex-column gap-3">
            <div className="flex-center justify-between wrap-content gap-3">
              <div className="flex-center gap-3 wrap-content flex-grow-1">
                <input
                  type="text"
                  placeholder="Search notices, title, author..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="table-search-input"
                  style={{ minWidth: '260px' }}
                />

                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="table-filter-select">
                  <option value="">All Categories</option>
                  <option value="Company">Company</option>
                  <option value="HR">HR Notices</option>
                  <option value="Project">Project</option>
                  <option value="Event">Event</option>
                  <option value="Emergency">Emergency</option>
                </select>

                <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="table-filter-select">
                  <option value="">All Priorities</option>
                  <option value="Critical">🔴 Critical</option>
                  <option value="High">🟠 High</option>
                  <option value="Medium">🟡 Medium</option>
                  <option value="Normal">🟢 Normal</option>
                </select>

                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="table-filter-select">
                  <option value="">All Statuses</option>
                  <option value="Published">Published</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Draft">Draft</option>
                  <option value="Expired">Expired</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>
            </div>
          </div>

          {/* Management Spreadsheet Table */}
          <div className="card table-wrapper-card">
            <div className="overflow-x-auto">
              <table className="payroll-data-table">
                <thead>
                  <tr>
                    <th>Notice ID</th>
                    <th>Title & Category</th>
                    <th>Priority</th>
                    <th>Published By</th>
                    <th>Audience Target</th>
                    <th>Expiry Date</th>
                    <th>Views</th>
                    <th>Acks</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredManagementData.length > 0 ? (
                    filteredManagementData.map(row => (
                      <tr key={row.id}>
                        <td className="font-semibold">{row.id}</td>
                        <td>
                          <div className="flex-column">
                            <strong className="cursor-pointer text-primary" onClick={() => setSelectedAnn(row)}>{row.title}</strong>
                            <span className="font-xsmall text-muted">Category: {row.category}</span>
                          </div>
                        </td>
                        <td>
                          <Badge variant={priorityMap[row.priority]?.badge || 'neutral'}>
                            {row.priority}
                          </Badge>
                        </td>
                        <td>{row.publishedBy}</td>
                        <td>
                          <span className="badge badge-secondary font-xsmall flex-center gap-1">
                            <Users size={10} /> {row.targetAudience}
                          </span>
                        </td>
                        <td><span className="text-muted font-small">{row.expiryDate || '—'}</span></td>
                        <td className="font-semibold">{row.views}</td>
                        <td className="font-semibold text-success">{row.acknowledgements}</td>
                        <td>
                          <Badge variant={
                            row.status === 'Published' ? 'success' :
                            row.status === 'Scheduled' ? 'info' :
                            row.status === 'Draft' ? 'warning' : 'neutral'
                          }>
                            {row.status}
                          </Badge>
                        </td>
                        <td>
                          <div className="flex-center gap-2 justify-start">
                            <button className="action-circle-btn" onClick={() => handlePinToggle(row.id)} title="Toggle Pin"><Pin size={13} /></button>
                            <button className="action-circle-btn" onClick={() => handleDuplicate(row)} title="Duplicate Draft"><Copy size={13} /></button>
                            <button className="action-circle-btn text-danger" onClick={() => handleDelete(row.id)} title="Delete Notice"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="10" className="text-center p-8 text-muted">
                        No announcement notices found matching filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB CONTENT: ANALYTICS ==================== */}
      {activeTab === 'analytics' && (
        <div className="flex-column grid-gap animate-fade-in">
          {/* Analytics Overview stats */}
          <div className="stats-row payroll-stats-row">
            <div className="card payroll-stat-card border-bottom-primary">
              <div className="stat-card-header flex-center justify-between width-full">
                <span className="stat-label">Total Employee Reach</span>
                <span className="stat-trend trend-green"><ArrowUpRight size={14} /> +8.4%</span>
              </div>
              <h3 className="stat-num">{totalReach} Employees</h3>
              <span className="font-small text-muted">Across all branch locations</span>
            </div>

            <div className="card payroll-stat-card border-bottom-success">
              <div className="stat-card-header flex-center justify-between width-full">
                <span className="stat-label">Average Read Rate</span>
                <span className="badge-paid flex-center font-xsmall">Healthy</span>
              </div>
              <h3 className="stat-num text-success">{readRate}%</h3>
              <span className="font-small text-muted">Awaiting Unreads: {unreadCount} notices</span>
            </div>

            <div className="card payroll-stat-card border-bottom-warning">
              <div className="stat-card-header flex-center justify-between width-full">
                <span className="stat-label">Policy Acknowledged</span>
                <span className="stat-trend trend-green"><ArrowUpRight size={14} /> +3.2%</span>
              </div>
              <h3 className="stat-num text-warning">{ackRate}%</h3>
              <span className="font-small text-muted">Target: 95% compliance rate</span>
            </div>

            <div className="card payroll-stat-card border-bottom-info">
              <div className="stat-card-header flex-center justify-between width-full">
                <span className="stat-label">Scheduled / Drafts</span>
                <span className="badge-hold flex-center font-xsmall">{scheduledCount} Scheduled</span>
              </div>
              <h3 className="stat-num text-info">{scheduledCount + expiredCount} Notices</h3>
              <span className="font-small text-muted">Expired or Archived: {expiredCount}</span>
            </div>
          </div>

          {/* Graphs Row */}
          <div className="grid-2-col gap-6">
            <div className="card chart-container-card">
              <h4 className="chart-title">Notice Views & Read Analytics Trend</h4>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer>
                  <AreaChart data={reachTrendsSeries}>
                    <defs>
                      <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorRead" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                    <XAxis dataKey="name" stroke="var(--text-muted)" />
                    <YAxis stroke="var(--text-muted)" />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                    <Legend />
                    <Area type="monotone" name="Total Reached" dataKey="reach" stroke="#3b82f6" fillOpacity={1} fill="url(#colorReach)" />
                    <Area type="monotone" name="Read / Viewed" dataKey="read" stroke="#10b981" fillOpacity={1} fill="url(#colorRead)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid-2-row gap-6">
              <div className="card p-4">
                <h4 className="chart-title">Read vs Acknowledged Rate by Department</h4>
                <div style={{ width: '100%', height: 110 }}>
                  <ResponsiveContainer>
                    <BarChart data={deptEngagementData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                      <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} />
                      <YAxis stroke="var(--text-muted)" fontSize={10} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                      <Legend fontSize={10} />
                      <Bar name="Read %" dataKey="read" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar name="Ack %" dataKey="ack" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card p-4 flex-row gap-4 align-center justify-between">
                <div style={{ width: '50%', height: 120 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={branchReachData} cx="50%" cy="50%" innerRadius={35} outerRadius={50} paddingAngle={5} dataKey="value">
                        {branchReachData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-column gap-2" style={{ width: '50%' }}>
                  <h4 className="chart-title" style={{ margin: 0 }}>Reach by Branch</h4>
                  <div className="flex-column gap-1">
                    {branchReachData.map((item, idx) => (
                      <div key={item.name} className="flex-center justify-between font-xsmall">
                        <span className="flex-center gap-1"><span className="color-dot" style={{ backgroundColor: CHART_COLORS[idx] }}></span> {item.name}</span>
                        <span className="font-semibold">{item.value} Users</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB CONTENT: EMERGENCY BLAST ==================== */}
      {activeTab === 'emergency' && perspective !== 'employee' && (
        <div className="flex-column grid-gap animate-fade-in">
          <h3 className="card-sec-title">Emergency Communication Center</h3>
          
          <div className="grid-2-col gap-6">
            {/* Left: Blast triggers */}
            <div className="card p-5 flex-column gap-4 border-left-danger">
              <h4 className="text-danger font-bold flex-center gap-2"><ShieldAlert size={18} /> Trigger Immediate Emergency Broadcast</h4>
              <p className="text-muted font-small">Initiate instant alerts to all delivery channels: Dashboard Flash Banner, Email Blast, Mobile Push, and SMS warning warnings. Only critical incidents should be triggered here.</p>

              <div className="grid-2-col gap-4">
                <button className="emergency-action-card border-danger flex-column gap-2 align-center justify-center py-4 cursor-pointer" onClick={() => handleEmergencyTrigger('Security Incident Outbreak')}>
                  <ShieldAlert className="text-danger" size={28} />
                  <strong className="font-small text-danger">Security Incident</strong>
                </button>
                <button className="emergency-action-card border-warning flex-column gap-2 align-center justify-center py-4 cursor-pointer" onClick={() => handleEmergencyTrigger('Severe Weather Warning & Office Closure')}>
                  <Flame className="text-warning" size={28} />
                  <strong className="font-small text-warning">Office Closure</strong>
                </button>
                <button className="emergency-action-card border-primary flex-column gap-2 align-center justify-center py-4 cursor-pointer" onClick={() => handleEmergencyTrigger('Production Core Server Downtime')}>
                  <Laptop className="text-primary" size={28} />
                  <strong className="font-small text-primary">System Downtime</strong>
                </button>
                <button className="emergency-action-card border-neutral flex-column gap-2 align-center justify-center py-4 cursor-pointer" onClick={() => handleEmergencyTrigger('Disaster Evacuation Notice')}>
                  <Info className="text-muted" size={28} />
                  <strong className="font-small text-muted">Evacuation Notice</strong>
                </button>
              </div>
            </div>

            {/* Right: Active Alert Detail tracking */}
            <div className="card p-5 flex-column gap-3">
              <h4 className="font-bold">Active Broadcast Audit</h4>
              <div className="p-3 bg-secondary rounded flex-column gap-2 font-small">
                <div><strong>Current Alert:</strong> {activeEmergencyAlert.title}</div>
                <div><strong>Description:</strong> {activeEmergencyAlert.description}</div>
                <div className="text-muted font-xsmall mt-2">Triggered at: {activeEmergencyAlert.date}</div>
              </div>

              <div className="flex-column gap-2 mt-2">
                <span className="font-semibold text-primary font-small">Live Delivery Channels Status</span>
                <div className="flex-column gap-1 font-xsmall text-muted">
                  <div className="flex-center justify-between border-bottom pb-1"><span>Dashboard Alert Banner:</span> <span className="text-success font-semibold flex-center gap-1"><Check size={12} /> Active</span></div>
                  <div className="flex-center justify-between border-bottom pb-1"><span>Email Blast (450 addresses):</span> <span className="text-success font-semibold flex-center gap-1"><Check size={12} /> Dispatched</span></div>
                  <div className="flex-center justify-between border-bottom pb-1"><span>SMS warning warning (API Gateway):</span> <span className="text-success font-semibold flex-center gap-1"><Check size={12} /> Sent</span></div>
                  <div className="flex-center justify-between"><span>Mobile Push (Firebase Cloud):</span> <span className="text-success font-semibold flex-center gap-1"><Check size={12} /> Active</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB CONTENT: COMPLIANCE AUDITS ==================== */}
      {activeTab === 'tracking' && perspective !== 'employee' && (
        <div className="flex-column grid-gap animate-fade-in">
          <div className="grid-2-col gap-6">
            {/* Tracking logs table */}
            <div className="card p-5 flex-column gap-3">
              <h3 className="card-sec-title">Employee Read & Policy Acknowledgement Logs</h3>
              <div className="overflow-x-auto">
                <table className="payroll-data-table font-small">
                  <thead>
                    <tr>
                      <th>Employee Name</th>
                      <th>Department</th>
                      <th>View Time</th>
                      <th>Read Status</th>
                      <th>Ack Status</th>
                      <th>Device Model</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trackingLogs.map(log => (
                      <tr key={log.employeeId}>
                        <td className="font-semibold">{log.employeeName}</td>
                        <td>{log.department}</td>
                        <td className="text-muted font-xsmall">{log.viewTime}</td>
                        <td>
                          <Badge variant={log.readStatus === 'Viewed' ? 'success' : 'neutral'}>
                            {log.readStatus}
                          </Badge>
                        </td>
                        <td>
                          <Badge variant={log.ackStatus === 'Acknowledged' ? 'success' : 'warning'}>
                            {log.ackStatus}
                          </Badge>
                        </td>
                        <td className="font-mono text-muted font-xsmall">{log.device}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Audit log trail */}
            <div className="card p-5 flex-column gap-3">
              <h3 className="card-sec-title">Communications Operations Audit Logs</h3>
              <div className="overflow-x-auto">
                <table className="payroll-data-table font-small">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Operation Action</th>
                      <th>Old Value</th>
                      <th>New Value</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map(log => (
                      <tr key={log.id}>
                        <td className="font-semibold">{log.user}</td>
                        <td>{log.action}</td>
                        <td className="text-danger">{log.prevVal}</td>
                        <td className="text-success">{log.newVal}</td>
                        <td className="text-muted font-xsmall">{log.timestamp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== CREATE ANNOUNCEMENT WIZARD MODAL ==================== */}
      {showCreateModal && (
        <div className="payroll-modal-overlay">
          <form className="payroll-modal-container animate-slide-up" onSubmit={handleCreateSubmit} style={{ maxWidth: '580px' }}>
            <div className="flex-center justify-between border-bottom pb-3 mb-4">
              <h3 className="modal-title-bold">Publish / Schedule New Announcement</h3>
              <button className="action-circle-btn" type="button" onClick={() => setShowCreateModal(false)}><X size={18} /></button>
            </div>

            <div className="flex-column gap-3 font-small">
              <div>
                <label className="input-label">Announcement Title</label>
                <input
                  type="text"
                  required
                  value={createForm.title}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
                  className="table-search-input width-full p-2"
                  placeholder="e.g. CEO Townhall Meeting June 2026"
                />
              </div>

              <div className="grid-3-col gap-3">
                <div>
                  <label className="input-label">Category</label>
                  <select
                    value={createForm.category}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, category: e.target.value }))}
                    className="table-filter-select width-full p-2"
                  >
                    <option value="Company">Company Update</option>
                    <option value="HR">HR Notice</option>
                    <option value="Project">Project Milestone</option>
                    <option value="Event">Event</option>
                    <option value="Emergency">Emergency Alert</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Priority</label>
                  <select
                    value={createForm.priority}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, priority: e.target.value }))}
                    className="table-filter-select width-full p-2"
                  >
                    <option value="Critical">🔴 Critical (Mandatory)</option>
                    <option value="High">🟠 High</option>
                    <option value="Medium">🟡 Medium</option>
                    <option value="Normal">🟢 Normal</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Target Audience</label>
                  <select
                    value={createForm.audienceType}
                    onChange={(e) => {
                      const type = e.target.value;
                      let targetVal = 'All Employees';
                      if (type === 'Department') targetVal = 'Engineering';
                      if (type === 'Branch') targetVal = 'Delhi HQ';
                      setCreateForm(prev => ({ ...prev, audienceType: type, targetAudience: targetVal }));
                    }}
                    className="table-filter-select width-full p-2"
                  >
                    <option value="All">Org-Wide (All)</option>
                    <option value="Department">Department Based</option>
                    <option value="Branch">Branch Based</option>
                  </select>
                </div>
              </div>

              <div className="grid-2-col gap-3">
                <div>
                  <label className="input-label">Publish Date (Leave blank for instant)</label>
                  <input
                    type="date"
                    value={createForm.publishDate}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, publishDate: e.target.value }))}
                    className="table-search-input width-full p-2"
                  />
                </div>
                <div>
                  <label className="input-label">Expiry Date</label>
                  <input
                    type="date"
                    value={createForm.expiryDate}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                    className="table-search-input width-full p-2"
                  />
                </div>
              </div>

              <div>
                <label className="input-label">Announcement Content Details</label>
                <textarea
                  required
                  rows="4"
                  value={createForm.description}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  className="table-search-input width-full p-2"
                  placeholder="Draft your organizational update details here..."
                ></textarea>
              </div>
            </div>

            <div className="flex-end gap-3 border-top pt-4 mt-4">
              <Button variant="secondary" type="button" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit">Submit & Publish</Button>
            </div>
          </form>
        </div>
      )}

      {/* ==================== ANNOUNCEMENT DETAIL VIEW MODAL ==================== */}
      {selectedAnn && (
        <div className="payroll-modal-overlay">
          <div className="payroll-modal-container animate-slide-up" style={{ maxWidth: '680px' }}>
            <div className="flex-center justify-between border-bottom pb-3 mb-4">
              <div className="flex-center gap-2">
                <Megaphone className="text-primary" size={22} />
                <h3 className="modal-title-bold">{selectedAnn.title}</h3>
              </div>
              <button className="action-circle-btn" onClick={() => setSelectedAnn(null)}><X size={18} /></button>
            </div>

            <div className="modal-body-section flex-column gap-4 font-small">
              <div className="flex-center justify-between border-bottom pb-2 font-xsmall text-muted">
                <div className="flex-center gap-2">
                  <Badge variant={priorityMap[selectedAnn.priority]?.badge}>{selectedAnn.priority} Priority</Badge>
                  <span>Category: <strong>{selectedAnn.category}</strong></span>
                </div>
                <span>Audience Target: <strong>{selectedAnn.targetAudience}</strong></span>
              </div>

              {/* Body */}
              <p className="notice-description-full" style={{ fontSize: '0.92rem', lineHeight: '1.6', margin: 0 }}>
                {selectedAnn.description}
              </p>

              {/* Attachments */}
              {selectedAnn.attachments.length > 0 && (
                <div className="flex-column gap-2 bg-secondary p-3 rounded">
                  <span className="font-semibold text-primary font-xsmall flex-center gap-1"><FileText size={12} /> Reference Files Downloads</span>
                  <div className="flex-row gap-2 mt-1">
                    {selectedAnn.attachments.map((file, idx) => (
                      <button key={idx} className="flex-center gap-1 font-xsmall badge badge-secondary py-1 cursor-pointer" onClick={() => addPageToast('success', `Downloaded reference file: ${file}`)}>
                        <FileDown size={10} /> {file}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Mandatory Policy acknowledgement check */}
              {selectedAnn.priority === 'Critical' && (
                <div className="flex-center justify-between p-3 border rounded border-danger bg-danger-subtle bg-opacity-10 align-center">
                  <div className="flex-column">
                    <span className="font-semibold text-danger">Mandatory Policy Read Confirmation</span>
                    <span className="font-xsmall text-muted">Acknowledged by {selectedAnn.acknowledgements} colleagues</span>
                  </div>
                  <Button
                    variant={selectedAnn.acknowledgedUsers.includes('EMP-2026-001') ? 'secondary' : 'primary'}
                    disabled={selectedAnn.acknowledgedUsers.includes('EMP-2026-001')}
                    onClick={() => handleAcknowledge(selectedAnn.id)}
                    icon={CheckCircle}
                  >
                    {selectedAnn.acknowledgedUsers.includes('EMP-2026-001') ? 'Already Acknowledged' : 'Click to Acknowledge'}
                  </Button>
                </div>
              )}

              {/* Discussion Forum */}
              <div className="flex-column gap-3 border-top pt-4">
                <span className="font-bold flex-center gap-1"><MessageSquare size={16} /> Notice Discussion Board ({selectedAnn.comments.length})</span>
                
                {/* Comments list */}
                <div className="comments-box flex-column gap-3 max-height-comments">
                  {selectedAnn.comments.length > 0 ? (
                    selectedAnn.comments.map(c => (
                      <div key={c.id} className="comment-balloon flex-row gap-2 p-3 bg-secondary rounded position-relative">
                        <Avatar name={c.user} size="xs" />
                        <div className="flex-column flex-grow-1">
                          <div className="flex-center justify-between font-xsmall">
                            <strong>{c.user} <span className="text-muted font-normal font-xsmall">• {c.role}</span></strong>
                            <span className="text-muted font-xsmall">{c.timestamp}</span>
                          </div>
                          <p className="mb-0 mt-1 font-small">{c.text}</p>
                        </div>
                        {perspective === 'super_admin' && (
                          <button className="action-circle-btn text-danger comment-delete-btn" onClick={() => handleDeleteComment(selectedAnn.id, c.id)} title="Delete Comment">
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-muted font-small italic">No queries or discussion comments posted yet. Ask a question below.</p>
                  )}
                </div>

                {/* Add comment Form */}
                <form className="flex-center gap-2 mt-2" onSubmit={handleAddComment}>
                  <input
                    type="text"
                    placeholder="Write a comment, reaction, or feedback question..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="table-search-input flex-grow-1"
                    style={{ height: '36px' }}
                  />
                  <Button variant="primary" type="submit" style={{ height: '36px' }} icon={Send}>Post</Button>
                </form>
              </div>

            </div>

            <div className="flex-end gap-3 border-top pt-4 mt-4">
              <Button variant="secondary" onClick={() => setSelectedAnn(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Announcements;
