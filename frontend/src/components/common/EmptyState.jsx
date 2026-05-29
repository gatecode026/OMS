import React from 'react';
import './EmptyState.css';
import Button from './Button';

const EmptyState = ({
  title = 'No records found',
  description = 'There is no data to show in this view right now.',
  actionText,
  onActionClick,
  actionIcon,
  className = ''
}) => {
  return (
    <div className={`empty-state ${className}`}>
      <div className="empty-state-icon">
        <svg
          width="120"
          height="120"
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle background circle */}
          <circle cx="60" cy="60" r="48" fill="var(--color-slate-100)" />
          {/* Geometric card-like shapes representing empty tables/content */}
          <rect
            x="36"
            y="42"
            width="48"
            height="36"
            rx="4"
            fill="var(--bg-card)"
            stroke="var(--color-slate-300)"
            strokeWidth="2"
          />
          {/* Shimmer placeholders in illustration */}
          <line
            x1="44"
            y1="50"
            x2="64"
            y2="50"
            stroke="var(--color-slate-200)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="44"
            y1="58"
            x2="76"
            y2="58"
            stroke="var(--color-slate-200)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="44"
            y1="66"
            x2="56"
            y2="66"
            stroke="var(--color-slate-200)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Corner badge for search/status */}
          <circle
            cx="80"
            cy="76"
            r="12"
            fill="var(--color-primary-light)"
            stroke="var(--color-primary)"
            strokeWidth="2"
          />
          <path
            d="M77 76H83M80 73V79"
            stroke="var(--color-primary)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description">{description}</p>

      {actionText && onActionClick && (
        <div className="empty-state-actions">
          <Button variant="primary" onClick={onActionClick} icon={actionIcon}>
            {actionText}
          </Button>
        </div>
      )}
    </div>
  );
};

export default EmptyState;
