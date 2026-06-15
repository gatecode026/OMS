import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Download, TrendingUp } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const PerformanceSummaryWidget = ({
  currentUser = {},
  myTasks = [],
  myAttendance = []
}) => {
  const navigate = useNavigate();
  const { addToast } = useApp();

  // Dynamic calculations using actual DB-backed data
  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  const monthPrefix = `${currentYear}-${currentMonth}`;
  const thisMonthAttendance = myAttendance.filter(h => (h.date || '').startsWith(monthPrefix));
  
  const presentDays = thisMonthAttendance.filter(h => h.status === 'Present' || h.status === 'Late' || h.status === 'Overtime' || h.status === 'Work From Home').length;
  const attendanceVal = thisMonthAttendance.length > 0 ? Math.min(100, Math.round((presentDays / thisMonthAttendance.length) * 100)) : 0;

  const totalTasks = myTasks.length;
  const completedTasksCount = myTasks.filter(t => t.status === 'Done' || t.status === 'done' || t.completed === true).length;
  const taskCompletionVal = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0;

  // Productivity: completed hours vs total hours, or fallback to task completion
  const totalHours = myTasks.reduce((sum, t) => sum + (Number(t.estimatedHours) || 0), 0);
  const completedHours = myTasks.filter(t => t.status === 'Done' || t.status === 'done' || t.completed === true).reduce((sum, t) => sum + (Number(t.estimatedHours) || 0), 0);
  const productivityVal = totalHours > 0 ? Math.round((completedHours / totalHours) * 100) : taskCompletionVal;

  // Project Contribution: ratio of user's tasks to total tasks
  const projectContributionVal = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0;

  // Work Quality: defined by manager or default to 90
  const scoreData = currentUser.performanceScore || {};
  const workQualityVal = scoreData.workQuality || 90;

  // Overall Score is calculated as average of the live KPIs
  const overall = Math.round((attendanceVal + productivityVal + taskCompletionVal + projectContributionVal + workQualityVal) / 5);
  const hasPerformanceData = true;

  const kpis = [
    { name: 'Attendance', score: attendanceVal },
    { name: 'Productivity', score: productivityVal },
    { name: 'Task Completion', score: taskCompletionVal },
    { name: 'Project Contribution', score: projectContributionVal },
    { name: 'Work Quality', score: workQualityVal }
  ];

  // Determine rating text dynamically from overall score
  const ratingText = overall >= 90 ? 'Excellent' : overall >= 80 ? 'Good' : overall >= 70 ? 'Average' : 'Needs Improvement';

  // Stars calculation (out of 5)
  const starsCount = Math.round((overall / 100) * 5);

  const handleDownload = () => {
    addToast('success', 'Performance report PDF downloaded successfully (simulated).');
  };

  return (
    <div className="dashboard-widget">
      <div className="widget-header">
        <h3>Performance Summary</h3>
      </div>
      <div className="widget-content flex-column gap-4">
        {!hasPerformanceData ? (
          <div className="text-center text-text-muted py-6" style={{ textAlign: 'center', padding: '30px 0' }}>
            No performance score generated for this period.
          </div>
        ) : (
          <>
            {/* KPI List */}
            <div className="flex-column gap-3">
              {kpis.map((kpi, idx) => (
                <div key={idx} className="flex-column gap-1">
                  <div className="flex-row justify-between text-xs text-text-muted">
                    <span className="bold-text" style={{ color: 'var(--text-secondary)' }}>{kpi.name}</span>
                    <span className="bold-text text-primary-500">{kpi.score}%</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${kpi.score}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Monthly Rating star section */}
            <div className="flex-row align-center justify-between padding-3 bg-surface rounded-lg">
              <div className="flex-column">
                <span className="text-xs text-text-muted bold-text uppercase">Overall Score</span>
                <span className="bold-text text-lg mt-1 text-white">{overall}%</span>
              </div>
              <div className="flex-column items-end">
                <span className="text-xs text-text-muted bold-text uppercase">Rating</span>
                <span className="bold-text text-sm mt-1" style={{ color: 'var(--color-primary)' }}>{ratingText}</span>
                <div className="flex-row gap-1 mt-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      fill={i < starsCount ? 'var(--color-primary)' : 'none'}
                      stroke="var(--color-primary)"
                    />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex-row gap-3 mt-1 flex-wrap">
          <button
            onClick={handleDownload}
            className="flex-1 padding-2 text-xs bold-text bg-surface border-border text-primary-500 hover:text-primary-400 rounded flex-center gap-1 transition-all"
            style={{ cursor: 'pointer' }}
          >
            <Download size={14} /> Download Summary
          </button>
        </div>
      </div>
    </div>
  );
};

export default PerformanceSummaryWidget;
