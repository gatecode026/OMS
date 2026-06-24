import React, { useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import ConversationItem from './ConversationItem';

const ArchivedChats = ({ currentUser, onBack, onSelectConversation }) => {
  const {
    archivedConversations,
    fetchArchivedConversations,
    unarchiveConversation,
    activeConvId,
    unreadCounts,
    isUserOnline,
    presenceMap,
    mutedConversations,
    pinConversation,
    unpinConversation,
    muteConversation,
    unmuteConversation
  } = useChat();

  useEffect(() => {
    fetchArchivedConversations?.();
  }, [fetchArchivedConversations]);

  const getOtherParticipant = (conv, currentUserId) => {
    if (conv.type !== 'direct') return null;
    return conv.participants?.find(p => p.employeeId !== currentUserId) || null;
  };

  const formatTime = (timestamp) => {
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

  return (
    <div className="conv-list-container" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="conv-list-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px' }}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-primary, #1f2937)',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-light, #f3f4f6)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
        <h2 className="conv-list-title" style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Archived Chats</h2>
      </div>

      {/* List Items */}
      <div className="conv-list-items" style={{ flex: 1, overflowY: 'auto' }}>
        {archivedConversations.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: 'var(--text-secondary, #6b7280)',
            fontSize: '14px'
          }}>
            <span style={{ fontSize: '36px', display: 'block', marginBottom: '10px' }}>📥</span>
            No archived chats.
          </div>
        ) : (
          archivedConversations.map(conv => {
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
                isArchivedView={true}
                onUnarchive={() => unarchiveConversation?.(conv.id)}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

export default ArchivedChats;
