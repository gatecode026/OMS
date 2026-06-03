import React from 'react';
import styles from '../../styles/projects.module.css';
import { TrendingUp, CheckCircle, Plus, Calendar, DollarSign, AlertCircle } from 'lucide-react';

const mockActivities = [
  {
    id: 'act-1',
    description: 'SaaS Platform v2.0 updated to 75%',
    timestamp: '10 minutes ago',
    department: 'IT',
    type: 'progress'
  },
  {
    id: 'act-2',
    description: 'Marketing Campaign milestone completed',
    timestamp: '1 hour ago',
    department: 'Marketing',
    type: 'milestone'
  },
  {
    id: 'act-3',
    description: 'New task assigned to Rahul Sharma',
    timestamp: '3 hours ago',
    department: 'HR',
    type: 'task'
  },
  {
    id: 'act-4',
    description: 'Project Alpha deadline updated',
    timestamp: '5 hours ago',
    department: 'Sales',
    type: 'date'
  },
  {
    id: 'act-5',
    description: 'Budget adjustments approved by Admin',
    timestamp: '1 day ago',
    department: 'Sales',
    type: 'budget'
  },
  {
    id: 'act-6',
    description: 'Critical issue reported on Database Core',
    timestamp: '2 days ago',
    department: 'IT',
    type: 'warning'
  }
];

const ActivityFeed = () => {
  const getActivityIcon = (type) => {
    switch (type) {
      case 'progress': return <TrendingUp size={14} className="text-info" />;
      case 'milestone': return <CheckCircle size={14} className="text-success" />;
      case 'task': return <Plus size={14} className="text-primary-c" />;
      case 'date': return <Calendar size={14} className="text-warning" />;
      case 'budget': return <DollarSign size={14} className="text-success" />;
      case 'warning': return <AlertCircle size={14} className="text-danger" />;
      default: return <TrendingUp size={14} />;
    }
  };

  return (
    <div className={styles.activitiesCard}>
      <div className={styles.activitiesHeader}>
        <h3 className={styles.activitiesTitle}>Recent Project Activities</h3>
      </div>
      
      <div className={styles.activitiesFeed}>
        {mockActivities.map((act) => (
          <div key={act.id} className={styles.activityItem}>
            <div className={styles.activityDot}>
              {getActivityIcon(act.type)}
            </div>
            
            <div className={styles.activityContent}>
              <span className={styles.activityText}>{act.description}</span>
              <div className={styles.activityMeta}>
                <span>{act.timestamp}</span>
                <span>•</span>
                <span className={styles.activityTag}>{act.department}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityFeed;
