/**
 * @file src/pages/chat/MessageBubble.jsx
 * @description Single message bubble — own (right/blue) vs others (left/white).
 *   Supports: text, deleted, edited, reactions, right-click actions, inline edit.
 */

import React, { useState, useRef, useEffect } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { BiCheck, BiCheckDouble } from 'react-icons/bi';
import { Star, Pin, CornerUpLeft, Pencil, Trash2 } from 'lucide-react';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const MessageStatus = ({ message: msg, conversation, onRetry }) => {
  if (msg.isDeleted || msg.type === 'system') return null;

  if (msg._deliveryStatus === 'failed') {
    return (
      <div 
        className="msg-status-container status-failed" 
        onClick={() => onRetry && onRetry(msg.id)} 
        style={{ cursor: 'pointer', color: 'var(--text-danger, #ef4444)', display: 'flex', alignItems: 'center', gap: '4px' }}
      >
        <span style={{ fontSize: '0.78rem', fontWeight: '500' }}>Failed — tap to retry</span>
      </div>
    );
  }

  const isGroup = conversation?.type === 'group';
  const readers = msg.readBy || [];
  const seenCount = readers.length;

  let status = 'sent';
  if (isGroup) {
    if (seenCount > 0) {
      status = 'seen';
    } else if (msg.deliveredTo?.length > 0 || msg._deliveryStatus === 'delivered') {
      status = 'delivered';
    }
  } else {
    const isSeen = msg.readBy?.length > 0 || msg._deliveryStatus === 'read';
    const isDelivered = !isSeen && (msg.deliveredTo?.length > 0 || msg._deliveryStatus === 'delivered');
    if (isSeen) {
      status = 'seen';
    } else if (isDelivered) {
      status = 'delivered';
    }
  }

  if (status === 'seen') {
    if (isGroup) {
      const displayedAvatars = readers.slice(0, 3).map(r => {
        const participant = conversation?.participants?.find(p => p.employeeId === r.employeeId);
        return {
          employeeId: r.employeeId,
          name: r.name || participant?.name || 'User',
          avatar: participant?.avatar || null
        };
      });
      const remainingCount = seenCount - 3;

      return (
        <div key="seen" className="msg-status-container status-seen">
          <BiCheckDouble className="msg-status-icon" />
          <span>Seen by {seenCount}</span>
          <div className="msg-status-avatar-stack">
            {displayedAvatars.map((reader, index) => (
              <div
                key={reader.employeeId}
                className="msg-status-stack-avatar"
                title={reader.name}
                style={{ zIndex: 10 - index }}
              >
                {reader.avatar ? (
                  <img src={reader.avatar} alt={reader.name} className="msg-status-avatar-img" />
                ) : (
                  <span>{reader.name.charAt(0).toUpperCase()}</span>
                )}
              </div>
            ))}
            {remainingCount > 0 && (
              <div className="msg-status-stack-avatar msg-status-stack-more" title={`${remainingCount} more`}>
                <span>+{remainingCount}</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div key="seen" className="msg-status-container status-seen">
        <BiCheckDouble className="msg-status-icon" />
        <span>Seen</span>
      </div>
    );
  }

  if (status === 'delivered') {
    return (
      <div key="delivered" className="msg-status-container status-delivered">
        <BiCheckDouble className="msg-status-icon" />
        <span>Delivered</span>
      </div>
    );
  }

  return (
    <div key="sent" className="msg-status-container status-sent">
      <BiCheck className="msg-status-icon" />
      <span>Sent</span>
    </div>
  );
};

const MessageBubble = ({
  message: msg,
  isOwn,
  conversation,
  onDelete,
  onEdit,
  onReact,
  onReply,
  onRetry,
  onPin,
  onUnpin,
  onStar,
  onUnstar,
  currentUser
}) => {
  const [showOptions, setShowOptions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(msg.content || '');
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const bubbleRef = useRef(null);
  const editRef = useRef(null);
  const emojiRef = useRef(null);

  // Close menus on click outside of action popups
  useEffect(() => {
    const handler = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }

      const clickedOption = e.target.closest('.msg-action-bar') || 
                            e.target.closest('.msg-emoji-picker-popup') || 
                            e.target.closest('.msg-delete-menu');
      if (!clickedOption) {
        setShowOptions(false);
        setShowDeleteMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close menus on scroll
  useEffect(() => {
    const handleScroll = () => {
      setShowOptions(false);
      setShowDeleteMenu(false);
      setShowEmojiPicker(false);
    };
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    return () => window.removeEventListener('scroll', handleScroll, { capture: true });
  }, []);

  // Focus edit textarea
  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus();
      editRef.current.setSelectionRange(editRef.current.value.length, editRef.current.value.length);
    }
  }, [isEditing]);

  const handleSaveEdit = () => {
    if (editedContent.trim() && editedContent !== msg.content) {
      onEdit(msg.id, editedContent.trim());
    }
    setIsEditing(false);
  };

  const handleEmojiClick = (emojiData) => {
    onReact(msg.id, emojiData.emoji);
    setShowEmojiPicker(false);
    setShowOptions(false);
  };

  // Timestamp
  const timeStr = msg.createdAt
    ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  // Deleted message
  if (msg.isDeleted) {
    return (
      <div className={`msg-row ${isOwn ? 'msg-row-own' : 'msg-row-other'}`}>
        <div className={`msg-bubble msg-bubble-deleted`}>
          <em className="msg-deleted-text">🚫 This message was deleted</em>
          <span className="msg-time">{timeStr}</span>
        </div>
      </div>
    );
  }

  // System message
  if (msg.type === 'system') {
    return (
      <div className="msg-system">
        <span>{msg.content}</span>
      </div>
    );
  }

  const isStarred = msg.starredBy?.includes(currentUser?.id);

  return (
    <div
      className={`msg-row ${isOwn ? 'msg-row-own' : 'msg-row-other'}`}
      ref={bubbleRef}
    >
      {/* Sender avatar (others only) */}
      {!isOwn && (
        <div className="msg-sender-avatar">
          {msg.senderAvatar ? (
            <img src={msg.senderAvatar} alt={msg.senderName} />
          ) : (
            <span>{msg.senderName?.charAt(0).toUpperCase()}</span>
          )}
        </div>
      )}

      <div 
        className={`msg-bubble-wrapper ${isOwn ? 'msg-bubble-wrapper-own' : ''}`}
        onContextMenu={(e) => {
          if (msg.isDeleted || msg.type === 'system') return;
          e.preventDefault();

          const mouseX = e.clientX;
          const mouseY = e.clientY;

          // Estimate menu dimensions to prevent offscreen rendering
          // Menu has reactions (approx 200px) + actions (approx 180px)
          const menuWidth = isOwn ? 385 : 325;
          const menuHeight = 44;

          let x = mouseX - 100; // Center around mouse click
          if (x + menuWidth > window.innerWidth) {
            x = window.innerWidth - menuWidth - 16;
          }
          if (x < 16) {
            x = 16;
          }

          let y = mouseY - menuHeight - 10; // Position above cursor
          if (y < 16) {
            y = mouseY + 15; // Fallback to below cursor
          }

          setMenuPosition({ x, y });
          setShowOptions(true);
        }}
      >
        {/* Sender name (group chats, others only) */}
        {!isOwn && msg.senderName && (
          <span className="msg-sender-name">{msg.senderName}</span>
        )}

        {/* Reply quote */}
        {msg.replyTo && (
          <div 
            className="msg-reply-quote" 
            style={{ cursor: 'pointer' }}
            onClick={() => {
              const targetEl = document.getElementById(`msg-${msg.replyTo.messageId}`);
              if (targetEl) {
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                targetEl.classList.add('msg-bubble-highlight');
                setTimeout(() => {
                  targetEl.classList.remove('msg-bubble-highlight');
                }, 2000);
              }
            }}
          >
            <div className="msg-reply-bar" />
            <div className="msg-reply-text">{msg.replyTo.content?.substring(0, 60)}</div>
          </div>
        )}

        {/* Bubble */}
        <div id={`msg-${msg.id}`} className={`msg-bubble ${isOwn ? 'msg-bubble-own' : 'msg-bubble-other'} ${isStarred ? 'msg-bubble-starred' : ''}`}>
          {isEditing ? (
            <div className="msg-edit-area">
              <textarea
                ref={editRef}
                className="msg-edit-textarea"
                value={editedContent}
                onChange={e => setEditedContent(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit(); }
                  if (e.key === 'Escape') { setIsEditing(false); setEditedContent(msg.content); }
                }}
                rows={2}
              />
              <div className="msg-edit-actions">
                <button className="msg-edit-cancel" onClick={() => { setIsEditing(false); setEditedContent(msg.content); }}>Cancel</button>
                <button className="msg-edit-save" onClick={handleSaveEdit}>Save</button>
              </div>
            </div>
          ) : (
            <>
              {/* Content */}
              {msg.type === 'image' && msg.media ? (
                <img src={msg.media.url} alt="Image" className="msg-image" />
              ) : msg.type === 'file' && msg.media ? (
                <a href={msg.media.url} target="_blank" rel="noreferrer" className="msg-file-link">
                  <span className="msg-file-icon">📎</span>
                  <span className="msg-file-name">{msg.media.fileName}</span>
                </a>
              ) : (
                <p className="msg-text">{msg.content}</p>
              )}

              {/* Edited tag */}
              {msg.isEdited && <span className="msg-edited-tag">edited</span>}
            </>
          )}

          {/* Footer */}
          <div className="msg-footer" style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
            {isStarred && (
              <span style={{ color: '#f59e0b', display: 'inline-flex', alignItems: 'center' }} title="Starred message">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </span>
            )}
            {msg.isPinned && (
              <span style={{ color: 'var(--chat-primary, #6366f1)', display: 'inline-flex', alignItems: 'center' }} title="Pinned message">
                <svg 
                  width="13" 
                  height="13" 
                  viewBox="0 0 24 24" 
                  fill="currentColor" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  style={{ transform: 'rotate(45deg)' }}
                >
                  <line x1="12" y1="17" x2="12" y2="22"/>
                  <path d="M5 17h14v-1.76a2 2 0 0 0-.44-1.24l-2.78-3.47A2 2 0 0 1 15 9.3V5a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4.3a2 2 0 0 1-.78 1.23l-2.78 3.5a2 2 0 0 0-.44 1.24z"/>
                </svg>
              </span>
            )}
            <span className="msg-time">{timeStr}</span>
          </div>
        </div>

        {/* Reactions */}
        {msg.reactions?.length > 0 && (
          <div className="msg-reactions">
            {Object.entries(
              msg.reactions.reduce((acc, r) => {
                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                return acc;
              }, {})
            ).map(([emoji, count]) => (
              <button
                key={emoji}
                className="msg-reaction-badge"
                onClick={() => onReact(msg.id, emoji)}
                title="React"
              >
                {emoji} {count > 1 && <span>{count}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Status indicator below bubble/reactions for own messages */}
        {isOwn && <MessageStatus message={msg} conversation={conversation} onRetry={onRetry} />}
      </div>

      {/* ── Context Action Bar (Right-Click Action Bar) ────────────────────────── */}
      {showOptions && !isEditing && (
        <div 
          className={`msg-action-bar ${isOwn ? 'msg-action-bar-own' : 'msg-action-bar-other'}`}
          style={{
            position: 'fixed',
            left: `${menuPosition.x}px`,
            top: `${menuPosition.y}px`,
            right: 'auto',
            margin: 0,
          }}
        >
          {/* Quick emoji reactions */}
          {QUICK_EMOJIS.map(emoji => (
            <button
              key={emoji}
              className="msg-action-emoji"
              onClick={() => {
                onReact(msg.id, emoji);
                setShowOptions(false);
              }}
              title={`React ${emoji}`}
            >
              {emoji}
            </button>
          ))}

          {/* Full emoji picker */}
          <div className="msg-action-emoji-picker-wrap" ref={emojiRef}>
            <button
              className="msg-action-btn"
              onClick={() => setShowEmojiPicker(p => !p)}
              title="More reactions"
            >
              😊
            </button>
            {showEmojiPicker && (
              <div className={`msg-emoji-picker-popup ${isOwn ? 'msg-emoji-picker-own' : ''}`}>
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  width={300}
                  height={380}
                  previewConfig={{ showPreview: false }}
                />
              </div>
            )}
          </div>

          {/* Vertical Divider separating Reactions from Actions */}
          <div 
            className="msg-action-divider" 
            style={{ 
              width: '1px', 
              height: '16px', 
              backgroundColor: 'var(--chat-border, #e2e8f0)', 
              margin: '0 8px',
              display: 'inline-block'
            }} 
          />

          {/* Star / Highlight Action */}
          <button 
            className="msg-action-btn" 
            onClick={() => {
              if (isStarred) onUnstar(msg.id, conversation.id);
              else onStar(msg.id, conversation.id);
              setShowOptions(false);
            }} 
            title={isStarred ? "Remove Star" : "Star Message"}
            style={{ color: isStarred ? '#f59e0b' : 'inherit' }}
          >
            <Star 
              size={16} 
              fill={isStarred ? "#f59e0b" : "none"} 
              color={isStarred ? "#f59e0b" : "currentColor"} 
              strokeWidth={2} 
            />
          </button>

          {/* Pin Message Action */}
          <button 
            className="msg-action-btn" 
            onClick={() => {
              if (msg.isPinned) onUnpin(msg.id, conversation.id);
              else onPin(msg.id, conversation.id);
              setShowOptions(false);
            }} 
            title={msg.isPinned ? "Unpin Message" : "Pin Message"}
            style={{ color: msg.isPinned ? 'var(--chat-primary, #6366f1)' : 'inherit' }}
          >
            <Pin 
              size={16} 
              fill={msg.isPinned ? "var(--chat-primary, #6366f1)" : "none"} 
              color={msg.isPinned ? "var(--chat-primary, #6366f1)" : "currentColor"} 
              strokeWidth={2} 
            />
          </button>

          {/* Reply */}
          <button 
            className="msg-action-btn" 
            onClick={() => {
              onReply(msg);
              setShowOptions(false);
            }} 
            title="Reply"
          >
            <CornerUpLeft size={16} strokeWidth={2} />
          </button>

          {/* Edit (own messages only) */}
          {isOwn && msg.type === 'text' && (
            <button className="msg-action-btn" onClick={() => setIsEditing(true)} title="Edit">
              <Pencil size={16} strokeWidth={2} />
            </button>
          )}

          {/* Delete (own messages only) */}
          {isOwn && (
            <div className="msg-delete-wrap">
              <button
                className="msg-action-btn msg-action-delete"
                onClick={() => setShowDeleteMenu(p => !p)}
                title="Delete"
              >
                <Trash2 size={16} strokeWidth={2} />
              </button>
              {showDeleteMenu && (
                <div className="msg-delete-menu">
                  <button onClick={() => { onDelete(msg.id, false); setShowDeleteMenu(false); setShowOptions(false); }}>
                    Delete for me
                  </button>
                  <button onClick={() => { onDelete(msg.id, true); setShowDeleteMenu(false); setShowOptions(false); }}>
                    Delete for everyone
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
