import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Video, ArrowRight, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const UpcomingSchedule = ({
  myTasks = []
}) => {
  const navigate = useNavigate();
  const { addToast, token } = useApp();
  const [todayEvents, setTodayEvents] = React.useState([]);

  const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalDateString();

  React.useEffect(() => {
    if (!token) return;
    const fetchTodayEvents = async () => {
      try {
        const response = await fetch(`${window.API_URL || "http://localhost:5000"}/api/events?from=${todayStr}&to=${todayStr}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (Array.isArray(data)) {
          // Filter out declined events
          const visible = data.filter(e => e.status !== 'declined');
          setTodayEvents(visible);
        }
      } catch (err) {
        console.error('Failed to fetch today\'s events:', err);
      }
    };
    fetchTodayEvents();
  }, [token, todayStr]);

  const formatTime12h = (time24) => {
    if (!time24) return '12:00 PM';
    const [hoursStr, minutesStr] = time24.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    const minutesFormatted = String(minutes).padStart(2, '0');
    return `${hours12}:${minutesFormatted} ${ampm}`;
  };

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

  // Map today's events/meetings
  const mappedEvents = todayEvents.map(evt => ({
    time: formatTime12h(evt.startTime),
    event: evt.status === 'pending' ? `${evt.title} (Pending)` : evt.title,
    type: evt.type === 'meeting' ? 'Meeting' : 'Event',
    link: evt.videoLink || null,
    id: evt.id || evt._id,
    color: evt.color,
    status: evt.status
  }));

  const scheduleItems = [...mappedEvents, ...taskDeadlines].sort((a, b) => {
    return a.time.localeCompare(b.time);
  });

  const getIconBg = (item) => {
    if (item.type === 'Deadline') return 'rgba(239, 68, 68, 0.12)';
    if (item.color) {
      if (item.color.startsWith('#')) return `${item.color}1e`; // Hex color with ~12% opacity (1e)
      return `var(--color-${item.color}-light, rgba(16, 185, 129, 0.12))`;
    }
    return 'rgba(16, 185, 129, 0.12)';
  };

  const getIconColor = (item) => {
    if (item.type === 'Deadline') return 'text-danger';
    if (item.color && item.color.startsWith('#')) return '';
    return 'text-success';
  };

  const getIconStyle = (item) => {
    if (item.type !== 'Deadline' && item.color && item.color.startsWith('#')) {
      return { color: item.color };
    }
    return {};
  };

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
                  style={{ backgroundColor: getIconBg(item) }}
                >
                  {item.type === 'Deadline' ? (
                    <Clock size={14} className="text-danger" />
                  ) : (
                    <Video size={14} className={getIconColor(item)} style={getIconStyle(item)} />
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
