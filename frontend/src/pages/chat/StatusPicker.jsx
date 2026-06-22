import React, { useState } from 'react';
import { BsCircleFill } from 'react-icons/bs';
import { MdDoNotDisturb } from 'react-icons/md';
import NotificationSettings from '../../components/chat/NotificationSettings';

const StatusPicker = ({ currentStatus, onStatusChange, onClose }) => {
  const [duration, setDuration] = useState('always');

  const options = [
    { value: 'available', label: 'Available', color: '#22c55e', icon: <BsCircleFill color="#22c55e" size={12} /> },
    { value: 'away', label: 'Away', color: '#eab308', icon: <BsCircleFill color="#eab308" size={12} /> },
    { value: 'dnd', label: 'Do Not Disturb', color: '#ef4444', subtitle: 'Notifications silenced', icon: <MdDoNotDisturb color="#ef4444" size={14} /> },
    { value: 'offline', label: 'Offline', color: '#94a3b8', icon: <BsCircleFill color="#94a3b8" size={12} /> }
  ];

  const handleSelect = (status) => {
    let expiresMinutes = null;
    if (duration === '30') expiresMinutes = 30;
    else if (duration === '60') expiresMinutes = 60;
    else if (duration === '240') expiresMinutes = 240;

    onStatusChange(status, null, expiresMinutes);
    if (onClose) onClose();
  };

  return (
    <div className="status-picker-dropdown" style={{
      position: 'absolute',
      top: '40px',
      left: '0',
      zIndex: 1000,
      backgroundColor: 'var(--bg-card, #ffffff)',
      border: '1px solid var(--chat-border, #e2e8f0)',
      borderRadius: '8px',
      padding: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      width: '240px'
    }}>
      <NotificationSettings />
      <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--text-primary)' }}>Set Status</h4>
      
      {/* Duration selector */}
      <div style={{ marginBottom: '10px' }}>
        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Duration:</label>
        <select 
          value={duration} 
          onChange={e => setDuration(e.target.value)}
          style={{
            width: '100%',
            padding: '4px',
            borderRadius: '4px',
            fontSize: '0.8rem',
            marginTop: '4px',
            backgroundColor: 'var(--bg-app, #f7fafc)',
            color: 'var(--text-primary)',
            border: '1px solid var(--chat-border, #cbd5e0)'
          }}
        >
          <option value="always">Until I change it</option>
          <option value="30">30 minutes</option>
          <option value="60">1 hour</option>
          <option value="240">4 hours</option>
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => handleSelect(opt.value)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px',
              borderRadius: '6px',
              border: 'none',
              background: currentStatus?.status === opt.value ? 'var(--bg-elevated, #edf2f7)' : 'transparent',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
              color: 'var(--text-primary)'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover, #f7fafc)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = currentStatus?.status === opt.value ? 'var(--bg-elevated, #edf2f7)' : 'transparent'}
          >
            {opt.icon}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>{opt.label}</span>
              {opt.subtitle && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted, #718096)' }}>{opt.subtitle}</span>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default StatusPicker;
