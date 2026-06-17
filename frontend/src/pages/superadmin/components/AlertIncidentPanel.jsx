import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, AlertCircle, X, BellOff } from 'lucide-react';

const AlertIncidentPanel = ({ incidents: propIncidents = [] }) => {
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    setIncidents(propIncidents);
  }, [propIncidents]);

  const dismissIncident = (id) => {
    setIncidents(prev => prev.filter(i => i.id !== id));
  };

  const clearAllIncidents = () => {
    setIncidents([]);
  };

  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'High': return 'border-red-500 bg-red-950/20 text-red-400';
      case 'Medium': return 'border-amber-500 bg-amber-950/20 text-amber-400';
      case 'Low': return 'border-blue-500 bg-blue-950/20 text-blue-400';
      default: return 'border-gray-500 bg-gray-950/20 text-gray-400';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'High': return <ShieldAlert size={16} className="text-red-500" />;
      case 'Medium': return <AlertTriangle size={16} className="text-amber-500" />;
      case 'Low': return <AlertCircle size={16} className="text-blue-400" />;
      default: return null;
    }
  };

  return (
    <div className="cc-incidents-card">
      <div className="cc-incidents-header">
        <h3 className="section-title">Platform Incident Monitoring</h3>
        {incidents.length > 0 && (
          <button onClick={clearAllIncidents} className="cc-incidents-clear-btn">
            Dismiss All ({incidents.length})
          </button>
        )}
      </div>

      <div className="cc-incidents-list">
        {incidents.map((inc) => (
          <div key={inc.id} className={`cc-incident-item ${getPriorityClass(inc.priority)}`}>
            <div className="cc-incident-meta">
              <div className="cc-incident-type-row">
                {getPriorityIcon(inc.priority)}
                <span className="cc-incident-priority-text">{inc.priority} Priority</span>
                <span className="cc-incident-category">{inc.category}</span>
              </div>
              <span className="cc-incident-time">{inc.time}</span>
            </div>
            <div className="cc-incident-body">
              <h5 className="cc-incident-title">{inc.title}</h5>
              <p className="cc-incident-desc">{inc.desc}</p>
            </div>
            <button onClick={() => dismissIncident(inc.id)} className="cc-incident-dismiss" title="Dismiss incident">
              <X size={14} />
            </button>
          </div>
        ))}

        {incidents.length === 0 && (
          <div className="cc-incidents-empty">
            <BellOff size={24} className="text-muted" style={{ marginBottom: '8px' }} />
            <h5>All Systems Operational</h5>
            <p>No warnings or critical platform incidents logged at this time.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertIncidentPanel;
