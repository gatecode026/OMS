import React, { useState } from 'react';
import './ActivityLogs.css'; // Reuse ActivityLogs.css as it is identical in style, or write a dedicated one
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import {
  ShieldAlert,
  Search,
  Download,
  Filter,
  CheckCircle,
  AlertTriangle,
  Info,
  Calendar,
  XCircle
} from 'lucide-react';

const mockAuditLogs = [
  {
    id: 'AUD-901',
    user: 'Sarah Connor',
    role: 'Super Admin',
    action: 'Modified system permissions for Role: Branch Admin',
    module: 'Permissions',
    ip: '192.168.1.120',
    severity: 'Warning',
    timestamp: '2026-05-29 08:14:02'
  },
  {
    id: 'AUD-902',
    user: 'Sarah Connor',
    role: 'Super Admin',
    action: 'Added new IP Whitelist range: 10.0.0.0/8',
    module: 'Security',
    ip: '192.168.1.120',
    severity: 'Info',
    timestamp: '2026-05-29 07:55:18'
  },
  {
    id: 'AUD-903',
    user: 'Kenji Sato',
    role: 'Branch Admin',
    action: 'Disbursed Monthly Payroll Batch (May 2026)',
    module: 'Payroll',
    ip: '139.65.0.3',
    severity: 'Success',
    timestamp: '2026-05-28 17:30:11'
  },
  {
    id: 'AUD-904',
    user: 'John Doe',
    role: 'Branch Admin',
    action: 'Failed authentication attempt (invalid password)',
    module: 'Auth',
    ip: '172.56.21.90',
    severity: 'Critical',
    timestamp: '2026-05-28 14:22:50'
  },
  {
    id: 'AUD-905',
    user: 'Sarah Connor',
    role: 'Super Admin',
    action: 'Deactivated Employee profile: Jane Smith',
    module: 'Employees',
    ip: '192.168.1.120',
    severity: 'Warning',
    timestamp: '2026-05-28 11:05:44'
  },
  {
    id: 'AUD-906',
    user: 'Emma Watson',
    role: 'Team Leader',
    action: 'Approved Annual Leave request for Tom Brown',
    module: 'Leaves',
    ip: '151.20.9.3',
    severity: 'Success',
    timestamp: '2026-05-27 09:41:23'
  }
];

const AuditLogs = () => {
  const { addToast } = useApp();
  const loading = usePageLoading();

  const [logs, setLogs] = useState(mockAuditLogs);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [moduleFilter, setModuleFilter] = useState('All');

  const handleExport = () => {
    addToast('success', 'Exporting audit trail as CSV. Check your downloads.');
  };

  const getSeverityVariant = (sev) => {
    switch (sev) {
      case 'Success': return 'success';
      case 'Warning': return 'warning';
      case 'Critical': return 'danger';
      default: return 'info';
    }
  };

  if (loading) {
    return (
      <div className="page-loading-wrapper">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  // Filtering
  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.user.toLowerCase().includes(search.toLowerCase()) || 
                          log.action.toLowerCase().includes(search.toLowerCase());
    const matchesSeverity = severityFilter === 'All' || log.severity === severityFilter;
    const matchesModule = moduleFilter === 'All' || log.module === moduleFilter;
    return matchesSearch && matchesSeverity && matchesModule;
  });

  return (
    <div className="activity-logs-page animate-fade-in">
      {/* Header */}
      <div className="logs-header">
        <div className="logs-title-section">
          <h1>System Audit Logs</h1>
          <p className="subtitle">Trace all administrative actions, permission overrides, and authorization attempts.</p>
        </div>
        <Button variant="secondary" icon={Download} onClick={handleExport}>
          Export Audit Trail
        </Button>
      </div>

      {/* Main Filter & Table Area */}
      <div className="logs-card card">
        <div className="logs-filter-bar">
          <div className="search-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search user, action or IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="select-filters">
            <div className="filter-select-group">
              <label>Severity</label>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="filter-select"
              >
                <option value="All">All Severities</option>
                <option value="Info">Info</option>
                <option value="Success">Success</option>
                <option value="Warning">Warning</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div className="filter-select-group">
              <label>Module</label>
              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="filter-select"
              >
                <option value="All">All Modules</option>
                <option value="Auth">Auth</option>
                <option value="Security">Security</option>
                <option value="Employees">Employees</option>
                <option value="Leaves">Leaves</option>
                <option value="Payroll">Payroll</option>
                <option value="Permissions">Permissions</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="table-wrapper">
          <table className="logs-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User / Operator</th>
                <th>Module</th>
                <th>Event Description</th>
                <th>IP Address</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className={log.severity === 'Critical' ? 'log-critical-row' : ''}>
                    <td className="log-timestamp">{log.timestamp}</td>
                    <td>
                      <div className="log-user-cell">
                        <strong>{log.user}</strong>
                        <span>{log.role}</span>
                      </div>
                    </td>
                    <td>
                      <span className="log-module-badge">{log.module}</span>
                    </td>
                    <td>
                      <p className="log-action-text">{log.action}</p>
                    </td>
                    <td className="log-ip-text">{log.ip}</td>
                    <td>
                      <Badge variant={getSeverityVariant(log.severity)}>
                        {log.severity}
                      </Badge>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="table-empty-row">
                    No audit records match the current filters.
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

export default AuditLogs;
