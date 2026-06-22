/**
 * @file src/pages/chat/NewChatModal.jsx
 * @description Modal to start a new direct chat — search employees, click to open chat.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useChat } from '../../context/ChatContext';

const NewChatModal = ({ currentUser, onClose }) => {
  const { searchEmployees, startDirectChat, isUserOnline } = useChat();

  const [searchQuery, setSearchQuery] = useState('');
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [starting, setStarting] = useState(null); // employeeId being started

  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  // Focus search on open
  useEffect(() => {
    searchRef.current?.focus();
    doSearch('');
  }, []);

  const doSearch = async (q) => {
    setIsLoading(true);
    try {
      const results = await searchEmployees(q);
      setEmployees(results.filter(e => e.id !== currentUser?.id));
    } catch (err) {
      console.error('[NewChatModal] search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  };

  const handleStartChat = async (emp) => {
    setStarting(emp.id);
    try {
      await startDirectChat(emp.id);
      onClose();
    } catch (err) {
      console.error('[NewChatModal] startDirectChat error:', err);
    } finally {
      setStarting(null);
    }
  };

  // Avatar colors
  const avatarColors = [
    '#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981',
    '#3b82f6','#ef4444','#14b8a6','#f97316','#84cc16'
  ];
  const getAvatarBg = (name) =>
    avatarColors[(name?.charCodeAt(0) || 0) % avatarColors.length];

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="new-chat-modal">
        {/* Header */}
        <div className="new-chat-modal-header">
          <div>
            <h3 className="new-chat-modal-title">New Chat</h3>
            <p className="new-chat-modal-sub">Search for people to message</p>
          </div>
          <button className="new-chat-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="new-chat-search-wrap">
          <svg className="new-chat-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            ref={searchRef}
            type="text"
            className="new-chat-search-input"
            placeholder="Search by name, email, or role..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>

        {/* Employee List */}
        <div className="new-chat-emp-list">
          {isLoading ? (
            <div className="new-chat-loading">
              {[1, 2, 3].map(i => (
                <div key={i} className="new-chat-skeleton">
                  <div className="new-chat-skel-avatar" />
                  <div className="new-chat-skel-lines">
                    <div className="new-chat-skel-line new-chat-skel-name" />
                    <div className="new-chat-skel-line new-chat-skel-role" />
                  </div>
                </div>
              ))}
            </div>
          ) : employees.length === 0 ? (
            <div className="new-chat-empty">
              <div className="new-chat-empty-icon">👥</div>
              <p>
                {searchQuery
                  ? `No employees found for "${searchQuery}"`
                  : 'No active employees found'
                }
              </p>
            </div>
          ) : (
            employees.map(emp => {
              const online = isUserOnline(emp.id);
              const isStarting = starting === emp.id;
              const avatarLetter = emp.name?.charAt(0).toUpperCase();
              return (
                <button
                  key={emp.id}
                  className="new-chat-emp-item"
                  onClick={() => handleStartChat(emp)}
                  disabled={isStarting}
                >
                  {/* Avatar */}
                  <div className="new-chat-emp-avatar-wrap">
                    {emp.avatar ? (
                      <img src={emp.avatar} alt={emp.name} className="new-chat-emp-avatar-img" />
                    ) : (
                      <div
                        className="new-chat-emp-avatar-letter"
                        style={{ background: getAvatarBg(emp.name) }}
                      >
                        {avatarLetter}
                      </div>
                    )}
                    {online && <span className="new-chat-emp-online-dot" />}
                  </div>

                  {/* Info */}
                  <div className="new-chat-emp-info">
                    <span className="new-chat-emp-name">{emp.name}</span>
                    <span className="new-chat-emp-role">
                      {emp.designation || emp.department || emp.roleId || 'Employee'}
                    </span>
                  </div>

                  {/* Status / Loading */}
                  {isStarting ? (
                    <div className="new-chat-emp-spinner" />
                  ) : (
                    <span className={`new-chat-emp-status ${online ? 'new-chat-emp-online' : 'new-chat-emp-offline'}`}>
                      {online ? 'Online' : 'Offline'}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default NewChatModal;
