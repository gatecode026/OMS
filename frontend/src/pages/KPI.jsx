import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  TrendingUp, LayoutDashboard, ClipboardList, RefreshCw, History,
  BarChart3, User, Plus, Edit, Archive, CheckCircle, AlertCircle,
  HelpCircle, Eye, Search, Filter, ArrowLeft, Save, Trash2, ArrowUpRight,
  UserCheck, AlertTriangle, ArrowDownRight, ChevronRight, Download, RefreshCcw,
  FileText, Calendar, X
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts';
import './KPI.css';

// Custom CSS styling (in separate sheet KPI.css, included below)

export default function KPI() {
  const { tab: paramTab, id } = useParams();
  const navigate = useNavigate();
  const { token, addToast, currentUser, currentUserRole, hasPermission } = useApp();

  const isEmployeeOnly = currentUserRole === 'employee';
  const isManagerOrAdmin = ['super_admin', 'company_admin', 'hr', 'manager'].includes(currentUserRole);

  // Dynamic permission checks
  const hasSelfRead = typeof hasPermission === 'function'
    ? hasPermission('performance_analytics', 'read', 'self')
    : true; // default fallback

  const hasCompanyRead = typeof hasPermission === 'function'
    ? hasPermission('performance_analytics', 'read', 'company')
    : isManagerOrAdmin; // default fallback

  const hasBoth = hasSelfRead && hasCompanyRead;

  const canCreate = typeof hasPermission === 'function'
    ? hasPermission('performance_analytics', 'create')
    : isManagerOrAdmin;

  const canUpdate = typeof hasPermission === 'function'
    ? hasPermission('performance_analytics', 'update')
    : isManagerOrAdmin;

  const canDelete = typeof hasPermission === 'function'
    ? hasPermission('performance_analytics', 'delete')
    : isManagerOrAdmin;

  const canApprove = typeof hasPermission === 'function'
    ? hasPermission('performance_analytics', 'approve')
    : isManagerOrAdmin;

  // Set initial perspective: Company view takes precedence if they have both/company access, otherwise Self view
  const [perspective, setPerspective] = useState(hasCompanyRead ? 'company' : 'self');

  // Align perspective if permissions update
  useEffect(() => {
    if (hasCompanyRead && !hasSelfRead) {
      setPerspective('company');
    } else if (hasSelfRead && !hasCompanyRead) {
      setPerspective('self');
    }
  }, [hasSelfRead, hasCompanyRead]);

  const tab = paramTab || (perspective === 'company' ? 'dashboard' : 'my-kpi');

  // Master local states
  const [departments, setDepartments] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [myEvaluations, setMyEvaluations] = useState([]);
  const [loading, setLoading] = useState(false);

  // API Call helper
  const apiCall = async (url, method = 'GET', body = null) => {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(url, options);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'API request failed');
    return data.data;
  };

  // Initial load
  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Load departments
      const depts = await apiCall('/api/v1/departments');
      setDepartments(depts || []);

      if (hasCompanyRead) {
        // Load Templates
        const tmpls = await apiCall('/api/v1/kpi-templates');
        setTemplates(tmpls || []);

        // Load Cycles
        const cycs = await apiCall('/api/v1/kpi-evaluation-cycles');
        setCycles(cycs || []);

        // Load all evaluations
        const allEvals = await apiCall('/api/v1/kpi-employee-evaluations');
        setEvaluations(allEvals || []);
      }

      if (hasSelfRead) {
        const myEvals = await apiCall(`/api/v1/kpi-employee-evaluations/employee/${currentUser.id}`);
        setMyEvaluations(myEvals || []);
      }
    } catch (err) {
      addToast('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [token, currentUserRole]);

  // Handle active navigation item click
  const handleNav = (targetTab) => {
    navigate(`/kpi/${targetTab}`);
  };

  return (
    <div className="kpi-page-container">
      {/* Dynamic Subheader / Header Tab Nav */}
      <div className="kpi-header-glass">
        <div className="kpi-title-block">
          <div className="kpi-icon-glow">
            <TrendingUp size={24} className="text-primary" />
          </div>
          <div>
            <h1>KPI Performance Management</h1>
            <p>Enterprise department-wise evaluation metrics, automated analytics, and history isolation.</p>
          </div>
        </div>

        {/* Workspace Sub-Navigation */}
        <div className="kpi-nav-tabs-wrapper">
          <div className="kpi-nav-tabs">
            {perspective === 'company' ? (
              <>
                <button className={`nav-tab-btn ${tab === 'dashboard' || tab === 'workspace' ? 'active' : ''}`} onClick={() => handleNav('dashboard')}>
                  <LayoutDashboard size={16} />
                  <span>Dashboard</span>
                </button>
                <button className={`nav-tab-btn ${tab === 'templates' ? 'active' : ''}`} onClick={() => handleNav('templates')}>
                  <ClipboardList size={16} />
                  <span>KPI Templates</span>
                </button>
                <button className={`nav-tab-btn ${tab === 'cycles' ? 'active' : ''}`} onClick={() => handleNav('cycles')}>
                  <RefreshCw size={16} />
                  <span>Evaluation Cycles</span>
                </button>
                <button className={`nav-tab-btn ${tab === 'history' ? 'active' : ''}`} onClick={() => handleNav('history')}>
                  <History size={16} />
                  <span>KPI History</span>
                </button>
                <button className={`nav-tab-btn ${tab === 'analytics' ? 'active' : ''}`} onClick={() => handleNav('analytics')}>
                  <BarChart3 size={16} />
                  <span>KPI Analytics</span>
                </button>
              </>
            ) : (
              <>
                <button className={`nav-tab-btn ${tab === 'my-kpi' ? 'active' : ''}`} onClick={() => handleNav('my-kpi')}>
                  <User size={16} />
                  <span>My KPI</span>
                </button>
                <button className={`nav-tab-btn ${tab === 'history' ? 'active' : ''}`} onClick={() => handleNav('history')}>
                  <History size={16} />
                  <span>KPI History</span>
                </button>
                <button className={`nav-tab-btn ${tab === 'analytics' ? 'active' : ''}`} onClick={() => handleNav('analytics')}>
                  <BarChart3 size={16} />
                  <span>KPI Analytics</span>
                </button>
              </>
            )}
          </div>

          {hasBoth && (
            <div className="perspective-dropdown-container">
              <label htmlFor="perspective-select">Perspective:</label>
              <select
                id="perspective-select"
                className="perspective-select"
                value={perspective}
                onChange={e => {
                  const newPers = e.target.value;
                  setPerspective(newPers);
                  if (newPers === 'company') {
                    navigate('/kpi/dashboard');
                  } else {
                    navigate('/kpi/my-kpi');
                  }
                }}
              >
                <option value="company">Company View</option>
                <option value="self">Self View</option>
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="kpi-content-scroll">
        {loading ? (
          <div className="kpi-loading-state">
            <RefreshCw className="animate-spin text-primary" size={32} />
            <p>Loading KPI modules...</p>
          </div>
        ) : (
          <>
            {tab === 'dashboard' && hasCompanyRead && (
              <KPIDashboard templates={templates} cycles={cycles} evaluations={evaluations} handleNav={handleNav} />
            )}
            {tab === 'templates' && hasCompanyRead && (
              <KPITemplates templates={templates} depts={departments} apiCall={apiCall} refreshData={loadInitialData} addToast={addToast} canCreate={canCreate} canUpdate={canUpdate} canDelete={canDelete} />
            )}
            {tab === 'cycles' && hasCompanyRead && (
              <KPIEvaluationCycles cycles={cycles} templates={templates} depts={departments} apiCall={apiCall} refreshData={loadInitialData} addToast={addToast} navigate={navigate} canCreate={canCreate} canUpdate={canUpdate} />
            )}
            {tab === 'workspace' && id && hasCompanyRead && (
              <KPIEvaluationWorkspace cycleId={id} apiCall={apiCall} addToast={addToast} navigate={navigate} currentUser={currentUser} canUpdate={canUpdate} canApprove={canApprove} />
            )}
            {tab === 'my-kpi' && (
              <MyKPI evaluations={perspective === 'self' ? myEvaluations : evaluations} currentUser={currentUser} isEmployee={perspective === 'self'} />
            )}
            {tab === 'history' && (
              <KPIHistory evaluations={perspective === 'self' ? myEvaluations : evaluations} isEmployee={perspective === 'self'} />
            )}
            {tab === 'analytics' && (
              <KPIAnalytics evaluations={perspective === 'self' ? myEvaluations : evaluations} isEmployee={perspective === 'self'} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── SUB-COMPONENTS ─────────────────────────────────────────────────────────

// 1. KPI DASHBOARD PANEL
function KPIDashboard({ templates, cycles, evaluations, handleNav }) {
  const stats = useMemo(() => {
    const totalTemplates = templates.length;
    const activeCycles = cycles.filter(c => ['In Progress', 'Submitted', 'Returned'].includes(c.status)).length;
    const pendingReview = evaluations.filter(e => e.status === 'Submitted').length;
    const avgScore = evaluations.length > 0 ? Math.round(evaluations.reduce((sum, e) => sum + e.totalScore, 0) / evaluations.length) : 0;
    return { totalTemplates, activeCycles, pendingReview, avgScore };
  }, [templates, cycles, evaluations]);

  return (
    <div className="kpi-panel-container fade-in">
      {/* Metrics Row */}
      <div className="kpi-metrics-grid">
        <div className="metric-card-glass">
          <div className="card-top">
            <span className="card-label">Active Templates</span>
            <ClipboardList className="card-icon text-primary" size={20} />
          </div>
          <h3>{stats.totalTemplates}</h3>
          <p>Reusable department templates</p>
        </div>

        <div className="metric-card-glass">
          <div className="card-top">
            <span className="card-label">Active Cycles</span>
            <RefreshCw className="card-icon text-success" size={20} />
          </div>
          <h3>{stats.activeCycles}</h3>
          <p>Cycles in progress / pending review</p>
        </div>

        <div className="metric-card-glass">
          <div className="card-top">
            <span className="card-label">Pending Approvals</span>
            <AlertCircle className="card-icon text-warning" size={20} />
          </div>
          <h3>{stats.pendingReview}</h3>
          <p>Individual reviews submitted</p>
        </div>

        <div className="metric-card-glass">
          <div className="card-top">
            <span className="card-label">Company Avg KPI</span>
            <TrendingUp className="card-icon text-purple" size={20} />
          </div>
          <h3>{stats.avgScore}%</h3>
          <p>Performance rating average</p>
        </div>
      </div>

      {/* Grid of details */}
      <div className="kpi-sections-grid">
        {/* Active Cycles Section */}
        <div className="kpi-section-glass">
          <div className="section-header">
            <h4>Active Evaluation Cycles</h4>
            <button className="btn-sm btn-outline" onClick={() => handleNav('cycles')}>Manage Cycles</button>
          </div>
          <div className="list-container">
            {cycles.length === 0 ? (
              <p className="empty-text">No active evaluation cycles started.</p>
            ) : (
              cycles.slice(0, 5).map(c => (
                <div key={c.id} className="list-item-cycle">
                  <div>
                    <h5>{c.departmentName}</h5>
                    <p className="text-muted">{c.templateName} — {c.periodLabel}</p>
                  </div>
                  <div className="cycle-action-row">
                    <span className={`status-pill ${c.status.toLowerCase().replace(' ', '-')}`}>{c.status}</span>
                    <Link to={`/kpi/workspace/${c.id}`} className="btn-sm btn-primary">Workspace</Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* High/Low Performers Summary */}
        <div className="kpi-section-glass">
          <div className="section-header">
            <h4>Top Department Performers</h4>
            <button className="btn-sm btn-outline" onClick={() => handleNav('analytics')}>Analytics</button>
          </div>
          <div className="list-container">
            {evaluations.length === 0 ? (
              <p className="empty-text">No evaluation records processed yet.</p>
            ) : (
              [...evaluations]
                .sort((a, b) => b.totalScore - a.totalScore)
                .slice(0, 5)
                .map(e => (
                  <div key={e.id} className="list-item-employee">
                    <div>
                      <h5>{e.employeeName}</h5>
                      <p className="text-muted">{e.departmentName} — {e.designation}</p>
                    </div>
                    <div className="score-badge-col">
                      <span className="score-badge-text">{e.totalScore}%</span>
                      <span className="rating-text">{e.rating}</span>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 2. KPI TEMPLATES PANEL
function KPITemplates({ templates, depts, apiCall, refreshData, addToast, canCreate, canUpdate, canDelete }) {
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Builder States
  const [name, setName] = useState('');
  const [dept, setDept] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState('Monthly');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [attributes, setAttributes] = useState([]);
  const [ratingConfig, setRatingConfig] = useState([
    { rating: 'Outstanding', minScore: 95, maxScore: 100 },
    { rating: 'Excellent', minScore: 85, maxScore: 94.99 },
    { rating: 'Good', minScore: 75, maxScore: 84.99 },
    { rating: 'Average', minScore: 60, maxScore: 74.99 },
    { rating: 'Needs Improvement', minScore: 0, maxScore: 59.99 }
  ]);

  const handleEdit = (tmpl) => {
    if (tmpl.status !== 'Draft') {
      addToast('error', 'Only Draft templates can be modified directly.');
      return;
    }
    setSelectedTemplate(tmpl);
    setName(tmpl.name);
    setDept(tmpl.departmentId);
    setDescription(tmpl.description);
    setFrequency(tmpl.frequency);
    setEffectiveDate(tmpl.effectiveDate ? tmpl.effectiveDate.substring(0, 10) : '');
    setExpiryDate(tmpl.expiryDate ? tmpl.expiryDate.substring(0, 10) : '');
    setAttributes(tmpl.attributes || []);
    setRatingConfig(tmpl.ratingConfig || []);
    setShowBuilder(true);
  };

  const handleCreateNew = () => {
    setSelectedTemplate(null);
    setName('');
    setDept('');
    setDescription('');
    setFrequency('Monthly');
    setEffectiveDate('');
    setExpiryDate('');
    setAttributes([
      { id: '1', name: 'Task Completion', description: 'Assigned tasks completion rate', weight: 30, maxScore: 10, scoreType: 'Automatic', dataSource: 'task_completion', allowOverride: false, commentRequired: false, order: 1 },
      { id: '2', name: 'Attendance', description: 'Present days percentage', weight: 20, maxScore: 10, scoreType: 'Automatic', dataSource: 'attendance', allowOverride: false, commentRequired: false, order: 2 },
      { id: '3', name: 'Daily Reports', description: 'Daily reports compliance', weight: 20, maxScore: 10, scoreType: 'Automatic', dataSource: 'daily_reports', allowOverride: false, commentRequired: false, order: 3 },
      { id: '4', name: 'Teamwork', description: 'Collaboration & team spirit', weight: 30, maxScore: 10, scoreType: 'Manual', dataSource: '', allowOverride: false, commentRequired: true, order: 4 }
    ]);
    setRatingConfig([
      { rating: 'Outstanding', minScore: 95, maxScore: 100 },
      { rating: 'Excellent', minScore: 85, maxScore: 94.99 },
      { rating: 'Good', minScore: 75, maxScore: 84.99 },
      { rating: 'Average', minScore: 60, maxScore: 74.99 },
      { rating: 'Needs Improvement', minScore: 0, maxScore: 59.99 }
    ]);
    setShowBuilder(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name || !dept || !effectiveDate || !expiryDate) {
      addToast('error', 'Please fill in all template header fields.');
      return;
    }

    const selectedDept = depts.find(d => d.id === dept || d._id === dept);
    const departmentName = selectedDept ? selectedDept.name : 'Unknown Department';

    // Basic Weight Check
    const totalWeight = attributes.reduce((sum, a) => sum + (Number(a.weight) || 0), 0);

    const payload = {
      name,
      departmentId: dept,
      departmentName,
      description,
      frequency,
      effectiveDate,
      expiryDate,
      attributes,
      ratingConfig
    };

    try {
      if (selectedTemplate) {
        await apiCall(`/api/v1/kpi-templates/${selectedTemplate.id}`, 'PUT', payload);
        addToast('success', 'KPI Template updated successfully.');
      } else {
        await apiCall('/api/v1/kpi-templates', 'POST', payload);
        addToast('success', 'KPI Template created successfully.');
      }
      setShowBuilder(false);
      refreshData();
    } catch (err) {
      addToast('error', err.message);
    }
  };

  const handlePublish = async (tmpl) => {
    const totalWeight = tmpl.attributes.reduce((sum, a) => sum + (Number(a.weight) || 0), 0);
    if (totalWeight !== 100) {
      addToast('error', `Cannot publish: Total weight is ${totalWeight}%, but must sum to exactly 100%.`);
      return;
    }

    try {
      await apiCall(`/api/v1/kpi-templates/${tmpl.id}/publish`, 'POST');
      addToast('success', `Template "${tmpl.name}" published successfully.`);
      refreshData();
    } catch (err) {
      addToast('error', err.message);
    }
  };

  const handleNewVersion = async (tmpl) => {
    try {
      const newVer = await apiCall(`/api/v1/kpi-templates/${tmpl.id}/new-version`, 'POST');
      addToast('success', `Created new draft version (v${newVer.version}) of "${tmpl.name}".`);
      refreshData();
    } catch (err) {
      addToast('error', err.message);
    }
  };

  const handleArchive = async (tmpl) => {
    try {
      await apiCall(`/api/v1/kpi-templates/${tmpl.id}/archive`, 'POST');
      addToast('success', `Template "${tmpl.name}" has been archived.`);
      refreshData();
    } catch (err) {
      addToast('error', err.message);
    }
  };

  const handleDelete = async (tmpl) => {
    if (!window.confirm(`Are you sure you want to delete template "${tmpl.name}"?`)) return;
    try {
      await apiCall(`/api/v1/kpi-templates/${tmpl.id}`, 'DELETE');
      addToast('success', `Template "${tmpl.name}" deleted.`);
      refreshData();
    } catch (err) {
      addToast('error', err.message);
    }
  };

  return (
    <div className="kpi-panel-container fade-in">
      {!showBuilder ? (
        <>
          <div className="panel-actions-row">
            <h4>Department Templates</h4>
            {canCreate && (
              <button className="btn btn-primary" onClick={handleCreateNew}>
                <Plus size={16} />
                <span>Create Template</span>
              </button>
            )}
          </div>

          <div className="kpi-table-glass">
            <table>
              <thead>
                <tr>
                  <th>Template Name</th>
                  <th>Department</th>
                  <th>Frequency</th>
                  <th>Version</th>
                  <th>Effective Dates</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center empty-cell">No templates created. Click "Create Template" to start.</td>
                  </tr>
                ) : (
                  templates.map(tmpl => {
                    const totalWeight = tmpl.attributes.reduce((sum, a) => sum + (Number(a.weight) || 0), 0);
                    return (
                      <tr key={tmpl.id}>
                        <td>
                          <div className="template-name-block">
                            <strong>{tmpl.name}</strong>
                            <span>{totalWeight}% total weight</span>
                          </div>
                        </td>
                        <td>{tmpl.departmentName}</td>
                        <td>{tmpl.frequency}</td>
                        <td><span className="version-badge">v{tmpl.version}</span></td>
                        <td>
                          {tmpl.effectiveDate ? tmpl.effectiveDate.substring(0, 10) : ''} to{' '}
                          {tmpl.expiryDate ? tmpl.expiryDate.substring(0, 10) : ''}
                        </td>
                        <td>
                          <span className={`status-pill ${tmpl.status.toLowerCase()}`}>{tmpl.status}</span>
                        </td>
                        <td className="text-right">
                          <div className="row-actions">
                            {tmpl.status === 'Draft' && (
                              <>
                                {canUpdate && <button className="icon-btn" title="Edit" onClick={() => handleEdit(tmpl)}><Edit size={14} /></button>}
                                {canUpdate && <button className="icon-btn text-success" title="Publish" onClick={() => handlePublish(tmpl)}><CheckCircle size={14} /></button>}
                                {canDelete && <button className="icon-btn text-danger" title="Delete" onClick={() => handleDelete(tmpl)}><Trash2 size={14} /></button>}
                              </>
                            )}
                            {tmpl.status === 'Published' && (
                              <>
                                {canCreate && <button className="icon-btn text-primary" title="Create New Version" onClick={() => handleNewVersion(tmpl)}><Plus size={14} /></button>}
                                {canUpdate && <button className="icon-btn text-warning" title="Archive" onClick={() => handleArchive(tmpl)}><Archive size={14} /></button>}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <form className="kpi-form-glass fade-in" onSubmit={handleSave}>
          <div className="form-header">
            <h4>{selectedTemplate ? `Edit Template: ${name}` : 'New KPI Template'}</h4>
            <button type="button" className="btn btn-outline" onClick={() => setShowBuilder(false)}>Cancel</button>
          </div>

          <div className="form-grid">
            <div className="form-col">
              <label>Template Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Software Development KPI" />
            </div>

            <div className="form-col">
              <label>Target Department</label>
              <select value={dept} onChange={e => setDept(e.target.value)} required>
                <option value="">Select Department</option>
                {depts.map(d => (
                  <option key={d.id || d._id} value={d.id || d._id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="form-col">
              <label>Frequency</label>
              <select value={frequency} onChange={e => setFrequency(e.target.value)}>
                <option value="Weekly">Weekly</option>
                <option value="15 Days">15 Days</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Semi-Annually">Semi-Annually</option>
                <option value="Annually">Annually</option>
                <option value="Custom">Custom</option>
              </select>
            </div>

            <div className="form-col-span">
              <label>Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Template description..." rows="2" />
            </div>

            <div className="form-col">
              <label>Effective Date</label>
              <input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} required />
            </div>

            <div className="form-col">
              <label>Expiry Date</label>
              <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} required />
            </div>
          </div>

          {/* Attributes Section */}
          <div className="form-section-divider">Attributes List</div>
          <div className="attributes-builder-container">
            {attributes.map((attr, idx) => (
              <div key={attr.id || idx} className="attribute-builder-row">
                <div className="attr-input-group name">
                  <label>Name</label>
                  <input type="text" value={attr.name} onChange={e => {
                    const newAttrs = [...attributes];
                    newAttrs[idx].name = e.target.value;
                    setAttributes(newAttrs);
                  }} required />
                </div>

                <div className="attr-input-group weight">
                  <label>Weight (%)</label>
                  <input type="number" value={attr.weight} onChange={e => {
                    const newAttrs = [...attributes];
                    newAttrs[idx].weight = Number(e.target.value);
                    setAttributes(newAttrs);
                  }} min="1" max="100" required />
                </div>

                <div className="attr-input-group max-score">
                  <label>Max Score</label>
                  <input type="number" value={attr.maxScore} onChange={e => {
                    const newAttrs = [...attributes];
                    newAttrs[idx].maxScore = Number(e.target.value);
                    setAttributes(newAttrs);
                  }} min="1" required />
                </div>

                <div className="attr-input-group type">
                  <label>Type</label>
                  <select value={attr.scoreType} onChange={e => {
                    const newAttrs = [...attributes];
                    newAttrs[idx].scoreType = e.target.value;
                    if (e.target.value === 'Manual') {
                      newAttrs[idx].dataSource = '';
                    }
                    setAttributes(newAttrs);
                  }}>
                    <option value="Automatic">Automatic</option>
                    <option value="Manual">Manual</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>

                {attr.scoreType !== 'Manual' && (
                  <div className="attr-input-group source">
                    <label>Data Source</label>
                    <select value={attr.dataSource} onChange={e => {
                      const newAttrs = [...attributes];
                      newAttrs[idx].dataSource = e.target.value;
                      setAttributes(newAttrs);
                    }}>
                      <option value="task_completion">Task Completion</option>
                      <option value="attendance">Attendance Tracking</option>
                      <option value="daily_reports">Daily Work Reports</option>
                      <option value="project_completion">Project Completion</option>
                      <option value="overdue_tasks">Overdue Tasks Ratio</option>
                      <option value="leave_percentage">Leaves Deduct</option>
                      <option value="attendance_corrections">Attendance Corrections</option>
                    </select>
                  </div>
                )}

                <button type="button" className="icon-btn text-danger attr-row-remove" onClick={() => {
                  setAttributes(attributes.filter((_, i) => i !== idx));
                }}><Trash2 size={16} /></button>
              </div>
            ))}

            <button type="button" className="btn btn-outline-dashed btn-sm" onClick={() => {
              setAttributes([...attributes, {
                id: Math.random().toString().substring(2),
                name: '',
                description: '',
                weight: 10,
                maxScore: 10,
                scoreType: 'Manual',
                dataSource: '',
                allowOverride: true,
                commentRequired: false,
                order: attributes.length + 1
              }]);
            }}>
              <Plus size={14} /> Add Custom Attribute
            </button>
          </div>

          {/* Validation indicators */}
          <div className="validation-bar">
            {attributes.reduce((sum, a) => sum + (Number(a.weight) || 0), 0) === 100 ? (
              <span className="text-success flex items-center gap-1"><CheckCircle size={16} /> Total Weight: 100% (Valid)</span>
            ) : (
              <span className="text-warning flex items-center gap-1">
                <AlertTriangle size={16} /> Total Weight: {attributes.reduce((sum, a) => sum + (Number(a.weight) || 0), 0)}% (Must equal exactly 100%)
              </span>
            )}
          </div>

          <div className="form-footer-actions">
            <button type="submit" className="btn btn-primary">
              <Save size={16} />
              <span>Save Template</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// 3. KPI EVALUATION CYCLES PANEL
function KPIEvaluationCycles({ cycles, templates, depts, apiCall, refreshData, addToast, navigate, canCreate, canUpdate }) {
  const [showStartForm, setShowStartForm] = useState(false);
  const [deptId, setDeptId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [periodLabel, setPeriodLabel] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  const filteredTemplates = useMemo(() => {
    return templates.filter(t => t.status === 'Published' && t.departmentId === deptId);
  }, [templates, deptId]);

  const handleStartCycle = async (e) => {
    e.preventDefault();
    if (!deptId || !templateId || !periodLabel || !periodStart || !periodEnd) {
      addToast('error', 'Please fill in all cycle details.');
      return;
    }

    const payload = { templateId, periodLabel, periodStart, periodEnd };
    try {
      const newCycle = await apiCall('/api/v1/kpi-evaluation-cycles', 'POST', payload);
      addToast('success', 'Evaluation cycle started successfully.');
      setShowStartForm(false);
      refreshData();
      navigate(`/kpi/workspace/${newCycle.id}`);
    } catch (err) {
      addToast('error', err.message);
    }
  };

  return (
    <div className="kpi-panel-container fade-in">
      {!showStartForm ? (
        <>
          <div className="panel-actions-row">
            <h4>Evaluation Cycles</h4>
            {canCreate && (
              <button className="btn btn-primary" onClick={() => setShowStartForm(true)}>
                <Plus size={16} />
                <span>Start Evaluation</span>
              </button>
            )}
          </div>

          <div className="kpi-table-glass">
            <table>
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Template Name</th>
                  <th>Period</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Avg Score</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cycles.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center empty-cell">No evaluation cycles started. Click "Start Evaluation" to create one.</td>
                  </tr>
                ) : (
                  cycles.map(c => {
                    const rate = c.employeeCount > 0 ? Math.round((c.completedCount / c.employeeCount) * 100) : 0;
                    return (
                      <tr key={c.id}>
                        <td><strong>{c.departmentName}</strong></td>
                        <td>{c.templateName} <span className="version-badge-small">v{c.templateVersion}</span></td>
                        <td>{c.periodLabel}</td>
                        <td><span className={`status-pill ${c.status.toLowerCase().replace(' ', '-')}`}>{c.status}</span></td>
                        <td>
                          <div className="progress-bar-container" title={`${c.completedCount} of ${c.employeeCount} completed`}>
                            <div className="progress-bar-fill" style={{ width: `${rate}%` }}></div>
                            <span className="progress-bar-text">{rate}%</span>
                          </div>
                        </td>
                        <td>{c.averageScore}%</td>
                        <td className="text-right">
                          <Link to={`/kpi/workspace/${c.id}`} className="btn-sm btn-outline">Workspace</Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <form className="kpi-form-glass fade-in" onSubmit={handleStartCycle}>
          <div className="form-header">
            <h4>Start Evaluation Cycle</h4>
            <button type="button" className="btn btn-outline" onClick={() => setShowStartForm(false)}>Cancel</button>
          </div>

          <div className="form-grid">
            <div className="form-col">
              <label>Select Department</label>
              <select value={deptId} onChange={e => {
                setDeptId(e.target.value);
                setTemplateId('');
              }} required>
                <option value="">Select Department</option>
                {depts.map(d => (
                  <option key={d.id || d._id} value={d.id || d._id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="form-col">
              <label>KPI Template</label>
              <select value={templateId} onChange={e => setTemplateId(e.target.value)} required disabled={!deptId}>
                <option value="">Select published template</option>
                {filteredTemplates.map(t => (
                  <option key={t.id} value={t.id}>{t.name} (v{t.version})</option>
                ))}
              </select>
            </div>

            <div className="form-col">
              <label>Period Label</label>
              <input type="text" value={periodLabel} onChange={e => setPeriodLabel(e.target.value)} required placeholder="e.g. July 2026" />
            </div>

            <div className="form-col">
              <label>Period Start Date</label>
              <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} required />
            </div>

            <div className="form-col">
              <label>Period End Date</label>
              <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} required />
            </div>
          </div>

          <div className="form-footer-actions">
            <button type="submit" className="btn btn-primary" disabled={!templateId}>
              <RefreshCw size={16} />
              <span>Start Cycle</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// 4. KPI SPREADSHEET EVALUATION WORKSPACE
function KPIEvaluationWorkspace({ cycleId, apiCall, addToast, navigate, currentUser, canUpdate, canApprove }) {
  const [cycle, setCycle] = useState(null);
  const [employeeEvals, setEmployeeEvals] = useState([]);
  const [selectedEval, setSelectedEval] = useState(null);
  const [savingState, setSavingState] = useState(''); // Saving, Saved, Failed, ''
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingRowId, setEditingRowId] = useState(null);

  // Export Modal States
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportDateFrom, setExportDateFrom] = useState('');
  const [exportDateTo, setExportDateTo] = useState('');
  const [exportStatusFilter, setExportStatusFilter] = useState('all');
  const [exportIncludeComments, setExportIncludeComments] = useState(true);
  const [exportIncludeScoreBreakdown, setExportIncludeScoreBreakdown] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Override States for Hybrid score overrides
  const [overrideValue, setOverrideValue] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideAttrId, setOverrideAttrId] = useState('');

  const loadWorkspaceData = async () => {
    try {
      const cyc = await apiCall(`/api/v1/kpi-evaluation-cycles/${cycleId}`);
      setCycle(cyc);

      const evs = await apiCall(`/api/v1/kpi-employee-evaluations/cycle/${cycleId}`);
      setEmployeeEvals(evs || []);
    } catch (err) {
      addToast('error', err.message);
    }
  };

  useEffect(() => {
    loadWorkspaceData();
  }, [cycleId]);

  // Dynamic template snapshot attributes
  const columns = useMemo(() => {
    if (employeeEvals.length === 0) return [];
    return employeeEvals[0].templateSnapshot?.attributes || [];
  }, [employeeEvals]);

  // Handle local spreadsheet input change
  const handleScoreChange = async (evalId, attrId, val) => {
    if (!canUpdate) {
      addToast('error', 'You do not have permission to update scores.');
      return;
    }
    // Optimistically update local state immediately
    const ev = employeeEvals.find(e => e.id === evalId);
    if (!ev) return;

    const attr = ev.attributeScores.find(a => a.attributeId === attrId);
    if (!attr) return;

    attr.manualScore = val;
    attr.finalScore = val;

    // Trigger debounced autosave to backend
    setSavingState('Saving...');
    try {
      await apiCall(`/api/v1/kpi-employee-evaluations/${evalId}/scores`, 'PATCH', {
        scores: [{ attributeId: attrId, value: val }]
      });
      setSavingState('Saved');
      setTimeout(() => setSavingState(''), 2000);
      loadWorkspaceData();
    } catch (err) {
      setSavingState('Failed');
      addToast('error', err.message);
    }
  };

  // Submit single employee evaluation
  const handleSubmitEval = async (evalId) => {
    try {
      await apiCall(`/api/v1/kpi-employee-evaluations/${evalId}/submit`, 'POST');
      addToast('success', 'Employee evaluation submitted.');
      loadWorkspaceData();
      if (selectedEval && selectedEval.id === evalId) {
        setShowDrawer(false);
      }
    } catch (err) {
      addToast('error', err.message);
    }
  };

  // Return evaluation
  const handleReturnEval = async (evalId, reason) => {
    if (!reason || !reason.trim()) {
      addToast('error', 'Please enter a return reason.');
      return;
    }
    try {
      await apiCall(`/api/v1/kpi-employee-evaluations/${evalId}/return`, 'POST', { returnReason: reason });
      addToast('success', 'Employee evaluation returned.');
      loadWorkspaceData();
      setShowDrawer(false);
    } catch (err) {
      addToast('error', err.message);
    }
  };

  // Approve evaluation
  const handleApproveEval = async (evalId) => {
    try {
      await apiCall(`/api/v1/kpi-employee-evaluations/${evalId}/approve`, 'POST');
      addToast('success', 'Employee evaluation approved.');
      loadWorkspaceData();
      if (selectedEval && selectedEval.id === evalId) {
        setShowDrawer(false);
      }
    } catch (err) {
      addToast('error', err.message);
    }
  };

  // Reopen evaluation
  const handleReopenEval = async (evalId, reason) => {
    if (!reason || !reason.trim()) {
      addToast('error', 'Reopen reason is required.');
      return;
    }
    try {
      await apiCall(`/api/v1/kpi-employee-evaluations/${evalId}/reopen`, 'POST', { reopenReason: reason });
      addToast('success', 'Employee evaluation reopened as Draft.');
      loadWorkspaceData();
      setShowDrawer(false);
    } catch (err) {
      addToast('error', err.message);
    }
  };

  // Submit entire cycle for approval
  const handleCycleSubmit = async () => {
    try {
      await apiCall(`/api/v1/kpi-evaluation-cycles/${cycleId}/submit`, 'POST');
      addToast('success', 'Cycle submitted for approval successfully.');
      loadWorkspaceData();
    } catch (err) {
      addToast('error', err.message);
    }
  };

  // Approve entire cycle
  const handleCycleApprove = async () => {
    try {
      await apiCall(`/api/v1/kpi-evaluation-cycles/${cycleId}/approve`, 'POST');
      addToast('success', 'Cycle approved successfully.');
      loadWorkspaceData();
    } catch (err) {
      addToast('error', err.message);
    }
  };

  // Lock cycle
  const handleCycleLock = async () => {
    try {
      await apiCall(`/api/v1/kpi-evaluation-cycles/${cycleId}/lock`, 'POST');
      addToast('success', 'Cycle evaluations locked permanently.');
      loadWorkspaceData();
    } catch (err) {
      addToast('error', err.message);
    }
  };

  // Save Hybrid Score Override
  const handleOverrideSave = async () => {
    if (!overrideValue || !overrideReason) {
      addToast('error', 'Score and override reason are required.');
      return;
    }

    try {
      await apiCall(`/api/v1/kpi-employee-evaluations/${selectedEval.id}/scores`, 'PATCH', {
        scores: [{
          attributeId: overrideAttrId,
          value: overrideValue,
          isOverridden: true,
          overrideReason
        }]
      });
      addToast('success', 'Hybrid score override saved successfully.');
      setOverrideValue('');
      setOverrideReason('');
      setOverrideAttrId('');
      loadWorkspaceData();
      setShowDrawer(false);
    } catch (err) {
      addToast('error', err.message);
    }
  };

  const handleRowClick = (ev) => {
    setSelectedEval(ev);
    setShowDrawer(true);
  };

  // Export handler
  const handleExport = () => {
    setIsExporting(true);
    try {
      // Filter evaluations by status
      let filtered = [...employeeEvals];
      if (exportStatusFilter !== 'all') {
        filtered = filtered.filter(ev => ev.status === exportStatusFilter);
      }

      if (filtered.length === 0) {
        addToast('error', 'No evaluations match your export filters.');
        setIsExporting(false);
        return;
      }

      const colNames = columns.map(c => c.name);
      const deptName = cycle?.departmentName || 'Department';
      const periodLabel = cycle?.periodLabel || '';
      const templateName = cycle?.templateName || '';
      const exportDate = new Date().toLocaleDateString();

      if (exportFormat === 'csv' || exportFormat === 'excel') {
        // Build CSV rows
        const sep = exportFormat === 'csv' ? ',' : '\t';
        const headerRow = ['Employee', 'Designation', ...colNames, 'Total Score', 'Rating', 'Status'];
        if (exportIncludeComments) headerRow.push('Manager Comment');
        const rows = [headerRow.join(sep)];

        // Add metadata header
        rows.unshift(`# Export: ${deptName} — ${periodLabel}${sep}Template: ${templateName}${sep}Date: ${exportDate}`);
        if (exportDateFrom || exportDateTo) {
          rows.splice(1, 0, `# Date Range: ${exportDateFrom || 'Start'} to ${exportDateTo || 'End'}`);
        }
        rows.push(''); // blank line before data

        filtered.forEach(ev => {
          const scores = columns.map(col => {
            const attr = ev.attributeScores?.find(a => a.attributeId === col.id) || {};
            if (exportIncludeScoreBreakdown) {
              return attr.finalScore ?? '--';
            }
            return attr.finalScore ?? '';
          });
          const row = [
            `"${ev.employeeName || ''}"`,
            `"${ev.designation || ''}"`,
            ...scores,
            ev.totalScore ?? '',
            `"${ev.rating || 'Pending'}"`,
            `"${ev.status}"`
          ];
          if (exportIncludeComments) {
            row.push(`"${ev.managerComment || ''}"`);
          }
          rows.push(row.join(sep));
        });

        const content = rows.join('\n');
        const ext = exportFormat === 'csv' ? 'csv' : 'xls';
        const mimeType = exportFormat === 'csv' ? 'text/csv' : 'application/vnd.ms-excel';
        const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `KPI_${deptName}_${periodLabel.replace(/\s/g, '_')}_${exportDate.replace(/\//g, '-')}.${ext}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        addToast('success', `Export downloaded as .${ext} successfully!`);
      } else if (exportFormat === 'pdf') {
        // Open print-friendly window
        const printWindow = window.open('', '_blank');
        const attrHeaders = columns.map(c => `<th style="padding:8px 12px;border:1px solid #334155;background:#1e293b;color:#f1f5f9;font-size:12px;">${c.name} (${c.weight}%)</th>`).join('');
        const bodyRows = filtered.map(ev => {
          const scoreCells = columns.map(col => {
            const attr = ev.attributeScores?.find(a => a.attributeId === col.id) || {};
            return `<td style="padding:6px 10px;border:1px solid #334155;text-align:center;font-size:12px;">${attr.finalScore ?? '--'}</td>`;
          }).join('');
          return `<tr>
            <td style="padding:6px 10px;border:1px solid #334155;font-weight:600;font-size:12px;">${ev.employeeName}</td>
            <td style="padding:6px 10px;border:1px solid #334155;font-size:12px;">${ev.designation || ''}</td>
            ${scoreCells}
            <td style="padding:6px 10px;border:1px solid #334155;text-align:center;font-weight:700;font-size:12px;">${ev.totalScore ?? ''}%</td>
            <td style="padding:6px 10px;border:1px solid #334155;text-align:center;font-size:12px;">${ev.rating || 'Pending'}</td>
            <td style="padding:6px 10px;border:1px solid #334155;text-align:center;font-size:12px;">${ev.status}</td>
            ${exportIncludeComments ? `<td style="padding:6px 10px;border:1px solid #334155;font-size:11px;max-width:200px;">${ev.managerComment || ''}</td>` : ''}
          </tr>`;
        }).join('');
        printWindow.document.write(`
          <html><head><title>KPI Export — ${deptName}</title></head>
          <body style="font-family:'Segoe UI',sans-serif;background:#0f172a;color:#e2e8f0;padding:32px;">
            <div style="max-width:1200px;margin:0 auto;">
              <h1 style="color:#db2777;margin-bottom:4px;">KPI Evaluation Report</h1>
              <p style="color:#94a3b8;margin-bottom:4px;">${deptName} — ${periodLabel}</p>
              <p style="color:#64748b;font-size:13px;">Template: ${templateName} | Exported: ${exportDate}${exportDateFrom ? ` | Range: ${exportDateFrom} to ${exportDateTo || 'Present'}` : ''}</p>
              <hr style="border-color:#334155;margin:16px 0;">
              <table style="width:100%;border-collapse:collapse;margin-top:12px;">
                <thead><tr>
                  <th style="padding:8px 12px;border:1px solid #334155;background:#1e293b;color:#f1f5f9;font-size:12px;text-align:left;">Employee</th>
                  <th style="padding:8px 12px;border:1px solid #334155;background:#1e293b;color:#f1f5f9;font-size:12px;">Designation</th>
                  ${attrHeaders}
                  <th style="padding:8px 12px;border:1px solid #334155;background:#1e293b;color:#f1f5f9;font-size:12px;">Total</th>
                  <th style="padding:8px 12px;border:1px solid #334155;background:#1e293b;color:#f1f5f9;font-size:12px;">Rating</th>
                  <th style="padding:8px 12px;border:1px solid #334155;background:#1e293b;color:#f1f5f9;font-size:12px;">Status</th>
                  ${exportIncludeComments ? '<th style="padding:8px 12px;border:1px solid #334155;background:#1e293b;color:#f1f5f9;font-size:12px;">Comment</th>' : ''}
                </tr></thead>
                <tbody>${bodyRows}</tbody>
              </table>
              <p style="margin-top:24px;color:#475569;font-size:11px;">Generated from OMS KPI Management System</p>
            </div>
            <script>setTimeout(()=>{window.print();},500);<\/script>
          </body></html>
        `);
        printWindow.document.close();
        addToast('success', 'PDF report opened in new tab. Use Print → Save as PDF.');
      }

      setShowExportModal(false);
    } catch (err) {
      addToast('error', 'Export failed: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  if (!cycle) return null;

  return (
    <div className="kpi-panel-container fade-in">
      <div className="workspace-header">
        <div className="left-side">
          <button className="icon-btn" onClick={() => navigate('/kpi/cycles')}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h4>Workspace: {cycle.departmentName} ({cycle.periodLabel})</h4>
            <p className="text-muted">Template: {cycle.templateName} — Status: <strong className="text-primary">{cycle.status}</strong></p>
          </div>
        </div>

        {/* Global actions */}
        <div className="right-side">
          {savingState && <span className="saving-indicator text-muted">{savingState}</span>}
          <button className="btn btn-outline-export" onClick={() => setShowExportModal(true)}>
            <Download size={16} />
            <span>Export Details</span>
          </button>
          {cycle.status === 'In Progress' && canUpdate && (
            <button className="btn btn-primary" onClick={handleCycleSubmit}>
              <CheckCircle size={16} />
              <span>Submit for Approval</span>
            </button>
          )}
          {cycle.status === 'Submitted' && canApprove && (
            <button className="btn btn-success" onClick={handleCycleApprove}>
              <UserCheck size={16} />
              <span>Approve All</span>
            </button>
          )}
          {cycle.status === 'Approved' && canApprove && (
            <button className="btn btn-danger" onClick={handleCycleLock}>
              <Archive size={16} />
              <span>Lock Cycle</span>
            </button>
          )}
        </div>
      </div>

      {/* Spreadsheet grid */}
      <div className="spreadsheet-container-glass">
        <table>
          <thead>
            <tr>
              <th className="sticky-col">Employee</th>
              {columns.map(col => (
                <th key={col.id}>{col.name} ({col.weight}%)</th>
              ))}
              <th>Final Score</th>
              <th>Rating</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {employeeEvals.map(ev => {
              const isLocked = ['Approved', 'Locked'].includes(ev.status);
              const isSubmitted = ev.status === 'Submitted';
              const isFieldDisabled = isLocked || !canUpdate || (isSubmitted && editingRowId !== ev.id);
              return (
                <tr key={ev.id}>
                  <td className="sticky-col employee-cell-name" onClick={() => handleRowClick(ev)}>
                    <strong>{ev.employeeName}</strong>
                    <span>{ev.designation}</span>
                  </td>
                  {columns.map(col => {
                    const attr = ev.attributeScores.find(a => a.attributeId === col.id) || {};
                    const isManual = attr.scoreType === 'Manual';
                    const isHybrid = attr.scoreType === 'Hybrid';

                    return (
                      <td key={col.id}>
                        {isManual ? (
                          <input
                            type="number"
                            className="spreadsheet-input"
                            min="0"
                            max={col.maxScore}
                            value={attr.manualScore ?? ''}
                            onChange={e => handleScoreChange(ev.id, col.id, e.target.value)}
                            disabled={isFieldDisabled}
                            placeholder={`max ${col.maxScore}`}
                          />
                        ) : (
                          <div className={`auto-score-display ${attr.isOverridden ? 'overridden' : ''}`} title={attr.isOverridden ? `Override reason: ${attr.overrideReason}` : ''}>
                            <span>{attr.finalScore ?? '--'}</span>
                            {isHybrid && !isFieldDisabled && (
                              <button className="override-trigger-btn" onClick={() => {
                                setSelectedEval(ev);
                                setOverrideAttrId(col.id);
                                setOverrideValue(attr.finalScore || '');
                                setShowDrawer(true);
                              }}>override</button>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td><strong>{ev.totalScore}%</strong></td>
                  <td><span className="rating-tag">{ev.rating || 'Pending'}</span></td>
                  <td>
                    <span className={`status-pill ${ev.status.toLowerCase().replace(' ', '-')}`}>{ev.status}</span>
                  </td>
                  <td className="text-right">
                    <div className="row-actions justify-end">
                      <button 
                        className="icon-btn" 
                        style={editingRowId === ev.id ? { background: 'rgba(219, 39, 119, 0.15)', color: '#db2777', borderColor: 'rgba(219, 39, 119, 0.3)' } : {}}
                        title={editingRowId === ev.id ? "Disable Editing" : "Enable Editing / Review"} 
                        onClick={() => {
                          setEditingRowId(prev => prev === ev.id ? null : ev.id);
                          handleRowClick(ev);
                        }}
                      >
                        <Edit size={14} />
                      </button>
                      {ev.status === 'Draft' && canUpdate && (
                        <button className="btn-sm btn-primary" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => handleSubmitEval(ev.id)}>Submit</button>
                      )}
                      {ev.status === 'Submitted' && canApprove && (
                        <button className="btn-sm btn-success" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => handleApproveEval(ev.id)}>Approve</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Side drawer detail / review pane */}
      {showDrawer && selectedEval && (
        <div className="drawer-overlay" onClick={() => setShowDrawer(false)}>
          <div className="drawer-container-glass" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <h4>KPI Review: {selectedEval.employeeName}</h4>
                <p className="text-muted">{selectedEval.designation} — {selectedEval.periodLabel}</p>
              </div>
              <button className="btn-close" onClick={() => setShowDrawer(false)}>×</button>
            </div>

            <div className="drawer-body">
              {(() => {
                const evalLocked = ['Approved', 'Locked'].includes(selectedEval.status);
                const evalSubmitted = selectedEval.status === 'Submitted';
                const isDrawerFieldDisabled = evalLocked || !canUpdate || (evalSubmitted && editingRowId !== selectedEval.id);

                return overrideAttrId ? (
                  <div className="override-form-block">
                    <h5>Override Hybrid Attribute Score</h5>
                    <div className="form-col">
                      <label>Override Score Value</label>
                      <input type="number" value={overrideValue} onChange={e => setOverrideValue(e.target.value)} required />
                    </div>
                    <div className="form-col">
                      <label>Mandatory Override Reason</label>
                      <textarea value={overrideReason} onChange={e => setOverrideReason(e.target.value)} required placeholder="Reason for changing score..." rows="3" />
                    </div>
                    <div className="flex gap-2 justify-end mt-3">
                      <button className="btn btn-outline btn-sm" onClick={() => setOverrideAttrId('')}>Cancel</button>
                      <button className="btn btn-primary btn-sm" onClick={handleOverrideSave}>Save Override</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Attributes breakdown */}
                    <div className="drawer-attributes-list">
                      {selectedEval.attributeScores.map(attr => (
                        <div key={attr.attributeId} className="drawer-attr-card">
                          <div className="attr-top-row">
                            <strong>{attr.attributeName}</strong>
                            <span className="type-tag">{attr.scoreType}</span>
                          </div>
                          <div className="attr-values-row">
                            <div>
                              {attr.scoreType === 'Manual' ? (
                                <div className="flex items-center gap-1" style={{ display: 'inline-flex', alignItems: 'center' }}>
                                  <span>Score: </span>
                                  <input
                                    type="number"
                                    className="spreadsheet-input"
                                    style={{ width: '70px', padding: '2px 6px', height: '28px', display: 'inline-block' }}
                                    min="0"
                                    max={attr.maxScore}
                                    value={attr.manualScore ?? ''}
                                    onChange={e => {
                                      handleScoreChange(selectedEval.id, attr.attributeId, e.target.value);
                                      setSelectedEval(prev => ({
                                        ...prev,
                                        attributeScores: prev.attributeScores.map(a =>
                                          a.attributeId === attr.attributeId
                                            ? { ...a, manualScore: e.target.value === '' ? null : Number(e.target.value), finalScore: e.target.value === '' ? null : Number(e.target.value) }
                                            : a
                                        )
                                      }));
                                    }}
                                    disabled={isDrawerFieldDisabled}
                                    placeholder={`max ${attr.maxScore}`}
                                  />
                                  <span>/ {attr.maxScore}</span>
                                </div>
                              ) : (
                                <>
                                  <span>Final Score: </span>
                                  <strong>{attr.finalScore ?? 'Pending'} / {attr.maxScore}</strong>
                                </>
                              )}
                            </div>
                            <div>
                              <span>Weight: </span>
                              <span>{attr.weight}%</span>
                            </div>
                          </div>
                          {attr.scoreType === 'Automatic' && attr.calculationMetadata && (
                            <div className="metadata-breakdown">
                              <span className="metadata-title">System Resolution:</span>
                              <span className="metadata-text">
                                Numerator: {attr.calculationMetadata.numerator || 0} — Denominator: {attr.calculationMetadata.denominator || 0}
                              </span>
                              <span className="metadata-rule">{attr.calculationMetadata.rule}</span>
                            </div>
                          )}
                          {attr.isOverridden && (
                            <div className="override-log-text">
                              <strong>Overridden:</strong> {attr.overrideReason}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Actions according to status */}
                    <div className="drawer-overall-section">
                      <div className="overall-summary">
                        <div>Final Weighted Score: <strong>{selectedEval.totalScore}%</strong></div>
                        <div>Rating: <span className="rating-tag">{selectedEval.rating || 'Pending'}</span></div>
                        <div>Status: <span className={`status-pill ${selectedEval.status.toLowerCase().replace(' ', '-')}`}>{selectedEval.status}</span></div>
                      </div>

                      {selectedEval.status === 'Submitted' && canApprove && (
                        <div className="drawer-actions-block">
                          <button className="btn btn-success w-full" onClick={() => handleApproveEval(selectedEval.id)}>Approve</button>
                        </div>
                      )}

                      {selectedEval.status === 'Approved' && canApprove && (
                        <div className="drawer-actions-block">
                          <textarea id="reopen-reason-input" placeholder="Reason for reopening to Draft..." rows="2" className="mb-2" />
                          <button className="btn btn-outline text-warning w-full" onClick={() => {
                            const reason = document.getElementById('reopen-reason-input').value;
                            handleReopenEval(selectedEval.id, reason);
                          }}>Reopen Evaluation</button>
                        </div>
                      )}

                      {selectedEval.status === 'Locked' && (
                        <div className="drawer-actions-block text-center text-muted">
                  This evaluation is locked and archived.
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="export-modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="export-modal-container" onClick={e => e.stopPropagation()}>
            <div className="export-modal-header">
              <div className="export-modal-title">
                <div className="export-icon-glow">
                  <Download size={20} />
                </div>
                <div>
                  <h3>Export Evaluation Details</h3>
                  <p className="text-muted">{cycle?.departmentName} — {cycle?.periodLabel}</p>
                </div>
              </div>
              <button className="btn-close" onClick={() => setShowExportModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="export-modal-body">
              {/* Format Selection */}
              <div className="export-section">
                <label className="export-label">Export Format</label>
                <div className="export-format-cards">
                  <button
                    className={`format-card ${exportFormat === 'csv' ? 'active' : ''}`}
                    onClick={() => setExportFormat('csv')}
                  >
                    <FileText size={24} />
                    <span className="format-name">CSV</span>
                    <span className="format-desc">Comma-separated values</span>
                  </button>
                  <button
                    className={`format-card ${exportFormat === 'excel' ? 'active' : ''}`}
                    onClick={() => setExportFormat('excel')}
                  >
                    <FileText size={24} />
                    <span className="format-name">Excel</span>
                    <span className="format-desc">Spreadsheet (.xls)</span>
                  </button>
                  <button
                    className={`format-card ${exportFormat === 'pdf' ? 'active' : ''}`}
                    onClick={() => setExportFormat('pdf')}
                  >
                    <Download size={24} />
                    <span className="format-name">PDF</span>
                    <span className="format-desc">Print-ready report</span>
                  </button>
                </div>
              </div>

              {/* Date Range */}
              <div className="export-section">
                <label className="export-label">
                  <Calendar size={14} />
                  Date Range <span className="text-muted">(optional)</span>
                </label>
                <div className="export-date-row">
                  <div className="export-field">
                    <label className="export-sublabel">From</label>
                    <input
                      type="date"
                      className="export-input"
                      value={exportDateFrom}
                      onChange={e => setExportDateFrom(e.target.value)}
                    />
                  </div>
                  <div className="export-field">
                    <label className="export-sublabel">To</label>
                    <input
                      type="date"
                      className="export-input"
                      value={exportDateTo}
                      onChange={e => setExportDateTo(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Status Filter */}
              <div className="export-section">
                <label className="export-label">
                  <Filter size={14} />
                  Status Filter
                </label>
                <select
                  className="export-input"
                  value={exportStatusFilter}
                  onChange={e => setExportStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="Draft">Draft</option>
                  <option value="Completed">Completed</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Approved">Approved</option>
                  <option value="Locked">Locked</option>
                </select>
              </div>

              {/* Include Options */}
              <div className="export-section">
                <label className="export-label">Include in Export</label>
                <div className="export-toggles">
                  <label className="export-toggle-item">
                    <input
                      type="checkbox"
                      checked={exportIncludeScoreBreakdown}
                      onChange={e => setExportIncludeScoreBreakdown(e.target.checked)}
                    />
                    <span>Individual attribute scores</span>
                  </label>
                  <label className="export-toggle-item">
                    <input
                      type="checkbox"
                      checked={exportIncludeComments}
                      onChange={e => setExportIncludeComments(e.target.checked)}
                    />
                    <span>Manager comments</span>
                  </label>
                </div>
              </div>

              {/* Summary */}
              <div className="export-summary-strip">
                <span>{employeeEvals.filter(ev => exportStatusFilter === 'all' || ev.status === exportStatusFilter).length} evaluation(s) will be exported</span>
              </div>
            </div>

            <div className="export-modal-footer">
              <button className="btn btn-outline" onClick={() => setShowExportModal(false)}>Cancel</button>
              <button
                className="btn btn-primary export-btn-glow"
                onClick={handleExport}
                disabled={isExporting}
              >
                {isExporting ? (
                  <><RefreshCw size={16} className="animate-spin" /> Exporting...</>
                ) : (
                  <><Download size={16} /> Export Now</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 5. EMPLOYEE MY KPI PAGE
function MyKPI({ evaluations, currentUser, isEmployee }) {
  const latestEval = useMemo(() => {
    const list = isEmployee ? evaluations : evaluations.filter(e => e.employeeId === currentUser.id);
    const sorted = [...list].sort((a, b) => new Date(b.periodStart) - new Date(a.periodStart));
    return sorted[0] || null;
  }, [evaluations, currentUser, isEmployee]);

  if (!latestEval) {
    return (
      <div className="kpi-panel-container fade-in">
        <div className="kpi-empty-state">
          <User size={48} className="text-muted" />
          <h4>No KPI records found.</h4>
          <p>Once your manager completes and publishes your KPI, it will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="kpi-panel-container fade-in">
      <div className="my-kpi-grid">
        {/* Score Ring / Rating Summary */}
        <div className="my-kpi-card-glass rating-card">
          <span className="tag">Latest Evaluation period: {latestEval.periodLabel}</span>
          <div className="ring-score-container">
            <div className="score-ring">
              <span className="score-num">{latestEval.totalScore}%</span>
              <span className="score-lbl">KPI Score</span>
            </div>
          </div>
          <h4>Rating: {latestEval.rating}</h4>
          <p className="manager-comm">"{latestEval.managerComment || 'No overall comment supplied.'}"</p>
        </div>

        {/* Attribute Contributions */}
        <div className="my-kpi-card-glass details-card">
          <h4>Attribute Breakdown</h4>
          <div className="my-kpi-attrs-list">
            {latestEval.attributeScores.map(attr => {
              const contribution = Math.round(((attr.finalScore || 0) / (attr.maxScore || 10)) * attr.weight * 10) / 10;
              return (
                <div key={attr.attributeId} className="my-kpi-attr-row">
                  <div className="row-header">
                    <strong>{attr.attributeName}</strong>
                    <span>Contribution: {contribution}% of {attr.weight}%</span>
                  </div>
                  <div className="score-visual-track">
                    <div className="score-visual-fill" style={{ width: `${((attr.finalScore || 0) / (attr.maxScore || 10)) * 100}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// 6. KPI HISTORY
function KPIHistory({ evaluations, isEmployee }) {
  const [filterText, setFilterText] = useState('');
  const [filterRating, setFilterRating] = useState('');

  const filtered = useMemo(() => {
    return evaluations.filter(e => {
      const matchText = e.employeeName?.toLowerCase().includes(filterText.toLowerCase()) || e.periodLabel?.toLowerCase().includes(filterText.toLowerCase());
      const matchRating = !filterRating || e.rating === filterRating;
      return matchText && matchRating;
    });
  }, [evaluations, filterText, filterRating]);

  return (
    <div className="kpi-panel-container fade-in">
      {/* History filters */}
      <div className="panel-actions-row flex-wrap gap-3">
        <h4>Evaluation History</h4>
        <div className="flex gap-2">
          <input
            type="text"
            className="filter-input-text w-64"
            placeholder="Search employee or period..."
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
          />
          <select className="filter-input-select" value={filterRating} onChange={e => setFilterRating(e.target.value)}>
            <option value="">All Ratings</option>
            <option value="Outstanding">Outstanding</option>
            <option value="Excellent">Excellent</option>
            <option value="Good">Good</option>
            <option value="Average">Average</option>
            <option value="Needs Improvement">Needs Improvement</option>
          </select>
        </div>
      </div>

      <div className="kpi-table-glass">
        <table>
          <thead>
            <tr>
              {!isEmployee && <th>Employee Name</th>}
              <th>Period</th>
              <th>Template</th>
              <th>KPI Score</th>
              <th>Rating</th>
              <th>Evaluated At</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={isEmployee ? 6 : 7} className="text-center empty-cell">No matching history records resolved.</td>
              </tr>
            ) : (
              filtered.map(e => (
                <tr key={e.id}>
                  {!isEmployee && <td><strong>{e.employeeName}</strong></td>}
                  <td>{e.periodLabel}</td>
                  <td>{e.templateSnapshot?.name || 'KPI Template'} (v{e.templateVersion})</td>
                  <td><strong>{e.totalScore}%</strong></td>
                  <td><span className="rating-tag">{e.rating}</span></td>
                  <td>{new Date(e.updatedAt).toLocaleDateString()}</td>
                  <td><span className={`status-pill ${e.status.toLowerCase().replace(' ', '-')}`}>{e.status}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 7. KPI ANALYTICS
function KPIAnalytics({ evaluations }) {
  // Compute chart details
  const ratingData = useMemo(() => {
    const ratings = {
      Outstanding: 0,
      Excellent: 0,
      Good: 0,
      Average: 0,
      'Needs Improvement': 0
    };
    evaluations.forEach(e => {
      if (ratings[e.rating] !== undefined) {
        ratings[e.rating]++;
      }
    });
    return Object.keys(ratings).map(k => ({ name: k, value: ratings[k] }));
  }, [evaluations]);

  const COLORS = ['#d946ef', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  const trendData = useMemo(() => {
    // Group average scores by period label
    const periods = {};
    evaluations.forEach(e => {
      if (!periods[e.periodLabel]) {
        periods[e.periodLabel] = { sum: 0, count: 0 };
      }
      periods[e.periodLabel].sum += e.totalScore;
      periods[e.periodLabel].count++;
    });

    return Object.keys(periods).map(p => ({
      period: p,
      average: Math.round((periods[p].sum / periods[p].count) * 10) / 10
    }));
  }, [evaluations]);

  return (
    <div className="kpi-panel-container fade-in">
      <div className="kpi-analytics-grid">
        {/* Rating Distribution Pie Chart */}
        <div className="kpi-chart-card-glass">
          <h4>Rating Distribution</h4>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={ratingData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {ratingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Period Trend Line Chart */}
        <div className="kpi-chart-card-glass">
          <h4>Performance Trend (Avg Score)</h4>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="period" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Area type="monotone" dataKey="average" name="Average KPI %" stroke="var(--color-primary)" fillOpacity={1} fill="url(#colorAvg)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
