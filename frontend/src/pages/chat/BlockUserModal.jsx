import React from 'react';

const BlockUserModal = ({ userName, onConfirm, onClose }) => {
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="new-chat-modal" style={{ maxWidth: '400px' }}>
        {/* Header */}
        <div className="new-chat-modal-header" style={{ borderBottom: 'none', paddingBottom: '10px' }}>
          <div>
            <h3 className="new-chat-modal-title" style={{ color: '#ef4444' }}>Block User</h3>
            <p className="new-chat-modal-sub" style={{ marginTop: '5px' }}>
              Are you sure you want to block <strong>{userName}</strong>?
            </p>
          </div>
          <button className="new-chat-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Content Description */}
        <div style={{ padding: '0 20px 20px 20px', color: 'var(--text-secondary, #6b7280)', fontSize: '14px', lineHeight: '1.5' }}>
          Blocked contacts will no longer be able to send you messages, start calls, or see your online status. They will not be notified that they have been blocked.
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
            onClick={onConfirm}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: '#ef4444',
              color: '#fff',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Block User
          </button>
        </div>
      </div>
    </div>
  );
};

export default BlockUserModal;
