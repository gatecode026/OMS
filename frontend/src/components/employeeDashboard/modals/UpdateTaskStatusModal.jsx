import React, { useState, useEffect } from 'react';
import Modal from '../../common/Modal';
import { useApp } from '../../../context/AppContext';

const getDisplayStatus = (statusVal) => {
  if (!statusVal) return 'To Do';
  switch (statusVal.toLowerCase()) {
    case 'todo':
    case 'assigned':
    case 'to do':
      return 'To Do';
    case 'in progress':
    case 'in_progress':
      return 'In Progress';
    case 'in review':
    case 'under_review':
    case 'review':
      return 'In Review';
    case 'done':
    case 'completed':
      return 'Done';
    default:
      return 'To Do';
  }
};

const UpdateTaskStatusModal = ({
  isOpen,
  onClose,
  task = {}
}) => {
  const { updateTaskProgress, addToast, currentUserRole } = useApp();
  const [status, setStatus] = useState('To Do');
  const [progress, setProgress] = useState(0);
  const [remarks, setRemarks] = useState('');

  // Sync state with selected task
  useEffect(() => {
    if (task) {
      setStatus(getDisplayStatus(task.status));
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
    } else if (newStatus === 'In Progress' && (progress === 0 || progress >= 90)) {
      setProgress(10);
    } else if (newStatus === 'In Review' && progress < 90) {
      setProgress(90);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (status === 'Done' && currentUserRole === 'employee') {
      if (addToast) addToast('warning', 'Only management can approve and set task to "Done".');
      return;
    }
    
    // Map display status back to DB status key
    let dbStatus = 'todo';
    if (status === 'In Progress') dbStatus = 'in_progress';
    else if (status === 'In Review') dbStatus = 'review';
    else if (status === 'Done') dbStatus = 'done';

    updateTaskProgress(task.id, dbStatus, progress, remarks);
    onClose();
  };

  const currentDisp = getDisplayStatus(task.status);

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
            disabled={currentDisp === 'Done'}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="padding-2 border-border"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
          >
            <option value="To Do" disabled={currentDisp !== 'To Do'}>To Do</option>
            <option value="In Progress" disabled={currentDisp !== 'To Do' && currentDisp !== 'In Progress'}>In Progress</option>
            <option value="In Review" disabled={currentDisp !== 'In Progress' && currentDisp !== 'In Review'}>In Review</option>
            <option value="Done" disabled={currentUserRole === 'employee' || (currentDisp !== 'In Review' && currentDisp !== 'Done')}>Done</option>
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
              disabled={currentDisp === 'In Review' || currentDisp === 'Done'}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                
                if (currentDisp === 'To Do') {
                  if (val > 30) {
                    setProgress(30);
                    setStatus('In Progress');
                    if (addToast) addToast('warning', 'Task must first be started. Progress capped at 30% for In Progress.');
                  } else if (val > 0) {
                    setProgress(val);
                    setStatus('In Progress');
                  } else {
                    setProgress(0);
                    setStatus('To Do');
                  }
                } else if (currentDisp === 'In Progress') {
                  if (val >= 90) {
                    setProgress(90);
                    setStatus('In Review');
                    if (addToast) addToast('info', 'Task submitted for review.');
                  } else {
                    setProgress(Math.max(10, val));
                  }
                } else if (currentDisp === 'In Review') {
                  if (addToast) addToast('warning', 'Task is in review. Only reviewers can approve/complete it.');
                } else if (currentDisp === 'Done') {
                  if (addToast) addToast('info', 'Completed tasks cannot be modified.');
                }
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
            disabled={currentDisp === 'Done'}
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
            disabled={currentDisp === 'Done'}
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
