import React from 'react';
import { PlusCircle, ArrowUpRight, DollarSign, Ban, KeyRound, Clock } from 'lucide-react';

const ActivityFeed = ({ logs = [] }) => {
  // Pre-seed some default historical activity logs
  const defaultLogs = [
    {
      id: 'log-1',
      event: 'ABC Corp added 25 employees',
      category: 'Employee',
      time: '5 mins ago',
      icon: PlusCircle,
      iconColor: '#a855f7'
    },
    {
      id: 'log-2',
      event: 'XYZ Corp upgraded to Enterprise plan',
      category: 'Subscription',
      time: '18 mins ago',
      icon: ArrowUpRight,
      iconColor: '#fbbf24'
    },
    {
      id: 'log-3',
      event: 'Acme generated monthly payroll ledger',
      category: 'Operations',
      time: '1 hour ago',
      icon: DollarSign,
      iconColor: '#10b981'
    },
    {
      id: 'log-4',
      event: 'TechSoft subscription billing charge failed',
      category: 'Billing',
      time: '2 hours ago',
      icon: Ban,
      iconColor: '#ef4444'
    },
    {
      id: 'log-5',
      event: 'Company admin balram@acme.com logged in',
      category: 'Auth',
      time: '4 hours ago',
      icon: KeyRound,
      iconColor: '#60a5fa'
    }
  ];

  // Merge dynamic logs with default logs
  const displayLogs = [...logs, ...defaultLogs].slice(0, 8);

  return (
    <div className="cc-activity-card">
      <h3 className="section-title">Live Platform Activity Logs</h3>
      <div className="cc-activity-timeline">
        {displayLogs.map((log) => {
          const LogIcon = log.icon || Clock;
          return (
            <div key={log.id} className="cc-timeline-item">
              <div 
                className="cc-timeline-icon-wrapper" 
                style={{ backgroundColor: `${log.iconColor || '#3b82f6'}18`, color: log.iconColor || '#3b82f6' }}
              >
                <LogIcon size={14} />
              </div>
              <div className="cc-timeline-content">
                <div className="cc-timeline-header-row">
                  <span className="cc-timeline-event">{log.event || log.message}</span>
                  <span className="cc-timeline-time">{log.time}</span>
                </div>
                {log.category && <span className="cc-timeline-tag">{log.category}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActivityFeed;
