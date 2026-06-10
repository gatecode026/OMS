import React from 'react';
import styles from '../../styles/projects.module.css';
import { TrendingUp, CheckCircle, Plus, Calendar, DollarSign, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const ActivityFeed = () => {
  const { projectsList } = useApp();

  const getRelativeTime = (date) => {
    try {
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (isNaN(diffMins)) return 'Recent';
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} minutes ago`;
      if (diffHrs < 24) return `${diffHrs} hour${diffHrs > 1 ? 's' : ''} ago`;
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } catch (e) {
      return 'Recent';
    }
  };

  const activities = React.useMemo(() => {
    const list = [];

    if (projectsList && projectsList.length > 0) {
      projectsList.forEach(project => {
        // 1. Project progress updates (if > 0 and not completed)
        if (project.progress > 0 && project.status !== 'Completed') {
          list.push({
            id: `proj-progress-${project.id}-${project.progress}-${project.updatedAt}`,
            description: `${project.name} updated to ${project.progress}%`,
            timestamp: project.updatedAt ? getRelativeTime(new Date(project.updatedAt)) : 'Just now',
            department: project.department || 'General',
            type: 'progress',
            dateObj: project.updatedAt ? new Date(project.updatedAt) : new Date()
          });
        }

        // 2. Project Completed Status
        if (project.status === 'Completed') {
          list.push({
            id: `proj-comp-${project.id}-${project.updatedAt}`,
            description: `Project "${project.name}" milestone completed`,
            timestamp: project.updatedAt ? getRelativeTime(new Date(project.updatedAt)) : '1 hour ago',
            department: project.department || 'General',
            type: 'milestone',
            dateObj: project.updatedAt ? new Date(project.updatedAt) : new Date(Date.now() - 3600000)
          });
        }

        // 3. Project Delayed Status
        if (project.status === 'Delayed') {
          list.push({
            id: `proj-delay-${project.id}-${project.updatedAt}`,
            description: `Delayed Project: "${project.name}" is lagging schedule`,
            timestamp: project.updatedAt ? getRelativeTime(new Date(project.updatedAt)) : 'System Alert',
            department: project.department || 'General',
            type: 'warning',
            dateObj: project.updatedAt ? new Date(project.updatedAt) : new Date(Date.now() - 7200000)
          });
        }

        // 4. Tasks completed or created
        if (project.tasks && project.tasks.length > 0) {
          project.tasks.forEach(t => {
            if (t.completed) {
              list.push({
                id: `task-comp-${t.id}`,
                description: `Task "${t.title}" completed in ${project.name}`,
                timestamp: 'Just now',
                department: project.department || 'General',
                type: 'milestone',
                dateObj: new Date()
              });
            } else {
              // Task creation
              list.push({
                id: `task-assign-${t.id}`,
                description: `New task "${t.title}" assigned to ${t.assigneeName || project.leader || 'Team'}`,
                timestamp: 'Pending',
                department: project.department || 'General',
                type: 'task',
                dateObj: new Date(Date.now() - 10800000)
              });
            }
          });
        }

        // 5. Documents uploaded
        if (project.documents && project.documents.length > 0) {
          project.documents.forEach((doc, idx) => {
            list.push({
              id: `doc-${project.id}-${idx}`,
              description: `Document "${doc.name}" uploaded by ${doc.uploadedBy || 'User'}`,
              timestamp: 'Uploaded',
              department: project.department || 'General',
              type: 'budget',
              dateObj: new Date(Date.now() - 18000000)
            });
          });
        }
      });
    }

    // Sort by dateObj descending
    list.sort((a, b) => b.dateObj - a.dateObj);

    // Limit to top 8 items
    return list.slice(0, 8);
  }, [projectsList]);

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
        {activities.map((act) => (
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
