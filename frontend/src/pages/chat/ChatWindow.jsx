/**
 * @file src/pages/chat/ChatWindow.jsx
 * @description Right panel — messages area with header, bubbles, typing, input.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useChat } from '../../context/ChatContext';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import ChatSidebar from './ChatSidebar';
import GroupInfoPanel from './GroupInfoPanel';
import { getOtherParticipant } from './ConversationsList';
import StatusDot from './StatusDot';
import { Pin } from 'lucide-react';

const ChatWindow = ({ currentUser, onBack }) => {
  const {
    conversations, activeConvId, messages,
    typingUsers, isLoadingMsgs, hasMoreMessages,
    loadMoreMessages, sendMessage, retryMessage, deleteMessage,
    editMessage, addReaction, isUserOnline,
    handleTypingStart, handleTypingStop,
    mutedConversations, muteConversation, unmuteConversation,
    socket, isConnected, presenceMap,
    pinMessage, unpinMessage, starMessage, unstarMessage
  } = useChat();

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
  const [replyTo, setReplyTo] = useState(null);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const prevMsgLengthRef = useRef(0);
  const isLoadingMoreRef = useRef(false);

  // Current conversation
  const conv = conversations.find(c => c.id === activeConvId);
  const convMessages = messages[activeConvId] || [];
  const typing = typingUsers[activeConvId] || [];

  // Other user for direct chat
  const other = conv ? getOtherParticipant(conv, currentUser?.id) : null;
  const isDirect = conv?.type === 'direct';
  const otherStatus = other ? (presenceMap?.get(other.employeeId)?.status || 'offline') : 'offline';

  const displayName = isDirect
    ? (other?.name || 'Chat')
    : (conv?.name || 'Group');

  const avatarSrc = isDirect ? other?.avatar : conv?.avatar;
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const isOnline = isDirect ? isUserOnline(other?.employeeId) : false;
  const participantCount = conv?.participants?.length || 0;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const newLen = convMessages.length;
    if (newLen > prevMsgLengthRef.current) {
      const lastMsg = convMessages[newLen - 1];
      // Only auto-scroll if the message is fresh (less than 5s old) or from current user
      const isRecent = lastMsg && (Date.now() - new Date(lastMsg.createdAt)) < 5000;
      const isOwn = lastMsg?.senderId === currentUser?.id;
      if (isRecent || isOwn) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
    prevMsgLengthRef.current = newLen;
  }, [convMessages.length]);

  // Scroll to bottom when switching conversations
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    prevMsgLengthRef.current = 0;
  }, [activeConvId]);

  // Scroll handler — load more + show scroll btn
  const handleScroll = useCallback(async () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;

    // Show scroll-to-bottom btn if not at bottom
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 150);

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

  if (!conv) return null;

  return (
    <div className="chat-window">
      {/* ── HEADER ──────────────────────────────────────────────── */}
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
                ? otherStatus === 'offline' ? 'Offline' : otherStatus.charAt(0).toUpperCase() + otherStatus.slice(1)
                : `${participantCount} member${participantCount !== 1 ? 's' : ''}`
            }
          </p>
        </div>

        {/* Actions */}
        <div className="chat-win-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
