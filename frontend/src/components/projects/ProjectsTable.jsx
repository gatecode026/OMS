import React, { useState } from 'react';
import styles from '../../styles/projects.module.css';
import { ArrowUp, ArrowDown, Eye, Edit2, Users } from 'lucide-react';
import Avatar from '../common/Avatar';
import { useApp } from '../../context/AppContext';

const ProjectsTable = ({ projects, onView, onEdit, onAssignTeam }) => {
  const { currentUserRole, hasPermission } = useApp();
  // Sort state: { key: string, direction: 'asc' | 'desc' }
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Sorting logic
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getPriorityWeight = (priority) => {
    switch (priority) {
      case 'Urgent': return 4;
      case 'High': return 3;
      case 'Medium': return 2;
      case 'Low': return 1;
      default: return 0;
    }
  };

  const sortedProjects = [...projects].sort((a, b) => {
    let valA = a[sortConfig.key];
    let valB = b[sortConfig.key];

    // Priority custom sorting
    if (sortConfig.key === 'priority') {
      valA = getPriorityWeight(a.priority);
      valB = getPriorityWeight(b.priority);
    }

    if (valA === undefined) valA = '';
    if (valB === undefined) valB = '';

    if (typeof valA === 'string') {
      return sortConfig.direction === 'asc'
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    } else {
      return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
    }
  });

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedProjects.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedProjects.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Helper styles for badges
  const getStatusClass = (status) => {
    switch (status) {
      case 'Active': return 'badge-success';
      case 'In Progress': return 'badge-info';
      case 'Pending': return 'badge-neutral';
      case 'Completed': return 'badge-purple'; // teal-ish / purple in token
      case 'Delayed': return 'badge-danger';
      case 'On Hold': return 'badge-warning';
      case 'Cancelled': return 'badge-neutral';
      default: return 'badge-neutral';
    }
  };

  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'Urgent': return 'badge-danger';
      case 'High': return 'badge-danger';
      case 'Medium': return 'badge-warning';
      case 'Low': return 'badge-success';
      default: return 'badge-neutral';
    }
  };

  const renderSortIndicator = (key) => {
    if (sortConfig.key !== key) return <span className={styles.sortIcon}><ArrowUp size={12} /></span>;
    return (
      <span className={`${styles.sortIcon} ${styles.active}`}>
        {sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
      </span>
    );
  };

  return (
    <div className={styles.tableCard}>
      <div className={styles.tableHeaderRow}>
        <h3 className={styles.tableTitle}>All Projects</h3>
        <span className={styles.paginationInfo}>
          Showing {Math.min(indexOfFirstItem + 1, sortedProjects.length)} - {Math.min(indexOfLastItem, sortedProjects.length)} of {sortedProjects.length}
        </span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className={styles.customTable}>
          <thead>
            <tr>
              <th className={styles.sortableHeader} onClick={() => handleSort('id')}>
                <div className={styles.thContent}>ID {renderSortIndicator('id')}</div>
              </th>
              <th className={styles.sortableHeader} onClick={() => handleSort('name')}>
                <div className={styles.thContent}>Project Name {renderSortIndicator('name')}</div>
              </th>
              <th className={styles.sortableHeader} onClick={() => handleSort('department')}>
                <div className={styles.thContent}>Client / Dept {renderSortIndicator('department')}</div>
              </th>
              <th className={styles.sortableHeader} onClick={() => handleSort('manager')}>
                <div className={styles.thContent}>Manager {renderSortIndicator('manager')}</div>
              </th>
              <th className={styles.sortableHeader} onClick={() => handleSort('leader')}>
                <div className={styles.thContent}>Team Leader {renderSortIndicator('leader')}</div>
              </th>
              <th>Assigned Team</th>
              <th className={styles.sortableHeader} onClick={() => handleSort('priority')}>
                <div className={styles.thContent}>Priority {renderSortIndicator('priority')}</div>
              </th>
              <th className={styles.sortableHeader} onClick={() => handleSort('startDate')}>
                <div className={styles.thContent}>Start Date {renderSortIndicator('startDate')}</div>
              </th>
              <th className={styles.sortableHeader} onClick={() => handleSort('deadline')}>
                <div className={styles.thContent}>Deadline {renderSortIndicator('deadline')}</div>
              </th>
              <th className={styles.sortableHeader} onClick={() => handleSort('progress')}>
                <div className={styles.thContent}>Completion % {renderSortIndicator('progress')}</div>
              </th>
              <th className={styles.sortableHeader} onClick={() => handleSort('status')}>
                <div className={styles.thContent}>Status {renderSortIndicator('status')}</div>
              </th>
              <th>Total Tasks</th>
              <th>Completed Tasks</th>
              <th>Pending Tasks</th>
              <th>Progress Bar</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length > 0 ? (
              currentItems.map((p) => {
                const totalTasks = p.tasksTotal || 0;
                const completedTasks = p.tasksDone || 0;
                const pendingTasks = totalTasks - completedTasks;

                return (
                  <tr key={p.id}>
                    <td><strong>{p.id}</strong></td>
                    <td>
                      <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{p.name}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span>{p.client || 'Internal'}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.department}</span>
                      </div>
                    </td>
                    <td>{p.manager}</td>
                    <td>{p.leader}</td>
                    <td>
                      <div className={styles.teamAvatarStack}>
                        {p.members && p.members.slice(0, 3).map((m, i) => (
                          <div key={i} className={styles.avatarOverlap} title={m}>
                            <Avatar name={m} size="xs" />
                          </div>
                        ))}
                        {p.members && p.members.length > 3 && (
                          <div className={styles.avatarExtra} title={`${p.members.length - 3} more`}>
                            +{p.members.length - 3}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${getStatusClass(p.priority)} ${styles.priorityBadge}`}>
                        {p.priority}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{p.startDate}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{p.deadline}</td>
                    <td>
                      <span style={{ fontWeight: '700', color: p.progress >= 100 ? 'var(--color-success)' : 'var(--text-primary)' }}>
                        {p.progress}%
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getStatusClass(p.status)} ${styles.statusBadge}`}>
                        {p.status}
                      </span>
                    </td>
                    <td>{totalTasks}</td>
                    <td>{completedTasks}</td>
                    <td>{pendingTasks}</td>
                    <td style={{ minWidth: '100px' }}>
                      <div className={styles.progressBarBg}>
                        <div
                          className={styles.progressBarFill}
                          style={{
                            width: `${p.progress}%`,
                            backgroundColor: p.status === 'Delayed' ? 'var(--color-danger)' : 'var(--color-primary)'
                          }}
                        />
                      </div>
                    </td>
                    <td>
                      <div className={styles.actionsCell}>
                        <button
                          className={`${styles.actionBtn} ${styles.actionBtnView}`}
                          onClick={() => onView(p)}
                          title="View Details"
                        >
                          <Eye size={13} />
                        </button>
                        {currentUserRole !== 'employee' && hasPermission('project_management', 'update') && (
                          <>
                            <button
                              className={`${styles.actionBtn} ${styles.actionBtnEdit}`}
                              onClick={() => onEdit(p)}
                              title="Edit Project"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              className={`${styles.actionBtn} ${styles.actionBtnAssign}`}
                              onClick={() => onAssignTeam(p)}
                              title="Assign Team"
                            >
                              <Users size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="16" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                  No projects found matching the filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className={styles.tablePagination}>
          <span className={styles.paginationInfo}>
            Page {currentPage} of {totalPages}
          </span>
          <div className={styles.paginationButtons}>
            <button
              className={styles.pageBtn}
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
              <button
                key={number}
                className={`${styles.pageNumber} ${currentPage === number ? styles.active : ''}`}
                onClick={() => paginate(number)}
              >
                {number}
              </button>
            ))}
            <button
              className={styles.pageBtn}
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsTable;
