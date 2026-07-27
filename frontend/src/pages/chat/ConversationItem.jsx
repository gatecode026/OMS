/**
 * @file src/pages/chat/ConversationItem.jsx
 * @description Single conversation row in the sidebar list with full context menu
 *   (desktop right-click / mobile long-press bottom sheet).
 *   Actions: Pin, Mute, Archive, Hide, Mark Read/Unread, Block, Clear Chat,
 *   Delete Chat, Delete Group (admin only).
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRenderCount } from '../../core/devtools/perf';
import StatusDot from './StatusDot';
import {
  Pin, Bell, BellOff, Archive, EyeOff, MailOpen, Mail,
  Ban, Trash2, X, Eraser, ShieldAlert, MoreVertical
} from 'lucide-react';

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

// ── Reusable menu button component ────────────────────────────────────────────
const MenuButton = ({ icon: Icon, label, danger, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      width: '100%',
      padding: '9px 14px',
      textAlign: 'left',
      background: 'none',
      border: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: '13px',
      color: danger ? '#ef4444' : 'var(--text-primary, #1e293b)',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontFamily: 'inherit',
      opacity: disabled ? 0.4 : 1,
      transition: 'background 0.15s'
    }}
    onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.08)' : 'var(--chat-hover, #f8fafc)'; }}
    onMouseLeave={e => e.currentTarget.style.background = 'none'}
  >
    <Icon size={15} strokeWidth={2} style={danger ? { color: '#ef4444' } : {}} />
    <span>{label}</span>
  </button>
);

// ── Divider line ──────────────────────────────────────────────────────────────
const MenuDivider = () => (
  <div style={{ height: '1px', background: 'var(--chat-border, #e2e8f0)', margin: '4px 8px' }} />
);

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
  onUnmute,
  // New management actions
  onArchive,
  onHide,
  onMarkUnread,
  onMarkRead,
  onBlock,
  onClearChat,
  onDeleteForMe,
  onDeleteGroup,
  isArchivedView,
  onUnarchive,
  isHiddenView,
  onUnhide,
  // Block state
  blockedUsers,
  blockedByUsers,
  // Toast + undo
  addToast
}) => {
  useRenderCount('ConversationItem');
  const other = getOtherParticipant(conv);
  const isDirect = conv.type === 'direct';

  const [showContextMenu, setShowContextMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const menuRef = useRef(null);
  const touchTimerRef = useRef(null);
  const touchMoved = useRef(false);

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

  // Avatar
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const avatarSrc = isDirect ? other?.avatar : conv.avatar;
  const isPinned = conv.pinnedBy?.some(p => p.employeeId === currentUser?.id);

  const isGroupAdmin = conv.type === 'group' && conv.participants?.some(
    p => p.employeeId === currentUser?.id && p.isAdmin
  );

  const otherUserId = other?.employeeId;
  const isBlocked = isDirect && blockedUsers?.includes(otherUserId);
  const isBlockedByOther = isDirect && blockedByUsers?.includes(otherUserId);

  // Handle right-click (desktop)
  const handleContextMenu = (e) => {
    e.preventDefault();

    // Adjust position so menu doesn't overflow viewport
    const x = Math.min(e.clientX, window.innerWidth - 220);
    const y = Math.min(e.clientY, window.innerHeight - 400);

    setMenuPos({ x, y });
    setShowContextMenu(true);
    setShowBottomSheet(false);
  };

  // Touch handlers for mobile long-press
  const handleTouchStart = useCallback((e) => {
    touchMoved.current = false;
    touchTimerRef.current = setTimeout(() => {
      if (!touchMoved.current) {
        // Haptic feedback if supported
        if (navigator.vibrate) navigator.vibrate(30);
        setShowBottomSheet(true);
        setShowContextMenu(false);
      }
    }, 500);
  }, []);

  const handleTouchMove = useCallback(() => {
    touchMoved.current = true;
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
  }, []);

  const closeAllMenus = () => {
    setShowContextMenu(false);
    setShowBottomSheet(false);
  };

  // ── Action handlers (with undo toasts for non-destructive) ──────────────

  const handlePin = () => {
    if (isPinned) onUnpin?.(conv.id);
    else onPin?.(conv.id);
    closeAllMenus();
  };

  const handleMute = () => {
    if (isMuted) onUnmute?.(conv.id);
    else onMute?.(conv.id);
    closeAllMenus();
  };

  const handleArchive = () => {
    onArchive?.(conv.id);
    closeAllMenus();
  };

  const handleHide = () => {
    onHide?.(conv.id);
    closeAllMenus();
  };

  const handleMarkUnread = () => {
    onMarkUnread?.(conv.id);
    closeAllMenus();
  };

  const handleMarkRead = () => {
    onMarkRead?.(conv.id);
    closeAllMenus();
  };

  const handleBlock = () => {
    onBlock?.(otherUserId, other?.name);
    closeAllMenus();
  };

  const handleClearChat = () => {
    onClearChat?.(conv.id, displayName);
    closeAllMenus();
  };

  const handleDeleteForMe = () => {
    onDeleteForMe?.(conv.id, displayName);
    closeAllMenus();
  };

  const handleDeleteGroup = () => {
    onDeleteGroup?.(conv.id, conv.name);
    closeAllMenus();
  };

  // Last message preview
  const lastMsg = conv.lastMessage;
  const hasLastMsg = lastMsg && lastMsg.messageId;
  const isAudioOrVoice = lastMsg && (
    lastMsg.type === 'audio' || 
    lastMsg.type === 'voice' || 
    (lastMsg.content && typeof lastMsg.content === 'string' && lastMsg.content.startsWith('data:audio/'))
  );
  const rawPreview = hasLastMsg 
    ? (isAudioOrVoice 
        ? '🎤 Voice Message' 
        : (lastMsg.content ? stripMarkdown(lastMsg.content) : null)) 
    : null;
  const preview = hasLastMsg
    ? rawPreview
      ? rawPreview.length > 48
        ? rawPreview.substring(0, 48) + '...'
        : rawPreview
      : (lastMsg.type === 'text' ? '' : '📎 Attachment')
    : 'No messages yet';

  // Timestamp
  const timestamp = hasLastMsg ? formatTime(lastMsg.sentAt) : '';

  // Avatar bg colors by letter
  const avatarColors = [
    '#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981',
    '#3b82f6','#ef4444','#14b8a6','#f97316','#84cc16'
  ];
  const avatarBg = avatarColors[avatarLetter.charCodeAt(0) % avatarColors.length];

  // ── Build menu options ─────────────────────────────────────────────────
  const renderMenuOptions = () => (
    <>
      <MenuButton icon={Pin} label={isPinned ? 'Unpin Chat' : 'Pin Chat'} onClick={handlePin} />
      <MenuButton icon={isMuted ? Bell : BellOff} label={isMuted ? 'Unmute Chat' : 'Mute Chat'} onClick={handleMute} />
      {isArchivedView ? (
        <MenuButton icon={Archive} label="Unarchive Chat" onClick={() => { onUnarchive?.(conv.id); closeAllMenus(); }} />
      ) : (
        <MenuButton icon={Archive} label="Archive Chat" onClick={handleArchive} />
      )}
      {isHiddenView ? (
        <MenuButton icon={EyeOff} label="Unhide Chat" onClick={() => { onUnhide?.(conv.id); closeAllMenus(); }} />
      ) : (
        <MenuButton icon={EyeOff} label="Hide Chat" onClick={handleHide} />
      )}
      {unreadCount > 0
        ? <MenuButton icon={MailOpen} label="Mark as Read" onClick={handleMarkRead} />
        : <MenuButton icon={Mail} label="Mark as Unread" onClick={handleMarkUnread} />
      }
      <MenuDivider />
      {isDirect && !isBlocked && (
        <MenuButton icon={Ban} label={`Block ${other?.name?.split(' ')[0] || 'User'}`} danger onClick={handleBlock} />
      )}
      <MenuButton icon={Eraser} label="Clear Chat" danger onClick={handleClearChat} />
      <MenuButton icon={Trash2} label="Delete Chat" danger onClick={handleDeleteForMe} />
      {conv.type === 'group' && isGroupAdmin && (
        <MenuButton icon={ShieldAlert} label="Delete Group" danger onClick={handleDeleteGroup} />
      )}
    </>
  );

  return (
    <div
      className={`conv-item ${isActive ? 'conv-item-active' : ''}`}
      onClick={onClick}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      {/* Avatar */}
      <div className="conv-item-avatar-wrap" style={{ position: 'relative' }}>
        {(() => {
          const hasValidAvatar = avatarSrc && 
                                 typeof avatarSrc === 'string' &&
                                 avatarSrc.trim() !== '' &&
                                 avatarSrc !== 'null' &&
                                 avatarSrc !== 'undefined';
          return hasValidAvatar ? (
            <>
              <img 
                src={avatarSrc} 
                alt={displayName} 
                className="conv-item-avatar-img" 
                onError={(e) => {
                  e.target.style.display = 'none';
                  const sib = e.target.nextSibling;
                  if (sib) sib.style.display = 'flex';
                }}
              />
              <div
                className="conv-item-avatar-letter"
                style={{ display: 'none', background: avatarBg }}
              >
                {avatarLetter}
              </div>
            </>
          ) : (
            <div
              className="conv-item-avatar-letter"
              style={{ background: avatarBg }}
            >
              {avatarLetter}
            </div>
          );
        })()}
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
          <span className="conv-item-name" style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
              {displayName}
            </span>
            {isBlocked && (
              <Ban size={12} style={{ color: '#ef4444', flexShrink: 0 }} />
            )}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            <span className="conv-item-time" style={{ marginLeft: 0 }}>{timestamp}</span>
            <button
              className="conv-item-more-btn"
              onClick={(e) => {
                e.stopPropagation();
                const isMobile = window.innerWidth <= 768;
                if (isMobile) {
                  setShowBottomSheet(true);
                  setShowContextMenu(false);
                } else {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setMenuPos({
                    x: rect.right - 200,
                    y: rect.bottom + 5
                  });
                  setShowContextMenu(prev => !prev);
                  setShowBottomSheet(false);
                }
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: '4px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted, #64748b)',
                transition: 'background 0.2s, color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--chat-hover, #f1f5f9)';
                e.currentTarget.style.color = 'var(--text-primary, #0f172a)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none';
                e.currentTarget.style.color = 'var(--text-muted, #64748b)';
              }}
            >
              <MoreVertical size={16} />
            </button>
          </div>
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

      {/* ── Desktop Floating Context Menu ──────────────────────────────── */}
      {showContextMenu && (
        <div
          ref={menuRef}
          className="conv-context-menu animate-slide-down"
          style={{
            position: 'fixed',
            left: `${menuPos.x}px`,
            top: `${menuPos.y}px`,
            zIndex: 10000,
            background: 'var(--bg-card, #ffffff)',
            border: '1px solid var(--chat-border, #e2e8f0)',
            borderRadius: '14px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.08)',
            padding: '6px',
            minWidth: '200px',
            maxHeight: '400px',
            overflowY: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {renderMenuOptions()}
        </div>
      )}

      {/* ── Mobile Bottom Sheet ────────────────────────────────────────── */}
      {showBottomSheet && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            animation: 'fadeIn 0.2s ease'
          }}
          onClick={(e) => {
            e.stopPropagation();
            setShowBottomSheet(false);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '500px',
              background: 'var(--bg-card, #ffffff)',
              borderRadius: '20px 20px 0 0',
              padding: '8px 6px 24px',
              animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              maxHeight: '70vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 10px' }}>
              <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'var(--chat-border, #cbd5e1)' }} />
            </div>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 12px' }}>
              <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary, #1e293b)' }}>
                {displayName}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); setShowBottomSheet(false); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '50%', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ borderTop: '1px solid var(--chat-border, #e2e8f0)', padding: '6px' }}>
              {renderMenuOptions()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationItem;
