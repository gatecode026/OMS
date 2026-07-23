/**
 * @file src/pages/chat/MessageBubble.jsx
 * @description Single message bubble — own (right/blue) vs others (left/white).
 *   Supports: text, deleted, edited, reactions, right-click actions, inline edit.
 */

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import EmojiPicker from 'emoji-picker-react';
import { BiCheck, BiCheckDouble } from 'react-icons/bi';
import { Star, Pin, CornerUpLeft, Pencil, Trash2, Plus, CheckSquare, Forward, MessageSquare, ClipboardList } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useChat } from '../../context/ChatContext';
import ImageLightbox from './ImageLightbox';
import PDFPreviewModal from './PDFPreviewModal';
import VoiceMessageBubble from './VoiceMessageBubble';
import PollBubble from '../../components/PollBubble';
import MarkdownRenderer from '../../components/MarkdownRenderer';
import { formatTime } from './ConversationsList';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const getFileIcon = (mimeType, fileName) => {
  const name = (fileName || '').toLowerCase();
  const mime = (mimeType || '').toLowerCase();
  if (mime.includes('pdf') || name.endsWith('.pdf'))
    return { icon: '📄', color: '#ef4444', label: 'PDF' };
  if (mime.includes('word') || name.endsWith('.doc') ||
    name.endsWith('.docx'))
    return { icon: '📝', color: '#2563eb', label: 'DOC' };
  if (mime.includes('excel') || name.endsWith('.xls') ||
    name.endsWith('.xlsx'))
    return { icon: '📊', color: '#16a34a', label: 'XLS' };
  if (mime.includes('zip') || name.endsWith('.zip'))
    return { icon: '🗜️', color: '#7c3aed', label: 'ZIP' };
  return { icon: '📎', color: '#64748b', label: 'FILE' };
};

const getVideoPoster = (url) => {
  if (url && url.includes('imagekit.io')) {
    const queryIdx = url.indexOf('?');
    if (queryIdx !== -1) {

      const basePath = url.substring(0, queryIdx);
      const queryParams = url.substring(queryIdx);
      return `${basePath}/ik-thumbnail.jpg${queryParams}`;
    }
    return url + '/ik-thumbnail.jpg';
  }
  return null;
};

const formatVideoDuration = (sec) => {
  if (!sec) return '';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const triggerDirectDownload = async (url, fileName) => {
  if (!url) return;

  const fallbackDownload = (downloadUrl) => {
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName || 'file';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  let blob = null;

  // If base64 data URL, convert to Blob
  if (url.startsWith('data:')) {
    try {
      const arr = url.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      blob = new Blob([u8arr], { type: mime });
    } catch (e) {
      console.warn('[Download] Base64 parsing error:', e);
    }
  }

  // If remote URL, fetch as Blob
  if (!blob && !url.startsWith('data:')) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        blob = await res.blob();
      }
    } catch (err) {
      console.warn('[Download] Blob fetch error:', err);
    }
  }

  // Use modern File System Access API if supported to prompt "Save As"
  if (blob && window.showSaveFilePicker) {
    try {
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: fileName || 'file'
      });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('[Download] Save picker cancelled by user');
        return;
      }
      console.warn('[Download] showSaveFilePicker failed, falling back:', err);
    }
  }

  // Classic download fallback
  if (blob) {
    const localUrl = window.URL.createObjectURL(blob);
    fallbackDownload(localUrl);
    window.URL.revokeObjectURL(localUrl);
  } else {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.download = fileName || 'file';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

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
  const readers = (msg.readBy || []).filter(r => r.employeeId !== msg.senderId);
  const seenCount = readers.length;
  const deliveries = (msg.deliveredTo || []).filter(d => d.employeeId !== msg.senderId);

  let status = 'sent';
  if (isGroup) {
    if (seenCount > 0 || msg._deliveryStatus === 'seen' || msg._deliveryStatus === 'read') {
      status = 'seen';
    } else if (deliveries.length > 0 || msg._deliveryStatus === 'delivered') {
      status = 'delivered';
    }
  } else {
    const isSeen = seenCount > 0 || msg._deliveryStatus === 'read' || msg._deliveryStatus === 'seen';
    const isDelivered = !isSeen && (deliveries.length > 0 || msg._deliveryStatus === 'delivered');
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
            {displayedAvatars.map((reader, index) => {
              const hasValidAvatar = reader.avatar && 
                                     typeof reader.avatar === 'string' &&
                                     reader.avatar.trim() !== '' &&
                                     reader.avatar !== 'null' &&
                                     reader.avatar !== 'undefined';
              return (
                <div
                  key={reader.employeeId}
                  className="msg-status-stack-avatar"
                  title={reader.name}
                  style={{ zIndex: 10 - index }}
                >
                  {hasValidAvatar ? (
                    <>
                      <img 
                        src={reader.avatar} 
                        alt={reader.name} 
                        className="msg-status-avatar-img" 
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const sib = e.target.nextSibling;
                          if (sib) sib.style.display = 'flex';
                        }}
                      />
                      <span style={{ display: 'none' }}>
                        {reader.name.charAt(0).toUpperCase()}
                      </span>
                    </>
                  ) : (
                    <span>{reader.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
              );
            })}
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
  currentUser,
  isSelectMode = false,
  isSelected = false,
  onToggleSelect,
  onStartSelectMode,
  onForward
}) => {
  const { showConfirm } = useApp();
  const [showOptions, setShowOptions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(msg.content || '');
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [lightboxFileName, setLightboxFileName] = useState('');
  const [pdfPreview, setPdfPreview] = useState(null);
  const [videoError, setVideoError] = useState(false);

  const bubbleRef = useRef(null);
  const editRef = useRef(null);
  const emojiRef = useRef(null);
  const actionBarRef = useRef(null);

  const { highlightedMessageId, setHighlightedMessageId, openThread } = useChat();

  const isManagerOrAdmin = (user) => {
    if (!user) return false;
    const role = user.roleId || user.role || '';
    const designation = user.designation || '';
    const isManagementRole = ['super_admin', 'dept_admin', 'branch_admin', 'manager'].includes(role.toLowerCase());
    const isManagerDesignation = designation.toLowerCase().includes('manager');
    return isManagementRole || isManagerDesignation;
  };

  const isGroupAdmin = conversation?.participants?.find(p => p.employeeId === currentUser?.id)?.isAdmin === true;

  const canCreateTask = isManagerOrAdmin(currentUser) || isGroupAdmin;

  // Scroll to and flash message when it's highlighted from search
  useEffect(() => {
    if (highlightedMessageId && msg.id === highlightedMessageId) {
      const targetEl = document.getElementById(`msg-${msg.id}`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetEl.classList.add('msg-bubble-highlight');
        const timer = setTimeout(() => {
          targetEl.classList.remove('msg-bubble-highlight');
          setHighlightedMessageId(null);
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [highlightedMessageId, msg.id, setHighlightedMessageId]);

  // After menu renders, clamp it inside the viewport
  useLayoutEffect(() => {
    if (!showOptions || !actionBarRef.current) return;
    const el = actionBarRef.current;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const MARGIN = 8;

    let { left, top } = rect;

    // Clamp horizontally
    if (left + rect.width > vw - MARGIN) {
      left = vw - rect.width - MARGIN;
    }
    if (left < MARGIN) left = MARGIN;

    // Clamp vertically — flip below cursor if clipped at top
    if (top < MARGIN) {
      // Try to position below the original click point
      top = menuPosition.y + rect.height + 10;
      // If that also overflows bottom, pin to top margin
      if (top + rect.height > vh - MARGIN) top = MARGIN;
    }
    if (top + rect.height > vh - MARGIN) {
      top = vh - rect.height - MARGIN;
    }

    // Only update if meaningfully different (avoid infinite loop)
    if (Math.abs(top - rect.top) > 1 || Math.abs(left - rect.left) > 1) {
      setMenuPosition({ x: left, y: top });
    }
  }, [showOptions, menuPosition.x, menuPosition.y]);

  // File type and preview variables
  const fileInfo = (msg.type === 'file' || msg.type === 'video') && msg.media ? getFileIcon(msg.media.mimeType || msg.media.fileType, msg.media.fileName) : null;
  const isPDF = msg.type === 'file' && msg.media && (((msg.media.mimeType || msg.media.fileType || '').includes('pdf')) || (msg.media.fileName || '').endsWith('.pdf'));
  const fileSizeKB = (msg.type === 'file' || msg.type === 'video') && msg.media && msg.media.fileSize
    ? (msg.media.fileSize / 1024).toFixed(1) + ' KB'
    : '';
  const mime = (msg.media?.mimeType || msg.media?.fileType || '').toLowerCase();
  const isVideo = (msg.type === 'file' || msg.type === 'video') &&
    msg.media &&
    (mime.startsWith('video/') || ['video/mp4', 'video/webm', 'video/ogg'].includes(mime));

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
    const handleScroll = (e) => {
      if (e.target && typeof e.target.closest === 'function') {
        if (e.target.closest('.msg-emoji-picker-popup') || e.target.closest('.msg-action-bar')) {
          return;
        }
      }
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
      <div className={`msg-row ${isOwn ? 'msg-row-other' : 'msg-row-own'}`}>
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

  // Call history message
  if (msg.type === 'call') {
    const isVideo = msg.content?.toLowerCase().includes('video');
    const isMissed = msg.content?.toLowerCase().includes('missed');
    const isDeclined = msg.content?.toLowerCase().includes('declined') || msg.content?.toLowerCase().includes('decline');

    return (
      <div className="msg-system" style={{ margin: '12px 0' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'var(--bg-card, #ffffff)',
          border: '1px solid var(--chat-border, #e2e8f0)',
          borderRadius: '20px',
          padding: '8px 16px',
          fontSize: '13px',
          color: isMissed ? '#ef4444' : isDeclined ? '#6b7280' : 'var(--text-primary, #1e293b)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          fontWeight: '500'
        }}>
          <span style={{ fontSize: '15px', display: 'flex', alignItems: 'center' }}>
            {isMissed ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.38 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            ) : isVideo ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.38 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            )}
          </span>
          <span>{msg.content}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', marginLeft: '4px' }}>
            {timeStr}
          </span>
        </div>
      </div>
    );
  }

  const isStarred = msg.starredBy?.length > 0;

  return (
    <div
      className={`msg-row ${isOwn ? 'msg-row-own' : 'msg-row-other'} ${isSelectMode ? 'msg-row-select-mode' : ''} ${isSelected ? 'msg-row-selected' : ''}`}
      ref={bubbleRef}
      onClick={() => {
        if (isSelectMode) {
          onToggleSelect(msg.id);
        }
      }}
      style={{ cursor: isSelectMode ? 'pointer' : 'default' }}
    >
      {isSelectMode && (
        <div className="msg-select-checkbox-container" style={{ display: 'flex', alignItems: 'center', justifycontent: 'center', padding: '0 12px 0 4px', flexShrink: 0 }}>
          <input
            type="checkbox"
            checked={isSelected}
            onClick={(e) => {
              e.stopPropagation();
            }}
            onChange={() => {
              onToggleSelect(msg.id);
            }}
            style={{
              width: '18px',
              height: '18px',
              cursor: 'pointer',
              accentColor: 'var(--chat-primary, #6366f1)'
            }}
          />
        </div>
      )}
      {!isOwn && msg.senderName && (() => {
        const hasValidAvatar = msg.senderAvatar && 
                               typeof msg.senderAvatar === 'string' &&
                               msg.senderAvatar.trim() !== '' &&
                               msg.senderAvatar !== 'null' &&
                               msg.senderAvatar !== 'undefined';
        return (
          <div className="msg-sender-avatar">
            {hasValidAvatar ? (
              <>
                <img 
                  src={msg.senderAvatar} 
                  alt={msg.senderName} 
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const sib = e.target.nextSibling;
                    if (sib) sib.style.display = 'flex';
                  }}
                />
                <span style={{ display: 'none' }}>
                  {msg.senderName.charAt(0).toUpperCase()}
                </span>
              </>
            ) : (
              <span>{msg.senderName.charAt(0).toUpperCase()}</span>
            )}
          </div>
        );
      })()}

      <div
        className={`msg-bubble-wrapper ${isOwn ? 'msg-bubble-wrapper-own' : ''}`}
        onContextMenu={(e) => {
          if (isSelectMode) return;
          if (msg.isDeleted || msg.type === 'system') return;
          e.preventDefault();

          const mouseX = e.clientX;
          const mouseY = e.clientY;
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const MARGIN = 8;

          // Conservative estimates — useLayoutEffect will fine-tune after render
          const estWidth = 380;
          const estHeight = 48;

          // Prefer above cursor; fall back to below if too close to top
          let y = mouseY - estHeight - 10;
          if (y < MARGIN) y = mouseY + 15;
          // If still goes off bottom, clamp
          if (y + estHeight > vh - MARGIN) y = vh - estHeight - MARGIN;

          // Center horizontally around click, then clamp
          let x = mouseX - estWidth / 2;
          if (x + estWidth > vw - MARGIN) x = vw - estWidth - MARGIN;
          if (x < MARGIN) x = MARGIN;

          setMenuPosition({ x, y });
          setShowOptions(true);
        }}
      >
        {/* Sender name */}
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
            <div className="msg-reply-text">
              {msg.replyTo.type === "audio" || msg.replyTo.type === "voice" ? "🎤 Voice Message" :
               msg.replyTo.type === "image" ? "📷 Photo" :
               msg.replyTo.type === "video" ? "🎥 Video" :
               msg.replyTo.type === "file" ? `📎 ${msg.replyTo.media?.fileName || "File"}` :
               msg.replyTo.content?.startsWith("data:") ? (
                 msg.replyTo.content.startsWith("data:audio") ? "🎤 Voice Message" :
                 msg.replyTo.content.startsWith("data:image") ? "📷 Photo" :
                 msg.replyTo.content.startsWith("data:video") ? "🎥 Video" : "📎 Attachment"
               ) : msg.replyTo.content?.substring(0, 60)}
            </div>
          </div>
        )}

        {/* Bubble */}
        <div id={`msg-${msg.id}`} className={`msg-bubble ${isOwn ? 'msg-bubble-own' : 'msg-bubble-other'} ${isStarred ? 'msg-bubble-starred' : ''} ${msg.isPinned ? 'msg-bubble-pinned' : ''}`}>
          {/* Hover Actions */}
          {!msg.isDeleted && msg.type !== 'system' && !isEditing && (
            <div className={`msg-bubble-hover-actions ${isOwn ? 'hover-other' : 'hover-own'}`}>
              <button
                className="msg-bubble-hover-action-btn"
                onClick={(e) => { e.stopPropagation(); openThread(msg.id); }}
                title="Reply in Thread"
              >
                <MessageSquare size={14} />
              </button>
            </div>
          )}
          {msg.isForwarded && (
            <div className="msg-forwarded-indicator" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: isOwn ? 'rgba(255, 255, 255, 0.75)' : 'var(--text-muted, #64748b)', marginBottom: '4px', fontStyle: 'italic' }}>
              <span>{msg.forwardedCount >= 2 ? '➡️ Forwarded many times' : '➡️ Forwarded'}</span>
            </div>
          )}
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
              {msg.type === 'poll' && conversation?.type === 'group' ? (
                <PollBubble message={msg} isOwn={isOwn} />
              ) : msg.type === 'audio' ? (
                <VoiceMessageBubble message={msg} isOwn={isOwn} />
              ) : msg.type === 'image' && msg.media ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <img
                    src={msg.media?.url || msg.content}
                    alt={msg.media?.fileName || 'Image'}
                    style={{
                      maxWidth: '240px', maxHeight: '200px',
                      objectFit: 'cover', borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'opacity 0.2s'
                    }}
                    onClick={() => {
                      setLightboxSrc(msg.media?.url || msg.content);
                      setLightboxFileName(msg.media?.fileName || 'Image');
                    }}
                    onMouseEnter={e => e.target.style.opacity = '0.85'}
                    onMouseLeave={e => e.target.style.opacity = '1'}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerDirectDownload(msg.media?.url || msg.content, msg.media?.fileName || 'image');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      background: 'rgba(0,0,0,0.06)',
                      border: 'none',
                      color: 'var(--text-primary, #fff)',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 500,
                      width: 'fit-content',
                      alignSelf: isOwn ? 'flex-start' : 'flex-end',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.12)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.06)'}
                    title="Download Image"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download
                  </button>
                </div>
              ) : isVideo && !videoError ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ position: 'relative', width: 'fit-content' }}>
                    <video
                      src={msg.media?.url}
                      poster={getVideoPoster(msg.media?.url)}
                      controls
                      muted
                      playsInline
                      onError={() => setVideoError(true)}
                      style={{
                        maxWidth: '240px', maxHeight: '200px',
                        borderRadius: '8px', display: 'block'
                      }}
                    />
                    {msg.media?.duration && (
                      <div style={{
                        position: 'absolute',
                        bottom: '8px',
                        left: '8px',
                        backgroundColor: 'rgba(0, 0, 0, 0.65)',
                        color: '#fff',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        zIndex: 2,
                        pointerEvents: 'none'
                      }}>
                        {formatVideoDuration(msg.media.duration)}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerDirectDownload(msg.media?.url, msg.media?.fileName || 'video');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      background: 'rgba(0,0,0,0.06)',
                      border: 'none',
                      color: 'var(--text-primary, #fff)',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 500,
                      width: 'fit-content',
                      alignSelf: isOwn ? 'flex-start' : 'flex-end',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.12)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.06)'}
                    title="Download Video"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download
                  </button>
                </div>
              ) : (msg.type === 'file' || msg.type === 'video') && msg.media ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  background: 'var(--bg-elevated, rgba(0,0,0,0.1))',
                  borderRadius: '10px', padding: '10px 14px',
                  minWidth: '200px', maxWidth: '280px'
                }}>
                  {/* File type badge */}
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '8px',
                    background: fileInfo.color + '20',
                    border: '1px solid ' + fileInfo.color + '40',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0,
                    fontSize: '20px'
                  }}>
                    {fileInfo.icon}
                  </div>

                  {/* File name + size */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '13px', fontWeight: 600,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap', overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {msg.media?.fileName || 'File'}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      marginTop: '2px'
                    }}>
                      {fileInfo.label}
                      {fileSizeKB && ` · ${fileSizeKB}`}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    {/* Preview (PDF only) */}
                    {isPDF && (
                      <button
                        onClick={() => setPdfPreview({
                          src: msg.media?.url || msg.content,
                          fileName: msg.media?.fileName
                        })}
                        style={{
                          background: 'var(--color-primary, #6366f1)',
                          border: 'none', color: '#fff',
                          borderRadius: '6px', padding: '6px',
                          cursor: 'pointer', display: 'flex',
                          alignItems: 'center', justifyContent: 'center'
                        }}
                        title="Preview PDF"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24"
                          fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                    )}
                    {/* Download */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerDirectDownload(msg.media?.url || msg.content, msg.media?.fileName || 'file');
                      }}
                      style={{
                        background: 'rgba(0,0,0,0.15)',
                        border: 'none', color: 'var(--text-primary)',
                        borderRadius: '6px', padding: '6px',
                        cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center'
                      }}
                      title="Download"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                <MarkdownRenderer content={msg.content} className="msg-markdown-content" />
              )}

              {/* Edited tag */}
              {msg.isEdited && <span className="msg-edited-tag">edited</span>}
            </>
          )}

          {/* Footer */}
          <div className="msg-footer" style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
            {isStarred && (
              <span className="msg-star-icon" title="Starred message">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </span>
            )}
            {msg.isPinned && (
              <span className="msg-pin-icon" title="Pinned message">
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
                  <line x1="12" y1="17" x2="12" y2="22" />
                  <path d="M5 17h14v-1.76a2 2 0 0 0-.44-1.24l-2.78-3.47A2 2 0 0 1 15 9.3V5a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4.3a2 2 0 0 1-.78 1.23l-2.78 3.5a2 2 0 0 0-.44 1.24z" />
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

        {/* Thread Summary Footer */}
        {msg.threadId && (
          <div
            className={`msg-thread-footer ${isOwn ? 'thread-own' : 'thread-other'}`}
            onClick={(e) => { e.stopPropagation(); openThread(msg.id); }}
            style={{ cursor: 'pointer' }}
          >
            {msg.threadDetails && msg.threadDetails.replyCount > 0 ? (
              <>
                <div className="thread-footer-avatars">
                  {(msg.threadDetails.participants || []).slice(0, 3).map(pId => {
                    const participant = conversation?.participants?.find(p => p.employeeId === pId);
                    const name = participant?.name || 'User';
                    const avatar = participant?.avatar || null;
                    return (
                      <div key={pId} className="thread-footer-avatar" title={name}>
                        {avatar ? (
                          <img src={avatar} alt={name} />
                        ) : (
                          <span>{name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                    );
                  })}
                  {(msg.threadDetails.participants || []).length > 3 && (
                    <div className="thread-footer-avatar-more">
                      +{msg.threadDetails.participants.length - 3}
                    </div>
                  )}
                </div>
                <span className="thread-footer-text">
                  {msg.threadDetails.replyCount} {msg.threadDetails.replyCount === 1 ? 'reply' : 'replies'}
                </span>
                {msg.threadDetails.lastReplyAt && (
                  <span className="thread-footer-time">
                    Last reply {formatTime(msg.threadDetails.lastReplyAt)}
                  </span>
                )}
                {msg.threadDetails.status && msg.threadDetails.status !== 'open' && (
                  <span className={`thread-footer-status status-${msg.threadDetails.status}`}>
                    {msg.threadDetails.status === 'resolved' ? '✓ Resolved' : '🔒 Closed'}
                  </span>
                )}
              </>
            ) : (
              <span className="thread-footer-view-link">View Thread</span>
            )}
          </div>
        )}

        {/* Status indicator below bubble/reactions for own messages */}
        {isOwn && <MessageStatus message={msg} conversation={conversation} onRetry={onRetry} />}
      </div>

      {/* ── Context Action Bar (Right-Click Action Bar) ────────────────────────── */}
      {showOptions && !isEditing && createPortal(
        <div
          ref={actionBarRef}
          className={`msg-action-bar ${isOwn ? 'msg-action-bar-own' : 'msg-action-bar-other'}`}
          style={{
            position: 'fixed',
            left: `${menuPosition.x}px`,
            top: `${menuPosition.y}px`,
            right: 'auto',
            margin: 0,
            zIndex: 99999
          }}
        >
          {/* ── Row 1: Emoji Reactions ───────────────────────────── */}
          <div className="msg-action-row">
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
                <Plus size={16} strokeWidth={2.5} />
              </button>
              {showEmojiPicker && (
                <div className={`msg-emoji-picker-popup ${!isOwn ? 'msg-emoji-picker-own' : ''}`}>
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    width={300}
                    height={380}
                    previewConfig={{ showPreview: false }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── Divider ──────────────────────────────────────────── */}
          <div className="msg-action-row-divider" />

          {/* ── Row 2: Action Buttons ────────────────────────────── */}
          <div className="msg-action-row">
            {/* Reply */}
            <button
              className="msg-action-btn"
              onClick={() => { onReply(msg); setShowOptions(false); }}
              title="Reply"
            >
              <CornerUpLeft size={16} strokeWidth={2} />
            </button>

            {/* Reply in Thread */}
            <button
              className="msg-action-btn"
              onClick={() => { openThread(msg.id); setShowOptions(false); }}
              title="Reply in Thread"
            >
              <MessageSquare size={16} strokeWidth={2} />
            </button>

            {/* Forward */}
            <button
              className="msg-action-btn"
              onClick={() => { onForward && onForward(msg); setShowOptions(false); }}
              title="Forward"
            >
              <Forward size={16} strokeWidth={2} />
            </button>

            {/* Star */}
            <button
              className="msg-action-btn"
              onClick={() => {
                if (isStarred) onUnstar(msg.id, conversation.id);
                else onStar(msg.id, conversation.id);
                setShowOptions(false);
              }}
              title={isStarred ? 'Remove Star' : 'Star Message'}
              style={{ color: isStarred ? '#f59e0b' : 'inherit' }}
            >
              <Star size={16} fill={isStarred ? '#f59e0b' : 'none'} color={isStarred ? '#f59e0b' : 'currentColor'} strokeWidth={2} />
            </button>

            {/* Pin */}
            <button
              className="msg-action-btn"
              onClick={() => {
                if (msg.isPinned) onUnpin(msg.id, conversation.id);
                else onPin(msg.id, conversation.id);
                setShowOptions(false);
              }}
              title={msg.isPinned ? 'Unpin Message' : 'Pin Message'}
              style={{ color: msg.isPinned ? 'var(--chat-primary, #6366f1)' : 'inherit' }}
            >
              <Pin size={16} fill={msg.isPinned ? 'var(--chat-primary, #6366f1)' : 'none'} color={msg.isPinned ? 'var(--chat-primary, #6366f1)' : 'currentColor'} strokeWidth={2} />
            </button>

            {/* Select */}
            <button
              className="msg-action-btn"
              onClick={() => { onStartSelectMode(msg.id); setShowOptions(false); }}
              title="Select Messages"
            >
              <CheckSquare size={16} strokeWidth={2} />
            </button>

            {/* Create Task */}
            {canCreateTask && (
              <button
                className="msg-action-btn"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('create-task-from-message', { detail: msg }));
                  setShowOptions(false);
                }}
                title="Create Task from Message"
              >
                <ClipboardList size={16} strokeWidth={2} />
              </button>
            )}

            {/* Edit (own text only) */}
            {isOwn && msg.type === 'text' && (
              <button className="msg-action-btn" onClick={() => setIsEditing(true)} title="Edit">
                <Pencil size={16} strokeWidth={2} />
              </button>
            )}

            {/* Delete */}
            <div className="msg-delete-wrap">
              <button
                className="msg-action-btn msg-action-delete"
                onClick={() => {
                  if (isOwn) {
                    setShowDeleteMenu(p => !p);
                  } else {
                    setShowOptions(false);
                    showConfirm(
                      'Delete Message',
                      'Are you sure you want to delete this message for yourself?',
                      () => { onDelete(msg.id, false); },
                      'danger'
                    );
                  }
                }}
                title="Delete"
              >
                <Trash2 size={16} strokeWidth={2} />
              </button>
              {isOwn && showDeleteMenu && (
                <div className="msg-delete-menu">
                  <button onClick={() => {
                    setShowDeleteMenu(false);
                    setShowOptions(false);
                    showConfirm(
                      'Delete Message',
                      'Are you sure you want to delete this message for yourself?',
                      () => { onDelete(msg.id, false); },
                      'danger'
                    );
                  }}>
                    Delete for me
                  </button>
                  <button onClick={() => {
                    setShowDeleteMenu(false);
                    setShowOptions(false);
                    showConfirm(
                      'Delete Message for Everyone',
                      'Are you sure you want to delete this message for everyone? This will replace the message content with a deletion notice.',
                      () => { onDelete(msg.id, true); },
                      'danger'
                    );
                  }}>
                    Delete for everyone
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {lightboxSrc && createPortal(
        <ImageLightbox
          src={lightboxSrc}
          fileName={lightboxFileName}
          onClose={() => { setLightboxSrc(null); setLightboxFileName(''); }}
        />,
        document.body
      )}

      {pdfPreview && createPortal(
        <PDFPreviewModal
          src={pdfPreview.src}
          fileName={pdfPreview.fileName}
          onClose={() => setPdfPreview(null)}
        />,
        document.body
      )}
    </div>
  );
};

export default MessageBubble;
