import React from 'react';
import './StatCard.css';
import { ArrowUpRight, ArrowDownRight, Check, Users, FileText } from 'lucide-react';

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
  subMetrics = [],
  variant = 'default',
  chartType = 'sparkline',
  sparklinePoints = false
}) => {
  const displayLabel = label || title || '';
  const displayTrendVal = trendVal || trend;
  const displayTrendLabel = trendLabel || description;

  const isUp = trendType === 'up' || trendType === 'success';
  const isOptimal = displayTrendVal === 'OPTIMAL' || displayTrendVal === 'Optimal';
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

  const renderSubMetrics = () => {
    if (variant === 'employees') {
      return (
        <div className="stat-sub-metrics sub-metrics-employees">
          {subMetrics.map((sm, i) => {
            const IconComponent = sm.icon || Users;
            const blockType = sm.label.toLowerCase() === 'active' ? 'active' : 'new';
            return (
              <div key={i} className={`sub-metric-block block-${blockType}`}>
                <div className="sub-metric-block-icon">
                  <IconComponent size={18} />
                </div>
                <div className="sub-metric-block-text">
                  <span className="sub-metric-block-val">{sm.value}</span>
                  <span className="sub-metric-block-lbl">{sm.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (variant === 'attendance' || variant === 'projects') {
      return (
        <div className="stat-sub-metrics sub-metrics-pills">
          {subMetrics.map((sm, i) => {
            const IconComponent = sm.icon || Check;
            const pillType = sm.label.toLowerCase();
            return (
              <div key={i} className={`sub-metric-pill pill-${pillType}`}>
                <div className="sub-metric-pill-top">
                  <IconComponent size={12} className="sub-pill-icon" />
                  <span className="sub-metric-pill-val">{sm.value}</span>
                </div>
                <span className="sub-metric-pill-lbl">{sm.label}</span>
              </div>
            );
          })}
        </div>
      );
    }

    if (variant === 'reports' || variant === 'tasks' || variant === 'branches') {
      return (
        <div className="stat-sub-metrics sub-metrics-three-blocks">
          {subMetrics.map((sm, i) => {
            const IconComponent = sm.icon || FileText;
            const labelLower = sm.label.toLowerCase();
            let blockType = labelLower.replace(/ /g, '-');
            if (labelLower === 'completed') blockType = 'completed-task';
            if (labelLower === 'active') blockType = 'active-branch';
            return (
              <div key={i} className={`sub-metric-three-block block-${blockType}`}>
                <div className="sub-metric-three-block-top">
                  <IconComponent size={14} className="sub-three-block-icon" />
                  <span className="sub-metric-three-block-val">{sm.value}</span>
                </div>
                <span className="sub-metric-three-block-lbl">{sm.label}</span>
              </div>
            );
          })}
        </div>
      );
    }

    // Default fallback
    return (
      <div className="stat-sub-metrics">
        {subMetrics.map((sm, i) => (
          <div key={i} className="sub-metric-item">
            <span className={`sub-metric-val ${getSubMetricClass(sm.label)}`}>{sm.value}</span>
            <span className="sub-metric-lbl">{sm.label}</span>
          </div>
        ))}
      </div>
    );
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

      {chartType === 'gauge' ? (
        <div className="stat-body gauge-layout">
          <div className="gauge-left">
            <h2 className="stat-value">{value}</h2>
            <span className="trend-desc">{displayTrendLabel}</span>
          </div>
          <div className="gauge-right">
            {displayTrendVal && (
              <div className={`stat-trend-chip trend-${trendType}`} style={{ alignSelf: 'flex-end', marginBottom: '8px' }}>
                {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                <span className="trend-text">{displayTrendVal}</span>
              </div>
            )}
            <div className="gauge-container">
              <svg width="100" height="52" viewBox="0 0 100 52" className="gauge-svg">
                <path
                  d="M 15 48 A 32 32 0 0 1 85 48"
                  fill="none"
                  stroke="rgba(203, 213, 225, 0.3)"
                  strokeWidth="7"
                  strokeLinecap="round"
                />
                <path
                  d="M 15 48 A 32 32 0 0 1 85 48"
                  fill="none"
                  stroke="var(--accent-color)"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray="100.53"
                  strokeDashoffset={100.53 * (1 - 0.91)}
                />
                <text x="50" y="37" textAnchor="middle" className="gauge-val-text" style={{ fill: 'var(--text-primary)', fontSize: '13px', fontWeight: '800' }}>
                  91%
                </text>
                <text x="50" y="45" textAnchor="middle" className="gauge-lbl-text" style={{ fill: 'var(--text-muted)', fontSize: '6.5px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Avg Perf
                </text>
              </svg>
            </div>
          </div>
        </div>
      ) : (
        <div className="stat-body">
          <div className="stat-value-group">
            <h2 className="stat-value">{value}</h2>
            
            {displayTrendVal && (
              <div className={`stat-trend-chip trend-${trendType} ${isOptimal ? 'trend-optimal' : ''}`}>
                {isOptimal ? <Check size={12} className="trend-opt-icon" /> : isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
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
                  {sparklinePoints && sparklineData.map((val, i) => {
                    const max = Math.max(...sparklineData);
                    const min = Math.min(...sparklineData);
                    const range = max - min === 0 ? 1 : max - min;
                    const pad = 3;
                    const h = height - pad * 2;
                    const x = (i / (sparklineData.length - 1)) * width;
                    const y = height - pad - ((val - min) / range) * h;
                    return (
                      <circle
                        key={i}
                        cx={x}
                        cy={y}
                        r="2.5"
                        fill={`var(--sparkline-color-${colorVariant})`}
                        stroke="var(--bg-card)"
                        strokeWidth="1.2"
                      />
                    );
                  })}
                </svg>
              </div>
            )}
          </div>
        </div>
      )}

      {subMetrics && subMetrics.length > 0 && renderSubMetrics()}
    </div>
  );
};

export default StatCard;
