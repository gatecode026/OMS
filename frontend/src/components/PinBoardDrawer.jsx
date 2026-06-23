/**
 * @file src/components/PinBoardDrawer.jsx
 * @description Slide-in panel wrapper for the PinBoard. Matches GroupInfoPanel styling,
 *   supporting dark mode, backdrop dismiss, and Escape key closing.
 */

import React, { useEffect } from 'react';
import PinBoard from './PinBoard';

const PinBoardDrawer = ({ conversation, currentUser, onClose }) => {
  // Escape key handler to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div className="chat-sidebar-backdrop" onClick={onClose} />

      {/* Slide-in panel */}
      <div className="chat-sidebar-panel" style={{ width: '350px' }}>
        {/* Header */}
        <div className="chat-sidebar-header">
          <h3 className="chat-sidebar-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📌</span>
            <span>Pin Board</span>
          </h3>
          <button className="chat-sidebar-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <PinBoard
            conversation={conversation}
            currentUser={currentUser}
            onClose={onClose}
          />
        </div>
      </div>
    </>
  );
};

export default PinBoardDrawer;
