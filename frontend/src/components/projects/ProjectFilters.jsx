import React from 'react';
import styles from '../../styles/projects.module.css';
import { Search } from 'lucide-react';

const ProjectFilters = ({ filters, onFilterChange, departments = [] }) => {
  const handleInputChange = (field, value) => {
    onFilterChange({
      ...filters,
      [field]: value
    });
  };

  return (
    <div className={styles.filterBar}>
      {/* Search Input */}
      <div className={styles.searchWrap}>
        <Search size={16} className={styles.searchIcon} />
        <input
          type="text"
          className={`${styles.textInput} ${styles.searchInput}`}
          placeholder="Search by ID, project name, leader, manager..."
          value={filters.search}
          onChange={(e) => handleInputChange('search', e.target.value)}
        />
      </div>

      {/* Status Filter */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)' }}>STATUS:</span>
        <select
          className={styles.filterSelect}
          value={filters.status}
          onChange={(e) => handleInputChange('status', e.target.value)}
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active</option>
          <option value="In Progress">In Progress</option>
          <option value="Pending">Pending</option>
          <option value="Completed">Completed</option>
          <option value="Delayed">Delayed</option>
          <option value="On Hold">On Hold</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {/* Priority Filter */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)' }}>PRIORITY:</span>
        <select
          className={styles.filterSelect}
          value={filters.priority}
          onChange={(e) => handleInputChange('priority', e.target.value)}
        >
          <option value="All">All Priorities</option>
          <option value="Urgent">Urgent</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      {/* Department Filter */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)' }}>DEPT:</span>
        <select
          className={styles.filterSelect}
          value={filters.department}
          onChange={(e) => handleInputChange('department', e.target.value)}
        >
          <option value="All">All Departments</option>
          {(departments || []).map(d => (
            <option key={d.id || d._id} value={d.name}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {/* Date Range Filter */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)' }}>TIMEFRAME:</span>
        <select
          className={styles.filterSelect}
          value={filters.dateRange}
          onChange={(e) => handleInputChange('dateRange', e.target.value)}
        >
          <option value="All">All Time</option>
          <option value="Today">Today</option>
          <option value="Weekly">This Week</option>
          <option value="Monthly">This Month</option>
          <option value="Custom">Custom Range</option>
        </select>
      </div>

      {/* Custom Date Inputs if selected */}
      {filters.dateRange === 'Custom' && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', animation: 'fadeIn 0.2s ease' }}>
          <input
            type="date"
            style={{ width: '130px', padding: '6px 8px', fontSize: '0.8rem' }}
            value={filters.customStart}
            onChange={(e) => handleInputChange('customStart', e.target.value)}
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>to</span>
          <input
            type="date"
            style={{ width: '130px', padding: '6px 8px', fontSize: '0.8rem' }}
            value={filters.customEnd}
            onChange={(e) => handleInputChange('customEnd', e.target.value)}
          />
        </div>
      )}
    </div>
  );
};

export default ProjectFilters;
