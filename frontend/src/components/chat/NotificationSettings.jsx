/**
 * @file src/components/chat/NotificationSettings.jsx
 * @description Panel of toggles managing desktop alerts, message sounds, and 
 *   preview settings stored under localStorage.
 */

import React, { useState, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { useApp } from '../../context/AppContext';

const NotificationSettings = () => {
  const { permission, requestPermission } = useChat();
  const { addToast } = useApp();

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('oms_notification_settings');
    return saved ? JSON.parse(saved) : { desktop: true, sound: true, preview: true };
  });

  const [showDeniedWarning, setShowDeniedWarning] = useState(false);

  // Sync settings back to localStorage on change
  useEffect(() => {
    localStorage.setItem('oms_notification_settings', JSON.stringify(settings));
  }, [settings]);

  // Handle Desktop toggle click
  const handleDesktopToggle = async () => {
    if (permission === 'unsupported') {
      addToast('info', 'Notifications are not supported by this browser');
      return;
    }

    if (settings.desktop) {
      // Turn OFF
      setSettings(prev => ({ ...prev, desktop: false }));
      setShowDeniedWarning(false);
    } else {
      // Turn ON
      if (permission === 'denied') {
        setShowDeniedWarning(true);
        addToast('error', 'Notification permission has been denied. Enable in browser settings.');
        return;
      }

      if (permission === 'default') {
        if (requestPermission) {
          const result = await requestPermission();
          if (result === 'granted') {
            setSettings(prev => ({ ...prev, desktop: true }));
            addToast('success', 'Desktop notifications enabled ✓');
          } else {
            addToast('info', 'Notifications permission was not granted');
          }
        }
      } else if (permission === 'granted') {
        setSettings(prev => ({ ...prev, desktop: true }));
      }
    }
  };

  const handleToggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isDenied = permission === 'denied';
  const isUnsupported = permission === 'unsupported';

  return (
    <div className="notif-settings-container">
      <h5 className="notif-settings-title">Notifications</h5>
      
      {/* Desktop Notifications Toggle */}
      <div className="notif-settings-row">
        <span className="notif-settings-label">Desktop notifications</span>
        <label className="notif-switch">
          <input 
            type="checkbox" 
            checked={settings.desktop && !isDenied && !isUnsupported}
            disabled={isUnsupported}
            onChange={handleDesktopToggle}
          />
          <span className="notif-slider" />
        </label>
      </div>
      
      {showDeniedWarning && isDenied && (
        <div className="notif-tooltip">
          Enable in browser settings → Site Settings → Notifications
        </div>
      )}
      
      {isUnsupported && (
        <div className="notif-tooltip" style={{ color: 'var(--text-muted, #94a3b8)' }}>
          Unsupported by your browser
        </div>
      )}

      {/* Message Sounds Toggle */}
      <div className="notif-settings-row">
        <span className="notif-settings-label">Message sounds</span>
        <label className="notif-switch">
          <input 
            type="checkbox" 
            checked={settings.sound}
            onChange={() => handleToggle('sound')}
          />
          <span className="notif-slider" />
        </label>
      </div>

      {/* Show Preview Toggle */}
      <div className="notif-settings-row">
        <span className="notif-settings-label">Show message preview</span>
        <label className="notif-switch">
          <input 
            type="checkbox" 
            checked={settings.preview}
            onChange={() => handleToggle('preview')}
          />
          <span className="notif-slider" />
        </label>
      </div>
    </div>
  );
};

export default NotificationSettings;
