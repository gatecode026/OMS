import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../../context/ChatContext';
import { useApp } from '../../context/AppContext';

const ChatPrivacySettings = () => {
  const navigate = useNavigate();
  const { currentUser } = useApp();
  const {
    blockedUsers,
    unblockUser,
    blockUser,
    searchEmployees,
    isUserOnline,
    hiddenConversations,
    fetchHiddenConversations,
    unhideConversation
  } = useChat();

  const [searchQuery, setSearchQuery] = useState('');
  const [employeesList, setEmployeesList] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hydratedBlockedUsers, setHydratedBlockedUsers] = useState([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);

  // Hydrate blocked users details by searching them
  useEffect(() => {
    const loadBlockedDetails = async () => {
      if (!blockedUsers || blockedUsers.length === 0) {
        setHydratedBlockedUsers([]);
        return;
      }
      setLoadingBlocked(true);
      try {
        const allEmployees = await searchEmployees('');
        const blockedDetails = allEmployees.filter(emp => blockedUsers.includes(emp.id));
        setHydratedBlockedUsers(blockedDetails);
      } catch (err) {
        console.error('[ChatPrivacySettings] Failed to load blocked details:', err);
      } finally {
        setLoadingBlocked(false);
      }
    };
    loadBlockedDetails();
  }, [blockedUsers, searchEmployees]);

  useEffect(() => {
    fetchHiddenConversations?.();
  }, [fetchHiddenConversations]);

  // Handle searching new users to block
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchEmployees(searchQuery);
        // Exclude already blocked users
        const filtered = results.filter(emp => !blockedUsers.includes(emp.id));
        setSearchResults(filtered);
      } catch (err) {
        console.error('[ChatPrivacySettings] Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, blockedUsers, searchEmployees]);

  const handleUnblock = async (userId) => {
    try {
      await unblockUser(userId);
    } catch (err) {
      console.error('[ChatPrivacySettings] Unblock failed:', err);
    }
  };

  const handleBlock = async (userId) => {
    try {
      await blockUser(userId);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      console.error('[ChatPrivacySettings] Block failed:', err);
    }
  };

  return (
    <div style={{
      padding: '24px',
      maxWidth: '800px',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      height: '100%',
      overflowY: 'auto'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        borderBottom: '1px solid var(--border-color, #e5e7eb)',
        paddingBottom: '16px'
      }}>
        <button
          onClick={() => navigate('/chat')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'var(--text-primary, #1f2937)' }}>Chat Privacy Settings</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary, #6b7280)' }}>Manage blocked users and chat privacy</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* Blocked Users List */}
        <div style={{
          background: 'var(--bg-card, #ffffff)',
          border: '1px solid var(--border-color, #e5e7eb)',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--text-primary, #1f2937)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🚫</span> Blocked Contacts ({blockedUsers?.length || 0})
          </h3>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            maxHeight: '400px',
            overflowY: 'auto',
            paddingRight: '4px'
          }}>
            {loadingBlocked ? (
              <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>Loading blocked list...</p>
            ) : hydratedBlockedUsers.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#9ca3af',
                fontSize: '14px'
              }}>
                <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>🛡️</span>
                No blocked contacts.
              </div>
            ) : (
              hydratedBlockedUsers.map(user => (
                <div key={user.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'var(--bg-light, #f9fafb)',
                  border: '1px solid var(--border-color, #e5e7eb)',
                  borderRadius: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: '#6366f1',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '600',
                        fontSize: '14px'
                      }}>
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-primary, #1f2937)' }}>{user.name}</span>
                      <span style={{ fontSize: '11px', color: '#6b7280' }}>{user.designation || 'Employee'}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnblock(user.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid #6366f1',
                      background: 'transparent',
                      color: '#6366f1',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#6366f1';
                      e.currentTarget.style.color = '#fff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#6366f1';
                    }}
                  >
                    Unblock
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Block New User search */}
        <div style={{
          background: 'var(--bg-card, #ffffff)',
          border: '1px solid var(--border-color, #e5e7eb)',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--text-primary, #1f2937)' }}>
            🔍 Block a Contact
          </h3>
          
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search employee to block..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1.5px solid var(--border-color, #d1d5db)',
                outline: 'none',
                fontSize: '14px',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#6366f1'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-color, #d1d5db)'}
            />
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            maxHeight: '340px',
            overflowY: 'auto'
          }}>
            {isSearching ? (
              <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>Searching...</p>
            ) : searchResults.length === 0 && searchQuery ? (
              <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>No matches found</p>
            ) : (
              searchResults.map(emp => (
                <div key={emp.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'var(--bg-light, #f9fafb)',
                  border: '1px solid var(--border-color, #e5e7eb)',
                  borderRadius: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {emp.avatar ? (
                      <img src={emp.avatar} alt={emp.name} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: '#3b82f6',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '600',
                        fontSize: '14px'
                      }}>
                        {emp.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-primary, #1f2937)' }}>{emp.name}</span>
                      <span style={{ fontSize: '11px', color: '#6b7280' }}>{emp.designation || 'Employee'}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleBlock(emp.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#ef4444',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
                  >
                    Block
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Hidden Conversations Section */}
      <div style={{
        background: 'var(--bg-card, #ffffff)',
        border: '1px solid var(--border-color, #e5e7eb)',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--text-primary, #1f2937)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>👁️‍🗨️</span> Hidden Conversations ({hiddenConversations?.length || 0})
        </h3>
        
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          maxHeight: '300px',
          overflowY: 'auto'
        }}>
          {!hiddenConversations || hiddenConversations.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '30px 20px',
              color: '#9ca3af',
              fontSize: '14px'
            }}>
              <span style={{ fontSize: '28px', display: 'block', marginBottom: '8px' }}>👁</span>
              No hidden conversations.
            </div>
          ) : (
            hiddenConversations.map(conv => {
              const isDirect = conv.type === 'direct';
              const other = isDirect ? conv.participants?.find(p => p.employeeId !== currentUser?.id) : null;
              const displayName = isDirect ? (other?.name || 'Unknown User') : (conv.name || 'Group Chat');
              const avatarSrc = isDirect ? other?.avatar : conv.avatar;
              const subText = isDirect ? (other?.designation || 'Direct Chat') : `${conv.participants?.length || 0} members`;

              return (
                <div key={conv.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'var(--bg-light, #f9fafb)',
                  border: '1px solid var(--border-color, #e5e7eb)',
                  borderRadius: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {avatarSrc ? (
                      <img src={avatarSrc} alt={displayName} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: '#6366f1',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '600',
                        fontSize: '14px'
                      }}>
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-primary, #1f2937)' }}>{displayName}</span>
                      <span style={{ fontSize: '11px', color: '#6b7280' }}>{subText}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => unhideConversation?.(conv.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid #10b981',
                      background: 'transparent',
                      color: '#10b981',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#10b981';
                      e.currentTarget.style.color = '#fff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#10b981';
                    }}
                  >
                    Unhide
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
};

export default ChatPrivacySettings;
