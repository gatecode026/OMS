/**
 * @file src/pages/chat/GroupInfoPanel.jsx
 * @description Slide-in group information panel. Enables group renaming,
 *   avatar changes, member lists with status dots, admin operations (promotion/kick),
 *   adding new members, and leaving groups.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../../context/ChatContext';
import StatusDot from './StatusDot';
import { 
  MoreVertical as LuMoreVertical, 
  X as LuX, 
  ImagePlus as LuImagePlus,
  Plus as LuPlus,
  Check as LuCheck,
  Edit2 as LuEdit2,
  Trash2 as LuTrash2,
  ShieldAlert as LuShieldAlert,
  LogOut as LuLogOut
} from 'lucide-react';

const GroupInfoPanel = ({ conversation: conv, currentUser, onClose }) => {
  const { 
    updateGroup, 
    addMembersToGroup, 
    removeMemberFromGroup, 
    leaveGroup, 
    searchEmployees,
    presenceMap
  } = useChat();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(conv?.name || '');
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editedDesc, setEditedDesc] = useState(conv?.description || '');

  // Add Member feature
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [availableEmployees, setAvailableEmployees] = useState([]);
  const [selectedForAdd, setSelectedForAdd] = useState(new Set());
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);

  // Kebab menu state: employeeId
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);
  const kebabRef = useRef(null);

  // Close kebab menu if clicked outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (kebabRef.current && !kebabRef.current.contains(e.target)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync state if conversation updates
  useEffect(() => {
    setEditedName(conv?.name || '');
    setEditedDesc(conv?.description || '');
  }, [conv]);

  // Fetch employees for adding
  useEffect(() => {
    if (isAddingMembers) {
      fetchAvailableEmployees('');
    }
  }, [isAddingMembers]);

  const fetchAvailableEmployees = async (q) => {
    setIsLoadingEmployees(true);
    try {
      const results = await searchEmployees(q);
      // Filter out employees who are already participants
      const currentParticipantIds = new Set(conv?.participants?.map(p => p.employeeId) || []);
      setAvailableEmployees(results.filter(e => !currentParticipantIds.has(e.id)));
    } catch (err) {
      console.error('[GroupInfoPanel] Error loading employees:', err);
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  const handleMemberSearchChange = (e) => {
    const q = e.target.value;
    setMemberSearchQuery(q);
    fetchAvailableEmployees(q);
  };

  const myParticipant = conv?.participants?.find(p => p.employeeId === currentUser?.id);
  const isAdmin = myParticipant?.isAdmin || false;

  const handleNameSave = async () => {
    if (!editedName.trim() || editedName.trim() === conv.name) {
      setIsEditingName(false);
      return;
    }
    try {
      await updateGroup(conv.id, { name: editedName.trim() });
      setIsEditingName(false);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to update name');
    }
  };

  const handleDescSave = async () => {
    if (editedDesc.trim() === (conv.description || '')) {
      setIsEditingDesc(false);
      return;
    }
    try {
      await updateGroup(conv.id, { description: editedDesc.trim() });
      setIsEditingDesc(false);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to update description');
    }
  };

  const handleAvatarClick = () => {
    if (!isAdmin) return;
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        await updateGroup(conv.id, { avatar: reader.result });
        setError(null);
      } catch (err) {
        setError(err.message || 'Failed to upload avatar');
      }
    };
    reader.readAsDataURL(file);
  };

  // Admin Kebab Actions
  const handlePromoteAdmin = async (empId) => {
    try {
      await updateGroup(conv.id, { promoteEmployeeId: empId });
      setActiveMenuId(null);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to promote member');
    }
  };

  const handleKickMember = async (empId) => {
    try {
      await removeMemberFromGroup(conv.id, empId);
      setActiveMenuId(null);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to remove member');
    }
  };

  const handleLeaveGroup = () => {
    if (window.confirm(`Are you sure you want to leave ${conv.name}?`)) {
      leaveGroup(conv.id);
      onClose();
    }
  };

  // Add members submit
  const handleToggleAddSelect = (empId) => {
    setSelectedForAdd(prev => {
      const next = new Set(prev);
      if (next.has(empId)) {
        next.delete(empId);
      } else {
        next.add(empId);
      }
      return next;
    });
  };

  const handleAddMembersSubmit = async () => {
    if (selectedForAdd.size === 0) return;
    try {
      await addMembersToGroup(conv.id, Array.from(selectedForAdd));
      setIsAddingMembers(false);
      setSelectedForAdd(new Set());
      setMemberSearchQuery('');
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to add members');
    }
  };

  // Escape key listener to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isAddingMembers) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isAddingMembers]);

  // Avatar Styling
  const avatarColors = [
    '#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981',
    '#3b82f6','#ef4444','#14b8a6','#f97316','#84cc16'
  ];
  const getAvatarBg = (str) =>
    avatarColors[(str?.charCodeAt(0) || 0) % avatarColors.length];

  const displayName = conv?.name || 'Group';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <>
      {/* Backdrop */}
      <div className="chat-sidebar-backdrop" onClick={onClose} />

      {/* Slide-in panel */}
      <div className="chat-sidebar-panel" style={{ width: '340px' }}>
        <style>{`
          .group-info-edit-input {
            width: 100%;
            padding: 6px 10px;
            border: 1.5px solid var(--chat-primary, #6366f1);
            border-radius: 8px;
            font-size: 15px;
            background: var(--chat-input-bg, #fff);
            color: var(--text-primary);
            outline: none;
            margin-bottom: 8px;
          }
          .group-info-actions-row {
            display: flex;
            gap: 6px;
            justify-content: flex-end;
            margin-bottom: 8px;
          }
          .kebab-container {
            position: relative;
            margin-left: auto;
          }
          .kebab-menu-popover {
            position: absolute;
            right: 0;
            top: 24px;
            background: var(--bg-card, #fff);
            border: 1px solid var(--chat-border, #cbd5e1);
            border-radius: 10px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.15);
            z-index: 200;
            overflow: hidden;
            width: 150px;
          }
          .kebab-menu-item {
            display: flex;
            align-items: center;
            gap: 8px;
            width: 100%;
            padding: 8px 12px;
            background: none;
            border: none;
            font-size: 13px;
            font-weight: 500;
            color: var(--text-primary);
            cursor: pointer;
            text-align: left;
            transition: background 0.15s;
          }
          .kebab-menu-item:hover {
            background: var(--chat-hover, #f1f5f9);
          }
          .kebab-menu-item-danger {
            color: #ef4444;
          }
          .add-member-section-backdrop {
            position: absolute;
            inset: 0;
            background: rgba(0,0,0,0.3);
            z-index: 150;
            display: flex;
            align-items: flex-end;
          }
          .add-member-panel {
            width: 100%;
            height: 75%;
            background: var(--bg-card, #fff);
            border-top-left-radius: 20px;
            border-top-right-radius: 20px;
            display: flex;
            flex-direction: column;
            box-shadow: 0 -10px 30px rgba(0,0,0,0.15);
            animation: slide-up-panel 0.25s cubic-bezier(.34,1.56,.64,1);
            padding: 16px 0;
          }
          @keyframes slide-up-panel {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
        `}</style>

        {/* Header */}
        <div className="chat-sidebar-header">
          <h3 className="chat-sidebar-title">Group Info</h3>
          <button className="chat-sidebar-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {error && <p className="inline-error-msg" style={{ margin: '8px 16px 0' }}>{error}</p>}

        {/* Profile Card */}
        <div className="chat-sidebar-profile" style={{ padding: '16px' }}>
          {/* Avatar Area */}
          <div 
            className="chat-sidebar-avatar" 
            style={{ 
              position: 'relative', 
              cursor: isAdmin ? 'pointer' : 'default',
              width: '80px',
              height: '80px',
              fontSize: '30px'
            }}
            onClick={handleAvatarClick}
          >
            {conv?.avatar ? (
              <img src={conv.avatar} alt={displayName} />
            ) : (
              <div 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  background: getAvatarBg(displayName),
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold'
                }}
              >
                {avatarLetter}
              </div>
            )}
            {isAdmin && (
              <div 
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0.4)',
                  opacity: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  borderRadius: '50%',
                  transition: 'opacity 0.2s'
                }}
                className="avatar-hover-overlay"
              >
                <LuImagePlus size={20} />
              </div>
            )}
          </div>
          {isAdmin && (
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept="image/*" 
              onChange={handleAvatarChange}
            />
          )}

          {/* Group Name Editing */}
          {isEditingName ? (
            <div style={{ width: '100%', marginTop: '8px' }}>
              <input
                type="text"
                className="group-info-edit-input"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                maxLength={50}
              />
              <div className="group-info-actions-row">
                <button className="group-btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => { setEditedName(conv.name); setIsEditingName(false); }}>Cancel</button>
                <button className="group-btn-primary" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={handleNameSave}>Save</button>
              </div>
            </div>
          ) : (
            <h4 
              className="chat-sidebar-name" 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px',
                cursor: isAdmin ? 'pointer' : 'default',
                marginTop: '4px'
              }}
              onClick={() => isAdmin && setIsEditingName(true)}
            >
              {displayName}
              {isAdmin && <LuEdit2 size={13} style={{ color: 'var(--text-muted)' }} />}
            </h4>
          )}

          <p className="chat-sidebar-meta">
            {conv?.participants?.length || 0} members · Group chat
          </p>
        </div>

        {/* Description Section */}
        <div className="chat-sidebar-section">
          <h5 className="chat-sidebar-section-title">Description</h5>
          {isEditingDesc ? (
            <div style={{ width: '100%' }}>
              <textarea
                className="group-info-edit-input"
                style={{ resize: 'none', height: '60px' }}
                value={editedDesc}
                onChange={(e) => setEditedDesc(e.target.value)}
                maxLength={150}
              />
              <div className="group-info-actions-row">
                <button className="group-btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => { setEditedDesc(conv.description || ''); setIsEditingDesc(false); }}>Cancel</button>
                <button className="group-btn-primary" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={handleDescSave}>Save</button>
              </div>
            </div>
          ) : (
            <p 
              className="chat-sidebar-section-body"
              style={{ 
                cursor: isAdmin ? 'pointer' : 'default', 
                minHeight: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px'
              }}
              onClick={() => isAdmin && setIsEditingDesc(true)}
            >
              <span>{conv?.description || <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No description added.</span>}</span>
              {isAdmin && <LuEdit2 size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
            </p>
          )}
        </div>

        {/* Members List */}
        <div className="chat-sidebar-section" style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h5 className="chat-sidebar-section-title" style={{ margin: 0 }}>
              Members ({conv?.participants?.length || 0})
            </h5>
            {isAdmin && (
              <button 
                onClick={() => setIsAddingMembers(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--chat-primary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <LuPlus size={14} /> Add
              </button>
            )}
          </div>

          <div className="chat-sidebar-members">
            {conv?.participants?.map(p => {
              const presence = presenceMap?.get(p.employeeId);
              const status = presence?.status || 'offline';
              const isUserAdmin = p.isAdmin || false;
              const isMe = p.employeeId === currentUser?.id;

              return (
                <div key={p.employeeId} className="chat-sidebar-member">
                  {/* Avatar with StatusDot */}
                  <div className="chat-sidebar-member-avatar" style={{ position: 'relative' }}>
                    {p.avatar ? (
                      <img src={p.avatar} alt={p.name} />
                    ) : (
                      <span>{p.name?.charAt(0).toUpperCase()}</span>
                    )}
                    <div style={{ position: 'absolute', bottom: '-1px', right: '-1px', border: '1.5px solid var(--bg-card)', borderRadius: '50%' }}>
                      <StatusDot status={status} size={8} />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="chat-sidebar-member-info">
                    <span className="chat-sidebar-member-name" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {p.name}
                      {isMe && <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 'normal' }}>(You)</span>}
                    </span>
                    {isUserAdmin && (
                      <span className="chat-sidebar-member-role">Admin</span>
                    )}
                  </div>

                  {/* Admin actions (Kebab menu) */}
                  {isAdmin && !isMe && (
                    <div className="kebab-container" ref={activeMenuId === p.employeeId ? kebabRef : null}>
                      <button 
                        onClick={() => setActiveMenuId(activeMenuId === p.employeeId ? null : p.employeeId)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '4px'
                        }}
                      >
                        <LuMoreVertical size={16} />
                      </button>

                      {activeMenuId === p.employeeId && (
                        <div className="kebab-menu-popover">
                          {!isUserAdmin && (
                            <button className="kebab-menu-item" onClick={() => handlePromoteAdmin(p.employeeId)}>
                              <LuCheck size={14} style={{ color: 'var(--chat-primary)' }} />
                              Make Admin
                            </button>
                          )}
                          <button className="kebab-menu-item kebab-menu-item-danger" onClick={() => handleKickMember(p.employeeId)}>
                            <LuTrash2 size={14} />
                            Remove Member
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Leave Group Action */}
        <div className="chat-sidebar-actions" style={{ padding: '16px' }}>
          <button className="chat-sidebar-action chat-sidebar-action-danger" onClick={handleLeaveGroup}>
            <LuLogOut size={16} />
            Leave Group
          </button>
        </div>

        {/* Add Members Overlay Drawer */}
        {isAddingMembers && (
          <div className="add-member-section-backdrop" onClick={(e) => e.target === e.currentTarget && setIsAddingMembers(false)}>
            <div className="add-member-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 16px 8px', borderBottom: '1px solid var(--chat-border)' }}>
                <span style={{ fontSize: '14px', fontWeight: 700 }}>Add Members</span>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setIsAddingMembers(false)}>
                  <LuX size={18} />
                </button>
              </div>

              {/* Search */}
              <div className="new-chat-search-wrap" style={{ margin: '12px 16px', padding: 0, border: 'none' }}>
                <svg className="new-chat-search-icon" style={{ left: '12px' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  type="text"
                  className="new-chat-search-input"
                  style={{ paddingLeft: '32px' }}
                  placeholder="Search colleagues..."
                  value={memberSearchQuery}
                  onChange={handleMemberSearchChange}
                />
              </div>

              {/* Scroll list */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {isLoadingEmployees ? (
                  <div className="new-chat-loading" style={{ padding: '10px 16px' }}>
                    <div className="new-chat-spinner" style={{ margin: '20px auto' }} />
                  </div>
                ) : availableEmployees.length === 0 ? (
                  <div className="new-chat-empty" style={{ padding: '20px' }}>
                    <p style={{ fontSize: '13px' }}>No colleagues available to add.</p>
                  </div>
                ) : (
                  availableEmployees.map(emp => {
                    const isSelected = selectedForAdd.has(emp.id);
                    const presence = presenceMap?.get(emp.id);
                    const status = presence?.status || 'offline';
                    
                    return (
                      <button
                        key={emp.id}
                        className="new-chat-emp-item"
                        style={{ padding: '8px 16px' }}
                        onClick={() => handleToggleAddSelect(emp.id)}
                      >
                        <div className="new-chat-emp-avatar-wrap">
                          {emp.avatar ? (
                            <img src={emp.avatar} alt={emp.name} className="new-chat-emp-avatar-img" style={{ width: '36px', height: '36px' }} />
                          ) : (
                            <div 
                              className="new-chat-emp-avatar-letter"
                              style={{ width: '36px', height: '36px', fontSize: '14px', background: getAvatarBg(emp.name) }}
                            >
                              {emp.name?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', border: '1.5px solid var(--bg-card)', borderRadius: '50%' }}>
                            <StatusDot status={status} size={8} />
                          </div>
                        </div>

                        <div className="new-chat-emp-info">
                          <span className="new-chat-emp-name" style={{ fontSize: '13.5px' }}>{emp.name}</span>
                          <span className="new-chat-emp-role" style={{ fontSize: '11px' }}>{emp.designation || 'Employee'}</span>
                        </div>

                        <div className={`member-checkbox-wrap ${isSelected ? 'member-checkbox-checked' : ''}`} style={{ width: '18px', height: '18px' }}>
                          {isSelected && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Action buttons */}
              <div style={{ padding: '12px 16px 0', borderTop: '1px solid var(--chat-border)', display: 'flex', justifySelf: 'flex-end', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
                <span style={{ marginRight: 'auto', alignSelf: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                  {selectedForAdd.size} selected
                </span>
                <button className="group-btn-secondary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => { setIsAddingMembers(false); setSelectedForAdd(new Set()); }}>Cancel</button>
                <button 
                  className="group-btn-primary" 
                  style={{ padding: '6px 16px', fontSize: '13px' }} 
                  disabled={selectedForAdd.size === 0}
                  onClick={handleAddMembersSubmit}
                >
                  Add Selected
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default GroupInfoPanel;
