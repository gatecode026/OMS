import React from 'react';
import { Filter } from 'lucide-react';

const DashboardFilters = ({
  timePeriod,
  setTimePeriod,
  projectFilter,
  setProjectFilter
}) => {
  return (
    <div className="sticky-filters flex-row justify-between align-center flex-wrap gap-4 padding-3 bg-surface border-border border-b-border rounded-lg mb-3">
      <div className="flex-center gap-2">
        <span className="text-xs text-text-muted bold-text flex-center gap-1">
          <Filter size={14} /> FILTERS:
        </span>
        <div className="perf-period-selector">
          <button
            className={`period-btn ${timePeriod === 'today' ? 'active' : ''}`}
            onClick={() => setTimePeriod('today')}
          >
            Today
          </button>
          <button
            className={`period-btn ${timePeriod === 'week' ? 'active' : ''}`}
            onClick={() => setTimePeriod('week')}
          >
            This Week
          </button>
          <button
            className={`period-btn ${timePeriod === 'month' ? 'active' : ''}`}
            onClick={() => setTimePeriod('month')}
          >
            This Month
          </button>
        </div>
      </div>

      <div className="flex-center gap-2">
        <label className="text-xs text-text-muted bold-text mb-0 uppercase" style={{ margin: 0 }}>Project:</label>
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="padding-1 rounded border-border"
          style={{ width: '180px', padding: '6px 12px', background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
        >
          <option value="all">All Projects</option>
          <option value="active">Active Projects</option>
          <option value="completed">Completed Projects</option>
        </select>
      </div>
    </div>
  );
};

export default DashboardFilters;
