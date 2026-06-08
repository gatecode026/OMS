import React, { useState } from 'react';
import Modal from '../../common/Modal';
import { useApp } from '../../../context/AppContext';

const SubmitReportModal = ({
  isOpen,
  onClose,
  currentUser = {}
}) => {
  const { addDailyReport, addToast } = useApp();
  const [project, setProject] = useState('SaaS Platform v2.0');
  const [date, setDate] = useState('2026-06-03'); // default mock sync date
  const [tasksAssigned, setTasksAssigned] = useState(5);
  const [tasksCompleted, setTasksCompleted] = useState(4);
  const [summary, setSummary] = useState('');
  const [ongoing, setOngoing] = useState('');
  const [nextPlan, setNextPlan] = useState('');
  const [blockers, setBlockers] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!summary.trim() || !ongoing.trim() || !nextPlan.trim()) {
      addToast('error', 'Please fill in all required fields.');
      return;
    }

    if (Number(tasksCompleted) > Number(tasksAssigned)) {
      addToast('error', 'Tasks completed cannot exceed tasks assigned.');
      return;
    }

    const reportData = {
      employeeId: currentUser.id,
      employeeName: currentUser.name,
      department: currentUser.department || 'Engineering',
      team: currentUser.team || 'Frontend Devs',
      project: project,
      date: date,
      tasksAssigned: Number(tasksAssigned),
      tasksCompleted: Number(tasksCompleted),
      pendingTasksCount: Math.max(0, Number(tasksAssigned) - Number(tasksCompleted)),
      summary: summary,
      ongoingTasks: ongoing,
      pendingTasks: nextPlan,
      challengesFaced: blockers || 'None.',
      productivityScore: Math.round((Number(tasksCompleted) / Math.max(1, Number(tasksAssigned))) * 100),
      status: 'Submitted',
      feedback: '',
      loginTime: '09:00 AM',
      logoutTime: '06:00 PM',
      workingHours: 8.0,
      overtimeHours: 0.0
    };

    addDailyReport(reportData);
    onClose();

    // Reset
    setSummary('');
    setOngoing('');
    setNextPlan('');
    setBlockers('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Submit Daily Work Report (DWR)">
      <form onSubmit={handleSubmit} className="flex-column gap-4 padding-4" style={{ maxHeight: '550px', overflowY: 'auto' }}>
        <div className="flex-row gap-3 flex-wrap">
          {/* Project */}
          <div className="flex-column flex-1 gap-1">
            <label className="text-xs text-text-muted bold-text uppercase">Project</label>
            <select
              value={project}
              onChange={(e) => setProject(e.target.value)}
              className="padding-2 border-border"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
            >
              <option value="SaaS Platform v2.0">SaaS Platform v2.0</option>
              <option value="Q2 Sales Campaign">Q2 Sales Campaign</option>
              <option value="Security Audits">Security Audits</option>
            </select>
          </div>

          {/* Date */}
          <div className="flex-column flex-1 gap-1">
            <label className="text-xs text-text-muted bold-text uppercase">Report Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="padding-2 border-border"
            />
          </div>
        </div>

        <div className="flex-row gap-3 flex-wrap">
          {/* Tasks Assigned */}
          <div className="flex-column flex-1 gap-1">
            <label className="text-xs text-text-muted bold-text uppercase">Tasks Assigned</label>
            <input
              type="number"
              value={tasksAssigned}
              onChange={(e) => setTasksAssigned(e.target.value)}
              required
              min={1}
              className="padding-2 border-border"
            />
          </div>

          {/* Tasks Completed */}
          <div className="flex-column flex-1 gap-1">
            <label className="text-xs text-text-muted bold-text uppercase">Tasks Completed</label>
            <input
              type="number"
              value={tasksCompleted}
              onChange={(e) => setTasksCompleted(e.target.value)}
              required
              min={0}
              className="padding-2 border-border"
            />
          </div>
        </div>

        {/* Work Summary */}
        <div className="flex-column gap-1">
          <label className="text-xs text-text-muted bold-text uppercase">Work Summary *</label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Summarize your main achievements today..."
            required
            rows={2}
            className="padding-2 border-border"
          />
        </div>

        {/* Tasks Completed details */}
        <div className="flex-column gap-1">
          <label className="text-xs text-text-muted bold-text uppercase">Detailed Tasks Completed *</label>
          <textarea
            value={ongoing}
            onChange={(e) => setOngoing(e.target.value)}
            placeholder="Bullet point list of completed tasks..."
            required
            rows={2}
            className="padding-2 border-border"
          />
        </div>

        {/* Next Plan */}
        <div className="flex-column gap-1">
          <label className="text-xs text-text-muted bold-text uppercase">Tomorrow's Planned Tasks *</label>
          <textarea
            value={nextPlan}
            onChange={(e) => setNextPlan(e.target.value)}
            placeholder="What will you work on next?"
            required
            rows={2}
            className="padding-2 border-border"
          />
        </div>

        {/* Blockers */}
        <div className="flex-column gap-1">
          <label className="text-xs text-text-muted bold-text uppercase">Issues & Blockers (Optional)</label>
          <textarea
            value={blockers}
            onChange={(e) => setBlockers(e.target.value)}
            placeholder="Any technical issues or blockers delaying tasks?"
            rows={2}
            className="padding-2 border-border"
          />
        </div>

        {/* Submit Buttons */}
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
            Submit Report
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default SubmitReportModal;
