import React, { useState, useEffect } from 'react';
import Modal from '../../common/Modal';
import { useApp } from '../../../context/AppContext';

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!match) return 0;
  let [_, hours, minutes, ampm] = match;
  hours = parseInt(hours, 10);
  minutes = parseInt(minutes, 10);
  if (ampm && ampm.toUpperCase() === 'PM' && hours !== 12) hours += 12;
  if (ampm && ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

const formatTime = (dateObj) => {
  let hours = dateObj.getHours();
  let minutes = dateObj.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  minutes = minutes < 10 ? '0' + minutes : minutes;
  return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
};

const MarkAttendanceModal = ({
  isOpen,
  onClose,
  todayRecord = {},
  currentUser = {}
}) => {
  const { addAttendanceRecord, updateAttendanceRecord, addToast, attendanceRules } = useApp();
  const [action, setAction] = useState('in');
  const [location, setLocation] = useState('WFO');
  const [notes, setNotes] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Keep clock running
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Pre-select logically based on today's state
  useEffect(() => {
    console.log('DEBUG: MarkAttendanceModal todayRecord =', todayRecord);
    if (todayRecord.punchIn && !todayRecord.punchOut) {
      setAction('out');
    } else {
      setAction('in');
    }
    if (todayRecord.workMode) {
      setLocation(todayRecord.workMode);
    } else {
      setLocation('WFO');
    }
  }, [todayRecord]);

  const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const todayStr = getLocalDateString(currentTime);
    const formattedTimeStr = formatTime(currentTime);

    if (action === 'in') {
      if (todayRecord.punchIn) {
        addToast('warning', 'Already punched in for today!');
        return;
      }

      const newRecord = {
        id: `ATT-MOCK-${Math.floor(Math.random() * 9000 + 1000)}`,
        employeeId: currentUser.id,
        employeeName: currentUser.name,
        department: currentUser.department,
        branch: currentUser.branch || '',
        date: todayStr,
        punchIn: formattedTimeStr,
        punchOut: null,
        totalHours: 0,
        overtime: 0,
        status: parseTimeToMinutes(formattedTimeStr) > parseTimeToMinutes(attendanceRules?.lateTimeThreshold || '09:15') ? 'Late' : 'Present',
        workMode: location,
        notes: notes
      };

      addAttendanceRecord(newRecord);
      addToast('success', `Punched in successfully at ${formattedTimeStr}`);
    } else if (action === 'out') {
      if (!todayRecord.punchIn) {
        addToast('error', 'Must punch in first!');
        return;
      }
      if (todayRecord.punchOut) {
        addToast('warning', 'Already punched out for today!');
        return;
      }

      // Calculate total hours
      const inMins = parseTimeToMinutes(todayRecord.punchIn);
      const outMins = parseTimeToMinutes(formattedTimeStr);
      let diffMins = outMins - inMins;
      if (diffMins < 0) {
        diffMins += 24 * 60;
      }
      const diffHrs = parseFloat((diffMins / 60).toFixed(2));
      const dailyHours = parseFloat(attendanceRules?.dailyHours) || 8;
      const halfDayHrs = parseFloat(attendanceRules?.halfDayHoursThreshold) || 8;
      const overtime = parseFloat(Math.max(0, diffHrs - dailyHours).toFixed(2));

      const toastHrs = Math.floor(diffMins / 60);
      const toastMins = diffMins % 60;
      const formattedDuration = `${toastHrs}h ${toastMins}m`;

      updateAttendanceRecord(todayRecord.id, {
        ...todayRecord,
        punchOut: formattedTimeStr,
        totalHours: diffHrs,
        overtime: overtime,
        status: diffHrs >= halfDayHrs ? 'Present' : 'Half Day',
        workMode: location,
        notes: notes
      });
      addToast('success', `Punched out successfully at ${formattedTimeStr}. Total working hours: ${formattedDuration}`);
    } else {
      addToast('info', `Logged ${action === 'break_start' ? 'Break Start' : 'Break End'} at ${formattedTimeStr}`);
    }

    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Mark Daily Attendance">
      <form onSubmit={handleSubmit} className="attendance-form-container">
        {/* Clock display */}
        <div className="attendance-clock-card">
          <span className="attendance-clock-title">Current Time</span>
          <h2 className="attendance-clock-time">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </h2>
          <span className="attendance-clock-date">
            Date: {currentTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>

        {/* Radio Actions */}
        <div className="flex-column gap-2">
          <label className="attendance-field-label">Select Action</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <label className={`attendance-action-card ${action === 'in' ? 'active' : ''}`}>
              <input
                type="radio"
                name="punchAction"
                value="in"
                checked={action === 'in'}
                onChange={() => setAction('in')}
                className="attendance-radio-input"
              />
              <span className="attendance-action-label">Punch In</span>
            </label>
            <label className={`attendance-action-card ${action === 'out' ? 'active' : ''}`}>
              <input
                type="radio"
                name="punchAction"
                value="out"
                checked={action === 'out'}
                onChange={() => setAction('out')}
                className="attendance-radio-input"
              />
              <span className="attendance-action-label">Punch Out</span>
            </label>
            <label className={`attendance-action-card ${action === 'break_start' ? 'active' : ''}`}>
              <input
                type="radio"
                name="punchAction"
                value="break_start"
                checked={action === 'break_start'}
                onChange={() => setAction('break_start')}
                className="attendance-radio-input"
              />
              <span className="attendance-action-label">Break Start</span>
            </label>
            <label className={`attendance-action-card ${action === 'break_end' ? 'active' : ''}`}>
              <input
                type="radio"
                name="punchAction"
                value="break_end"
                checked={action === 'break_end'}
                onChange={() => setAction('break_end')}
                className="attendance-radio-input"
              />
              <span className="attendance-action-label">Break End</span>
            </label>
          </div>
        </div>

        {/* Location selection */}
        <div className="flex-column gap-1">
          <label className="attendance-field-label">Work Location</label>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="attendance-input"
            style={{ cursor: 'pointer' }}
          >
            <option value="WFO">WFO</option>
            <option value="WFH">WFH</option>
            <option value="Hybrid">Hybrid</option>
          </select>
        </div>

        {/* Notes */}
        <div className="flex-column gap-1">
          <label className="attendance-field-label">Notes (Optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Log work details or reasons for delay..."
            className="attendance-textarea"
            rows={3}
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex-row justify-end gap-3 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="attendance-btn-cancel"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="attendance-btn-submit"
          >
            Submit
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default MarkAttendanceModal;
