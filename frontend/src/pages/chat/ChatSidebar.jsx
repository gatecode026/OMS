/**
 * @file src/pages/chat/ChatSidebar.jsx
 * @description Slide-in right panel for conversation info (3-dot menu) for direct chats.
 */

import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useChat } from '../../context/ChatContext';

const ChatSidebar = ({ conversation: conv, currentUser, onClose }) => {
  const { token, addToast, showConfirm } = useApp();
  const { clearChat } = useChat();

  const handleClearChat = () => {
    showConfirm(
      'Clear Chat',
      'Are you sure you want to clear all messages in this chat? This action cannot be undone.',
      async () => {
        const success = await clearChat(conv.id);
        if (success) {
          addToast('success', 'Chat history cleared successfully');
          onClose();
        } else {
          addToast('error', 'Failed to clear chat history');
        }
      },
      'danger'
    );
  };
  const [employeeInfo, setEmployeeInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  const isDirect = conv?.type === 'direct';
  const other = isDirect
    ? conv.participants?.find(p => p.employeeId !== currentUser?.id)
    : null;

  const displayName = isDirect ? (other?.name || 'Unknown') : (conv?.name || 'Group');
  const avatarLetter = displayName.charAt(0).toUpperCase();

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Fetch full employee details for contact details
  useEffect(() => {
    if (!isDirect || !other?.employeeId || !token) return;

    const fetchEmployeeDetails = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${window.API_URL || 'http://localhost:5000'}/api/v1/employees/${other.employeeId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (data.status === 'success') {
          setEmployeeInfo(data.data);
        }
      } catch (err) {
        console.error('[ChatSidebar] Error fetching employee details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeDetails();
  }, [other?.employeeId, isDirect, token]);

  return (
    <>
      {/* Backdrop */}
      <div className="chat-sidebar-backdrop" onClick={onClose} />

      {/* Panel */}
      <div className="chat-sidebar-panel">
        {/* Header */}
        <div className="chat-sidebar-header">
          <h3 className="chat-sidebar-title">
            {isDirect ? 'Contact Info' : 'Group Info'}
          </h3>
          <button className="chat-sidebar-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Profile area */}
        <div className="chat-sidebar-profile">
          <div className="chat-sidebar-avatar">
            {(() => {
              const avatarSrc = isDirect ? other?.avatar : conv?.avatar;
              const hasValidAvatar = avatarSrc && 
                                     typeof avatarSrc === 'string' &&
                                     avatarSrc.trim() !== '' &&
                                     avatarSrc !== 'null' &&
                                     avatarSrc !== 'undefined';
              return hasValidAvatar ? (
                <>
                  <img 
                    src={avatarSrc} 
                    alt={displayName} 
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const sib = e.target.nextSibling;
                      if (sib) sib.style.display = 'flex';
                    }}
                  />
                  <span style={{ display: 'none' }}>{avatarLetter}</span>
                </>
              ) : (
                <span>{avatarLetter}</span>
              );
            })()}
          </div>
          <h4 className="chat-sidebar-name">{displayName}</h4>
          {!isDirect && (
            <p className="chat-sidebar-meta">
              {conv?.participants?.length || 0} members · Group chat
            </p>
          )}
          {isDirect && (employeeInfo?.designation || other?.designation) && (
            <p className="chat-sidebar-meta">{employeeInfo?.designation || other?.designation}</p>
          )}
        </div>

        {/* Contact Details (Direct Chat) */}
        {isDirect && (
          <div className="chat-sidebar-section">
            <h5 className="chat-sidebar-section-title">Contact Details</h5>
            {loading ? (
              <div style={{ padding: '8px 0', fontSize: '13.5px', color: 'var(--text-muted)' }}>
                Loading details...
              </div>
            ) : employeeInfo ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '4px' }}>
                {employeeInfo.designation && (
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Designation</div>
                    <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginTop: '2px', fontWeight: 500 }}>{employeeInfo.designation}</div>
                  </div>
                )}
                {employeeInfo.department && (
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Department</div>
                    <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginTop: '2px', fontWeight: 500 }}>{employeeInfo.department}</div>
                  </div>
                )}
                {employeeInfo.email && (
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email Address</div>
                    <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginTop: '2px', wordBreak: 'break-all', fontWeight: 500 }}>{employeeInfo.email}</div>
                  </div>
                )}
                {employeeInfo.phone && (
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phone Number</div>
                    <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginTop: '2px', fontWeight: 500 }}>{employeeInfo.phone}</div>
                  </div>
                )}
                {employeeInfo.branch && (
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Branch</div>
                    <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginTop: '2px', fontWeight: 500 }}>{employeeInfo.branch}</div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No contact information available.
              </div>
            )}
          </div>
        )}

        {/* Description (groups) */}
        {!isDirect && conv?.description && (
          <div className="chat-sidebar-section">
            <h5 className="chat-sidebar-section-title">Description</h5>
            <p className="chat-sidebar-section-body">{conv.description}</p>
          </div>
        )}

        {/* Participants (groups) */}
        {!isDirect && conv?.participants && (
          <div className="chat-sidebar-section">
            <h5 className="chat-sidebar-section-title">
              Members ({conv.participants.length})
            </h5>
            <div className="chat-sidebar-members">
              {conv.participants.map(p => (
                <div key={p.employeeId} className="chat-sidebar-member">
                  <div className="chat-sidebar-member-avatar">
                    {(() => {
                      const hasValidAvatar = p.avatar && 
                                             typeof p.avatar === 'string' &&
                                             p.avatar.trim() !== '' &&
                                             p.avatar !== 'null' &&
                                             p.avatar !== 'undefined';
                      const letter = p.name?.charAt(0).toUpperCase() || '?';
                      return hasValidAvatar ? (
                        <>
                          <img 
                            src={p.avatar} 
                            alt={p.name} 
                            onError={(e) => {
                              e.target.style.display = 'none';
                              const sib = e.target.nextSibling;
                              if (sib) sib.style.display = 'flex';
                            }}
                          />
                          <span style={{ display: 'none' }}>{letter}</span>
                        </>
                      ) : (
                        <span>{letter}</span>
                      );
                    })()}
                  </div>
                  <div className="chat-sidebar-member-info">
                    <span className="chat-sidebar-member-name">
                      {p.name}
                      {p.employeeId === currentUser?.id && ' (You)'}
                    </span>
                    {p.isAdmin && (
                      <span className="chat-sidebar-member-role">Admin</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="chat-sidebar-actions">
          <button 
            className="chat-sidebar-action chat-sidebar-action-danger"
            onClick={handleClearChat}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            </svg>
            Clear Chat
          </button>
        </div>
      </div>
    </>
  );
};

export default ChatSidebar;
