import React, { useState } from 'react';

const DeleteChatModal = ({ chatName, onConfirm, onClose }) => {
  const [selectedAction, setSelectedAction] = useState('delete'); // 'delete' or 'clear'

  const handleConfirm = () => {
    onConfirm(selectedAction);
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="new-chat-modal" style={{ maxWidth: '420px' }}>
        {/* Header */}
        <div className="new-chat-modal-header" style={{ borderBottom: 'none', paddingBottom: '10px' }}>
          <div>
            <h3 className="new-chat-modal-title" style={{ color: '#374151' }}>Manage Chat History</h3>
            <p className="new-chat-modal-sub" style={{ marginTop: '5px' }}>
              Choose how you want to manage history for <strong>{chatName}</strong>
            </p>
          </div>
          <button className="new-chat-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Content Radio options */}
        <div style={{ padding: '0 20px 20px 20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          {/* Delete Option */}
          <label style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '12px',
            borderRadius: '8px',
            border: `1.5px solid ${selectedAction === 'delete' ? '#6366f1' : 'var(--border-color, #e5e7eb)'}`,
            background: selectedAction === 'delete' ? '#f5f3ff' : 'transparent',
            cursor: 'pointer',
            transition: 'all 0.2s',
            textTransform: 'none'
          }}>
            <input
              type="radio"
              name="delete-action"
              value="delete"
              checked={selectedAction === 'delete'}
              onChange={() => setSelectedAction('delete')}
              style={{ marginTop: '4px', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: '600', color: '#1f2937', fontSize: '14px' }}>Delete Chat for Me</span>
              <span style={{ fontSize: '12px', color: '#6b7280', marginTop: '3px', lineHeight: '1.4' }}>
                Hides this conversation from your sidebar roster. It will reappear if you receive or send a new message, but past history remains hidden.
              </span>
            </div>
          </label>

          {/* Clear Option */}
          <label style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '12px',
            borderRadius: '8px',
            border: `1.5px solid ${selectedAction === 'clear' ? '#6366f1' : 'var(--border-color, #e5e7eb)'}`,
            background: selectedAction === 'clear' ? '#f5f3ff' : 'transparent',
            cursor: 'pointer',
            transition: 'all 0.2s',
            textTransform: 'none'
          }}>
            <input
              type="radio"
              name="delete-action"
              value="clear"
              checked={selectedAction === 'clear'}
              onChange={() => setSelectedAction('clear')}
              style={{ marginTop: '4px', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: '600', color: '#1f2937', fontSize: '14px' }}>Clear Chat History</span>
              <span style={{ fontSize: '12px', color: '#6b7280', marginTop: '3px', lineHeight: '1.4' }}>
                Clears all existing messages in this conversation. The conversation will remain in your sidebar roster, but the message window will be empty.
              </span>
            </div>
          </label>

        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '15px 20px', borderTop: '1px solid var(--border-color, #e5e7eb)', background: 'var(--bg-light, #f9fafb)', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid var(--border-color, #d1d5db)',
              background: '#fff',
              color: '#374151',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: '#6366f1',
              color: '#fff',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteChatModal;
