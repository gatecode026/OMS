/**
 * @file src/pages/chat/ChatWindow.jsx
 * @description Right panel — messages area with header, bubbles, typing, input.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useChat } from '../../context/ChatContext';
import { useApp } from '../../context/AppContext';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import ChatSidebar from './ChatSidebar';
import GroupInfoPanel from './GroupInfoPanel';
import { getOtherParticipant } from './ConversationsList';
import StatusDot from './StatusDot';
import { Pin } from 'lucide-react';
import { useCall } from '../../context/CallContext';

const getFirstUnreadMessage = (msgs, currentUserId, unreadCount) => {
  if (!msgs || msgs.length === 0) return null;
  
  // Method 1: direct readBy check
  for (let i = 0; i < msgs.length; i++) {
    const msg = msgs[i];
    if (msg.senderId !== currentUserId) {
      const hasRead = msg.readBy?.some(r => r.employeeId === currentUserId);
      if (!hasRead) {
        return msg;
      }
    }
  }

  // Method 2: fallback to unread count
  if (unreadCount > 0 && msgs.length >= unreadCount) {
    return msgs[msgs.length - unreadCount];
  }
  
  return null;
};

const ChatWindow = ({ currentUser, onBack }) => {
  const {
    conversations, activeConvId, messages,
    typingUsers, isLoadingMsgs, hasMoreMessages,
    loadMoreMessages, sendMessage, retryMessage, deleteMessage,
    deleteMessagesBulk, editMessage, addReaction, isUserOnline,
    handleTypingStart, handleTypingStop,
    mutedConversations, muteConversation, unmuteConversation,
    socket, isConnected, presenceMap,
    pinMessage, unpinMessage, starMessage, unstarMessage,
    unreadCountOnOpen
  } = useChat();

  const { initiateCall, callState } = useCall();

  const { showConfirm, addToast } = useApp();
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState(new Set());

  // Reset select mode when conversation changes
  useEffect(() => {
    setIsSelectMode(false);
    setSelectedMessageIds(new Set());
  }, [activeConvId]);

  const handleStartSelectMode = (msgId) => {
    setIsSelectMode(true);
    setSelectedMessageIds(new Set([msgId]));
  };

  const handleToggleSelect = (msgId) => {
    setSelectedMessageIds(prev => {
      const next = new Set(prev);
      if (next.has(msgId)) {
        next.delete(msgId);
      } else {
        next.add(msgId);
      }
      return next;
    });
  };

  const handleCancelSelectMode = () => {
    setIsSelectMode(false);
    setSelectedMessageIds(new Set());
  };

  const handleBulkDelete = () => {
    const count = selectedMessageIds.size;
    if (count === 0) return;

    showConfirm(
      'Delete Messages',
      `Are you sure you want to delete the ${count} selected messages for yourself?`,
      async () => {
        const success = await deleteMessagesBulk(Array.from(selectedMessageIds), activeConvId);
        if (success) {
          addToast('success', `${count} messages deleted successfully`);
          handleCancelSelectMode();
        } else {
          addToast('error', 'Failed to delete selected messages');
        }
      },
      'danger'
    );
  };

  useEffect(() => {
    if (!activeConvId || !socket || !isConnected) return;
    const timer = setTimeout(() => {
      socket.emit('mark_read', { conversationId: activeConvId });
    }, 300);
    return () => clearTimeout(timer);
  }, [activeConvId, isConnected, socket]);

  const isMuted = mutedConversations?.has(activeConvId);

  const toggleMute = () => {
    if (isMuted) {
      unmuteConversation(activeConvId);
    } else {
      muteConversation(activeConvId);
    }
  };

  const [showSidebar, setShowSidebar] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [unreadScrollCount, setUnreadScrollCount] = useState(0);
  const [unreadCountForBanner, setUnreadCountForBanner] = useState(0);
  // ID of the first unread message — used to place the separator
  // We capture it only once on open, and clear it when banner is dismissed
  const [firstUnreadMsgId, setFirstUnreadMsgId] = useState(null);
  const [replyTo, setReplyTo] = useState(null);

  const showScrollBtnRef = useRef(false);
  const initialScrollDoneRef = useRef({});
  const lastActiveConvIdRef = useRef(null);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const prevMsgLengthRef = useRef(0);
  const isLoadingMoreRef = useRef(false);
  
  const [unreadSeparatorEl, setUnreadSeparatorEl] = useState(null);
  const unreadSeparatorRef = useCallback((node) => {
    setUnreadSeparatorEl(node);
  }, []);

  // Initialize unread count for banner AND capture the first-unread message id
  useEffect(() => {
    const count = unreadCountOnOpen[activeConvId] || 0;
    setUnreadCountForBanner(count);
    if (count > 0) {
      // Find the first unread message id right now and lock it in
      const msgs = messages[activeConvId] || [];
      const firstUnread = getFirstUnreadMessage(msgs, currentUser?.id, count);
      setFirstUnreadMsgId(firstUnread?.id || null);
    } else {
      // No unread messages — never show the separator
      setFirstUnreadMsgId(null);
    }
  }, [activeConvId]); // Only re-run when conversation changes, NOT on every messages update

  // Helper to dismiss the banner + separator completely
  const dismissUnreadBanner = useCallback(() => {
    setUnreadCountForBanner(0);
    setUnreadScrollCount(0);
    setFirstUnreadMsgId(null);
  }, []);

  // IntersectionObserver: clear banner when separator scrolls into view
  useEffect(() => {
    if (!unreadCountForBanner || !unreadSeparatorEl) return;

    let timer;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            timer = setTimeout(() => {
              dismissUnreadBanner();
            }, 800);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(unreadSeparatorEl);
    return () => {
      if (timer) clearTimeout(timer);
      observer.unobserve(unreadSeparatorEl);
      observer.disconnect();
    };
  }, [unreadCountForBanner, unreadSeparatorEl, dismissUnreadBanner]);

  // Current conversation
  const conv = conversations.find(c => c.id === activeConvId);
  const convMessages = messages[activeConvId] || [];
  const typing = typingUsers[activeConvId] || [];

  // No longer compute firstUnreadMsg from msg.readBy (which never updates client-side).
  // We use firstUnreadMsgId which is captured once when the conversation opens.

  // Other user for direct chat
  const other = conv ? getOtherParticipant(conv, currentUser?.id) : null;
  const isDirect = conv?.type === 'direct';
  const otherPresence = other ? presenceMap?.get(other.employeeId) : null;
  const otherStatus = otherPresence?.status || 'offline';
  const otherIsOnChatScreen = otherPresence?.isOnChatScreen || false;

  const displayName = isDirect
    ? (other?.name || 'Chat')
    : (conv?.name || 'Group');

  const avatarSrc = isDirect ? other?.avatar : conv?.avatar;
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const isOnline = isDirect ? isUserOnline(other?.employeeId) : false;
  const participantCount = conv?.participants?.length || 0;

  // Track last activeConvId and reset initialScrollDone when it changes
  useEffect(() => {
    if (activeConvId !== lastActiveConvIdRef.current) {
      lastActiveConvIdRef.current = activeConvId;
      setUnreadScrollCount(0);
      setShowScrollBtn(false);
      showScrollBtnRef.current = false;
      if (activeConvId) {
        initialScrollDoneRef.current[activeConvId] = false;
      }
    }
  }, [activeConvId]);

  // Unified Initial Scroll when switching to a conversation
  useEffect(() => {
    if (!activeConvId) return;

    if (!isLoadingMsgs && initialScrollDoneRef.current[activeConvId] === false) {
      initialScrollDoneRef.current[activeConvId] = true;
      prevMsgLengthRef.current = convMessages.length;

      if (convMessages.length > 0) {
        const countOnOpen = unreadCountOnOpen[activeConvId] || 0;
        const firstUnread = getFirstUnreadMessage(convMessages, currentUser?.id, countOnOpen);

        if (firstUnread) {
          const el = document.getElementById(`msg-${firstUnread.id}`);
          if (el) {
            requestAnimationFrame(() => {
              el.scrollIntoView({ behavior: 'auto', block: 'center' });
            });
            return;
          }
        }
      }

      // Default fallback: scroll to bottom
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      });
    }
  }, [activeConvId, convMessages, isLoadingMsgs, unreadCountOnOpen, currentUser?.id]);

  // Auto-scroll or badge increment when new messages arrive
  useEffect(() => {
    const newLen = convMessages.length;
    // Only handle if we have done the initial scroll for this conversation
    if (initialScrollDoneRef.current[activeConvId] && newLen > prevMsgLengthRef.current) {
      const lastMsg = convMessages[newLen - 1];
      const isRecent = lastMsg && (Date.now() - new Date(lastMsg.createdAt)) < 5000;
      const isOwn = lastMsg?.senderId === currentUser?.id;

      if (isRecent) {
        if (isOwn) {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          setUnreadScrollCount(0);
        } else if (showScrollBtnRef.current) {
          // Scrolled up and someone else sent a message: increment unread scroll count badge
          setUnreadScrollCount(prev => prev + 1);
        } else {
          // At bottom and someone else sent a message: auto-scroll to show it
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          setUnreadScrollCount(0);
        }
      }
    }
    prevMsgLengthRef.current = newLen;
  }, [convMessages.length, activeConvId, currentUser?.id]);

  // Scroll to bottom when typing status changes to keep typing indicator in view
  useEffect(() => {
    if (typing.length > 0 && !showScrollBtnRef.current) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }, [typing.length]);

  // Scroll handler — load more + show scroll btn
  const handleScroll = useCallback(async () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;

    // Show scroll-to-bottom btn if not at bottom
    const isUp = scrollHeight - scrollTop - clientHeight > 150;
    setShowScrollBtn(isUp);
    showScrollBtnRef.current = isUp;

    // Reset unread counts + hide separator if we are at the bottom
    if (!isUp) {
      dismissUnreadBanner();
    }

    // Load more when scrolled near top
    if (scrollTop < 80 && hasMoreMessages[activeConvId] && !isLoadingMoreRef.current) {
      isLoadingMoreRef.current = true;
      const prevHeight = container.scrollHeight;
      await loadMoreMessages(activeConvId);
      // Restore scroll position after prepending older messages
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight - prevHeight;
        isLoadingMoreRef.current = false;
      });
    }
  }, [activeConvId, hasMoreMessages, loadMoreMessages]);

  const handleLoadMoreClick = useCallback(async () => {
    const container = messagesContainerRef.current;
    if (!container || isLoadingMoreRef.current) return;

    isLoadingMoreRef.current = true;
    const prevHeight = container.scrollHeight;
    await loadMoreMessages(activeConvId);
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight - prevHeight;
      isLoadingMoreRef.current = false;
    });
  }, [activeConvId, loadMoreMessages]);

  const handleSend = useCallback((content, type = 'text', media = null) => {
    sendMessage(activeConvId, content, type, replyTo?.id, media);
    setReplyTo(null);
  }, [activeConvId, sendMessage, replyTo]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleWindowClick = useCallback(() => {
    if (unreadCountForBanner > 0 || unreadScrollCount > 0) {
      dismissUnreadBanner();
    }
  }, [unreadCountForBanner, unreadScrollCount, dismissUnreadBanner]);

  if (!conv) return null;

  return (
    <div className="chat-window" onClick={handleWindowClick}>
      {/* ── HEADER ──────────────────────────────────────────────── */}
      {isSelectMode ? (
        <div className="chat-win-header" style={{ backgroundColor: 'var(--chat-primary, #6366f1)', color: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={handleCancelSelectMode}
              style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '6px', borderRadius: '50%' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <span style={{ fontWeight: '600', fontSize: '15.5px' }}>{selectedMessageIds.size} selected</span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={handleBulkDelete}
              disabled={selectedMessageIds.size === 0}
              style={{
                background: 'none',
                border: 'none',
                color: selectedMessageIds.size === 0 ? 'rgba(255,255,255,0.4)' : '#ffffff',
                cursor: selectedMessageIds.size === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '20px',
                fontWeight: '600',
                fontSize: '14.5px',
                transition: 'background 0.2s',
                backgroundColor: selectedMessageIds.size === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.1)'
              }}
              onMouseEnter={e => { if (selectedMessageIds.size > 0) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'; }}
              onMouseLeave={e => { if (selectedMessageIds.size > 0) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              </svg>
              Delete Selected
            </button>
          </div>
        </div>
      ) : (
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
            <div className="chat-win-avatar-letter">
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
                  activeConvId
                )}
                disabled={callState !== 'idle'}
                title="Voice Call"
                style={{
                  opacity: callState !== 'idle' ? 0.5 : 1,
                  cursor: callState !== 'idle' 
                    ? 'not-allowed' : 'pointer'
                }}
              >
                <svg width="20" height="20" 
                  viewBox="0 0 24 24" fill="none" 
                  stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 
                    19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 
                    0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 
                    3.38 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 
                    1.72c.127.96.361 1.903.7 2.81a2 2 0 0 
                    1-.45 2.11L7.91 8.91a16 16 0 0 0 6 
                    6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 
                    1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
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
                  activeConvId
                )}
                disabled={callState !== 'idle'}
                title="Video Call"
                style={{
                  opacity: callState !== 'idle' ? 0.5 : 1,
                  cursor: callState !== 'idle' 
                    ? 'not-allowed' : 'pointer'
                }}
              >
                <svg width="20" height="20" 
                  viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2">
                  <polygon points="23 7 16 12 23 17 23 7"/>
                  <rect x="1" y="5" width="15" height="14" 
                    rx="2" ry="2"/>
                </svg>
              </button>
            </>
          )}

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
      )}

      {/* Pinned message banner */}
      {(() => {
        const pinnedMsg = convMessages.find(m => m.isPinned);
        if (!pinnedMsg) return null;
        return (
          <div 
            style={{
              background: 'var(--bg-card, #ffffff)',
              borderBottom: '1px solid var(--chat-border, #e2e8f0)',
              padding: '10px 16px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              zIndex: 5,
              color: 'var(--text-secondary, #475569)'
            }}
          >
            <div 
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', minWidth: 0, flex: 1 }} 
              onClick={() => {
                const el = document.getElementById(`msg-${pinnedMsg.id}`);
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  el.classList.add('msg-bubble-highlight');
                  setTimeout(() => {
                    el.classList.remove('msg-bubble-highlight');
                  }, 2000);
                }
              }}
            >
              <Pin 
                size={14} 
                fill="var(--chat-primary, #6366f1)" 
                color="var(--chat-primary, #6366f1)" 
                strokeWidth={2} 
                style={{ 
                  transform: 'rotate(45deg)', 
                  flexShrink: 0 
                }}
              />
              <span style={{ fontWeight: '600', color: 'var(--chat-primary, #6366f1)' }}>Pinned message:</span>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                {pinnedMsg.senderName}: {pinnedMsg.content || (pinnedMsg.type === 'image' ? '📷 Image' : '📎 Attachment')}
              </span>
            </div>
            <button 
              onClick={() => unpinMessage(pinnedMsg.id, activeConvId)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted, #94a3b8)',
                fontSize: '12px',
                padding: '4px 8px',
                borderRadius: '6px',
                marginLeft: '8px'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--chat-hover, #f8fafc)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'none'}
            >
              Unpin
            </button>
          </div>
        );
      })()}

      {/* ── MESSAGES AREA ───────────────────────────────────────── */}
      <div
        className="chat-win-messages"
        ref={messagesContainerRef}
        onScroll={handleScroll}
      >
        {/* Load more indicator */}
        {isLoadingMsgs && (
          <div className="chat-load-more-spinner">
            <div className="chat-spinner" />
          </div>
        )}

        {/* Load More Button */}
        {hasMoreMessages[activeConvId] && !isLoadingMsgs && (
          <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0 16px 0' }}>
            <button
              onClick={handleLoadMoreClick}
              style={{
                backgroundColor: 'var(--bg-card, #ffffff)',
                color: 'var(--chat-primary, #6366f1)',
                border: '1.5px solid var(--chat-border, #e2e8f0)',
                padding: '6px 18px',
                borderRadius: '20px',
                fontSize: '12.5px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = 'var(--chat-primary, #6366f1)';
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.borderColor = 'var(--chat-primary, #6366f1)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'var(--bg-card, #ffffff)';
                e.currentTarget.style.color = 'var(--chat-primary, #6366f1)';
                e.currentTarget.style.borderColor = 'var(--chat-border, #e2e8f0)';
              }}
            >
              Load older messages
            </button>
          </div>
        )}

        {/* No messages */}
        {convMessages.length === 0 && !isLoadingMsgs && (
          <div className="chat-no-messages">
            <div className="chat-no-msg-icon">👋</div>
            <p>Say hello to {displayName}!</p>
          </div>
        )}

        {/* Date separators + Message bubbles */}
        {convMessages.map((msg, idx) => {
          const isOwn = msg.senderId === currentUser?.id;
          const prevMsg = convMessages[idx - 1];

          // Show date separator
          const showDate = !prevMsg ||
            new Date(msg.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString();

          return (
            <React.Fragment key={msg.id || idx}>
              {showDate && (
                <div className="chat-date-separator">
                  <span>
                    {new Date(msg.createdAt).toLocaleDateString([], {
                      weekday: 'long', month: 'long', day: 'numeric'
                    })}
                  </span>
                </div>
              )}
              {/* New Messages separator — only shown while banner is active */}
              {firstUnreadMsgId && unreadCountForBanner > 0 && msg.id === firstUnreadMsgId && (
                <div className="chat-unread-separator" ref={unreadSeparatorRef}>
                  <span>New Messages</span>
                </div>
              )}
              <MessageBubble
                message={msg}
                isOwn={isOwn}
                conversation={conv}
                onDelete={(id, forEveryone) => deleteMessage(id, activeConvId, forEveryone)}
                onEdit={(id, content) => editMessage(id, activeConvId, content)}
                onReact={(id, emoji) => addReaction(id, activeConvId, emoji)}
                onReply={() => setReplyTo(msg)}
                onRetry={retryMessage}
                onPin={pinMessage}
                onUnpin={unpinMessage}
                onStar={starMessage}
                onUnstar={unstarMessage}
                currentUser={currentUser}
                isSelectMode={isSelectMode}
                isSelected={selectedMessageIds.has(msg.id)}
                onToggleSelect={handleToggleSelect}
                onStartSelectMode={handleStartSelectMode}
              />
            </React.Fragment>
          );
        })}

        {/* Typing indicator */}
        {typing.length > 0 && (
          <div className="chat-typing-indicator">
            <div className="chat-typing-avatar">
              {typing[0]?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="chat-typing-bubble">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll-to-bottom button */}
      {showScrollBtn && (
        <button className="chat-scroll-bottom-btn" onClick={scrollToBottom} title="Scroll to bottom">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6"/>
          </svg>
          {unreadScrollCount > 0 && (
            <span className="chat-scroll-badge">{unreadScrollCount}</span>
          )}
        </button>
      )}

      {/* ── REPLY PREVIEW ───────────────────────────────────────── */}
      {replyTo && (
        <div className="chat-reply-preview">
          <div className="chat-reply-bar" />
          <div className="chat-reply-content">
            <span className="chat-reply-name">
              {replyTo.senderName}
            </span>
            <span className="chat-reply-text">
              {replyTo.content?.substring(0, 80)}
            </span>
          </div>
          <button className="chat-reply-close" onClick={() => setReplyTo(null)}>✕</button>
        </div>
      )}

      {/* ── MESSAGE INPUT ────────────────────────────────────────── */}
      <MessageInput
        activeConvId={activeConvId}
        onSend={handleSend}
        onTypingStart={() => handleTypingStart(activeConvId)}
        onTypingStop={() => handleTypingStop(activeConvId)}
      />

      {/* ── SIDEBAR (info panel) ─────────────────────────────────── */}
      {showSidebar && (
        isDirect ? (
          <ChatSidebar
            conversation={conv}
            currentUser={currentUser}
            onClose={() => setShowSidebar(false)}
          />
        ) : (
          <GroupInfoPanel
            conversation={conv}
            currentUser={currentUser}
            onClose={() => setShowSidebar(false)}
          />
        )
      )}
    </div>
  );
};

export default ChatWindow;
