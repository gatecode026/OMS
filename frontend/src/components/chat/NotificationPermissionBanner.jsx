/**
 * @file src/components/chat/NotificationPermissionBanner.jsx
 * @description Slide-down banner prompting users to enable browser notifications 
 *   when status is default and permission hasn't been asked yet.
 */

import React, { useState, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { useApp } from '../../context/AppContext';
import { BsBellFill } from 'react-icons/bs';

const NotificationPermissionBanner = () => {
  const { permission, requestPermission } = useChat();
  const { addToast } = useApp();
  
  const [visible, setVisible] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    // Check constraints: only show if default, hasn't been asked, not on mobile, and supported
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    const hasAsked = localStorage.getItem('oms_notif_permission_asked') === 'true';

    if (permission === 'default' && !hasAsked && !isMobile) {
      setVisible(true);
    }
  }, [permission]);

  const handleDismiss = () => {
    setDismissing(true);
    localStorage.setItem('oms_notif_permission_asked', 'true');
    setTimeout(() => {
      setVisible(false);
    }, 300); // match animation duration
  };

  const handleEnable = async () => {
    if (requestPermission) {
      const result = await requestPermission();
      localStorage.setItem('oms_notif_permission_asked', 'true');
      
      setDismissing(true);
      setTimeout(() => {
        setVisible(false);
        if (result === 'granted') {
          addToast('success', 'Desktop notifications enabled ✓');
        } else if (result === 'denied') {
          addToast('info', 'You can enable notifications from browser settings');
        }
      }, 300);
    }
  };

  if (!visible) return null;

  return (
    <div className={`notif-banner ${dismissing ? 'dismissing' : ''}`}>
      <div className="notif-banner-left">
        <span className="notif-banner-icon">
          <BsBellFill size={18} />
        </span>
        <div className="notif-banner-text">
          <h5 className="notif-banner-title">Get desktop notifications for new messages</h5>
          <p className="notif-banner-desc">Stay updated even when you switch tabs or minimize the window</p>
        </div>
      </div>
      <div className="notif-banner-right">
        <button className="notif-banner-btn-enable" onClick={handleEnable}>
          Enable
        </button>
        <button className="notif-banner-btn-dismiss" onClick={handleDismiss}>
          Not now
        </button>
      </div>
    </div>
  );
};

export default NotificationPermissionBanner;
