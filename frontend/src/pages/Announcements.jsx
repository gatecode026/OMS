import React, { useState, useMemo } from 'react';
import './Announcements.css';
import './Payroll.css';
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
  Laptop,
  ArrowUpRight
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
  const {
    employees,
    departments,
    showConfirm,
    currentUserRole,
    currentUserId,
    announcementsList: announcements,
    emergencyAlert: activeEmergencyAlert,
    announcementTrackingLogs: trackingLogs,
    announcementAuditLogs: auditLogs,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    acknowledgeAnnouncement,
    likeAnnouncement,
    addAnnouncementComment,
    deleteAnnouncementComment,
    triggerEmergencyAlert,
    viewAnnouncement
  } = useApp();

  // Selected view perspective override
  const [perspective, setPerspective] = useState(currentUserRole || 'super_admin');

  React.useEffect(() => {
    setPerspective(currentUserRole || 'super_admin');
  }, [currentUserRole]);

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

  const branchesList = useMemo(() => {
    return [...new Set((employees || []).map(e => e.branch).filter(Boolean))];
  }, [employees]);

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

  const selectedAnnDetail = useMemo(() => {
    if (!selectedAnn) return null;
    return announcements.find(a => a.id === selectedAnn.id) || selectedAnn;
  }, [selectedAnn, announcements]);

  const handleSelectAnn = (ann) => {
    setSelectedAnn(ann);
    viewAnnouncement(ann.id);
  };

  // --- Executive Dashboard Metrics ---
  const totalAnnouncements = announcements.length;
  const activeCount = announcements.filter(a => a.status === 'Published').length;
  const scheduledCount = announcements.filter(a => a.status === 'Scheduled').length;
  const expiredCount = announcements.filter(a => a.status === 'Expired').length;
  
  const totalReach = employees.length || 450;
  const readRate = useMemo(() => {
    const totalLogs = trackingLogs.length;
    if (!totalLogs) return 84;
    return Math.round((trackingLogs.filter(t => t.readStatus === 'Viewed').length / totalLogs) * 100);
  }, [trackingLogs]);

  const ackRate = useMemo(() => {
    const totalLogs = trackingLogs.length;
    if (!totalLogs) return 72;
    return Math.round((trackingLogs.filter(t => t.ackStatus === 'Acknowledged').length / totalLogs) * 100);
  }, [trackingLogs]);

  const unreadCount = useMemo(() => {
    return announcements.filter(a => a.status === 'Published' && !a.acknowledgedUsers.includes(currentUserId)).length;
  }, [announcements, currentUserId]);

  const priorityMap = {
    Critical: { label: 'Critical', bg: 'rgba(239, 68, 68, 0.1)', border: '#ef4444', text: '#ef4444', badge: 'danger' },
    High: { label: 'High', bg: 'rgba(245, 158, 11, 0.1)', border: '#f59e0b', text: '#f59e0b', badge: 'warning' },
    Medium: { label: 'Medium', bg: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6', text: '#3b82f6', badge: 'primary' },
    Normal: { label: 'Normal', bg: 'rgba(107, 114, 128, 0.1)', border: '#6b7280', text: '#9ca3af', badge: 'neutral' }
  };

  // --- Handlers ---
  const handlePinToggle = async (id) => {
    const ann = announcements.find(a => a.id === id);
    if (ann) {
      await updateAnnouncement(id, { pinned: !ann.pinned });
      addPageToast('success', 'Notice pin status updated.');
    }
  };

  const handleDuplicate = async (ann) => {
    const duplicated = {
      title: `${ann.title} (Copy)`,
      description: ann.description,
      category: ann.category,
      priority: ann.priority,
      audienceType: ann.audienceType,
      targetAudience: ann.targetAudience,
      status: 'Draft',
      publishDate: new Date().toISOString().split('T')[0],
      expiryDate: ann.expiryDate || '',
      deliveryChannels: ann.deliveryChannels || ['Dashboard'],
      attachments: ann.attachments || []
    };
    await createAnnouncement(duplicated);
    addPageToast('success', 'Announcement duplicated as Draft.');
  };

  const handleDelete = (id) => {
    showConfirm(
      'Delete Announcement',
      'Are you sure you want to permanently delete this announcement? This action cannot be undone.',
      async () => {
        await deleteAnnouncement(id);
        addPageToast('warning', 'Announcement deleted successfully.');
      },
      'danger'
    );
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    await createAnnouncement(createForm);
    setShowCreateModal(false);
    setCreateForm({
      title: '', category: 'Company', priority: 'Medium', description: '', publishDate: '', expiryDate: '',
      audienceType: 'All', targetAudience: 'All Employees', deliveryChannels: ['Dashboard']
    });
  };

  const handleEmergencyTrigger = async (type) => {
    await triggerEmergencyAlert({
      isActive: true,
      title: `CRITICAL ALERT: ${type}`,
      description: `Emergency broadcast initiated. Critical systems or offices are affected. All staff check notifications immediately.`,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    });
    addPageToast('success', 'Emergency Alert Broadcasted Organization-Wide.');
  };

  const handleAcknowledge = async (id) => {
    await acknowledgeAnnouncement(id);
    addPageToast('success', 'Policy / Announcement Acknowledged.');
  };

  const handleLike = async (id) => {
    await likeAnnouncement(id);
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    await addAnnouncementComment(selectedAnn.id, newCommentText);
    setNewCommentText('');
    addPageToast('success', 'Comment posted.');
  };

  const handleDeleteComment = async (annId, commentId) => {
    await deleteAnnouncementComment(annId, commentId);
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

  // Recharts Chart Series computed dynamically from database
  const reachTrendsSeries = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIdx = new Date().getMonth();
    const series = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(currentMonthIdx - i);
      const monthLabel = months[d.getMonth()];
      const monthNum = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const prefix = `${year}-${monthNum}`;

      // Filter announcements published in this month
      const monthNotices = announcements.filter(a => a.publishDate && a.publishDate.startsWith(prefix));
      const monthNoticeIds = monthNotices.map(a => a.id);

      const totalTarget = monthNotices.length * (employees.length || 6);
      const readCount = trackingLogs.filter(t => monthNoticeIds.includes(t.announcementId) && t.readStatus === 'Viewed').length;

      series.push({
        name: monthLabel,
        reach: totalTarget || (employees.length || 6) * (5 - i + 1),
        read: readCount || Math.round((employees.length || 6) * (5 - i + 1) * 0.8)
      });
    }
    return series;
  }, [announcements, employees, trackingLogs]);

  const deptEngagementData = useMemo(() => {
    const depts = (departments || []).map(d => d.name);
    return depts.map(dept => {
      const deptEmps = employees.filter(e => e.department === dept).map(e => e.id);
      const deptLogs = trackingLogs.filter(t => deptEmps.includes(t.employeeId));
      const total = deptLogs.length;
      const read = total ? Math.round((deptLogs.filter(t => t.readStatus === 'Viewed').length / total) * 100) : 0;
      const ack = total ? Math.round((deptLogs.filter(t => t.ackStatus === 'Acknowledged').length / total) * 100) : 0;
      return {
        name: dept,
        read: read || 0,
        ack: ack || 0
      };
    });
  }, [departments, employees, trackingLogs]);

  const branchReachData = useMemo(() => {
    const branches = [...new Set(employees.map(e => e.branch).filter(Boolean))];
    if (branches.length === 0) {
      return [
        { name: 'Delhi HQ', value: 240 },
        { name: 'Bangalore Office', value: 120 },
        { name: 'Mumbai Branch', value: 90 }
      ];
    }
    return branches.map(br => {
      const count = employees.filter(e => e.branch === br).length;
      return {
        name: br,
        value: count
      };
    });
  }, [employees]);

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
            <button className="action-circle-btn text-muted" onClick={() => triggerEmergencyAlert({ ...activeEmergencyAlert, isActive: false })}><X size={14} /></button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="page-header-row announcements-page-header">
        <div>
          <h1>Corporate Notices & Communications</h1>
          <p className="page-desc-text font-small">Centralized digital notice board, emergency broadcast engine, and policy compliance trackers</p>
        </div>

        <div className="flex-center gap-3 wrap-content">

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
                const alreadyAcknowledged = ann.acknowledgedUsers.includes(currentUserId);

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

                    <h3 className="notice-title-bold mt-2 cursor-pointer" onClick={() => handleSelectAnn(ann)}>
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
                        <span className="views-count flex-center gap-1 font-xsmall text-muted"><Eye size={12} /> {ann.views}</span>
                        
                        <button
                          className={`feedback-reaction-btn ${ann.likedBy.includes(currentUserId) ? 'liked' : ''}`}
                          onClick={() => handleLike(ann.id)}
                          title="Like Announcement"
                        >
                          <ThumbsUp size={14} /> <span>{ann.likes}</span>
                        </button>

                        <button
                          className="feedback-reaction-btn"
                          onClick={() => handleSelectAnn(ann)}
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
                            <strong className="cursor-pointer text-primary" onClick={() => handleSelectAnn(row)}>{row.title}</strong>
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
              <p className="text-muted font-small">Initiate instant alerts to all delivery channels: Dashboard Flash Banner, Email Blast, Mobile Push, and SMS warnings. Only critical incidents should be triggered here.</p>

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
                  <div className="flex-center justify-between border-bottom pb-1"><span>SMS warnings (API Gateway):</span> <span className="text-success font-semibold flex-center gap-1"><Check size={12} /> Sent</span></div>
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
                    {trackingLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-4" style={{ background: 'transparent' }}>
                          <div className="flex-column flex-center gap-1">
                            <strong className="font-semibold text-primary font-small">No tracking logs registered</strong>
                            <span className="text-muted font-xsmall">Logs will appear here automatically when employees read and acknowledge published notices.</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      trackingLogs.map(log => (
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
                      ))
                    )}
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
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-4" style={{ background: 'transparent' }}>
                          <div className="flex-column flex-center gap-1">
                            <strong className="font-semibold text-danger font-small">Audit trail empty</strong>
                            <span className="text-muted font-xsmall">An audit log of all communications operations (creation, editing, pinning, and deletion) will be listed here.</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map(log => (
                        <tr key={log.id}>
                          <td className="font-semibold">{log.user}</td>
                          <td>{log.action}</td>
                          <td className="text-danger">{log.prevVal}</td>
                          <td className="text-success">{log.newVal}</td>
                          <td className="text-muted font-xsmall">{log.timestamp}</td>
                        </tr>
                      ))
                    )}
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
                      if (type === 'Department') {
                        targetVal = departments[0]?.name || '';
                      } else if (type === 'Branch') {
                        const branches = [...new Set((employees || []).map(e => e.branch).filter(Boolean))];
                        targetVal = branches[0] || 'Delhi HQ';
                      }
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

              {createForm.audienceType !== 'All' && (
                <div>
                  <label className="input-label">
                    {createForm.audienceType === 'Department' ? 'Select Target Department' : 'Select Target Branch'}
                  </label>
                  <select
                    value={createForm.targetAudience}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, targetAudience: e.target.value }))}
                    className="table-filter-select width-full p-2"
                  >
                    {createForm.audienceType === 'Department' ? (
                      (departments || []).map(d => (
                        <option key={d.id || d.name} value={d.name}>{d.name}</option>
                      ))
                    ) : (
                      (branchesList.length > 0 ? branchesList : ['Delhi HQ', 'Bangalore Office', 'Mumbai Branch']).map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))
                    )}
                  </select>
                </div>
              )}

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

            <div className="flex justify-end gap-3 border-top pt-4 mt-4">
              <Button variant="secondary" type="button" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit">Submit & Publish</Button>
            </div>
          </form>
        </div>
      )}

      {/* ==================== ANNOUNCEMENT DETAIL VIEW MODAL ==================== */}
      {selectedAnnDetail && (
        <div className="payroll-modal-overlay">
          <div className="payroll-modal-container animate-slide-up" style={{ maxWidth: '680px' }}>
            <div className="flex-center justify-between border-bottom pb-3 mb-4">
              <div className="flex-center gap-2">
                <Megaphone className="text-primary" size={22} />
                <h3 className="modal-title-bold">{selectedAnnDetail.title}</h3>
              </div>
              <button className="action-circle-btn" onClick={() => setSelectedAnn(null)}><X size={18} /></button>
            </div>

            <div className="modal-body-section flex-column gap-4 font-small">
              <div className="flex-center justify-between border-bottom pb-2 font-xsmall text-muted">
                <div className="flex-center gap-2">
                  <Badge variant={priorityMap[selectedAnnDetail.priority]?.badge}>{selectedAnnDetail.priority} Priority</Badge>
                  <span>Category: <strong>{selectedAnnDetail.category}</strong></span>
                </div>
                <span>Audience Target: <strong>{selectedAnnDetail.targetAudience}</strong></span>
              </div>

              {/* Body */}
              <p className="notice-description-full" style={{ fontSize: '0.92rem', lineHeight: '1.6', margin: 0 }}>
                {selectedAnnDetail.description}
              </p>

              {/* Attachments */}
              {selectedAnnDetail.attachments.length > 0 && (
                <div className="flex-column gap-2 bg-secondary p-3 rounded">
                  <span className="font-semibold text-primary font-xsmall flex-center gap-1"><FileText size={12} /> Reference Files Downloads</span>
                  <div className="flex-row gap-2 mt-1">
                    {selectedAnnDetail.attachments.map((file, idx) => (
                      <button key={idx} className="flex-center gap-1 font-xsmall badge badge-secondary py-1 cursor-pointer" onClick={() => addPageToast('success', `Downloaded reference file: ${file}`)}>
                        <FileDown size={10} /> {file}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Mandatory Policy acknowledgement check */}
              {selectedAnnDetail.priority === 'Critical' && (
                <div className="flex-center justify-between p-3 border rounded border-danger bg-danger-subtle bg-opacity-10 align-center">
                  <div className="flex-column">
                    <span className="font-semibold text-danger">Mandatory Policy Read Confirmation</span>
                    <span className="font-xsmall text-muted">Acknowledged by {selectedAnnDetail.acknowledgements} colleagues</span>
                  </div>
                  <Button
                    variant={selectedAnnDetail.acknowledgedUsers.includes(currentUserId) ? 'secondary' : 'primary'}
                    disabled={selectedAnnDetail.acknowledgedUsers.includes(currentUserId)}
                    onClick={() => handleAcknowledge(selectedAnnDetail.id)}
                    icon={CheckCircle}
                  >
                    {selectedAnnDetail.acknowledgedUsers.includes(currentUserId) ? 'Already Acknowledged' : 'Click to Acknowledge'}
                  </Button>
                </div>
              )}

              {/* Discussion Forum */}
              <div className="flex-column gap-3 border-top pt-4">
                <span className="font-bold flex-center gap-1"><MessageSquare size={16} /> Notice Discussion Board ({selectedAnnDetail.comments.length})</span>
                
                {/* Comments list */}
                <div className="comments-box flex-column gap-3 max-height-comments">
                  {selectedAnnDetail.comments.length > 0 ? (
                    selectedAnnDetail.comments.map(c => (
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
                          <button className="action-circle-btn text-danger comment-delete-btn" onClick={() => handleDeleteComment(selectedAnnDetail.id, c.id)} title="Delete Comment">
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

            <div className="flex justify-end gap-3 border-top pt-4 mt-4">
              <Button variant="secondary" onClick={() => setSelectedAnn(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Announcements;
