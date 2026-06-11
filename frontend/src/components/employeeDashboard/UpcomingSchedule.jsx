import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Video, ArrowRight, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const UpcomingSchedule = ({
  myTasks = []
}) => {
  const navigate = useNavigate();
  const { addToast } = useApp();

  const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalDateString();

  // Seed default meetings
  const defaultSchedule = [
    { time: '10:00 AM', event: 'Daily Standup Meeting', type: 'Meeting', link: 'https://meet.google.com/abc-defg-hij' },
    { time: '12:00 PM', event: 'Project UI Review', type: 'Meeting', link: 'https://meet.google.com/abc-defg-hij' },
    { time: '04:30 PM', event: 'Sprint Planning Session', type: 'Meeting', link: 'https://meet.google.com/abc-defg-hij' }
  ];

  // Map tasks due today
  const taskDeadlines = myTasks
    .filter(t => t.dueDate === todayStr && t.status !== 'Done')
    .map(t => ({
      time: '06:00 PM',
      event: `Task Deadline: ${t.title}`,
      type: 'Deadline',
      link: null,
      taskId: t.id
    }));

  const scheduleItems = [...defaultSchedule, ...taskDeadlines].sort((a, b) => {
    return a.time.localeCompare(b.time);
  });

  const handleJoinMeeting = (link) => {
    if (link) {
      window.open(link, '_blank');
      addToast('success', 'Opening video conference link...');
    }
  };

  return (
    <div className="dashboard-widget flex-1">
      <div className="widget-header">
        <h3>Today's Schedule</h3>
        <button
          onClick={() => navigate('/leaves')}
          className="text-xs text-primary-500 hover:text-primary-400 font-semibold"
        >
          View Calendar
        </button>
      </div>
      <div className="widget-content flex-column gap-3">
        <div className="flex-column">
          {scheduleItems.map((item, idx) => (
            <div
              key={idx}
              className="flex-row align-center justify-between py-3 border-b border-border hover:bg-surface px-2 rounded"
              style={{ borderBottom: '1px solid var(--border-color)' }}
            >
              <div className="flex-row align-center gap-3">
                <div 
                  className="activity-icon-container" 
                  style={{ backgroundColor: item.type === 'Deadline' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)' }}
                >
                  {item.type === 'Deadline' ? (
                    <Clock size={14} className="text-danger" />
                  ) : (
                    <Video size={14} className="text-success" />
                  )}
                </div>
                <div className="flex-column">
                  <span className="bold-text text-sm" style={{ color: 'var(--text-primary)' }}>{item.event}</span>
                  <span className="text-xs text-text-muted mt-1">{item.time} • {item.type}</span>
                </div>
              </div>
              <div>
                {item.link ? (
                  <button
                    onClick={() => handleJoinMeeting(item.link)}
                    className="padding-1 text-xs bold-text bg-primary-500 hover:bg-primary-hover text-white rounded px-3 transition-all"
                    style={{ background: 'var(--color-primary)', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
                  >
                    Join
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/tasks')}
                    className="text-xs text-primary-500 hover:text-primary-400 font-semibold flex-center gap-1"
                    style={{ cursor: 'pointer' }}
                  >
                    View <ArrowRight size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}

          {scheduleItems.length === 0 && (
            <div className="text-center text-text-muted py-6">No upcoming events today</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpcomingSchedule;
