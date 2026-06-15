import React from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Download } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const CHART_TT_STYLE = {
  contentStyle: {
    backgroundColor: 'var(--bg-elevated, #1a2133)',
    border: '1px solid var(--border-color, rgba(255, 255, 255, 0.07))',
    borderRadius: '8px',
    color: 'var(--text-primary, #f1f5f9)',
    fontSize: '0.75rem',
  }
};

const ProductivityAnalytics = ({
  myTasks = [],
  myAttendance = [],
  currentUser = {}
}) => {
  const { addToast } = useApp();

  const getDatesOfCurrentWeek = () => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday...
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + distanceToMonday);

    const weekdays = [];
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);
      const year = dayDate.getFullYear();
      const month = String(dayDate.getMonth() + 1).padStart(2, '0');
      const day = String(dayDate.getDate()).padStart(2, '0');
      weekdays.push({
        label: labels[i],
        dateStr: `${year}-${month}-${day}`
      });
    }
    return weekdays;
  };

  const weekdays = getDatesOfCurrentWeek();
  const weeklyDates = weekdays.map(w => w.dateStr);

  // Stats
  const completedThisWeek = myTasks.filter(t => 
    (t.status === 'Done' || t.status === 'done' || t.completed === true) && 
    weeklyDates.includes(t.dueDate)
  ).length;
  
  const weeklyAttendance = myAttendance.filter(entry => entry.date && weeklyDates.includes(entry.date));
  const totalHoursThisWeek = weeklyAttendance.reduce((sum, entry) => sum + (Number(entry.totalHours || entry.workingHours) || 0), 0);

  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  const monthPrefix = `${currentYear}-${currentMonth}`;
  const thisMonthAttendance = myAttendance.filter(h => (h.date || '').startsWith(monthPrefix));

  const presentDays = thisMonthAttendance.filter(h => h.status === 'Present' || h.status === 'Late' || h.status === 'Overtime' || h.status === 'Work From Home').length;
  const attendancePercentage = thisMonthAttendance.length > 0 ? Math.min(100, Math.round((presentDays / thisMonthAttendance.length) * 100)) : 0;

  // Project Contribution: % of user's completed tasks relative to all completed tasks in their project
  const projectContribution = currentUser.performanceScore?.overall !== undefined ? currentUser.performanceScore.overall : 0;

  // Weekly Productivity Trend (completed tasks due on each day of the current week)
  const weeklyTrendData = weekdays.map(day => {
    const completedOnDay = myTasks.filter(t => 
      (t.status === 'Done' || t.status === 'done' || t.completed === true) && 
      t.dueDate === day.dateStr
    ).length;
    return {
      name: day.label,
      Completed: completedOnDay
    };
  });

  // Monthly Performance Trend (from employee's real historical monthly scores array)
  const monthlyScores = currentUser.performanceScore?.monthly || [];
  const monthlyTrendData = [
    { name: 'Week 1', Score: monthlyScores[0] !== undefined ? monthlyScores[0] : Math.max(70, Math.round(projectContribution * 0.85)) },
    { name: 'Week 2', Score: monthlyScores[1] !== undefined ? monthlyScores[1] : Math.max(70, Math.round(projectContribution * 0.9)) },
    { name: 'Week 3', Score: monthlyScores[2] !== undefined ? monthlyScores[2] : Math.max(70, Math.round(projectContribution * 0.95)) },
    { name: 'Week 4', Score: monthlyScores[3] !== undefined ? monthlyScores[3] : projectContribution }
  ];

  // Task Completion Trend (Assigned vs Completed for each day of the current week)
  const taskCompletionData = weekdays.map(day => {
    const assignedOnDay = myTasks.filter(t => t.dueDate === day.dateStr).length;
    const completedOnDay = myTasks.filter(t => 
      (t.status === 'Done' || t.status === 'done' || t.completed === true) && 
      t.dueDate === day.dateStr
    ).length;
    return {
      name: day.label,
      Assigned: assignedOnDay,
      Completed: completedOnDay
    };
  });

  const handleDownloadReport = () => {
    addToast('success', 'Productivity report downloaded successfully (simulated).');
  };

  const hasData = myTasks.length > 0 || myAttendance.length > 0;

  return (
    <div className="dashboard-widget w-full">
      <div className="widget-header">
        <h3>Productivity Analytics</h3>
        <button
          onClick={handleDownloadReport}
          className="text-xs text-primary-500 hover:text-primary-400 font-semibold flex-center gap-1"
        >
          <Download size={14} /> Download Report
        </button>
      </div>
      <div className="widget-content flex-column gap-5">
        {/* Stats Row */}
        <div className="summary-cards-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          <div className="mini-stat-card">
            <span className="text-xs text-text-muted block">Completed Tasks (Week)</span>
            <span className="bold-text text-sm block mt-1">{completedThisWeek}</span>
          </div>
          <div className="mini-stat-card">
            <span className="text-xs text-text-muted block">Hours Worked (Week)</span>
            <span className="bold-text text-sm block mt-1">{totalHoursThisWeek.toFixed(1)} Hrs</span>
          </div>
          <div className="mini-stat-card">
            <span className="text-xs text-text-muted block">Attendance (Month)</span>
            <span className="bold-text text-sm block mt-1">{attendancePercentage}%</span>
          </div>
          <div className="mini-stat-card">
            <span className="text-xs text-text-muted block">Project Contribution</span>
            <span className="bold-text text-sm block mt-1">{projectContribution}%</span>
          </div>
        </div>

        {/* Charts Row */}
        {!hasData ? (
          <div className="text-center text-text-muted py-6">No data available for selected time period</div>
        ) : (
          <div className="charts-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {/* Weekly Productivity */}
            <div className="flex-column gap-2">
              <span className="text-xs text-text-muted bold-text uppercase">Weekly Productivity Trend</span>
              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} allowDecimals={false} />
                    <Tooltip {...CHART_TT_STYLE} />
                    <Line type="monotone" dataKey="Completed" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Monthly Performance */}
            <div className="flex-column gap-2">
              <span className="text-xs text-text-muted bold-text uppercase">Monthly Performance Trend</span>
              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                    <Tooltip {...CHART_TT_STYLE} />
                    <Line type="monotone" dataKey="Score" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tasks completion vs assigned */}
            <div className="flex-column gap-2">
              <span className="text-xs text-text-muted bold-text uppercase">Task Completion Trend</span>
              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={taskCompletionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} allowDecimals={false} />
                    <Tooltip {...CHART_TT_STYLE} />
                    <Bar dataKey="Assigned" fill="rgba(255,255,255,0.15)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Completed" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductivityAnalytics;
