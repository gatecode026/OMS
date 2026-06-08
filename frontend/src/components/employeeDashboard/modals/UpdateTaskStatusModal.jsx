import React, { useState, useEffect } from 'react';
import Modal from '../../common/Modal';
import { useApp } from '../../../context/AppContext';

const UpdateTaskStatusModal = ({
  isOpen,
  onClose,
  task = {}
}) => {
  const { updateTaskProgress } = useApp();
  const [status, setStatus] = useState('To Do');
  const [progress, setProgress] = useState(0);
  const [remarks, setRemarks] = useState('');

  // Sync state with selected task
  useEffect(() => {
    if (task) {
      setStatus(task.status || 'To Do');
      setProgress(task.progress || 0);
      setRemarks(task.remarks || '');
    }
  }, [task]);

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    if (newStatus === 'Done') {
      setProgress(100);
    } else if (newStatus === 'To Do') {
      setProgress(0);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateTaskProgress(task.id, status, progress, remarks);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Update Task: ${task.title || ''}`}>
      <form onSubmit={handleSubmit} className="flex-column gap-4 padding-4">
        {/* Task Name */}
        <div className="flex-column gap-1 bg-surface padding-2 rounded border border-border">
          <span className="text-xs text-text-muted bold-text uppercase">Selected Task</span>
          <span className="bold-text text-sm text-white mt-1">{task.title}</span>
          <span className="text-xs text-text-muted mt-1">Project: {task.project}</span>
        </div>

        {/* Status Dropdown */}
        <div className="flex-column gap-1">
          <label className="text-xs text-text-muted bold-text uppercase">Task Status</label>
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="padding-2 border-border"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
          >
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="In Review">In Review</option>
            <option value="Done">Done</option>
          </select>
        </div>

        {/* Progress Slider */}
        <div className="flex-column gap-1">
          <div className="flex-row justify-between text-xs text-text-muted">
            <label className="bold-text uppercase">Completion Progress</label>
            <span className="bold-text text-primary-500">{progress}%</span>
          </div>
          <div className="flex-row align-center gap-3 mt-1">
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setProgress(val);
                if (val === 100) setStatus('Done');
                else if (val === 0) setStatus('To Do');
                else if (status === 'To Do' || status === 'Done') setStatus('In Progress');
              }}
              style={{ flex: 1, accentColor: 'var(--color-primary)' }}
            />
          </div>
        </div>

        {/* Remarks */}
        <div className="flex-column gap-1">
          <label className="text-xs text-text-muted bold-text uppercase">Remarks / Notes</label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Add progress remarks or details about completion..."
            rows={3}
            className="padding-2 border-border"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex-row justify-end gap-3 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="padding-2 text-xs bold-text bg-surface border border-border rounded px-4 transition-all"
            style={{ cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="padding-2 text-xs bold-text bg-primary-500 hover:bg-primary-hover text-white rounded px-5 transition-all"
            style={{ border: 'none', cursor: 'pointer', background: 'var(--color-primary)' }}
          >
            Save Changes
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default UpdateTaskStatusModal;
