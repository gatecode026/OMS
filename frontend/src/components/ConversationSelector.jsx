/**
 * @file src/components/ConversationSelector.jsx
 * @description WhatsApp-style conversation list with multi-select support for forwarding.
 */

import React, { useState, useMemo } from 'react';
import { useChat } from '../context/ChatContext';
import { getOtherParticipant } from '../pages/chat/ConversationsList';
import StatusDot from '../pages/chat/StatusDot';

const ConversationSelector = ({
  selectedIds,
  onToggleSelect,
  currentUser,
  searchQuery
}) => {
  const { conversations, isUserOnline, presenceMap } = useChat();

  // Filter active conversations
  const filtered = useMemo(() => {
    const activeConvs = conversations.filter(c => c.isActive !== false);
    if (!searchQuery.trim()) return activeConvs;
    const q = searchQuery.toLowerCase();
    return activeConvs.filter(conv => {
      if (conv.type === 'group') {
        return conv.name?.toLowerCase().includes(q);
      }
      const other = getOtherParticipant(conv, currentUser?.id);
      return other?.name?.toLowerCase().includes(q);
    });
  }, [conversations, searchQuery, currentUser?.id]);

  const avatarColors = [
    '#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981',
    '#3b82f6','#ef4444','#14b8a6','#f97316','#84cc16'
  ];
  const getAvatarBg = (name) => {
    const letter = (name || '?').charAt(0).toUpperCase();
    return avatarColors[letter.charCodeAt(0) % avatarColors.length];
  };

  return (
    <div className="conv-selector-list">
      {filtered.length === 0 ? (
        <div className="conv-selector-empty">
          <p>No conversations found</p>
        </div>
      ) : (
        filtered.map(conv => {
          const isSelected = selectedIds.has(conv.id);
          const isGroup = conv.type === 'group';
          const other = isGroup ? null : getOtherParticipant(conv, currentUser?.id);
          const displayName = isGroup ? (conv.name || 'Group') : (other?.name || 'Unknown');
          const avatarSrc = isGroup ? conv.avatar : other?.avatar;
          const avatarLetter = displayName.charAt(0).toUpperCase();
          
          const isOnline = isGroup ? false : isUserOnline(other?.employeeId);
          const otherStatus = other ? (presenceMap?.get(other.employeeId)?.status || 'offline') : 'offline';

          const lastMsg = conv.lastMessage;
          const preview = lastMsg
            ? lastMsg.content
              ? lastMsg.content.length > 40
                ? lastMsg.content.substring(0, 40) + '...'
                : lastMsg.content
              : '📎 Attachment'
            : 'No messages yet';

          return (
            <div
              key={conv.id}
              className={`conv-selector-item ${isSelected ? 'selected' : ''}`}
              onClick={() => onToggleSelect(conv.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onToggleSelect(conv.id)}
            >
              {/* Checkbox */}
              <div className="conv-selector-checkbox">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}} // Controlled via row click
                  style={{
                    accentColor: 'var(--chat-primary, #6366f1)',
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer'
                  }}
                />
              </div>

              {/* Avatar */}
              <div className="conv-selector-avatar-wrap" style={{ position: 'relative', flexShrink: 0 }}>
                {avatarSrc ? (
                  <img src={avatarSrc} alt={displayName} className="conv-selector-avatar-img" />
                ) : (
                  <div
                    className="conv-selector-avatar-letter"
                    style={{
                      background: getAvatarBg(displayName),
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: '700',
                      fontSize: '15px'
                    }}
                  >
                    {avatarLetter}
                  </div>
                )}
                {/* Status dot — only for direct chats */}
                {!isGroup && (
                  <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', border: '2px solid var(--bg-card, #fff)', borderRadius: '50%' }}>
                    <StatusDot status={otherStatus} size={9} />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="conv-selector-content" style={{ flex: 1, minWidth: 0, marginLeft: '12px' }}>
                <div className="conv-selector-name-row" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="conv-selector-name" style={{ fontWeight: '600', fontSize: '13.5px', color: 'var(--text-primary)' }}>
                    {displayName}
                  </span>
                  {isGroup && (
                    <span className="conv-selector-group-badge" style={{
                      fontSize: '9px',
                      background: 'var(--color-primary-light, rgba(99, 102, 241, 0.1))',
                      color: 'var(--chat-primary, #6366f1)',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      fontWeight: '700',
                      textTransform: 'uppercase'
                    }}>
                      Group
                    </span>
                  )}
                </div>
                <div className="conv-selector-preview" style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                  {lastMsg?.senderId === currentUser?.id && (
                    <span style={{ color: 'var(--text-muted, #94a3b8)' }}>You: </span>
                  )}
                  {preview}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default ConversationSelector;
