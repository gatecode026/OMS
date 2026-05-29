import React from 'react';
import './Placeholder.css';
import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import { LayoutDashboard, ArrowLeft } from 'lucide-react';

const Placeholder = ({ title = 'Module View' }) => {
  const navigate = useNavigate();

  return (
    <div className="placeholder-page flex-center">
      <div className="placeholder-card card animate-slide-up">
        {/* Simple geometric SVG illustration */}
        <div className="placeholder-illustration">
          <svg
            width="160"
            height="160"
            viewBox="0 0 160 160"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="80" cy="80" r="64" fill="rgba(255, 255, 255, 0.02)" stroke="var(--border-color)" strokeWidth="2" strokeDasharray="4 4" />
            <circle cx="80" cy="80" r="48" fill="rgba(217, 70, 239, 0.05)" />
            {/* Geometric layout */}
            <rect x="52" y="60" width="56" height="40" rx="6" fill="var(--bg-card)" stroke="var(--border-color-dark)" strokeWidth="2" />
            <rect x="62" y="72" width="36" height="8" rx="2" fill="var(--color-primary-light)" />
            <circle cx="80" cy="90" r="4" fill="var(--color-primary)" />
            {/* Gear wheels representing building module */}
            <circle cx="116" cy="52" r="12" fill="rgba(16, 185, 129, 0.1)" stroke="var(--color-success)" strokeWidth="2" />
            <circle cx="44" cy="108" r="16" fill="rgba(245, 158, 11, 0.1)" stroke="var(--color-warning)" strokeWidth="2" strokeDasharray="3 3" />
          </svg>
        </div>

        <h2 className="placeholder-title">{title} Coming Soon</h2>
        <p className="placeholder-desc">
          We are currently implementing this enterprise module. Keep an eye out for upcoming system updates!
        </p>

        <div className="placeholder-actions">
          <Button variant="secondary" onClick={() => navigate(-1)} icon={ArrowLeft}>
            Go Back
          </Button>
          <Button variant="primary" onClick={() => navigate('/')} icon={LayoutDashboard}>
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Placeholder;
