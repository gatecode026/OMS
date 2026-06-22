import React from 'react';

const StatusDot = ({ status = 'offline', size = 10 }) => {
  const getDotStyle = () => {
    switch (status) {
      case 'available': return { bg: '#22c55e' };
      case 'away': return { bg: '#eab308' };
      case 'dnd': return { bg: '#ef4444' };
      case 'offline':
      default: return { bg: '#94a3b8' };
    }
  };

  const style = getDotStyle();

  return (
    <div
      className={`status-dot status-dot-${status}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        backgroundColor: style.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        flexShrink: 0
      }}
    >
      {status === 'dnd' && (
        <div
          style={{
            width: `${size - 4}px`,
            height: '2px',
            backgroundColor: '#ffffff',
            borderRadius: '1px'
          }}
        />
      )}
    </div>
  );
};

export default StatusDot;
