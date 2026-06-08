import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Download, TrendingUp } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const PerformanceSummaryWidget = ({
  currentUser = {}
}) => {
  const navigate = useNavigate();
  const { addToast } = useApp();

  // Extract performance scores from user or fallback to defaults
  const scoreData = currentUser.performanceScore || {};
  const overall = scoreData.overall || 92;
  const attendanceVal = scoreData.attendance || 96;
  const productivityVal = currentUser.productivityScore || 92;
  const taskCompletionVal = scoreData.taskCompletion || 94;
  const projectContributionVal = scoreData.overall ? Math.max(60, scoreData.overall - 4) : 88;
  const workQualityVal = scoreData.overall ? Math.min(100, scoreData.overall + 3) : 91;

  const kpis = [
    { name: 'Attendance', score: attendanceVal },
    { name: 'Productivity', score: productivityVal },
    { name: 'Task Completion', score: taskCompletionVal },
    { name: 'Project Contribution', score: projectContributionVal },
    { name: 'Work Quality', score: workQualityVal }
  ];

  // Determine rating text
  const ratingText = currentUser.performanceRating || (overall >= 90 ? 'Excellent' : overall >= 80 ? 'Good' : overall >= 70 ? 'Average' : 'Needs Improvement');

  // Stars calculation (out of 5)
  const starsCount = Math.round((overall / 100) * 5);

  const handleDownload = () => {
    addToast('success', 'Performance report PDF downloaded successfully (simulated).');
  };

  return (
    <div className="dashboard-widget">
      <div className="widget-header">
        <h3>Performance Summary</h3>
        <button
          onClick={() => navigate('/performance')}
          className="text-xs text-primary-500 hover:text-primary-400 font-semibold"
        >
          View Full Report
        </button>
      </div>
      <div className="widget-content flex-column gap-4">
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

        {/* Actions */}
        <div className="flex-row gap-3 mt-1 flex-wrap">
          <button
            onClick={() => navigate('/performance')}
            className="flex-1 padding-2 text-xs bold-text bg-surface border-border text-primary-500 hover:text-primary-400 rounded flex-center gap-1 transition-all"
            style={{ cursor: 'pointer' }}
          >
            <TrendingUp size={14} /> View Performance Report
          </button>
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
