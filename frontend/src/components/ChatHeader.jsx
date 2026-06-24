/**
 * @file src/components/ChatHeader.jsx
 * @description Extracted chat window header component. Displays partner details/group info,
 *   typing status, WebRTC call controls, mute state, and the central PinBoard button.
 */

import React from 'react';
import StatusDot from '../pages/chat/StatusDot';
import { Pin } from 'lucide-react';

const ChatHeader = ({
  displayName,
  isDirect,
  other,
  otherStatus,
  otherIsOnChatScreen,
  avatarSrc,
  avatarLetter,
  participantCount,
  typing,
  onBack,
  isMuted,
  toggleMute,
  setShowSidebar,
  setShowPinBoard,
  initiateCall,
  callState,
  conversationId
}) => {
  const getAvatarBg = (str) => {
    const colors = [
      '#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981',
      '#3b82f6','#ef4444','#14b8a6','#f97316','#84cc16'
    ];
    return colors[(str?.charCodeAt(0) || 0) % colors.length];
  };

  return (
    <div className="chat-win-header">
      {/* Back button (mobile) */}
      <button className="chat-win-back-btn" onClick={onBack}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6"/>
        </svg>
      </button>

      {/* Avatar */}
      <div className="chat-win-avatar-wrap">
        {avatarSrc ? (
          <img src={avatarSrc} alt={displayName} className="chat-win-avatar-img" />
        ) : (
          <div className="chat-win-avatar-letter" style={{ backgroundColor: getAvatarBg(displayName) }}>
            {avatarLetter}
          </div>
        )}
        {isDirect && (
          <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', border: '2px solid var(--bg-card, #fff)', borderRadius: '50%' }}>
            <StatusDot status={otherStatus} size={10} />
          </div>
        )}
      </div>

      {/* Name + Status */}
      <div 
        className="chat-win-info"
        style={{ cursor: !isDirect ? 'pointer' : 'default' }}
        onClick={() => { if (!isDirect) setShowSidebar(true); }}
      >
        <h3 className="chat-win-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {displayName}
          {isDirect && <StatusDot status={otherStatus} size={10} />}
        </h3>
        <p className="chat-win-status">
          {typing.length > 0
            ? `${typing.map(u => u.name.split(' ')[0]).join(', ')} ${typing.length === 1 ? 'is' : 'are'} typing...`
            : isDirect
              ? otherStatus === 'offline'
                ? 'Offline'
                : otherStatus === 'available'
                  ? otherIsOnChatScreen
                    ? 'Online'
                    : 'Available and ready to take call'
                  : otherStatus === 'dnd'
                    ? 'Do Not Disturb'
                    : otherStatus.charAt(0).toUpperCase() + otherStatus.slice(1)
              : `${participantCount} member${participantCount !== 1 ? 's' : ''}`
          }
        </p>
      </div>

      {/* Actions */}
      <div className="chat-win-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {isDirect && other && (
          <>
            {/* Voice Call */}
            <button
              className="chat-win-action-btn"
              onClick={() => initiateCall(
                { 
                  id: other.employeeId,
                  name: other.name,
                  avatar: other.avatar
                },
                'audio',
                conversationId
              )}
              disabled={callState !== 'idle'}
              title="Voice Call"
              style={{
                opacity: callState !== 'idle' ? 0.5 : 1,
                cursor: callState !== 'idle' ? 'not-allowed' : 'pointer'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.38 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </button>

            {/* Video Call */}
            <button
              className="chat-win-action-btn"
              onClick={() => initiateCall(
                {
                  id: other.employeeId,
                  name: other.name,
                  avatar: other.avatar
                },
                'video',
                conversationId
              )}
              disabled={callState !== 'idle'}
              title="Video Call"
              style={{
                opacity: callState !== 'idle' ? 0.5 : 1,
                cursor: callState !== 'idle' ? 'not-allowed' : 'pointer'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="23 7 16 12 23 17 23 7"/>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
            </button>
          </>
        )}

        {/* Mute Conversation */}
        <button
          className={`chat-win-action-btn ${isMuted ? 'muted' : ''}`}
          onClick={toggleMute}
          title={isMuted ? 'Unmute Conversation' : 'Mute Conversation'}
          style={{ color: isMuted ? 'var(--text-muted, #888)' : 'inherit' }}
        >
          {isMuted ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m13.73 21a2 2 0 0 1-3.46 0" />
              <path d="M18.63 13A17.89 17.89 0 0 1 18 8" />
              <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" />
              <path d="M18 8a6 6 0 0 0-9.33-5" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          )}
        </button>

        {/* PinBoard Button */}
        <button
          className="chat-win-action-btn"
          onClick={() => setShowPinBoard(true)}
          title="Pin Board"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Pin size={18} style={{ transform: 'rotate(45deg)' }} />
        </button>

        {/* Conversation Info */}
        <button
          className="chat-win-action-btn"
          onClick={() => setShowSidebar(true)}
          title="Conversation Info"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;
