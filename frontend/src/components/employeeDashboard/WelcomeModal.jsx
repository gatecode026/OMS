import React, { useEffect, useState } from 'react';
import './WelcomeModal.css';
import Avatar from '../common/Avatar';
import Badge from '../common/Badge';
import { useApp } from '../../context/AppContext';
import { Sparkles, Star, X } from 'lucide-react';

const WelcomeModal = ({ currentUser, onClose }) => {
  const [shouldRender, setShouldRender] = useState(true);
  const { theme } = useApp();

  useEffect(() => {
    // Dismiss after 3 seconds
    const timer = setTimeout(() => {
      setShouldRender(false);
      setTimeout(onClose, 400); // Allow exit animation to complete
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  if (!currentUser || !shouldRender) {
    return null;
  }

  const roleName = currentUser.designation || currentUser.role || 'Employee';

  const getDynamicGreeting = () => {
    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday'
    ];
    const dayName = days[new Date().getDay()];
    
    const hour = new Date().getHours();
    let timePrefix = 'Good Morning';
    if (hour >= 12 && hour < 17) {
      timePrefix = 'Good Afternoon';
    } else if (hour >= 17) {
      timePrefix = 'Good Evening';
    }

    const messages = {
      Monday: "Let's kick off this fresh week with determination and high energy!",
      Tuesday: "Keep up the great momentum! Focus on your goals today.",
      Wednesday: "Happy Mid-Week! Halfway there, stay strong and productive.",
      Thursday: "Friday is just around the corner! Let's make today count.",
      Friday: "Happy Friday! Let's finish all our tasks strong and enjoy the weekend.",
      Saturday: "Have a wonderful and relaxing Saturday! Enjoy your day off.",
      Sunday: "Rest, recharge, and prepare for a successful upcoming week."
    };

    return {
      title: `${timePrefix}, Happy ${dayName}!`,
      message: messages[dayName] || "Have an awesome day at work today!"
    };
  };

  const greeting = getDynamicGreeting();
  const isLight = theme === 'light';

  const handleManualClose = () => {
    setShouldRender(false);
    setTimeout(onClose, 400);
  };

  return (
    <div className={`welcome-modal-overlay ${isLight ? 'light-theme' : ''}`}>
      <div className={`welcome-modal-card ${isLight ? 'light-theme' : ''} animate-welcome-in`}>
        {/* Close Button */}
        <button className="welcome-close-btn" onClick={handleManualClose} aria-label="Close welcome message">
          <X size={16} />
        </button>

        {/* Background glow effects */}
        <div className="welcome-glow-1"></div>
        <div className="welcome-glow-2"></div>
        
        {/* Sparkle Icons */}
        <Sparkles className="sparkle-icon top-left" size={24} />
        <Star className="sparkle-icon bottom-right" size={20} />

        <div className="welcome-content">
          <div className="welcome-avatar-wrapper">
            <Avatar name={currentUser.name} size="lg" src={currentUser.avatar || currentUser.photoUrl} />
            <div className="avatar-pulse-ring"></div>
          </div>

          <h2 className="welcome-title">Welcome Back!</h2>
          <h1 className="welcome-employee-name">{currentUser.name}</h1>
          
          <div className="welcome-role-badge">
            <Badge variant="primary">{roleName}</Badge>
          </div>

          <div className="welcome-divider"></div>

          <div className="welcome-message-block">
            <h3 className="welcome-greeting-title">{greeting.title}</h3>
            <p className="welcome-greeting-desc">{greeting.message}</p>
          </div>
        </div>

        {/* 3-second shrinking progress bar */}
        <div className="welcome-progress-bar">
          <div className="welcome-progress-fill"></div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;
