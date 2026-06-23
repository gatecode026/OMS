/**
 * @file src/components/ForwardMessageModal.jsx
 * @description WhatsApp-style Modal to forward a message to up to 5 conversations.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../context/ChatContext';
import { useApp } from '../context/AppContext';
import ConversationSelector from './ConversationSelector';

const ForwardMessageModal = ({ message, currentUser, onClose }) => {
  const { forwardMessage } = useChat();
  const { addToast } = useApp();

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const searchRef = useRef(null);

  // Focus search input on load
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const handleToggleSelect = (convId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(convId)) {
        next.delete(convId);
      } else {
        if (next.size >= 5) {
          addToast?.('warning', 'You can only forward to up to 5 conversations');
          return prev;
        }
        next.add(convId);
      }
      return next;
    });
  };

  const handleConfirm = async () => {
    if (selectedIds.size === 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const success = await forwardMessage(message.id, Array.from(selectedIds));
      if (success) {
        onClose();
      }
    } catch (err) {
      console.error('[ForwardMessageModal] failed to forward:', err);
      addToast?.('error', 'Failed to forward message');
    } finally {
      setIsSubmitting(false);
    }
  };

  const count = selectedIds.size;

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && !isSubmitting && onClose()}>
      <div className="new-chat-modal forward-modal" style={{ maxWidth: '440px', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div className="new-chat-modal-header" style={{ padding: '20px 20px 12px', borderBottom: '1px solid var(--chat-border)' }}>
          <div>
            <h3 className="new-chat-modal-title">Forward message</h3>
            <p className="new-chat-modal-sub">Select up to 5 chats</p>
          </div>
          <button className="new-chat-modal-close" onClick={onClose} disabled={isSubmitting}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="new-chat-search-wrap" style={{ padding: '12px 20px', borderBottom: 'none' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
            <svg style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              ref={searchRef}
              type="text"
              className="new-chat-search-input"
              style={{ width: '100%', paddingLeft: '36px', paddingRight: '12px' }}
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Selected Count / Limit Alert */}
        {count > 0 && (
          <div style={{
            padding: '4px 20px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
            fontWeight: '600',
            color: 'var(--chat-primary, #6366f1)'
          }}>
            <span>Selected: {count} / 5</span>
            {count === 5 && <span style={{ color: '#ef4444' }}>Limit reached</span>}
          </div>
        )}

        {/* Conversation List */}
        <div className="new-chat-emp-list" style={{ flex: 1, overflowY: 'auto', maxHeight: '350px' }}>
          <ConversationSelector
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            currentUser={currentUser}
            searchQuery={searchQuery}
          />
        </div>

        {/* Footer actions */}
        <div className="forward-modal-footer" style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--chat-border)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          background: 'var(--bg-card)'
        }}>
          <button
            onClick={onClose}
            className="msg-edit-cancel"
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: '1.5px solid var(--chat-border, #e2e8f0)',
              background: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '13.5px'
            }}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="msg-edit-save"
            style={{
              padding: '8px 24px',
              borderRadius: '20px',
              background: count === 0 ? 'var(--text-muted, #94a3b8)' : 'var(--chat-primary, #6366f1)',
              color: '#fff',
              border: 'none',
              cursor: count === 0 ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '13.5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: count === 0 ? 'none' : '0 2px 8px rgba(99, 102, 241, 0.3)'
            }}
            disabled={count === 0 || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="chat-spinner" style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                <span>Forwarding...</span>
              </>
            ) : (
              <span>Forward {count > 0 ? `(${count})` : ''}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForwardMessageModal;
