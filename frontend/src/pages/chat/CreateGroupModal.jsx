/**
 * @file src/pages/chat/CreateGroupModal.jsx
 * @description Modal for creating a new group conversation.
 *   Step 1: Group Details (name, description, avatar)
 *   Step 2: Member Selection (search, chips, scroll list, status dots)
 */

import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../../context/ChatContext';
import StatusDot from './StatusDot';
import { ImagePlus as LuImagePlus, X as LuX } from 'lucide-react';

const CreateGroupModal = ({ currentUser, onClose }) => {
  const { searchEmployees, createGroup, presenceMap } = useChat();

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarBase64, setAvatarBase64] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [employees, setEmployees] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);
  const searchInputRef = useRef(null);

  // Fetch initial employee list on mount
  useEffect(() => {
    fetchEmployees('');
  }, []);

  // Fetch employees when transitioning to step 2 or when query changes
  const fetchEmployees = async (q) => {
    setIsLoading(true);
    try {
      const results = await searchEmployees(q);
      // Exclude current user from the list
      setEmployees(results.filter(e => e.id !== currentUser?.id));
    } catch (err) {
      console.error('[CreateGroupModal] Error searching employees:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    fetchEmployees(q);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (limit to 2MB for safe base64 transit)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarBase64(reader.result);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleToggleSelect = (empId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(empId)) {
        next.delete(empId);
      } else {
        next.add(empId);
      }
      return next;
    });
  };

  const handleRemoveChip = (empId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(empId);
      return next;
    });
  };

  const handleNext = () => {
    if (!name.trim()) return;
    setStep(2);
    // Focus search input after modal renders step 2
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  const handleCreate = async () => {
    if (selectedIds.size === 0) return;
    setIsCreating(true);
    setError(null);

    try {
      await createGroup(
        name.trim(),
        description.trim(),
        Array.from(selectedIds),
        avatarBase64
      );
      onClose();
    } catch (err) {
      console.error('[CreateGroupModal] Error creating group:', err);
      setError(err.message || 'Failed to create group');
    } finally {
      setIsCreating(false);
    }
  };

  // Helper for avatar fallbacks
  const getInitials = (str) => {
    if (!str) return 'G';
    return str.trim().charAt(0).toUpperCase();
  };

  const avatarColors = [
    '#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981',
    '#3b82f6','#ef4444','#14b8a6','#f97316','#84cc16'
  ];
  const getAvatarBg = (str) =>
    avatarColors[(str?.charCodeAt(0) || 0) % avatarColors.length];

  const selectedEmployees = employees.filter(e => selectedIds.has(e.id));

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && !isCreating && onClose()}>
      <div className="new-chat-modal" style={{ maxWidth: '480px', height: '620px' }}>
        {/* Style block for Group Creation Specifics */}
        <style>{`
          .group-progress-bar {
            height: 4px;
            background: var(--bg-elevated, #f1f5f9);
            position: relative;
            margin: 0 20px;
            border-radius: 2px;
            overflow: hidden;
          }
          .group-progress-fill {
            height: 100%;
            background: var(--chat-primary, #6366f1);
            transition: width 0.3s ease;
          }
          .avatar-upload-circle {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            border: 2px dashed var(--chat-border, #cbd5e1);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 20px auto;
            cursor: pointer;
            position: relative;
            overflow: hidden;
            background: var(--bg-elevated, #f8fafc);
            transition: all 0.2s ease;
          }
          .avatar-upload-circle:hover {
            border-color: var(--chat-primary, #6366f1);
            background: var(--chat-hover, #f1f5f9);
          }
          .avatar-upload-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .avatar-upload-overlay {
            position: absolute;
            inset: 0;
            background: rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            opacity: 0;
            transition: opacity 0.2s;
          }
          .avatar-upload-circle:hover .avatar-upload-overlay {
            opacity: 1;
          }
          .group-form-group {
            margin: 0 20px 16px;
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .group-label {
            font-size: 13px;
            font-weight: 600;
            color: var(--text-secondary, #475569);
          }
          .group-input, .group-textarea {
            width: 100%;
            padding: 10px 14px;
            border: 1.5px solid var(--chat-border, #cbd5e1);
            border-radius: 10px;
            font-size: 14px;
            background: var(--chat-input-bg, #fff);
            color: var(--text-primary, #1e293b);
            outline: none;
            transition: border-color 0.2s;
          }
          .group-input:focus, .group-textarea:focus {
            border-color: var(--chat-primary, #6366f1);
          }
          .group-textarea {
            resize: none;
            height: 80px;
          }
          .group-char-counter {
            font-size: 11px;
            color: var(--text-muted, #94a3b8);
            align-self: flex-end;
          }
          .group-footer-btn-row {
            margin-top: auto;
            padding: 16px 20px;
            border-top: 1px solid var(--chat-border, #cbd5e1);
            display: flex;
            justify-content: flex-end;
            gap: 12px;
          }
          .group-btn-secondary {
            padding: 10px 16px;
            border-radius: 10px;
            border: 1px solid var(--border-color, #cbd5e1);
            background: transparent;
            color: var(--text-primary, #1e293b);
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: background 0.15s;
          }
          .group-btn-secondary:hover {
            background: var(--bg-elevated, #f1f5f9);
          }
          .group-btn-primary {
            padding: 10px 20px;
            border-radius: 10px;
            border: none;
            background: var(--chat-primary, #6366f1);
            color: #fff;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: opacity 0.15s;
          }
          .group-btn-primary:hover {
            opacity: 0.9;
          }
          .group-btn-primary:disabled {
            background: var(--text-muted, #cbd5e1);
            cursor: not-allowed;
          }
          .selected-chips-container {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            padding: 8px 20px;
            max-height: 90px;
            overflow-y: auto;
            border-bottom: 1px solid var(--chat-border, #e2e8f0);
            background: var(--bg-elevated, #f8fafc);
          }
          .selected-chip {
            display: flex;
            align-items: center;
            gap: 6px;
            background: var(--chat-primary, #6366f1);
            color: #fff;
            padding: 4px 8px;
            border-radius: 16px;
            font-size: 12px;
            font-weight: 600;
          }
          .selected-chip-btn {
            background: transparent;
            border: none;
            color: #fff;
            cursor: pointer;
            display: flex;
            align-items: center;
            padding: 0;
          }
          .member-checkbox-wrap {
            margin-left: auto;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 20px;
            height: 20px;
            border: 2px solid var(--chat-border, #cbd5e1);
            border-radius: 4px;
            transition: all 0.15s;
          }
          .member-checkbox-checked {
            background: var(--chat-primary, #6366f1);
            border-color: var(--chat-primary, #6366f1);
            color: #fff;
          }
          .inline-error-msg {
            color: #ef4444;
            font-size: 12.5px;
            padding: 4px 20px 0;
            margin: 0;
          }
        `}</style>

        {/* Header */}
        <div className="new-chat-modal-header" style={{ paddingBottom: '8px' }}>
          <div>
            <h3 className="new-chat-modal-title">New Group</h3>
            <p className="new-chat-modal-sub">
              {step === 1 ? 'Step 1: Group Details' : 'Step 2: Add Members'}
            </p>
          </div>
          <button className="new-chat-modal-close" onClick={onClose} disabled={isCreating}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="group-progress-bar">
          <div className="group-progress-fill" style={{ width: step === 1 ? '50%' : '100%' }} />
        </div>

        {error && <p className="inline-error-msg">{error}</p>}

        {/* Step 1: Details */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
              {/* Avatar Selector */}
              <div className="avatar-upload-circle" onClick={handleAvatarClick}>
                {avatarBase64 ? (
                  <img src={avatarBase64} alt="Preview" className="avatar-upload-img" />
                ) : name.trim() ? (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      background: getAvatarBg(name),
                      color: '#fff',
                      fontSize: '36px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {getInitials(name)}
                  </div>
                ) : (
                  <LuImagePlus size={32} style={{ color: 'var(--text-muted, #94a3b8)' }} />
                )}
                <div className="avatar-upload-overlay">
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>Change</span>
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleAvatarChange}
              />

              {/* Group Name */}
              <div className="group-form-group">
                <label className="group-label">Group Name *</label>
                <input
                  type="text"
                  className="group-input"
                  placeholder="Enter group name..."
                  maxLength={50}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error && e.target.value.trim()) setError(null);
                  }}
                />
                <span className="group-char-counter">{name.length}/50</span>
              </div>

              {/* Group Description */}
              <div className="group-form-group">
                <label className="group-label">Description (Optional)</label>
                <textarea
                  className="group-textarea"
                  placeholder="What is this group about..."
                  maxLength={150}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <span className="group-char-counter">{description.length}/150</span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="group-footer-btn-row">
              <button className="group-btn-secondary" onClick={onClose}>Cancel</button>
              <button
                className="group-btn-primary"
                onClick={handleNext}
                disabled={!name.trim()}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Add Members */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            {/* Search Box */}
            <div className="new-chat-search-wrap" style={{ paddingBottom: '10px' }}>
              <svg className="new-chat-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                className="new-chat-search-input"
                placeholder="Search employees to add..."
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>

            {/* Selected Chips */}
            {selectedIds.size > 0 && (
              <div className="selected-chips-container">
                {selectedEmployees.map(emp => (
                  <div key={emp.id} className="selected-chip">
                    <span>{emp.name}</span>
                    <button className="selected-chip-btn" onClick={() => handleRemoveChip(emp.id)}>
                      <LuX size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Scrollable list */}
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
                  <p>{searchQuery ? `No results for "${searchQuery}"` : 'No active employees found'}</p>
                </div>
              ) : (
                employees.map(emp => {
                  const isSelected = selectedIds.has(emp.id);
                  const presence = presenceMap?.get(emp.id);
                  const status = presence?.status || 'offline';
                  const avatarLetter = emp.name?.charAt(0).toUpperCase();

                  return (
                    <button
                      key={emp.id}
                      className="new-chat-emp-item"
                      onClick={() => handleToggleSelect(emp.id)}
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
                        <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', border: '2px solid var(--bg-card, #fff)', borderRadius: '50%' }}>
                          <StatusDot status={status} size={10} />
                        </div>
                      </div>

                      {/* Info */}
                      <div className="new-chat-emp-info">
                        <span className="new-chat-emp-name">{emp.name}</span>
                        <span className="new-chat-emp-role">
                          {emp.designation || emp.department || emp.roleId || 'Employee'}
                        </span>
                      </div>

                      {/* Checkbox */}
                      <div className={`member-checkbox-wrap ${isSelected ? 'member-checkbox-checked' : ''}`}>
                        {isSelected && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer Buttons */}
            <div className="group-footer-btn-row">
              <span style={{ marginRight: 'auto', alignSelf: 'center', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
                {selectedIds.size} member{selectedIds.size !== 1 ? 's' : ''} selected
              </span>
              <button
                className="group-btn-secondary"
                onClick={() => setStep(1)}
                disabled={isCreating}
              >
                Back
              </button>
              <button
                className="group-btn-primary"
                onClick={handleCreate}
                disabled={selectedIds.size === 0 || isCreating}
              >
                {isCreating ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateGroupModal;
