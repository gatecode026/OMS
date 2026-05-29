import React, { useState } from 'react';
import './ActivityLogs.css';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import Badge from '../components/common/Badge';
import Avatar from '../components/common/Avatar';
import {
  ShieldAlert, Search, Download, Filter, Clock, CheckCircle,
  AlertTriangle, XCircle, Info
} from 'lucide-react';

const ActivityLogs = () => {
  const isLoading = usePageLoading(500);
  const { activityLogs } = useApp();
  const [search, setSearch] = useState('');
  const [filterModule, setFilterModule] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  const modules = ['All', ...new Set(activityLogs.map(l => l.module))];
  const statuses = ['All', 'success', 'warning', 'danger'];

  const filtered = activityLogs.filter(log => {
    const matchSearch =
      log.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.module.toLowerCase().includes(search.toLowerCase());
    const matchModule = filterModule === 'All' || log.module === filterModule;
    const matchStatus = filterStatus === 'All' || log.status === filterStatus;
    return matchSearch && matchModule && matchStatus;
  });

  const statusIcon = (status) => {
    if (status === 'success') return <CheckCircle size={14} className="log-status-icon success" />;
    if (status === 'warning') return <AlertTriangle size={14} className="log-status-icon warning" />;
    if (status === 'danger') return <XCircle size={14} className="log-status-icon danger" />;
    return <Info size={14} className="log-status-icon info" />;
  };

  if (isLoading) {
    return (
      <div className="activity-logs-page">
        <div className="card" style={{ height: 500 }}>
          <div style={{ height: '100%', background: 'var(--bg-elevated)', borderRadius: 8 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="activity-logs-page">

      {/* Stats Banner */}
      <div className="logs-stats-row">
        {[
          { label: 'Total Events', value: activityLogs.length, color: '#3b82f6' },
          { label: 'Successful', value: activityLogs.filter(l => l.status === 'success').length, color: '#10b981' },
          { label: 'Warnings', value: activityLogs.filter(l => l.status === 'warning').length, color: '#f59e0b' },
          { label: 'Critical', value: activityLogs.filter(l => l.status === 'danger').length, color: '#ef4444' }
        ].map((s, i) => (
          <div key={i} className="card logs-stat-card">
            <span className="logs-stat-num" style={{ color: s.color }}>{s.value}</span>
            <span className="logs-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="card logs-table-card">
        <div className="logs-toolbar">
          <div>
            <h3 className="card-title">System Activity Logs</h3>
            <span className="chart-subtitle">Comprehensive audit trail of all user actions</span>
          </div>

          <div className="logs-controls">
            {/* Search */}
            <div className="logs-search-wrap">
              <Search size={14} className="logs-search-icon" />
              <input
                className="logs-search-input"
                placeholder="Search logs..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* Module Filter */}
            <select
              className="logs-filter-select"
              value={filterModule}
              onChange={e => setFilterModule(e.target.value)}
            >
              {modules.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              className="logs-filter-select"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              {statuses.map(s => (
                <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>
              ))}
            </select>

            {/* Export */}
            <button className="logs-export-btn">
              <Download size={14} />
              Export
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Log ID</th>
                <th>Employee</th>
                <th>Department</th>
                <th>Action</th>
                <th>Module</th>
                <th>Timestamp</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? filtered.map((log, idx) => (
                <tr key={log.id} className="log-table-row animate-fade-in">
                  <td>
                    <code className="log-id-code">{log.id}</code>
                  </td>
                  <td>
                    <div className="flex-center gap-3 justify-start">
                      <Avatar name={log.employeeName} size="sm" />
                      <span className="bold-text">{log.employeeName}</span>
                    </div>
                  </td>
                  <td className="text-muted">{log.department}</td>
                  <td className="log-action-text">{log.action}</td>
                  <td>
                    <Badge variant="neutral">{log.module}</Badge>
                  </td>
                  <td>
                    <div className="flex-center gap-2 justify-start">
                      <Clock size={12} className="text-muted" />
                      <span className="text-muted">{log.timestamp}</span>
                    </div>
                  </td>
                  <td>
                    <div className="log-status-cell">
                      {statusIcon(log.status)}
                      <Badge variant={log.status === 'success' ? 'success' : log.status === 'danger' ? 'danger' : 'warning'}>
                        {log.status}
                      </Badge>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7" className="text-center text-muted pad-6">
                    No activity logs match your current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default ActivityLogs;
