/**
 * @file src/pages/chat/ConversationsList.jsx
 * @description Left sidebar — all conversations with search + New Chat button.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { useCall } from '../../context/CallContext';
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

const getFileDetails = (mimeType, fileName) => {
  const name = (fileName || '').toLowerCase();
  const mime = (mimeType || '').toLowerCase();
  if (mime.includes('pdf') || name.endsWith('.pdf'))
    return { icon: '📄', color: '#ef4444' };
  if (mime.includes('word') || name.endsWith('.doc') || name.endsWith('.docx'))
    return { icon: '📝', color: '#2563eb' };
  if (mime.includes('excel') || name.endsWith('.xls') || name.endsWith('.xlsx'))
    return { icon: '📊', color: '#16a34a' };
  if (mime.includes('zip') || name.endsWith('.zip'))
    return { icon: '🗜️', color: '#7c3aed' };
  if (mime.startsWith('image/'))
    return { icon: '📷', color: '#06b6d4' };
  if (mime.startsWith('video/'))
    return { icon: '🎥', color: '#f59e0b' };
  if (mime.startsWith('audio/'))
    return { icon: '🎵', color: '#ec4899' };
  return { icon: '📎', color: '#64748b' };
};

const formatSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
};

const categoryHeaderStyle = {
  padding: '10px 14px 4px',
  fontSize: '11px',
  fontWeight: '700',
  textTransform: 'uppercase',
  color: 'var(--text-muted, #888)',
  letterSpacing: '0.05em',
  borderBottom: '1px solid var(--chat-border, rgba(0,0,0,0.05))',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between'
};

const categoryBadgeStyle = {
  fontSize: '10px',
  background: 'var(--bg-hover, rgba(0,0,0,0.05))',
  padding: '1px 5px',
  borderRadius: '4px'
};

const searchItemStyle = {
  display: 'flex',
  gap: '10px',
  padding: '10px 14px',
  cursor: 'pointer',
  borderBottom: '1px solid var(--chat-border, rgba(0,0,0,0.03))',
  transition: 'background 0.2s',
  alignItems: 'center'
};

const avatarStyle = {
  width: '28px',
  height: '28px',
  borderRadius: '50%',
  backgroundColor: 'var(--chat-border, #e2e8f0)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: '600',
  fontSize: '11px',
  color: 'var(--chat-primary, #6366f1)',
  overflow: 'hidden',
  flexShrink: 0
};

// ── Component ─────────────────────────────────────────────────────────────────

const ConversationsList = ({ currentUser, onSelectConversation }) => {
  const { initiateCall, callState } = useCall();
  const {
    conversations, activeConvId, isLoadingConvs,
    unreadCounts, isUserOnline, mutedConversations,
    currentUserStatus, presenceMap, setUserStatus,
    pinConversation, unpinConversation, muteConversation, unmuteConversation,
    apiFetch, startDirectChat,
    setHighlightedMessageId,
    // Threading
    threadActivityList, isLoadingThreadActivity, fetchThreadActivity,
    openThread, activeThread, openConversation, threadUnreadCounts
  } = useChat();

  const [searchQuery, setSearchQuery] = useState(() => {
    const q = window.CHAT_GLOBAL_SEARCH_QUERY || '';
    try {
      delete window.CHAT_GLOBAL_SEARCH_QUERY;
    } catch {
      window.CHAT_GLOBAL_SEARCH_QUERY = undefined;
    }
    return q;
  });
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [globalResults, setGlobalResults] = useState({ conversations: [], messages: [], files: [], contacts: [] });
  const [isGlobalSearching, setIsGlobalSearching] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch global search results
  useEffect(() => {
    if (!debouncedSearchQuery) {
      setGlobalResults({ conversations: [], messages: [], files: [], contacts: [] });
      setIsGlobalSearching(false);
      return;
    }

    const fetchGlobalSearch = async () => {
      setIsGlobalSearching(true);
      try {
        const res = await apiFetch(`/chat/search?q=${encodeURIComponent(debouncedSearchQuery)}&category=all&page=1&limit=8`);
        if (res.status === 'success') {
          setGlobalResults(res.data);
        }
      } catch (err) {
        console.error('[ChatGlobalSearch] Failed to fetch:', err);
      } finally {
        setIsGlobalSearching(false);
      }
    };

    fetchGlobalSearch();
  }, [debouncedSearchQuery, apiFetch]);

  // Keyboard shortcut listener for Ctrl+K/Cmd+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('.conv-search-input');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'calls' | 'threads'
  const [callLogs, setCallLogs] = useState([]);
  const [isLoadingCalls, setIsLoadingCalls] = useState(false);

  const fetchCallLogs = useCallback(async () => {
    setIsLoadingCalls(true);
    try {
      const res = await apiFetch('/chat/calls/history');
      if (res.status === 'success') {
        setCallLogs(res.data || []);
      }
    } catch (err) {
      console.error('[Chat] Failed to fetch call logs:', err);
    } finally {
      setIsLoadingCalls(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    if (activeTab === 'calls') {
      fetchCallLogs();
    }
  }, [activeTab, fetchCallLogs]);

  useEffect(() => {
    if (activeTab === 'threads') {
      fetchThreadActivity();
    }
  }, [activeTab, fetchThreadActivity]);

  const handleThreadClick = async (thread) => {
    await openConversation(thread.conversationId);
    await openThread(thread.rootMessageId);
  };

  const handleCallLogClick = async (targetEmployeeId) => {
    try {
      const conv = await startDirectChat(targetEmployeeId);
      if (onSelectConversation) {
        onSelectConversation(conv.id);
      }
    } catch (err) {
      console.error('[CallLogs] Failed to open conversation:', err);
    }
  };

  const handleRedial = async (e, otherUser, callType) => {
    e.stopPropagation();
    try {
      const conv = await startDirectChat(otherUser.id);
      initiateCall(otherUser, callType, conv.id);
    } catch (err) {
      console.error('[CallLogs] Redial error:', err);
    }
  };

  const [showNewChat, setShowNewChat] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  // Filter conversations/calls by search query
  const filtered = useMemo(() => {
    if (activeTab === 'chats') {
      if (!searchQuery.trim()) return conversations;
      const q = searchQuery.toLowerCase();
      return conversations.filter(conv => {
        if (conv.type === 'group') {
          return conv.name?.toLowerCase().includes(q);
        }
        const other = getOtherParticipant(conv, currentUser?.id);
        return other?.name?.toLowerCase().includes(q);
      });
    } else {
      if (!searchQuery.trim()) return callLogs;
      const q = searchQuery.toLowerCase();
      return callLogs.filter(call => {
        const otherName = call.callerId === currentUser?.id ? call.calleeName : call.callerName;
        return otherName?.toLowerCase().includes(q);
      });
    }
  }, [conversations, callLogs, searchQuery, activeTab, currentUser?.id]);

  // Sort: Pinned chats first, then by last activity time (chats tab only)
  const sorted = useMemo(() => {
    if (activeTab === 'calls') return filtered;
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
  }, [filtered, activeTab, currentUser?.id]);

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

        {/* Tabs for Chats vs Calls vs Threads */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--chat-border, #e2e8f0)',
          margin: '10px 0',
          padding: '2px 0'
        }}>
          <button
            onClick={() => setActiveTab('chats')}
            style={{
              flex: 1,
              padding: '8px 0',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'chats' ? '2.5px solid var(--chat-primary, #6366f1)' : '2.5px solid transparent',
              color: activeTab === 'chats' ? 'var(--chat-primary, #6366f1)' : 'var(--text-secondary, #64748b)',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'center'
            }}
          >
            Chats
          </button>
          <button
            onClick={() => setActiveTab('calls')}
            style={{
              flex: 1,
              padding: '8px 0',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'calls' ? '2.5px solid var(--chat-primary, #6366f1)' : '2.5px solid transparent',
              color: activeTab === 'calls' ? 'var(--chat-primary, #6366f1)' : 'var(--text-secondary, #64748b)',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'center'
            }}
          >
            Call Logs
          </button>
          <button
            onClick={() => setActiveTab('threads')}
            style={{
              flex: 1,
              padding: '8px 0',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'threads' ? '2.5px solid var(--chat-primary, #6366f1)' : '2.5px solid transparent',
              color: activeTab === 'threads' ? 'var(--chat-primary, #6366f1)' : 'var(--text-secondary, #64748b)',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            Threads
            {Object.values(threadUnreadCounts || {}).reduce((a, b) => a + b, 0) > 0 && (
              <span className="conv-list-total-badge" style={{ padding: '1px 5px', fontSize: '9.5px', background: '#ef4444' }}>
                {Object.values(threadUnreadCounts || {}).reduce((a, b) => a + b, 0)}
              </span>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="conv-search-wrapper">
          <svg className="conv-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            className="conv-search-input"
            placeholder="Search messages, files, contacts..."
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
        {activeTab === 'chats' ? (
          searchQuery.trim() ? (
            isGlobalSearching ? (
              <div className="conv-list-loading">
                {[1, 2, 3].map(i => (
                  <div key={i} className="conv-skeleton">
                    <div className="conv-skeleton-avatar" />
                    <div className="conv-skeleton-lines">
                      <div className="conv-skeleton-line conv-skeleton-name" />
                      <div className="conv-skeleton-line conv-skeleton-msg" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              (() => {
                const totalGlobalCount =
                  (globalResults.conversations?.length || 0) +
                  (globalResults.messages?.length || 0) +
                  (globalResults.files?.length || 0) +
                  (globalResults.contacts?.length || 0);

                if (totalGlobalCount === 0) {
                  return (
                    <div className="conv-list-empty">
                      <div className="conv-empty-icon">🔍</div>
                      <p>No global matches found for "<strong>{searchQuery}</strong>"</p>
                    </div>
                  );
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
                    {/* Conversations */}
                    {globalResults.conversations?.length > 0 && (
                      <div>
                        <div style={categoryHeaderStyle}>
                          <span>Conversations</span>
                          <span style={categoryBadgeStyle}>{globalResults.conversations.length}</span>
                        </div>
                        {globalResults.conversations.map(conv => {
                          const other = getOtherParticipant(conv, currentUser?.id);
                          const isOnline = conv.type === 'direct' ? isUserOnline(other?.employeeId) : false;
                          const otherStatus = other ? (presenceMap?.get(other.employeeId)?.status || 'offline') : 'offline';
                          return (
                            <ConversationItem
                              key={conv.id}
                              conversation={conv}
                              isActive={activeConvId === conv.id}
                              onClick={() => {
                                onSelectConversation(conv.id);
                                setSearchQuery('');
                              }}
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
                        })}
                      </div>
                    )}

                    {/* Contacts */}
                    {globalResults.contacts?.length > 0 && (
                      <div>
                        <div style={categoryHeaderStyle}>
                          <span>Contacts</span>
                          <span style={categoryBadgeStyle}>{globalResults.contacts.length}</span>
                        </div>
                        {globalResults.contacts.map(contact => (
                          <div
                            key={contact.id}
                            style={searchItemStyle}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--chat-hover, #f1f5f9)'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            onClick={async () => {
                              try {
                                const conv = await startDirectChat(contact.id);
                                if (onSelectConversation) {
                                  onSelectConversation(conv.id);
                                }
                                setSearchQuery('');
                              } catch (err) {
                                console.error('[ChatSearch] Failed to open direct chat:', err);
                              }
                            }}
                          >
                            <div style={avatarStyle}>
                              {contact.avatar ? (
                                <img src={contact.avatar} alt={contact.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <span>{contact.name?.charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {contact.name}
                              </div>
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {contact.designation} · {contact.department}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Messages */}
                    {globalResults.messages?.length > 0 && (
                      <div>
                        <div style={categoryHeaderStyle}>
                          <span>Messages</span>
                          <span style={categoryBadgeStyle}>{globalResults.messages.length}</span>
                        </div>
                        {globalResults.messages.map(msg => (
                          <div
                            key={msg.id}
                            style={searchItemStyle}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--chat-hover, #f1f5f9)'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            onClick={() => {
                              setHighlightedMessageId(msg.id);
                              onSelectConversation(msg.conversationId);
                              setSearchQuery('');
                            }}
                          >
                            <div style={avatarStyle}>
                              {msg.senderAvatar ? (
                                <img src={msg.senderAvatar} alt={msg.senderName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <span>{msg.senderName?.charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                                  {msg.senderName}
                                </span>
                                <span style={{ fontSize: '9px', color: 'var(--text-muted, #94a3b8)', flexShrink: 0 }}>
                                  {msg.createdAt ? new Date(msg.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                                </span>
                              </div>
                              <div
                                style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                                dangerouslySetInnerHTML={{ __html: msg.highlightedMatch }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Files */}
                    {globalResults.files?.length > 0 && (
                      <div>
                        <div style={categoryHeaderStyle}>
                          <span>Shared Files</span>
                          <span style={categoryBadgeStyle}>{globalResults.files.length}</span>
                        </div>
                        {globalResults.files.map(file => {
                          const fInfo = getFileDetails(file.media?.mimeType || file.type, file.media?.fileName);
                          return (
                            <div
                              key={file.id}
                              style={searchItemStyle}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--chat-hover, #f1f5f9)'}
                              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                              onClick={() => {
                                setHighlightedMessageId(file.id);
                                onSelectConversation(file.conversationId);
                                setSearchQuery('');
                              }}
                            >
                              <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '6px',
                                backgroundColor: fInfo.color + '15',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px',
                                flexShrink: 0
                              }}>
                                {fInfo.icon}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {file.media?.fileName || 'Unnamed File'}
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                                  <span>{formatSize(file.media?.fileSize)}</span>
                                  <span>·</span>
                                  <span>{file.senderName}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()
            )
          ) : (
            isLoadingConvs ? (
              <div className="conv-list-loading">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="conv-skeleton" style={{ contentVisibility: 'auto' }}>
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
                <div className="conv-empty-icon">💬</div>
                <p>No conversations yet</p>
                <button className="conv-start-btn" onClick={() => setShowNewChat(true)}>
                  Start a Chat
                </button>
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
            )
          )
        ) : activeTab === 'calls' ? (
          callLogs.length === 0 ? (
            <div className="conv-list-empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '150px', color: 'var(--text-muted, #94a3b8)' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>📞</div>
              <p>{searchQuery ? 'No calls matched your search' : 'No call history yet'}</p>
            </div>
          ) : (
            filtered.map(call => {
              const isOutgoing = call.callerId === currentUser?.id;
              const otherId = isOutgoing ? call.calleeId : call.callerId;
              const otherName = isOutgoing ? call.calleeName : call.callerName;
              const otherAvatar = isOutgoing ? call.calleeAvatar : call.callerAvatar;
              const isVideo = call.callType === 'video';
              const isMissed = call.status === 'missed';
              const isRejected = call.status === 'rejected';
              
              // Format duration
              const minutes = Math.floor(call.duration / 60);
              const seconds = call.duration % 60;
              const durationStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

              return (
                <div
                  key={call.id}
                  onClick={() => handleCallLogClick(otherId)}
                  className="conv-item"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--chat-border, #f1f5f9)',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    position: 'relative'
                  }}
                >
                  {/* Avatar */}
                  <div style={{ position: 'relative', width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--color-primary-light, #f0f4ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--color-primary, #6366f1)', marginRight: '12px', flexShrink: 0, overflow: 'hidden' }}>
                    {otherAvatar ? (
                      <img src={otherAvatar} alt={otherName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      otherName?.charAt(0).toUpperCase()
                    )}
                  </div>

                  {/* Call Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '3px' }}>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary, #1e293b)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {otherName}
                      </h4>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', flexShrink: 0 }}>
                        {formatTime(call.createdAt)}
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: isMissed ? '#ef4444' : 'var(--text-muted, #64748b)' }}>
                      {/* Direction Icon */}
                      {isOutgoing ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--chat-primary, #6366f1)" strokeWidth="3" style={{ flexShrink: 0 }}>
                          <line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>
                        </svg>
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isMissed ? '#ef4444' : '#22c55e'} strokeWidth="3" style={{ flexShrink: 0 }}>
                          <line x1="17" y1="7" x2="7" y2="17"/><polyline points="17 17 7 17 7 7"/>
                        </svg>
                      )}
                      
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {isVideo ? 'Video' : 'Voice'} Call · {isMissed ? 'Missed' : isRejected ? 'Declined' : `Ended (${durationStr})`}
                      </span>
                    </div>
                  </div>

                  {/* Quick Call Action Buttons */}
                  <div style={{ display: 'flex', gap: '8px', marginLeft: '12px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    {/* Voice Call Redial */}
                    <button
                      onClick={(e) => handleRedial(e, { id: otherId, name: otherName, avatar: otherAvatar }, 'audio')}
                      disabled={callState !== 'idle'}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '6px',
                        borderRadius: '50%',
                        cursor: callState !== 'idle' ? 'not-allowed' : 'pointer',
                        color: 'var(--text-muted, #64748b)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.2s, color 0.2s'
                      }}
                      onMouseEnter={e => { if (callState === 'idle') { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'; e.currentTarget.style.color = 'var(--chat-primary, #6366f1)'; } }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted, #64748b)'; }}
                      title="Voice Call"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.38 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                    </button>

                    {/* Video Call Redial */}
                    <button
                      onClick={(e) => handleRedial(e, { id: otherId, name: otherName, avatar: otherAvatar }, 'video')}
                      disabled={callState !== 'idle'}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '6px',
                        borderRadius: '50%',
                        cursor: callState !== 'idle' ? 'not-allowed' : 'pointer',
                        color: 'var(--text-muted, #64748b)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.2s, color 0.2s'
                      }}
                      onMouseEnter={e => { if (callState === 'idle') { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'; e.currentTarget.style.color = 'var(--chat-primary, #6366f1)'; } }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted, #64748b)'; }}
                      title="Video Call"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polygon points="23 7 16 12 23 17 23 7"/>
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })
          )
        ) : (
          // Threads tab activity rendering
          isLoadingThreadActivity && threadActivityList.length === 0 ? (
            <div className="conv-list-loading" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px 20px', color: 'var(--text-muted, #64748b)' }}>
              <div className="conv-spinner" style={{ width: '24px', height: '24px', border: '2.5px solid var(--chat-primary, #6366f1)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
              <span>Loading threads...</span>
            </div>
          ) : threadActivityList.length === 0 ? (
            <div className="conv-list-empty" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted, #64748b)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>💬</div>
              <p style={{ margin: 0, fontSize: '13.5px' }}>No active threads yet.</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.8 }}>Reply to any message to start one!</p>
            </div>
          ) : (
            threadActivityList.map(thread => {
              const rootAvatar = thread.createdByDetails?.avatar;
              const rootName = thread.createdByDetails?.name || 'Someone';
              const isActive = activeThread?._id === thread.threadId;
              
              return (
                <div
                  key={thread.threadId}
                  onClick={() => handleThreadClick(thread)}
                  className={`conv-item ${isActive ? 'conv-item-active' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--chat-border, #f1f5f9)',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    position: 'relative',
                    backgroundColor: isActive ? 'var(--chat-active-bg, #eef2ff)' : 'transparent'
                  }}
                >
                  {/* Creator Avatar */}
                  <div style={{ position: 'relative', width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--color-primary-light, #f0f4ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--color-primary, #6366f1)', marginRight: '12px', flexShrink: 0, overflow: 'hidden' }}>
                    {rootAvatar ? (
                      <img src={rootAvatar} alt={rootName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      rootName.charAt(0).toUpperCase()
                    )}
                  </div>

                  {/* Thread details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '3px' }}>
                      <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary, #1e293b)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Thread by {rootName}
                      </h4>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', flexShrink: 0 }}>
                        {formatTime(thread.lastReplyAt)}
                      </span>
                    </div>
                    
                    <div style={{ fontSize: '12.5px', color: 'var(--text-primary, #334155)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px' }}>
                      <strong>{thread.rootMsgSenderName}:</strong> {thread.rootMessagePreview}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'var(--chat-primary, #6366f1)', fontWeight: '500' }}>
                        💬 {thread.replyCount} {thread.replyCount === 1 ? 'reply' : 'replies'}
                        {thread.status !== 'open' && ` · ${thread.status === 'resolved' ? '✓ Resolved' : '🔒 Closed'}`}
                      </span>
                      {thread.unreadCount > 0 && (
                        <span 
                          className="conv-list-total-badge" 
                          style={{ 
                            background: '#ef4444', 
                            color: '#fff', 
                            fontSize: '10px', 
                            padding: '2px 6px', 
                            borderRadius: '10px',
                            fontWeight: 'bold' 
                          }}
                        >
                          {thread.unreadCount} new
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )
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
