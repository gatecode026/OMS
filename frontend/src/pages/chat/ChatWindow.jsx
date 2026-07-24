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
import ForwardMessageModal from '../../components/ForwardMessageModal';
import CreateTaskFromMessageModal from '../../components/CreateTaskFromMessageModal';
import ChatHeader from '../../components/ChatHeader';
import PinBoardDrawer from '../../components/PinBoardDrawer';
import ThreadPanel from '../../components/ThreadPanel';
import CreatePollModal from '../../components/CreatePollModal';
import TypingIndicator from '../../components/chat/TypingIndicator';

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
    unreadCountOnOpen,
    highlightedMessageId, setHighlightedMessageId,
    pinnedMessages, totalPinned, loadPinnedMessages,
    activeThread, closeThread,
    blockedUsers, blockedByUsers, unblockUser
  } = useChat();

  const { initiateCall, callState } = useCall();

  const { showConfirm, addToast } = useApp();

  const conv = conversations.find(c => c.id === activeConvId);
  const convMessages = messages[activeConvId] || [];
  const typing = typingUsers[activeConvId] || [];

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState(new Set());
  const [showPinBoard, setShowPinBoard] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [showCreatePoll, setShowCreatePoll] = useState(false);

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
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const [taskMessage, setTaskMessage] = useState(null);

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

  const lastEmittedReadIdRef = useRef(null);

  // Reset last emitted read receipt ID on conversation switch
  useEffect(() => {
    lastEmittedReadIdRef.current = null;
  }, [activeConvId]);

  const updateReadReceipts = useCallback(() => {
    if (!activeConvId || !socket || !isConnected || convMessages.length === 0) return;
    const container = messagesContainerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    let lastVisibleMsg = null;

    // Scan backwards to find the last message sent by others that is visible
    for (let i = convMessages.length - 1; i >= 0; i--) {
      const msg = convMessages[i];
      if (msg.senderId === currentUser?.id) continue;

      const el = document.getElementById(`msg-${msg.id}`);
      if (el) {
        const rect = el.getBoundingClientRect();
        // Check if the element's top boundary is within the container viewport
        const isVisible = (rect.top >= containerRect.top - 10 && rect.top <= containerRect.bottom + 10);
        if (isVisible) {
          lastVisibleMsg = msg;
          break;
        }
      }
    }

    if (lastVisibleMsg && lastVisibleMsg.id !== lastEmittedReadIdRef.current) {
      lastEmittedReadIdRef.current = lastVisibleMsg.id;
      socket.emit('conversation:read', {
        conversationId: activeConvId,
        lastReadMessageId: lastVisibleMsg.id
      });
    }
  }, [activeConvId, convMessages, currentUser?.id, isConnected, socket]);

  useEffect(() => {
    if (!activeConvId || !socket || !isConnected) return;
    const timer = setTimeout(() => {
      if (document.visibilityState === 'visible' && document.hasFocus()) {
        updateReadReceipts();
        socket.emit('mark_read', { conversationId: activeConvId });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [activeConvId, isConnected, socket, convMessages.length, updateReadReceipts]);

  // Read receipt trigger on window focus and tab visibility change
  useEffect(() => {
    const handleFocusOrVisible = () => {
      if (activeConvId && socket && isConnected && document.visibilityState === 'visible' && document.hasFocus()) {
        updateReadReceipts();
        socket.emit('mark_read', { conversationId: activeConvId });
      }
    };

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    return () => {
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
    };
  }, [activeConvId, isConnected, socket, updateReadReceipts]);

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
    };
  }, [unreadCountForBanner, unreadSeparatorEl, dismissUnreadBanner]);

  // Wire up listener for creating task from message
  useEffect(() => {
    const handleCreateTask = (e) => {
      setTaskMessage(e.detail);
    };
    const handleOpenCreatePoll = () => {
      setShowCreatePoll(true);
    };
    window.addEventListener('create-task-from-message', handleCreateTask);
    window.addEventListener('open-create-poll', handleOpenCreatePoll);
    return () => {
      window.removeEventListener('create-task-from-message', handleCreateTask);
      window.removeEventListener('open-create-poll', handleOpenCreatePoll);
    };
  }, []);



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

  // Reset carouselIndex on activeConvId or pinnedMessages length changes
  useEffect(() => {
    setCarouselIndex(0);
  }, [activeConvId, pinnedMessages?.length]);

  // Clamp carouselIndex to length of pinnedMessages
  useEffect(() => {
    if (pinnedMessages && carouselIndex >= pinnedMessages.length) {
      setCarouselIndex(Math.max(0, pinnedMessages.length - 1));
    }
  }, [pinnedMessages?.length, carouselIndex]);

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

  // Auto-paginate/load older messages if search clicked an older message
  useEffect(() => {
    if (!highlightedMessageId || !activeConvId) return;

    // Check if message is currently in the active conversation message list
    const hasMsg = convMessages.some(m => m.id === highlightedMessageId);
    if (!hasMsg) {
      if (hasMoreMessages[activeConvId] && !isLoadingMsgs) {
        // Load next page of older messages
        loadMoreMessages(activeConvId);
      } else if (!hasMoreMessages[activeConvId] && !isLoadingMsgs) {
        // We've loaded all messages and the target is still not found
        console.warn(`[ChatWindow] Target message ${highlightedMessageId} not found in history`);
        setHighlightedMessageId(null);
      }
    }
  }, [highlightedMessageId, activeConvId, convMessages, hasMoreMessages, isLoadingMsgs, loadMoreMessages, setHighlightedMessageId]);

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

    // Emit read receipt for visible messages
    updateReadReceipts();

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
  }, [activeConvId, hasMoreMessages, loadMoreMessages, updateReadReceipts, dismissUnreadBanner]);

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
    <div className="chat-window-container-split">
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
        <ChatHeader
          displayName={displayName}
          isDirect={isDirect}
          other={other}
          otherStatus={otherStatus}
          otherIsOnChatScreen={otherIsOnChatScreen}
          avatarSrc={avatarSrc}
          avatarLetter={avatarLetter}
          participantCount={participantCount}
          typing={typing}
          onBack={onBack}
          isMuted={isMuted}
          toggleMute={toggleMute}
          setShowSidebar={setShowSidebar}
          setShowPinBoard={setShowPinBoard}
          initiateCall={initiateCall}
          callState={callState}
          conversationId={activeConvId}
          isBlocked={isDirect && (blockedUsers.includes(other?.employeeId) || blockedByUsers.includes(other?.employeeId))}
        />
      )}

      {/* Pinned message banner (Carousel) */}
      {pinnedMessages && pinnedMessages.length > 0 && (
        <div 
          className="chat-pinned-banner"
          style={{
            background: 'var(--bg-card, #ffffff)',
            borderBottom: '1px solid var(--chat-border, #e2e8f0)',
            padding: '8px 16px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 5,
            color: 'var(--text-secondary, #475569)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
          }}
        >
          <div 
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', minWidth: 0, flex: 1 }} 
            onClick={() => {
              const currentPin = pinnedMessages[carouselIndex];
              if (currentPin) {
                const elId = `msg-${currentPin.messageId}`;
                const targetEl = document.getElementById(elId);
                if (targetEl) {
                  targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  targetEl.classList.add('msg-bubble-highlight');
                  setTimeout(() => targetEl.classList.remove('msg-bubble-highlight'), 2000);
                } else {
                  setHighlightedMessageId(currentPin.messageId);
                }
              }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.12)', flexShrink: 0 }}>
              <Pin 
                size={14} 
                fill="var(--chat-primary, #6366f1)" 
                color="var(--chat-primary, #6366f1)" 
                strokeWidth={2} 
                style={{ transform: 'rotate(45deg)' }}
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                <span style={{ fontWeight: '600', color: 'var(--chat-primary, #6366f1)', fontSize: '13px' }}>
                  {pinnedMessages[carouselIndex]?.senderName || 'User'}:
                </span>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary, #0f172a)', fontWeight: '500' }}>
                  {pinnedMessages[carouselIndex]?.text ? stripMarkdown(pinnedMessages[carouselIndex].text) : (pinnedMessages[carouselIndex]?.messageType === 'image' ? '📷 Image' : '📎 Attachment')}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
                <span>
                  Pinned by <strong style={{ color: 'var(--chat-primary, #6366f1)' }}>{
                    pinnedMessages[carouselIndex]?.pinnedBy === currentUser?.id
                      ? 'You'
                      : pinnedMessages[carouselIndex]?.pinnedByName ||
                        conv?.participants?.find(p => p.employeeId === pinnedMessages[carouselIndex]?.pinnedBy || p.id === pinnedMessages[carouselIndex]?.pinnedBy)?.name ||
                        'Someone'
                  }</strong>
                </span>
                <span>•</span>
                <span>📌 {totalPinned || pinnedMessages.length} { (totalPinned || pinnedMessages.length) === 1 ? 'Pinned Message' : 'Pinned Messages'}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '12px', flexShrink: 0 }}>
            <span style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--text-muted, #64748b)', background: 'var(--bg-secondary, #f1f5f9)', padding: '2px 8px', borderRadius: '12px' }}>
              {carouselIndex + 1} / {totalPinned || pinnedMessages.length}
            </span>

            {pinnedMessages.length > 1 && (
              <div style={{ display: 'flex', gap: '3px' }}>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setCarouselIndex(prev => (prev - 1 + pinnedMessages.length) % pinnedMessages.length);
                  }}
                  style={{
                    background: 'var(--bg-secondary, #f1f5f9)',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-primary, #0f172a)',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontWeight: 'bold'
                  }}
                  title="Previous Pinned Message"
                >
                  ‹
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setCarouselIndex(prev => (prev + 1) % pinnedMessages.length);
                  }}
                  style={{
                    background: 'var(--bg-secondary, #f1f5f9)',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-primary, #0f172a)',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontWeight: 'bold'
                  }}
                  title="Next Pinned Message"
                >
                  ›
                </button>
              </div>
            )}

            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowPinBoard(true);
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--chat-primary, #6366f1)',
                fontSize: '12px',
                fontWeight: '600',
                padding: '4px 8px',
                borderRadius: '6px'
              }}
              title="Open PinBoard"
            >
              All Pinned
            </button>
          </div>
        </div>
      )}

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
                onForward={setForwardingMessage}
              />
            </React.Fragment>
          );
        })}

        {/* Typing indicator */}
        <TypingIndicator typingUsers={typing} />

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
              {replyTo.type === "audio" || replyTo.type === "voice" ? "🎤 Voice Message" :
               replyTo.type === "image" ? "📷 Photo" :
               replyTo.type === "video" ? "🎥 Video" :
               replyTo.type === "file" ? `📎 ${replyTo.media?.fileName || "File"}` :
               replyTo.content?.startsWith("data:") ? (
                 replyTo.content.startsWith("data:audio") ? "🎤 Voice Message" :
                 replyTo.content.startsWith("data:image") ? "📷 Photo" :
                 replyTo.content.startsWith("data:video") ? "🎥 Video" : "📎 Attachment"
               ) : replyTo.content?.substring(0, 80)}
            </span>
          </div>
          <button className="chat-reply-close" onClick={() => setReplyTo(null)}>✕</button>
        </div>
      )}

      {/* ── MESSAGE INPUT / BLOCKED CONTACT BANNER ── */}
      {isDirect && (blockedUsers.includes(other?.employeeId) || blockedByUsers.includes(other?.employeeId)) ? (
        <div className="chat-blocked-banner" style={{
          padding: '20px',
          textAlign: 'center',
          backgroundColor: 'var(--bg-card, #1e293b)',
          borderTop: '1px solid var(--border-color, #e2e8f0)',
          color: 'var(--text-muted, #94a3b8)',
          fontSize: '14px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}>
          {blockedUsers.includes(other?.employeeId) ? (
            <>
              <span>🚫 You have blocked this contact. Unblock them to send messages.</span>
              <button 
                onClick={() => unblockUser(other?.employeeId)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'var(--color-primary, #6366f1)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-primary-hover, #4f46e5)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--color-primary, #6366f1)'}
              >
                Unblock {displayName}
              </button>
            </>
          ) : (
            <span>🚫 You cannot reply to this conversation.</span>
          )}
        </div>
      ) : (
        <MessageInput
          activeConvId={activeConvId}
          onSend={handleSend}
          onTypingStart={(isRecording) => handleTypingStart(activeConvId, isRecording)}
          onTypingStop={() => handleTypingStop(activeConvId)}
        />
      )}

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

      {/* ── PINBOARD DRAWER ────────────────────────────────────── */}
      {showPinBoard && (
        <PinBoardDrawer
          conversation={conv}
          currentUser={currentUser}
          onClose={() => setShowPinBoard(false)}
        />
      )}

      {/* Forward message modal */}
      {forwardingMessage && (
        <ForwardMessageModal
          message={forwardingMessage}
          currentUser={currentUser}
          onClose={() => setForwardingMessage(null)}
        />
      )}

      {/* Create Task From Message Modal */}
      {taskMessage && (
        <CreateTaskFromMessageModal
          message={taskMessage}
          onClose={() => setTaskMessage(null)}
        />
      )}

      {/* Create Poll Modal */}
      {showCreatePoll && (
        <CreatePollModal
          conversationId={activeConvId}
          onClose={() => setShowCreatePoll(false)}
        />
      )}
      </div>
    </div>
  );
};

export default ChatWindow;
