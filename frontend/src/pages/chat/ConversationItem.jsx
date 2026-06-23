/**
 * @file src/pages/chat/ConversationItem.jsx
 * @description Single conversation row in the sidebar list with right-click actions.
 */

import React, { useState, useRef, useEffect } from 'react';
import StatusDot from './StatusDot';
import { Pin, Bell, BellOff } from 'lucide-react';

const stripMarkdown = (text) => {
  if (!text) return '';
  return text
    .replace(/```[\s\S]*?```/g, '[Code Block]')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/~([^~]+)~/g, '$1')
    .replace(/^\s*>\s+/gm, '')
    .replace(/^\s*[\*\-+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\n+/g, ' ')
    .trim();
};

const ConversationItem = ({
  conversation: conv,
  isActive,
  onClick,
  unreadCount,
  isOnline,
  otherStatus,
  isMuted,
  formatTime,
  getOtherParticipant,
  currentUser,
  onPin,
  onUnpin,
  onMute,
  onUnmute
}) => {
  const other = getOtherParticipant(conv);
  const isDirect = conv.type === 'direct';

  const [showContextMenu, setShowContextMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef(null);

  // Close context menu on click outside
  useEffect(() => {
    const closeMenu = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowContextMenu(false);
      }
    };
    document.addEventListener('mousedown', closeMenu);
    return () => document.removeEventListener('mousedown', closeMenu);
  }, []);

  // Display name
  const displayName = isDirect
    ? (other?.name || 'Unknown')
    : (conv.name || 'Group');

  // Avatar letter
  const avatarLetter = displayName.charAt(0).toUpperCase();

  // Avatar src
  const avatarSrc = isDirect ? other?.avatar : conv.avatar;

  const isPinned = conv.pinnedBy?.some(p => p.employeeId === currentUser?.id);

  // Handle right-click
  const handleContextMenu = (e) => {
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  // Last message preview
  const lastMsg = conv.lastMessage;
  const rawPreview = lastMsg ? (lastMsg.content ? stripMarkdown(lastMsg.content) : null) : null;
  const preview = lastMsg
    ? rawPreview
      ? rawPreview.length > 48
        ? rawPreview.substring(0, 48) + '...'
        : rawPreview
      : '📎 Attachment'
    : 'No messages yet';

  // Timestamp
  const timestamp = formatTime(lastMsg?.sentAt || conv.lastActivityAt);

  // Avatar bg colors by letter
  const avatarColors = [
    '#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981',
    '#3b82f6','#ef4444','#14b8a6','#f97316','#84cc16'
  ];
  const avatarBg = avatarColors[avatarLetter.charCodeAt(0) % avatarColors.length];

  return (
    <div
      className={`conv-item ${isActive ? 'conv-item-active' : ''}`}
      onClick={onClick}
      onContextMenu={handleContextMenu}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      {/* Avatar */}
      <div className="conv-item-avatar-wrap" style={{ position: 'relative' }}>
        {avatarSrc ? (
          <img src={avatarSrc} alt={displayName} className="conv-item-avatar-img" />
        ) : (
          <div
            className="conv-item-avatar-letter"
            style={{ background: avatarBg }}
          >
            {avatarLetter}
          </div>
        )}
        {/* Status dot — only for direct chats */}
        {isDirect && (
          <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', border: '2px solid var(--bg-card, #fff)', borderRadius: '50%' }}>
            <StatusDot status={otherStatus} size={10} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="conv-item-content">
        <div className="conv-item-top-row">
          <span className="conv-item-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {displayName}
            {isPinned && (
              <svg 
                width="14" 
                height="14" 
                viewBox="0 0 24 24" 
                fill="currentColor" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                style={{ 
                  color: 'var(--chat-primary, #6366f1)', 
                  transform: 'rotate(45deg)', 
                  flexShrink: 0 
                }}
              >
                <line x1="12" y1="17" x2="12" y2="22"/>
                <path d="M5 17h14v-1.76a2 2 0 0 0-.44-1.24l-2.78-3.47A2 2 0 0 1 15 9.3V5a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4.3a2 2 0 0 1-.78 1.23l-2.78 3.5a2 2 0 0 0-.44 1.24z"/>
              </svg>
            )}
            {isMuted && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, flexShrink: 0 }}>
                <path d="m13.73 21a2 2 0 0 1-3.46 0" />
                <path d="M18.63 13A17.89 17.89 0 0 1 18 8" />
                <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" />
                <path d="M18 8a6 6 0 0 0-9.33-5" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            )}
          </span>
          <span className="conv-item-time">{timestamp}</span>
        </div>
        <div className="conv-item-bottom-row">
          <span className={`conv-item-preview ${unreadCount > 0 ? 'conv-item-preview-unread' : ''}`}>
            {lastMsg?.senderId === currentUser?.id && (
              <span className="conv-item-mine-prefix">You: </span>
            )}
            {preview}
          </span>
          {unreadCount > 0 && (
            <span className="conv-item-badge">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>

      {/* Floating Context Menu */}
      {showContextMenu && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            left: `${menuPos.x}px`,
            top: `${menuPos.y}px`,
            zIndex: 10000,
            background: 'var(--bg-card, #ffffff)',
            border: '1px solid var(--chat-border, #e2e8f0)',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
            padding: '6px',
            minWidth: '160px'
          }}
          onClick={(e) => e.stopPropagation()} // Prevent selecting item behind menu
        >
          <button
            onClick={() => {
              if (isPinned) onUnpin(conv.id);
              else onPin(conv.id);
              setShowContextMenu(false);
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              textAlign: 'left',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              color: 'var(--text-primary, #1e293b)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontFamily: 'inherit'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--chat-hover, #f8fafc)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <Pin 
              size={14} 
              strokeWidth={2} 
              style={{ transform: 'rotate(45deg)' }} 
            />
            <span>{isPinned ? 'Unpin Chat' : 'Pin Chat'}</span>
          </button>
          <button
            onClick={() => {
              if (isMuted) onUnmute(conv.id);
              else onMute(conv.id);
              setShowContextMenu(false);
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              textAlign: 'left',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              color: 'var(--text-primary, #1e293b)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontFamily: 'inherit'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--chat-hover, #f8fafc)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            {isMuted ? (
              <Bell size={14} strokeWidth={2} />
            ) : (
              <BellOff size={14} strokeWidth={2} />
            )}
            <span>{isMuted ? 'Unmute Chat' : 'Mute Chat'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ConversationItem;
