/**
 * @file src/components/CreateTaskFromMessageModal.jsx
 * @description Modal to create a project task directly from a chat message.
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

const stripMarkdown = (text) => {
  if (!text) return '';
  return text
    .replace(/```[\s\S]*?```/g, '[Code Block]')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/~([^~]+)~/g, '$1')
    .replace(/^\s*>\s+/gm, '')
    .replace(/^\s*[\*\-+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\n+/g, ' ')
    .trim();
};

const CreateTaskFromMessageModal = ({ message, onClose }) => {
  const { employees, projectsList, addTask, addToast, currentUser } = useApp();

  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [assigneeId, setAssigneeId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize fields
  useEffect(() => {
    if (projectsList && projectsList.length > 0) {
      setProjectId(projectsList[0].id);
    }
    if (message) {
      setTitle(stripMarkdown(message.content || ''));
      
      // Try to pre-select assignee matching the message sender
      const matched = (employees || []).find(e => 
        (e.id && e.id === message.senderId) || 
        (e.name && e.name.toLowerCase() === message.senderName?.toLowerCase())
      );
      if (matched) {
        setAssigneeId(matched.id);
      } else {
        setAssigneeId('');
      }
    }
    
    // Default due date to 7 days from now
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    setDueDate(nextWeek.toISOString().split('T')[0]);
  }, [message, projectsList, employees]);

  // Find employees belonging to the selected project (project members), fallback to all employees
  const selectedProject = (projectsList || []).find(p => p.id === projectId);
  
  const projectEmployees = React.useMemo(() => {
    if (!selectedProject || !selectedProject.members || selectedProject.members.length === 0) {
      return employees || [];
    }
    // Filter global employees list by project member names
    const memberNames = selectedProject.members.map(m => m.toLowerCase());
    return (employees || []).filter(e => e.name && memberNames.includes(e.name.toLowerCase()));
  }, [selectedProject, employees]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!projectId) {
      addToast?.('error', 'Please select a project');
      return;
    }
    if (!title.trim()) {
      addToast?.('error', 'Task description cannot be empty');
      return;
    }

    setIsSubmitting(true);
    try {
      const task = await addTask({
        projectId,
        title: title.trim(),
        dueDate,
        priority,
        assigneeId
      });
      if (task) {
        onClose();
      }
    } catch (err) {
      console.error('[CreateTaskFromMessageModal] Failed to create task:', err);
      addToast?.('error', 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && !isSubmitting && onClose()}>
      <div className="new-chat-modal" style={{ maxWidth: '460px', height: 'auto', display: 'flex', flexDirection: 'column' }}>
        <style>{`
          .task-form-group {
            margin: 0 20px 16px;
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .task-label {
            font-size: 13px;
            font-weight: 600;
            color: var(--text-secondary, #475569);
          }
          .task-input, .task-select, .task-textarea {
            width: 100%;
            padding: 10px 14px;
            border: 1.5px solid var(--chat-border, #cbd5e1);
            border-radius: 10px;
            font-size: 14px;
            background: var(--chat-input-bg, #fff);
            color: var(--text-primary, #1e293b);
            outline: none;
            transition: border-color 0.2s;
          }
          .task-input:focus, .task-select:focus, .task-textarea:focus {
            border-color: var(--chat-primary, #6366f1);
          }
          .task-textarea {
            resize: vertical;
            height: 90px;
            min-height: 60px;
          }
          .task-footer-row {
            margin-top: 10px;
            padding: 16px 20px;
            border-top: 1px solid var(--chat-border, #cbd5e1);
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            background: var(--bg-card);
          }
        `}</style>

        {/* Header */}
        <div className="new-chat-modal-header" style={{ padding: '20px 20px 12px', borderBottom: '1px solid var(--chat-border)' }}>
          <div>
            <h3 className="new-chat-modal-title">Convert Message to Task</h3>
            <p className="new-chat-modal-sub">Create and assign a task directly from this chat message</p>
          </div>
          <button className="new-chat-modal-close" onClick={onClose} disabled={isSubmitting}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '16px' }}>
            {/* Target Project Selection */}
            <div className="task-form-group">
              <label className="task-label">Target Project *</label>
              <select
                className="task-select"
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                required
                disabled={isSubmitting}
              >
                <option value="">Select a project...</option>
                {(projectsList || []).map(p => (
                  <option key={p.id} value={p.id}>{p.id} - {p.name}</option>
                ))}
              </select>
            </div>

            {/* Task Title (Pre-populated) */}
            <div className="task-form-group">
              <label className="task-label">Task Description *</label>
              <textarea
                className="task-textarea"
                placeholder="Enter task title or description..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Due Date */}
            <div className="task-form-group">
              <label className="task-label">Due Date *</label>
              <input
                type="date"
                className="task-input"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Priority */}
            <div className="task-form-group">
              <label className="task-label">Priority</label>
              <select
                className="task-select"
                value={priority}
                onChange={e => setPriority(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            {/* Assignee Selection */}
            <div className="task-form-group">
              <label className="task-label">Assign To</label>
              <select
                className="task-select"
                value={assigneeId}
                onChange={e => setAssigneeId(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="">Unassigned</option>
                {projectEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="task-footer-row">
            <button
              type="button"
              className="group-btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="group-btn-primary"
              disabled={isSubmitting || !projectId || !title.trim()}
            >
              {isSubmitting ? 'Creating Task...' : 'Create & Assign Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTaskFromMessageModal;
