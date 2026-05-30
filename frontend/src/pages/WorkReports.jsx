import React, { useState } from 'react';
import './WorkReports.css';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import Avatar from '../components/common/Avatar';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import SlideOver from '../components/common/SlideOver';
import StatCard from '../components/common/StatCard';
import {
  FileText,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Clock,
  ThumbsUp,
  Eye,
  MessageSquare,
  Sparkles
} from 'lucide-react';

const initialReports = [
  {
    id: 'REP-01',
    employeeName: 'Divya Singh',
    avatar: 'DS',
    department: 'Engineering',
    date: '2026-05-28',
    project: 'SaaS Platform v2',
    hoursLogged: 8,
    status: 'Approved',
    summary: 'Refactored state management provider to handle lazy routing and role validation hooks.',
    blockers: 'Minor Vite hot-reload delay, resolved after clearing cache.',
    tomorrowGoals: 'Add JWT authorization simulation and structure security forms.',
    feedback: 'Excellent work structuring the RBAC core.',
  },
  {
    id: 'REP-02',
    employeeName: 'Rajesh Kumar',
    avatar: 'RK',
    department: 'Design',
    date: '2026-05-28',
    project: 'Marketing Website',
    hoursLogged: 7.5,
    status: 'Submitted',
    summary: 'Created landing page drafts and Figma layouts. Prepared dark mode gradient swatches.',
    blockers: 'None.',
    tomorrowGoals: 'Export SVG icon packs and coordinate with frontend developers.',
    feedback: '',
  },
  {
    id: 'REP-03',
    employeeName: 'Meena Sharma',
    avatar: 'MS',
    department: 'Marketing & Sales',
    date: '2026-05-28',
    project: 'Q2 Promo Campaign',
    hoursLogged: 6,
    status: 'Flagged',
    summary: 'Attended stakeholder meetings. Logged minimal details regarding task outcomes.',
    blockers: 'Awaiting copywriter approvals for campaign assets.',
    tomorrowGoals: 'Launch newsletter automation campaigns.',
    feedback: 'Please provide more details on task milestones achieved.',
  },
  {
    id: 'REP-04',
    employeeName: 'Prakash Patel',
    avatar: 'PP',
    department: 'Operations',
    date: '2026-05-27',
    project: 'Branch Deployment',
    hoursLogged: 8.5,
    status: 'Approved',
    summary: 'Onboarded 5 new hires for Delhi Office. Configured workstations and active directory accounts.',
    blockers: 'Network latency during provisioning.',
    tomorrowGoals: 'Conduct initial branch operations checklist review.',
    feedback: 'Great job handling the rapid onboarding.',
  }
];

const WorkReports = () => {
  const { addToast } = useApp();
  const loading = usePageLoading();

  const [reports, setReports] = useState(initialReports);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedReport, setSelectedReport] = useState(null);
  
  // Review form states
  const [feedbackInput, setFeedbackInput] = useState('');

  const handleOpenReview = (report) => {
    setSelectedReport(report);
    setFeedbackInput(report.feedback || '');
  };

  const handleApprove = (reportId) => {
    setReports(prev =>
      prev.map(r => (r.id === reportId ? { ...r, status: 'Approved', feedback: feedbackInput } : r))
    );
    addToast('success', `Daily report from ${selectedReport.employeeName} approved.`);
    setSelectedReport(null);
  };

  const handleFlag = (reportId) => {
    setReports(prev =>
      prev.map(r => (r.id === reportId ? { ...r, status: 'Flagged', feedback: feedbackInput } : r))
    );
    addToast('warning', `Daily report from ${selectedReport.employeeName} flagged for review.`);
    setSelectedReport(null);
  };

  if (loading) {
    return (
      <div className="page-loading-wrapper">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  // Filter Logic
  const filteredReports = reports.filter(r => {
    const matchesSearch = r.employeeName.toLowerCase().includes(search.toLowerCase()) || 
                          r.project.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const submittedCount = reports.filter(r => r.status === 'Submitted').length;
  const approvedCount = reports.filter(r => r.status === 'Approved').length;
  const flaggedCount = reports.filter(r => r.status === 'Flagged').length;
  const totalHours = reports.reduce((acc, r) => acc + r.hoursLogged, 0);

  return (
    <div className="work-reports-page animate-fade-in">
      {/* Header */}
      <div className="reports-header">
        <div className="reports-title-section">
          <h1>Daily Work Reports</h1>
          <p className="subtitle">Audit timesheets, task summaries, blockages, and manager feedback loops.</p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="reports-stats">
        <StatCard
          title="Pending Review"
          value={submittedCount}
          icon={Clock}
          description="Reports awaiting audit"
          trend="Needs prompt review"
          trendType={submittedCount > 0 ? 'warning' : 'info'}
        />
        <StatCard
          title="Approved Today"
          value={approvedCount}
          icon={CheckCircle}
          description="Verified employee timesheets"
          trend="All systems aligned"
          trendType="success"
        />
        <StatCard
          title="Flagged Reports"
          value={flaggedCount}
          icon={AlertTriangle}
          description="Items needing clarification"
          trend={flaggedCount > 0 ? 'Requires attention' : 'Clean audit trail'}
          trendType={flaggedCount > 0 ? 'danger' : 'success'}
        />
        <StatCard
          title="Total Hours Logged"
          value={`${totalHours} hrs`}
          icon={FileText}
          description="Accumulated active log time"
          trend="Average 7.5 hrs/emp"
          trendType="info"
        />
      </div>

      {/* Main Filter & Table Card */}
      <div className="reports-card card">
        <div className="table-filter-bar">
          <div className="search-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search employee or project..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-actions">
            <div className="status-filter-tabs">
              {['All', 'Submitted', 'Approved', 'Flagged'].map((status) => (
                <button
                  key={status}
                  className={`status-tab ${statusFilter === status ? 'active' : ''}`}
                  onClick={() => setStatusFilter(status)}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="table-wrapper">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Date</th>
                <th>Project</th>
                <th>Hours Logged</th>
                <th>Task Summary</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.length > 0 ? (
                filteredReports.map((report) => (
                  <tr key={report.id}>
                    <td>
                      <div className="emp-avatar-cell">
                        <Avatar name={report.employeeName} size="sm" />
                        <div>
                          <span className="emp-name">{report.employeeName}</span>
                          <span className="emp-dept">{report.department}</span>
                        </div>
                      </div>
                    </td>
                    <td>{report.date}</td>
                    <td>
                      <span className="project-badge">{report.project}</span>
                    </td>
                    <td>
                      <strong>{report.hoursLogged} hrs</strong>
                    </td>
                    <td>
                      <p className="report-summary-text">{report.summary}</p>
                    </td>
                    <td>
                      <Badge variant={
                        report.status === 'Approved' ? 'success' :
                        report.status === 'Flagged' ? 'danger' : 'warning'
                      }>
                        {report.status}
                      </Badge>
                    </td>
                    <td className="text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={Eye}
                        onClick={() => handleOpenReview(report)}
                      >
                        Audit
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="table-empty-row">
                    No reports match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over detail audit panel */}
      {selectedReport && (
        <SlideOver
          isOpen={!!selectedReport}
          onClose={() => setSelectedReport(null)}
          title="Audit Work Report"
        >
          <div className="report-detail-wrapper">
            {/* Header info */}
            <div className="report-detail-meta">
              <div className="detail-meta-row">
                <Avatar name={selectedReport.employeeName} size="md" />
                <div>
                  <h4>{selectedReport.employeeName}</h4>
                  <p className="subtitle">{selectedReport.department} • {selectedReport.date}</p>
                </div>
              </div>
              <Badge variant={
                selectedReport.status === 'Approved' ? 'success' :
                selectedReport.status === 'Flagged' ? 'danger' : 'warning'
              }>
                {selectedReport.status}
              </Badge>
            </div>

            {/* Project / Hours */}
            <div className="report-metrics-strip">
              <div className="report-metric">
                <span className="label">Project</span>
                <span className="val">{selectedReport.project}</span>
              </div>
              <div className="report-metric">
                <span className="label">Hours Logged</span>
                <span className="val">{selectedReport.hoursLogged} hours</span>
              </div>
            </div>

            {/* Core summaries */}
            <div className="report-content-section">
              <h5>Tasks Completed</h5>
              <div className="content-box">
                <p>{selectedReport.summary}</p>
              </div>
            </div>

            <div className="report-content-section">
              <h5>Blockers / Obstacles</h5>
              <div className="content-box blocker">
                <p>{selectedReport.blockers || 'No obstacles reported.'}</p>
              </div>
            </div>

            <div className="report-content-section">
              <h5>Tomorrow's Objectives</h5>
              <div className="content-box next-goals">
                <p>{selectedReport.tomorrowGoals}</p>
              </div>
            </div>

            {/* Feedback form */}
            <div className="report-content-section feedback-section">
              <h5>Manager Evaluation Feedback</h5>
              <textarea
                placeholder="Provide notes or clarification requests..."
                rows="4"
                value={feedbackInput}
                onChange={(e) => setFeedbackInput(e.target.value)}
                className="form-control"
              />
            </div>

            {/* Action buttons */}
            <div className="audit-panel-actions">
              <button
                className="audit-btn flag-btn"
                onClick={() => handleFlag(selectedReport.id)}
              >
                <AlertTriangle size={16} /> Flag for Correction
              </button>
              
              <button
                className="audit-btn approve-btn"
                onClick={() => handleApprove(selectedReport.id)}
              >
                <ThumbsUp size={16} /> Approve & Log
              </button>
            </div>
          </div>
        </SlideOver>
      )}
    </div>
  );
};

export default WorkReports;
