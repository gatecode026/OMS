import React from 'react';
import { Server, Cpu, Database } from 'lucide-react';

const HealthIndicator = ({ name, status, message, load, icon: Icon, isConnected }) => {
  const getStatusColor = (s) => {
    switch (s) {
      case 'Healthy':
      case 'Connected':
      case 'Idle':
        return 'success';
      case 'Warning':
      case 'High Load':
      case 'Suspended':
        return 'warning';
      case 'Critical':
      case 'Disconnected':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const statusVal = getStatusColor(status);

  return (
    <div className="health-diag-card">
      <div className="health-card-header">
        <div className="health-icon-title">
          <Icon size={16} className={`text-${statusVal}`} />
          <span className="health-item-name">{name}</span>
        </div>
        <span className={`health-status-badge status-${statusVal}`}>
          {status}
        </span>
      </div>
      
      {load !== undefined && (
        <div className="health-load-bar-wrapper">
          <div className="health-bar-labels">
            <span>Utilization</span>
            <span className="font-semibold">{load}%</span>
          </div>
          <div className="progress-bar-track">
            <div 
              className={`progress-bar-fill bg-${statusVal}`} 
              style={{ width: `${load}%` }} 
            />
          </div>
        </div>
      )}

      <div className="health-card-footer">
        <span className="health-footer-msg">{message}</span>
      </div>
    </div>
  );
};

const SystemHealthPanel = ({ liveMetrics = {} }) => {
  const { cpu = 24, memory = 62, dbConnections = 1, storageUsedMB = 12.5 } = liveMetrics;

  return (
    <div className="cc-health-panel-wrapper">
      <h3 className="section-title">Infrastructure Monitoring Console</h3>
      <div className="cc-health-grid">
        <HealthIndicator 
          name="MongoDB Cluster" 
          status={dbConnections > 25 ? 'High Load' : 'Healthy'} 
          message={`Primary cluster node replica set. ${dbConnections} active pools.`}
          load={Math.min(100, Math.floor(dbConnections * 4))}
          icon={Database} 
        />
        <HealthIndicator 
          name="Database Storage" 
          status="Healthy" 
          message={`Total tenant disk space: ${storageUsedMB.toFixed(1)} MB.`} 
          load={Math.min(100, Math.round((storageUsedMB / 10240) * 100))}
          icon={Database} 
        />
        <HealthIndicator 
          name="CPU Load" 
          status={cpu > 80 ? 'Critical' : cpu > 50 ? 'Warning' : 'Healthy'} 
          message={`Platform Express web gateway instance cluster.`}
          load={cpu}
          icon={Cpu} 
        />
        <HealthIndicator 
          name="Memory Utilization" 
          status={memory > 90 ? 'Critical' : memory > 75 ? 'Warning' : 'Healthy'} 
          message="Node runtime server heap space." 
          load={memory}
          icon={Server} 
        />
      </div>
    </div>
  );
};

export default SystemHealthPanel;
