/**
 * @file src/pages/chat/ConversationsList.jsx
 * @description Left sidebar — all conversations with search + New Chat button.
 */

import React, { useState, useMemo } from 'react';
import { useChat } from '../../context/ChatContext';
import ConversationItem from './ConversationItem';
import NewChatModal from './NewChatModal';
import CreateGroupModal from './CreateGroupModal';
import StatusDot from './StatusDot';
import StatusPicker from './StatusPicker';

// ── Helpers ───────────────────────────────────────────────────────────────────

export const getOtherParticipant = (conv, currentUserId) => {
  if (conv.type !== 'direct') return null;
  return conv.participants?.find(p => p.employeeId !== currentUserId) || null;
};

export const formatTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  } else {
    return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
  }
};

// ── Component ─────────────────────────────────────────────────────────────────

const ConversationsList = ({ currentUser, onSelectConversation }) => {
  const {
    conversations, activeConvId, isLoadingConvs,
    unreadCounts, isUserOnline, mutedConversations,
    currentUserStatus, presenceMap, setUserStatus,
    pinConversation, unpinConversation, muteConversation, unmuteConversation
  } = useChat();

  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  // Filter conversations by search query
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(conv => {
      if (conv.type === 'group') {
        return conv.name?.toLowerCase().includes(q);
      }
      const other = getOtherParticipant(conv, currentUser?.id);
      return other?.name?.toLowerCase().includes(q);
    });
  }, [conversations, searchQuery, currentUser?.id]);

  // Sort: Pinned chats first, then by last activity time
  const sorted = useMemo(() => {
    let list = [...filtered];
    return list.sort((a, b) => {
      const aPinned = a.pinnedBy?.some(p => p.employeeId === currentUser?.id);
      const bPinned = b.pinnedBy?.some(p => p.employeeId === currentUser?.id);

      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      if (aPinned && bPinned) {
        const aPinnedAt = a.pinnedBy.find(p => p.employeeId === currentUser?.id)?.pinnedAt || a.lastActivityAt;
        const bPinnedAt = b.pinnedBy.find(p => p.employeeId === currentUser?.id)?.pinnedAt || b.lastActivityAt;
        return new Date(bPinnedAt) - new Date(aPinnedAt);
      }

      return new Date(b.lastActivityAt || b.createdAt) - new Date(a.lastActivityAt || a.createdAt);
    });
  }, [filtered, currentUser?.id]);

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="conv-list-container">
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="conv-list-header">
        <div className="conv-list-header-top">
          <div className="conv-list-title-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
            <div 
              style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}
              onClick={() => setShowStatusPicker(!showStatusPicker)}
            >
              {currentUser?.avatar ? (
                <img 
                  src={currentUser.avatar} 
                  alt={currentUser.name} 
                  style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} 
                />
              ) : (
                <div 
                  style={{ 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '50%', 
                    backgroundColor: 'var(--color-primary, #6366f1)', 
                    color: 'white', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '14px'
                  }}
                >
                  {currentUser?.name?.charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', border: '2px solid var(--bg-card, #fff)', borderRadius: '50%' }}>
                <StatusDot status={currentUserStatus?.status || 'available'} size={10} />
              </div>
            </div>
            <h2 className="conv-list-title">Messages</h2>
            {totalUnread > 0 && (
              <span className="conv-list-total-badge">{totalUnread}</span>
            )}
            {showStatusPicker && (
              <StatusPicker 
                currentStatus={currentUserStatus} 
                onStatusChange={setUserStatus} 
                onClose={() => setShowStatusPicker(false)} 
              />
            )}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className="conv-new-chat-btn"
              onClick={() => setShowCreateGroup(true)}
              title="New Group"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </button>
            <button
              className="conv-new-chat-btn"
              onClick={() => setShowNewChat(true)}
              title="New Chat"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                <line x1="12" y1="8" x2="12" y2="16"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="conv-search-wrapper">
          <svg className="conv-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            className="conv-search-input"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="conv-search-clear" onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>
      </div>

      {/* ── List ─────────────────────────────────────────────── */}
      <div className="conv-list-items">
        {isLoadingConvs ? (
          <div className="conv-list-loading">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="conv-skeleton">
                <div className="conv-skeleton-avatar" />
                <div className="conv-skeleton-lines">
                  <div className="conv-skeleton-line conv-skeleton-name" />
                  <div className="conv-skeleton-line conv-skeleton-msg" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="conv-list-empty">
            {searchQuery ? (
              <>
                <div className="conv-empty-icon">🔍</div>
                <p>No conversations match "<strong>{searchQuery}</strong>"</p>
              </>
            ) : (
              <>
                <div className="conv-empty-icon">💬</div>
                <p>No conversations yet</p>
                <button className="conv-start-btn" onClick={() => setShowNewChat(true)}>
                  Start a Chat
                </button>
              </>
            )}
          </div>
        ) : (
          sorted.map(conv => {
            const other = getOtherParticipant(conv, currentUser?.id);
            const isOnline = conv.type === 'direct' ? isUserOnline(other?.employeeId) : false;
            const otherStatus = other ? (presenceMap?.get(other.employeeId)?.status || 'offline') : 'offline';
            return (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={activeConvId === conv.id}
                onClick={() => onSelectConversation(conv.id)}
                unreadCount={unreadCounts[conv.id] || 0}
                isOnline={isOnline}
                otherStatus={otherStatus}
                isMuted={mutedConversations?.has(conv.id)}
                formatTime={formatTime}
                getOtherParticipant={(c) => getOtherParticipant(c, currentUser?.id)}
                currentUser={currentUser}
                onPin={pinConversation}
                onUnpin={unpinConversation}
                onMute={muteConversation}
                onUnmute={unmuteConversation}
              />
            );
          })
        )}
      </div>

      {/* ── New Chat Modal ────────────────────────────────────── */}
      {showNewChat && (
        <NewChatModal
          currentUser={currentUser}
          onClose={() => setShowNewChat(false)}
        />
      )}

      {/* ── Create Group Modal ────────────────────────────────── */}
      {showCreateGroup && (
        <CreateGroupModal
          currentUser={currentUser}
          onClose={() => setShowCreateGroup(false)}
        />
      )}
    </div>
  );
};

export default ConversationsList;
