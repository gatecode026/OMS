import React, { useState } from 'react';
import { Database, RefreshCw, CheckCircle2, AlertTriangle, Play, Calendar, Download } from 'lucide-react';

const BackupRecoveryPanel = ({ onTriggerGlobalBackup }) => {
  const [backups, setBackups] = useState([
    {
      id: 'bak-1',
      name: 'System Auto Weekly Snapshot',
      cluster: 'Global Registry + Shared Clusters',
      size: '242.4 MB',
      status: 'Success',
      time: 'Today, 03:00 AM',
      type: 'Scheduled'
    },
    {
      id: 'bak-2',
      name: 'Manual Backup Before Patch 2.4.1',
      cluster: 'Dedicated DB COMP-001 (Acme)',
      size: '48.2 MB',
      status: 'Success',
      time: 'Yesterday, 04:12 PM',
      type: 'Manual'
    },
    {
      id: 'bak-3',
      name: 'System Auto Weekly Snapshot',
      cluster: 'Global Registry + Shared Clusters',
      size: '238.1 MB',
      status: 'Success',
      time: 'June 9, 2026, 03:00 AM',
      type: 'Scheduled'
    },
    {
      id: 'bak-4',
      name: 'Acme DB Hot Mig Backup',
      cluster: 'Dedicated DB COMP-001 (Acme)',
      size: '42.9 MB',
      status: 'Failed',
      time: 'June 5, 2026, 01:22 PM',
      type: 'Manual',
      error: 'Socket timeout occurred during chunk upload'
    }
  ]);

  const [backingUp, setBackingUp] = useState(false);

  const runGlobalBackup = () => {
    setBackingUp(true);
    if (onTriggerGlobalBackup) onTriggerGlobalBackup();
    
    setTimeout(() => {
      setBackingUp(false);
      setBackups(prev => [
        {
          id: `bak-${Date.now()}`,
          name: 'Manual Control Center Global Backup',
          cluster: 'All Registries & Clusters',
          size: '318.5 MB',
          status: 'Success',
          time: 'Just now',
          type: 'Manual'
        },
        ...prev
      ]);
    }, 2000);
  };

  return (
    <div className="cc-backup-card">
      <div className="cc-backup-header">
        <h3 className="section-title">Database Backup & Recovery Vault</h3>
        <button 
          onClick={runGlobalBackup} 
          disabled={backingUp} 
          className="cc-backup-run-btn"
        >
          <Play size={12} style={{ marginRight: '5px' }} />
          {backingUp ? 'Compiling Snapshot...' : 'Backup Platform'}
        </button>
      </div>

      <div className="cc-backup-summary">
        <div className="backup-summary-block">
          <span className="summary-lbl">Last Sync</span>
          <span className="summary-val text-success">Today, 03:00 AM</span>
        </div>
        <div className="backup-summary-block">
          <span className="summary-lbl">Restore Points</span>
          <span className="summary-val text-info">3 Available</span>
        </div>
        <div className="backup-summary-block">
          <span className="summary-lbl">Failed Retries</span>
          <span className="summary-val text-danger">1 Incident</span>
        </div>
      </div>

      <div className="cc-backup-list">
        {backups.map((bak) => (
          <div key={bak.id} className="cc-backup-item">
            <div className="cc-backup-item-left">
              <Database size={16} className={bak.status === 'Success' ? 'text-success' : 'text-danger'} />
              <div className="cc-backup-item-info">
                <span className="backup-name">{bak.name}</span>
                <span className="backup-meta font-mono">{bak.cluster}</span>
                {bak.error && <span className="backup-error-txt text-danger">{bak.error}</span>}
              </div>
            </div>
            
            <div className="cc-backup-item-right">
              <div className="backup-time-size">
                <span className="backup-time">{bak.time}</span>
                <span className="backup-size">{bak.size}</span>
              </div>
              <span className={`backup-badge status-${bak.status.toLowerCase()}`}>
                {bak.status}
              </span>
              {bak.status === 'Success' && (
                <button className="action-btn-sa" title="Download backup snapshot">
                  <Download size={12} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BackupRecoveryPanel;
