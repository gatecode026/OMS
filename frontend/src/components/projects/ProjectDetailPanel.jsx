import React, { useState, useEffect, useRef } from 'react';
import styles from '../../styles/projects.module.css';
import {
  X, Briefcase, Calendar, Users, CheckSquare,
  FileText, Download, TrendingUp, Clock, AlertTriangle, File
} from 'lucide-react';
import Avatar from '../common/Avatar';

const ProjectDetailPanel = ({ project, isOpen, onClose, onToggleTask }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const panelRef = useRef(null);
  const [animateState, setAnimateState] = useState('closed');

  // Esc key and click outside to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && project) {
      setAnimateState('opening');
      const timer = setTimeout(() => setAnimateState('open'), 50);
      document.body.style.overflow = 'hidden';
      return () => clearTimeout(timer);
    } else {
      if (animateState === 'open' || animateState === 'opening') {
        setAnimateState('closing');
        const timer = setTimeout(() => {
          setAnimateState('closed');
          document.body.style.overflow = '';
        }, 250);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, project]);

  if (animateState === 'closed' || !project) return null;

  const handleBackdropClick = (e) => {
    if (e.target.classList.contains(styles.backdrop)) {
      onClose();
    }
  };

  // Format currency
  const formatCurrency = (val) => {
    if (!val) return '$0';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  const isTransitioningIn = animateState === 'opening' || animateState === 'open';

  return (
    <div className={`${styles.backdrop} ${isTransitioningIn ? styles.isOpen : ''}`} onClick={handleBackdropClick}>
      <div className={`${styles.slideOver} ${isTransitioningIn ? styles.isOpen : ''}`} ref={panelRef}>
        {/* Header */}
        <div className={styles.slideHeader}>
          <div className={styles.slideTitleWrapper}>
            <span className={styles.slideSubtitle}>{project.id}</span>
            <h2 className={styles.slideTitle}>{project.name}</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close panel">
            <X size={20} />
          </button>
        </div>

        {/* Tab Selection */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '0 var(--space-4)' }}>
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'team-tasks', label: 'Team & Tasks' },
            { id: 'docs-performance', label: 'Docs & Productivity' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 16px',
                border: 'none',
                background: 'none',
                color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--text-muted)',
                fontWeight: activeTab === tab.id ? '600' : '400',
                borderBottom: activeTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div className={styles.slideBody}>
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <>
              {/* Basic Details */}
              <div className={styles.detailSection}>
                <h4 className={styles.sectionHeader}>Basic Details</h4>
                <div className={styles.basicGrid}>
                  <div className={styles.detailField}>
                    <span className={styles.detailLabel}><Briefcase size={12} style={{ marginRight: 4, display: 'inline' }} /> Department</span>
                    <span className={styles.detailVal}>{project.department}</span>
                  </div>
                  <div className={styles.detailField}>
                    <span className={styles.detailLabel}>Client Name</span>
                    <span className={styles.detailVal}>{project.client || 'Google'}</span>
                  </div>
                  <div className={styles.detailField}>
                    <span className={styles.detailLabel}><Calendar size={12} style={{ marginRight: 4, display: 'inline' }} /> Start Date</span>
                    <span className={styles.detailVal}>{project.startDate}</span>
                  </div>
                  <div className={styles.detailField}>
                    <span className={styles.detailLabel}><Calendar size={12} style={{ marginRight: 4, display: 'inline' }} /> Deadline</span>
                    <span className={styles.detailVal}>{project.deadline}</span>
                  </div>
                  <div className={styles.detailField}>
                    <span className={styles.detailLabel}>Current Status</span>
                    <span className={styles.detailVal}>{project.status}</span>
                  </div>
                </div>

                <div className={styles.detailField} style={{ marginTop: 8 }}>
                  <span className={styles.detailLabel}>Description</span>
                  <p className={styles.descText}>{project.description || 'No description provided.'}</p>
                </div>
              </div>



              {/* Delayed warnings */}
              {project.status === 'Delayed' && (
                <div className={styles.alertsBanner}>
                  <div className={styles.alertsHeader}>
                    <span className={styles.alertsTitle}>
                      <AlertTriangle size={16} /> Attention: Delayed Schedule
                    </span>
                  </div>
                  <div className={styles.alertList}>
                    <div className={styles.alertItem}>
                      <span className={styles.alertDot} />
                      <span>Project is currently past its milestone deadlines. Task completion rate is lower than required.</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* TAB 2: TEAM & TASKS */}
          {activeTab === 'team-tasks' && (
            <>
              {/* Team Info */}
              <div className={styles.detailSection}>
                <h4 className={styles.sectionHeader}>Team Information</h4>
                <div className={styles.basicGrid} style={{ marginBottom: 12 }}>
                  <div className={styles.detailField}>
                    <span className={styles.detailLabel}>Project Manager</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <Avatar name={project.manager} size="xs" />
                      <span className={styles.detailVal}>{project.manager}</span>
                    </div>
                  </div>
                  <div className={styles.detailField}>
                    <span className={styles.detailLabel}>Team Leader</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <Avatar name={project.leader} size="xs" />
                      <span className={styles.detailVal}>{project.leader}</span>
                    </div>
                  </div>
                </div>

                <span className={styles.detailLabel}>Assigned Team ({project.members?.length || 0} Employees)</span>
                <div className={styles.teamList}>
                  {project.members && project.members.map((member, i) => (
                    <div key={i} className={styles.teamMemberItem}>
                      <Avatar name={member} size="xs" />
                      <div className={styles.memberText}>
                        <span className={styles.memberName}>{member}</span>
                        <span className={styles.memberRole}>
                          {i === 0 ? 'Lead Engineer' : i === 1 ? 'UI Designer' : 'Software Specialist'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Task Management */}
              <div className={styles.detailSection}>
                <div className={styles.flexBetween}>
                  <h4 className={styles.sectionHeader} style={{ border: 'none', margin: 0, padding: 0 }}>Task Management</h4>
                  <span className={styles.detailLabel} style={{ textTransform: 'none' }}>
                    {project.tasksDone}/{project.tasksTotal} Completed
                  </span>
                </div>
                <div className={styles.progressBarBg} style={{ margin: '8px 0' }}>
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${(project.tasksDone / project.tasksTotal) * 100 || 0}%`, backgroundColor: 'var(--color-success)' }}
                  />
                </div>

                <div className={styles.taskChecklist}>
                  {project.tasks && project.tasks.map((task) => (
                    <div
                      key={task.id}
                      className={`${styles.taskItem} ${task.overdue && !task.completed ? styles.taskOverdue : ''}`}
                    >
                      <input
                        type="checkbox"
                        className={styles.taskCheckbox}
                        checked={task.completed}
                        onChange={() => onToggleTask(project.id, task.id)}
                      />
                      <div className={styles.taskItemText}>
                        <span className={`${styles.taskTitle} ${task.completed ? styles.completed : ''}`}>
                          {task.title}
                        </span>
                        <div className={styles.taskMeta}>
                          <span>Due: {task.dueDate}</span>
                          <span>•</span>
                          <span style={{ color: task.priority === 'High' ? 'var(--color-danger)' : 'var(--text-muted)' }}>
                            {task.priority} Priority
                          </span>
                          {((task.assignedTo && task.assignedTo.length > 0) || (task.assigneeName && task.assigneeName !== 'Unassigned')) && (
                            <>
                              <span>•</span>
                              <span>Assigned: {task.assignedTo && task.assignedTo.length > 0 ? task.assignedTo.join(', ') : task.assigneeName}</span>
                            </>
                          )}
                          {task.overdue && !task.completed && (
                            <>
                              <span>•</span>
                              <span className={styles.taskOverdueBadge}>OVERDUE</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* TAB 3: DOCS & PRODUCTIVITY */}
          {activeTab === 'docs-performance' && (
            <>
              {/* Team Productivity */}
              <div className={styles.detailSection}>
                <h4 className={styles.sectionHeader}>Team Productivity</h4>
                <div className={styles.workflowMetaRow} style={{ marginBottom: 12 }}>
                  <div className={styles.workflowMetaCell}>
                    <span className={styles.workflowMetaLabel}>Performance Rate</span>
                    <span className={styles.workflowMetaVal} style={{ color: 'var(--color-primary)' }}>
                      {project.productivityScore || 85}%
                    </span>
                  </div>
                  <div className={styles.workflowMetaCell}>
                    <span className={styles.workflowMetaLabel}>Working Hours</span>
                    <span className={styles.workflowMetaVal}><Clock size={12} style={{ display: 'inline', marginRight: 4 }} /> {project.workingHours || 240} hrs</span>
                  </div>
                  <div className={styles.workflowMetaCell}>
                    <span className={styles.workflowMetaLabel}>Task Success Rate</span>
                    <span className={styles.workflowMetaVal} style={{ color: 'var(--color-success)' }}>
                      {Math.round((project.tasksDone / project.tasksTotal) * 100 || 0)}%
                    </span>
                  </div>
                </div>

                <span className={styles.detailLabel}>Employee Task Contribution</span>
                <div className={styles.progressList}>
                  {project.members && project.members.map((member, i) => {
                    const contributions = [45, 25, 20, 10];
                    const pct = contributions[i % contributions.length];
                    return (
                      <div key={i} className={styles.progressItem}>
                        <div className={styles.progressLabelRow}>
                          <span>{member}</span>
                          <span>{pct}% contribution</span>
                        </div>
                        <div className={styles.progressBarBg}>
                          <div
                            className={styles.progressBarFill}
                            style={{
                              width: `${pct}%`,
                              backgroundColor: `hsl(${(i * 90) % 360}, 60%, 55%)`
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Project Documents */}
              <div className={styles.detailSection}>
                <h4 className={styles.sectionHeader}>Project Documents</h4>
                <div className={styles.documentList}>
                  {project.documents && project.documents.map((doc, idx) => (
                    <div key={idx} className={styles.documentItem}>
                      <div className={styles.docLeft}>
                        {doc.type === 'pdf' ? <FileText size={18} className={styles.docIcon} /> : <File size={18} className={styles.docIcon} />}
                        <div className={styles.docMeta}>
                          <span className={styles.docName}>{doc.name}</span>
                          <span className={styles.docSize}>{doc.size || '1.2 MB'} • Uploaded by {doc.uploadedBy || 'PM'}</span>
                        </div>
                      </div>
                      <a href={doc.downloadUrl || '#'} download className={styles.docDLBtn} title="Download Document">
                        <Download size={14} />
                      </a>
                    </div>
                  ))}
                  {(!project.documents || project.documents.length === 0) && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', display: 'block', padding: '12px' }}>
                      No documents uploaded yet.
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailPanel;
