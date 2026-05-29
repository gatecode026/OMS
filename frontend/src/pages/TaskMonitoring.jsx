import React, { useState } from 'react';
import './TaskMonitoring.css';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import Avatar from '../components/common/Avatar';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import Skeleton from '../components/common/Skeleton';
import { KanbanSquare, Plus, AlertCircle, Calendar, Flag } from 'lucide-react';

const TaskMonitoring = () => {
  const isLoading = usePageLoading(600);
  const { tasks, employees, updateTaskStatus, addTask, deleteTask, showConfirm } = useApp();

  // Filters State
  const [projectFilter, setProjectFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Modals state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newTaskData, setNewTaskData] = useState({
    title: '', project: 'SaaS Platform', description: '', assigneeId: employees[0]?.id || '', priority: 'Medium', dueDate: '2026-05-30'
  });

  const [draggedOverColumn, setDraggedOverColumn] = useState(null);

  const columns = ['To Do', 'In Progress', 'In Review', 'Done'];

  // Handle drag-and-drop
  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDragEnter = (e, col) => {
    e.preventDefault();
    setDraggedOverColumn(col);
  };

  const handleDragLeave = () => {
    setDraggedOverColumn(null);
  };

  const handleDrop = (e, col) => {
    e.preventDefault();
    setDraggedOverColumn(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      updateTaskStatus(taskId, col);
    }
  };

  // Handle status updates from details modal
  const handleStatusChangeInModal = (e) => {
    const newStatus = e.target.value;
    updateTaskStatus(selectedTask.id, newStatus);
    setSelectedTask(prev => ({ ...prev, status: newStatus }));
  };

  const handleOpenAddModal = () => {
    setNewTaskData({
      title: '', project: 'SaaS Platform', description: '', assigneeId: employees[0]?.id || '', priority: 'Medium', dueDate: '2026-05-30'
    });
    setAddModalOpen(true);
  };

  const handleAddTaskSubmit = () => {
    if (!newTaskData.title.trim()) return;
    addTask(newTaskData);
    setAddModalOpen(false);
  };

  // Filter tasks
  const filteredTasks = tasks.filter(t => {
    const matchesProject = projectFilter ? t.project === projectFilter : true;
    const matchesAssignee = assigneeFilter ? t.assigneeId === assigneeFilter : true;
    const matchesPriority = priorityFilter ? t.priority === priorityFilter : true;
    return matchesProject && matchesAssignee && matchesPriority;
  });

  const getPriorityVariant = (priority) => {
    switch (priority) {
      case 'Critical': return 'danger';
      case 'High': return 'warning';
      case 'Medium': return 'info';
      default: return 'neutral';
    }
  };

  const isOverdue = (dueDate, status) => {
    if (status === 'Done') return false;
    return new Date(dueDate) < new Date('2026-05-29'); // mock current date
  };

  if (isLoading) {
    return (
      <div className="tasks-page grid-gap">
        <div className="card" style={{ height: '80px' }}><Skeleton variant="rect" height="100%" /></div>
        <div className="kanban-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card column-card" style={{ height: '450px' }}>
              <Skeleton variant="rect" height="100%" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="tasks-page flex-column grid-gap">
      
      {/* Title */}
      <div className="page-header-row">
        <div>
          <h2>Kanban Task Monitoring</h2>
          <p className="page-desc-text">Track operations deliverables, project boards, and sprint schedules</p>
        </div>
        <Button variant="primary" onClick={handleOpenAddModal} icon={Plus}>
          Create Task
        </Button>
      </div>

      {/* Filter Options */}
      <div className="card filters-card">
        <div className="tasks-filters-grid">
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            <option value="">All Projects</option>
            <option value="SaaS Platform">SaaS Platform</option>
            <option value="Engineering Operations">Engineering Operations</option>
            <option value="HR System">HR System</option>
            <option value="Marketing Outreach">Marketing Outreach</option>
          </select>

          <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
            <option value="">All Assignees</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>

          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Kanban Board Grid */}
      <div className="kanban-grid">
        {columns.map(col => {
          const columnTasks = filteredTasks.filter(t => t.status === col);
          return (
            <div key={col} className="kanban-column">
              <div className="column-header">
                <div className="column-title-group">
                  <span className={`column-dot dot-var-${col.replace(/\s+/g, '').toLowerCase()}`}></span>
                  <h4>{col}</h4>
                </div>
                <span className="column-card-count">{columnTasks.length}</span>
              </div>

              <div
                className={`column-cards-container ${draggedOverColumn === col ? 'column-drag-over' : ''}`}
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(e, col)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col)}
              >
                {columnTasks.length > 0 ? (
                  columnTasks.map(task => {
                    const overdue = isOverdue(task.dueDate, task.status);
                    return (
                      <div
                        key={task.id}
                        className={`kanban-card animate-fade-in ${overdue ? 'card-border-overdue' : ''}`}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onClick={() => {
                          setSelectedTask(task);
                          setDetailModalOpen(true);
                        }}
                      >
                        <h5 className="task-card-title">{task.title}</h5>
                        <span className="task-card-project">{task.project}</span>

                        <div className="task-card-footer">
                          <div className="task-card-meta">
                            <Badge variant={getPriorityVariant(task.priority)}>
                              {task.priority}
                            </Badge>
                            
                            {overdue && (
                              <Badge variant="danger">
                                Overdue
                              </Badge>
                            )}
                            
                            <div className={`task-due-date-badge ${overdue ? 'text-danger-bold' : ''}`}>
                              <Calendar size={12} />
                              <span>{task.dueDate}</span>
                            </div>
                          </div>

                          <div className="task-card-assignee">
                            <Avatar name={task.assigneeName} size="sm" />
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="column-empty-state">
                    <span>No tasks in this list</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Details Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Task Detail View"
        size="md"
        footer={
          <div className="modal-actions-wrapper" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <Button variant="secondary" onClick={() => setDetailModalOpen(false)}>
              Close
            </Button>
            {selectedTask && (
              <Button
                variant="danger"
                onClick={() => {
                  showConfirm(
                    'Delete Task',
                    `Are you sure you want to delete task "${selectedTask.title}"? This action cannot be undone.`,
                    () => {
                      deleteTask(selectedTask.id);
                      setDetailModalOpen(false);
                    },
                    'danger'
                  );
                }}
              >
                Delete Task
              </Button>
            )}
          </div>
        }
      >
        {selectedTask && (
          <div className="task-detail-modal-body">
            <h3 className="task-modal-title">{selectedTask.title}</h3>
            <span className="task-modal-project">{selectedTask.project}</span>

            <div className="task-modal-split-fields">
              <div className="modal-field">
                <label>Status</label>
                <select value={selectedTask.status} onChange={handleStatusChangeInModal}>
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="In Review">In Review</option>
                  <option value="Done">Done</option>
                </select>
              </div>

              <div className="modal-field">
                <label>Priority</label>
                <Badge variant={getPriorityVariant(selectedTask.priority)}>
                  {selectedTask.priority}
                </Badge>
              </div>
              
              <div className="modal-field">
                <label>Due Date</label>
                <span className="modal-due-date-value">
                  {selectedTask.dueDate}
                  {isOverdue(selectedTask.dueDate, selectedTask.status) && (
                    <span className="overdue-text-label">(Overdue)</span>
                  )}
                </span>
              </div>

              <div className="modal-field">
                <label>Assignee</label>
                <div className="flex-center gap-2 justify-start">
                  <Avatar name={selectedTask.assigneeName} size="sm" />
                  <strong>{selectedTask.assigneeName}</strong>
                </div>
              </div>
            </div>

            <div className="modal-field">
              <label>Description</label>
              <p className="task-modal-description">{selectedTask.description}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Task Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Create New Project Task"
        size="md"
        footer={
          <div className="modal-actions-wrapper">
            <Button variant="secondary" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddTaskSubmit} disabled={!newTaskData.title.trim()}>
              Create Task
            </Button>
          </div>
        }
      >
        <div className="create-task-form-body">
          <div className="form-field">
            <label>Task Title *</label>
            <input
              type="text"
              placeholder="e.g. Implement Oauth Login"
              value={newTaskData.title}
              onChange={(e) => setNewTaskData(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>
          <div className="form-field">
            <label>Project Name *</label>
            <select
              value={newTaskData.project}
              onChange={(e) => setNewTaskData(prev => ({ ...prev, project: e.target.value }))}
            >
              <option value="SaaS Platform">SaaS Platform</option>
              <option value="Engineering Operations">Engineering Operations</option>
              <option value="HR System">HR System</option>
              <option value="Marketing Outreach">Marketing Outreach</option>
            </select>
          </div>
          <div className="form-field">
            <label>Assignee *</label>
            <select
              value={newTaskData.assigneeId}
              onChange={(e) => setNewTaskData(prev => ({ ...prev, assigneeId: e.target.value }))}
            >
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>Priority</label>
            <select
              value={newTaskData.priority}
              onChange={(e) => setNewTaskData(prev => ({ ...prev, priority: e.target.value }))}
            >
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
          <div className="form-field">
            <label>Due Date</label>
            <input
              type="date"
              value={newTaskData.dueDate}
              onChange={(e) => setNewTaskData(prev => ({ ...prev, dueDate: e.target.value }))}
            />
          </div>
          <div className="form-field">
            <label>Task Description</label>
            <textarea
              placeholder="Provide context and notes for the engineer..."
              value={newTaskData.description}
              onChange={(e) => setNewTaskData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default TaskMonitoring;
