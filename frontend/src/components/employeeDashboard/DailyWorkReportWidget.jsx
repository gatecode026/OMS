import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Send, Calendar, CheckSquare } from 'lucide-react';
import Badge from '../common/Badge';

const DailyWorkReportWidget = ({
  myReports = [],
  onOpenReportModal
}) => {
  const navigate = useNavigate();

  // Sort reports by date descending
  const sortedReports = [...myReports].sort((a, b) => b.date.localeCompare(a.date));

  // Today's date in mock context is 2026-06-03 (or current date)
  const todayStr = '2026-06-03';
  const todayReport = sortedReports.find(r => r.date === todayStr);

  const getDwrBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'approved') return <span className="status-badge status-present">Approved ✓</span>;
    if (s === 'submitted') return <span className="status-badge status-late">Submitted ✅</span>;
    if (s === 'changes requested' || s === 'rejected') return <span className="status-badge status-absent">Rejected ✗</span>;
    return <span className="status-badge status-late">Pending ⏳</span>;
  };

  const getStatusLabelText = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'approved') return 'Approved ✓';
    if (s === 'submitted') return 'Submitted ✅';
    if (s === 'changes requested' || s === 'rejected') return 'Rejected ✗';
    return 'Pending ⏳';
  };

  // Counts
  const pendingReportsCount = myReports.filter(r => r.status === 'Submitted' || r.status === 'Escalated').length;
  const approvedReportsCount = myReports.filter(r => r.status === 'Approved').length;
  const rejectedReportsCount = myReports.filter(r => r.status === 'Rejected' || r.status === 'Changes Requested').length;

  return (
    <div className="dashboard-widget">
      <div className="widget-header">
        <h3>Work Report Status</h3>
        <button
          onClick={() => navigate('/work-reports')}
          className="text-xs text-primary-500 hover:text-primary-400 font-semibold"
        >
          View All Reports
        </button>
      </div>
      <div className="widget-content flex-column gap-4">
        {/* Status display */}
        <div className="flex-row justify-between align-center flex-wrap gap-4">
          <div className="flex-column gap-1">
            <span className="text-xs text-text-muted bold-text uppercase">Today's Status</span>
            <div className="mt-1">{getDwrBadge(todayReport?.status)}</div>
          </div>
          <div className="flex-column">
            <span className="text-xs text-text-muted bold-text uppercase">Submission Time</span>
            <span className="bold-text text-sm mt-1">
              {todayReport?.submittedTime
                ? new Date(todayReport.submittedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'Not submitted'}
            </span>
          </div>
        </div>

        {/* Counts summary row */}
        <div className="summary-cards-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          <div className="mini-stat-card">
            <span className="text-xs text-text-muted block">Pending Reviews</span>
            <span className="bold-text text-sm block mt-1 text-warning">{pendingReportsCount}</span>
          </div>
          <div className="mini-stat-card">
            <span className="text-xs text-text-muted block">Approved Reports</span>
            <span className="bold-text text-sm block mt-1 text-success">{approvedReportsCount}</span>
          </div>
          <div className="mini-stat-card">
            <span className="text-xs text-text-muted block">Rejected Reports</span>
            <span className="bold-text text-sm block mt-1 text-danger">{rejectedReportsCount}</span>
          </div>
        </div>

        {/* History Table */}
        <div className="flex-column gap-2">
          <span className="text-xs text-text-muted bold-text uppercase">Recent Report Summary</span>
          <div className="overflow-x-auto">
            <table className="dash-mini-table">
              <thead>
                <tr className="border-b-border">
                  <th style={{ padding: '6px 12px' }}>Date</th>
                  <th style={{ padding: '6px 12px' }}>Status</th>
                  <th style={{ padding: '6px 12px', textAlign: 'right' }}>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {sortedReports.slice(0, 3).map((report) => (
                  <tr key={report.id} className="border-b-border">
                    <td style={{ padding: '6px 12px', fontWeight: 600 }}>{report.date}</td>
                    <td style={{ padding: '6px 12px' }}>{getDwrBadge(report.status)}</td>
                    <td style={{ padding: '6px 12px', textAlign: 'right', fontSize: '0.8rem', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={report.feedback || report.remarks || 'No remarks'}>
                      {report.feedback || report.remarks || '—'}
                    </td>
                  </tr>
                ))}
                {sortedReports.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center text-text-muted py-3">No reports logged yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex-row gap-3 mt-1 flex-wrap">
          <button
            onClick={() => navigate('/work-reports')}
            className="flex-1 padding-2 text-xs bold-text bg-primary-500 hover:bg-primary-hover text-white rounded flex-center gap-1 transition-all"
            style={{ border: 'none', cursor: 'pointer', background: 'var(--color-primary)' }}
          >
            View My Reports
          </button>
        </div>
      </div>
    </div>
  );
};

export default DailyWorkReportWidget;
