import React, { useMemo } from 'react';

const DashboardHeader = ({ currentUser }) => {
  if (!currentUser) return null;

  // Calculate day and time greetings
  const timeOfDayGreeting = useMemo(() => {
    const hours = new Date().getHours();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[new Date().getDay()];

    let timeOfDay = 'Day';
    if (hours < 12) timeOfDay = 'Morning';
    else if (hours < 17) timeOfDay = 'Afternoon';
    else timeOfDay = 'Evening';

    return `Good ${timeOfDay} • Happy ${dayName}`;
  }, []);

  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }, []);

  return (
    <div className="flex-column gap-4 w-full mb-3">
      {/* 1. Page Greeting (Modern Multi-line Typography Dashboard Header) */}
      <div className="flex-row justify-between align-start flex-wrap gap-4 mt-2 mb-1">
        <div className="flex-column gap-1">
          {/* Top category/greeting tag */}
          <span style={{ 
            fontSize: '0.8rem', 
            fontWeight: '700', 
            textTransform: 'uppercase', 
            letterSpacing: '1.2px', 
            color: 'var(--color-primary, #d946ef)' 
          }}>
            {timeOfDayGreeting}
          </span>
          
          {/* Employee Name (Big H1 Header) */}
          <h1 className="bold-text" style={{ 
            fontSize: '2.5rem', 
            fontWeight: '850',
            letterSpacing: '-1.2px',
            lineHeight: '1.1',
            background: 'linear-gradient(135deg, var(--text-primary) 30%, var(--color-primary, #d946ef) 100%)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent', 
            margin: '4px 0' 
          }}>
            {currentUser.name}
          </h1>

          {/* Subtitle containing Employee Metadata */}
          <div className="flex-row align-center gap-2 flex-wrap text-muted" style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            <span>{currentUser.designation || 'Team Member'}</span>
            <span style={{ color: 'var(--border-color, rgba(255,255,255,0.15))' }}>•</span>
            <span>{currentUser.department || 'Operations'} Department</span>
          </div>
        </div>
        
        {/* Date Display Pill */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.06))',
          padding: '8px 16px',
          borderRadius: '30px',
          fontSize: '0.82rem',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          alignSelf: 'flex-start',
          marginTop: '6px'
        }} className="date-pill">
          <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-primary, #d946ef)' }}></span>
          <span>{formattedDate}</span>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
