import React from 'react';
import './StatCard.css';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

const generateSparklinePath = (data, width, height) => {
  if (!data || data.length < 2) return '';
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min === 0 ? 1 : max - min;
  
  // Padding top/bottom inside SVG to keep line within boundary
  const pad = 3;
  const h = height - pad * 2;

  return data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - pad - ((val - min) / range) * h;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
};

const StatCard = ({
  label,
  title,
  value,
  trendVal,
  trend,
  trendType = 'up', // 'up', 'down', 'warning', 'danger'
  trendLabel = '',
  description,
  icon: Icon,
  colorVariant = 'primary', // 'primary', 'success', 'warning', 'danger', 'purple'
  sparklineData = [10, 12, 8, 15, 11, 14, 18],
  onClick,
  subMetrics = []
}) => {
  const displayLabel = label || title || '';
  const displayTrendVal = trendVal || trend;
  const displayTrendLabel = trendLabel || description;

  const isUp = trendType === 'up' || trendType === 'success';
  const width = 110;
  const height = 34;
  const linePath = generateSparklinePath(sparklineData, width, height);

  // Gradient area path
  const areaPath = linePath 
    ? `${linePath} L ${width} ${height} L 0 ${height} Z` 
    : '';

  // Class mapping for colors
  const colorMap = {
    primary: 'card-var-primary',
    success: 'card-var-success',
    warning: 'card-var-warning',
    danger: 'card-var-danger',
    purple: 'card-var-purple',
    info: 'card-var-primary'
  };

  // Helper to color sub-metrics semantically
  const getSubMetricClass = (lbl) => {
    if (!lbl) return '';
    const l = lbl.toLowerCase();
    if (l.includes('active') || l.includes('present') || l.includes('completed') || l.includes('success') || l.includes('optimal') || l.includes('running')) {
      return 'sub-success';
    }
    if (l.includes('absent') || l.includes('danger') || l.includes('overdue') || l.includes('delayed') || l.includes('deadlines') || l.includes('leave')) {
      return 'sub-danger';
    }
    if (l.includes('late') || l.includes('pending') || l.includes('warning') || l.includes('reviewed')) {
      return 'sub-warning';
    }
    if (l.includes('new') || l.includes('submitted')) {
      return 'sub-primary';
    }
    return '';
  };

  const safeId = displayLabel.replace(/[^a-zA-Z0-9]/g, '') || Math.random().toString(36).substring(2, 9);

  return (
    <div className={`stat-card card ${colorMap[colorVariant] || 'card-var-primary'} ${onClick ? 'stat-card-clickable' : ''}`} onClick={onClick}>
      <div className="stat-header">
        <span className="stat-label">{displayLabel}</span>
        <div className={`stat-icon-wrapper ${colorMap[colorVariant] || 'card-var-primary'}`}>
          {Icon && <Icon size={20} />}
        </div>
      </div>

      <div className="stat-body">
        <div className="stat-value-group">
          <h2 className="stat-value">{value}</h2>
          
          {displayTrendVal && (
            <div className={`stat-trend-chip trend-${trendType}`}>
              {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              <span className="trend-text">{displayTrendVal}</span>
            </div>
          )}
        </div>

        <div className="stat-footer">
          <span className="trend-desc">{displayTrendLabel}</span>
          
          {linePath && (
            <div className="stat-sparkline">
              <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
                <defs>
                  <linearGradient id={`grad-${safeId}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={`var(--sparkline-color-${colorVariant})`} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={`var(--sparkline-color-${colorVariant})`} stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d={areaPath}
                  fill={`url(#grad-${safeId})`}
                />
                <path
                  d={linePath}
                  fill="none"
                  stroke={`var(--sparkline-color-${colorVariant})`}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}
        </div>
      </div>

      {subMetrics && subMetrics.length > 0 && (
        <div className="stat-sub-metrics">
          {subMetrics.map((sm, i) => (
            <div key={i} className="sub-metric-item">
              <span className={`sub-metric-val ${getSubMetricClass(sm.label)}`}>{sm.value}</span>
              <span className="sub-metric-lbl">{sm.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StatCard;
