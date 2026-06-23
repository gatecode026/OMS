/**
 * @file src/components/CreatePollModal.jsx
 * @description Modal for creating chat and thread polls.
 *   Matches the site's custom modal styling and colors.
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Plus, Trash2 } from 'lucide-react';

const CreatePollModal = ({ conversationId, threadId, onClose }) => {
  const { addToast, token } = useApp();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [allowMultipleVotes, setAllowMultipleVotes] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle options changes
  const handleOptionChange = (idx, value) => {
    const updated = [...options];
    updated[idx] = value;
    setOptions(updated);
  };

  const addOptionField = () => {
    if (options.length >= 20) {
      addToast?.('warning', 'A poll can have at most 20 options.');
      return;
    }
    setOptions([...options, '']);
  };

  const removeOptionField = (idx) => {
    if (options.length <= 2) {
      addToast?.('warning', 'A poll must have at least 2 options.');
      return;
    }
    const updated = options.filter((_, i) => i !== idx);
    setOptions(updated);
  };

  // Submit poll details to backend
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!question.trim()) {
      addToast?.('error', 'Please enter a poll question.');
      return;
    }

    const filteredOptions = options.map(o => o.trim()).filter(Boolean);
    if (filteredOptions.length < 2) {
      addToast?.('error', 'Please enter at least 2 options.');
      return;
    }

    let expiryVal = null;
    if (hasExpiry) {
      if (!expiresAt) {
        addToast?.('error', 'Please select an expiration date and time.');
        return;
      }
      expiryVal = new Date(expiresAt).toISOString();
      if (new Date(expiryVal) <= new Date()) {
        addToast?.('error', 'Expiry date/time must be in the future.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const apiUrl = window.API_URL || window.location.origin;
      const res = await fetch(`${apiUrl}/api/v1/chat/polls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          question: question.trim(),
          options: filteredOptions,
          allowMultipleVotes,
          isAnonymous,
          expiresAt: expiryVal,
          conversationId,
          threadId: threadId || null
        })
      });

      const data = await res.json();
      if (data.status === 'success' || res.ok) {
        addToast?.('success', 'Poll created successfully!');
        onClose();
      } else {
        addToast?.('error', data.message || 'Failed to create poll');
      }
    } catch (err) {
      console.error('[CreatePollModal] Submit error:', err);
      addToast?.('error', 'Network error. Failed to create poll.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && !isSubmitting && onClose()}>
      <div className="new-chat-modal" style={{ maxWidth: '500px', height: 'auto', display: 'flex', flexDirection: 'column' }}>
        <style>{`
          .poll-form-body {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 16px;
            max-height: 70vh;
            scrollbar-width: thin;
          }
          .poll-form-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .poll-label {
            font-size: 13px;
            font-weight: 600;
            color: var(--text-secondary, #94a3b8);
          }
          .poll-input, .poll-select {
            width: 100%;
            padding: 10px 14px;
            border: 1.5px solid var(--border-color, rgba(255, 255, 255, 0.1));
            border-radius: 10px;
            font-size: 14px;
            background: var(--bg-elevated, #182229);
            color: #ffffff;
            outline: none;
            transition: all 0.2s ease;
          }
          .poll-input:focus, .poll-select:focus {
            border-color: var(--chat-primary, #6366f1);
            box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
          }
          .poll-option-row {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .poll-option-input {
            flex: 1;
          }
          .poll-btn-icon {
            background: transparent;
            border: none;
            color: var(--text-muted, #64748b);
            cursor: pointer;
            padding: 8px;
            border-radius: 8px;
            transition: all 0.15s;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .poll-btn-icon:hover {
            color: #ef4444;
            background: rgba(239, 68, 68, 0.1);
          }
          .poll-btn-add {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            width: 100%;
            padding: 10px;
            border: 1.5px dashed var(--border-color, rgba(255, 255, 255, 0.15));
            background: transparent;
            color: var(--chat-primary, #6366f1);
            border-radius: 10px;
            font-size: 13.5px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .poll-btn-add:hover {
            background: rgba(99, 102, 241, 0.05);
            border-color: var(--chat-primary, #6366f1);
          }
          .poll-checkbox-row {
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
            user-select: none;
            padding: 4px 0;
          }
          .poll-checkbox-title {
            font-size: 14px;
            font-weight: 500;
            color: var(--text-primary, #ffffff);
          }
          .poll-checkbox-desc {
            font-size: 12px;
            color: var(--text-secondary, #94a3b8);
            margin-left: 26px;
            margin-top: -2px;
          }
          .poll-preview-box {
            border: 1.5px solid var(--border-color, rgba(255, 255, 255, 0.1));
            border-radius: 12px;
            padding: 14px;
            background: var(--bg-body, #0f172a);
          }
          .poll-footer-row {
            padding: 16px 20px;
            border-top: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            background: var(--bg-card, #1e293b);
          }
          .group-btn-secondary {
            padding: 10px 16px;
            border-radius: 10px;
            border: 1px solid var(--border-color, rgba(255,255,255,0.1));
            background: transparent;
            color: var(--text-primary, #f8fafc);
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: background 0.15s;
          }
          .group-btn-secondary:hover {
            background: rgba(255, 255, 255, 0.08);
          }
          .group-btn-primary {
            padding: 10px 20px;
            border-radius: 10px;
            border: none;
            background: var(--chat-primary, #6366f1);
            color: #ffffff;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: opacity 0.15s;
          }
          .group-btn-primary:hover {
            opacity: 0.9;
          }
          .group-btn-primary:disabled {
            background: var(--border-color, rgba(255, 255, 255, 0.1));
            color: var(--text-muted, #64748b);
            cursor: not-allowed;
          }
        `}</style>

        {/* Header */}
        <div className="new-chat-modal-header" style={{ padding: '20px 20px 12px', borderBottom: '1px solid var(--chat-border)' }}>
          <div>
            <h3 className="new-chat-modal-title">Create a Poll</h3>
            <p className="new-chat-modal-sub">Ask a question, add options, and share it with your team</p>
          </div>
          <button className="new-chat-modal-close" onClick={onClose} disabled={isSubmitting} style={{ color: '#ffffff', opacity: 0.8 }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="poll-form-body">
            {/* Question */}
            <div className="poll-form-group">
              <label className="poll-label">Question *</label>
              <input
                type="text"
                className="poll-input"
                placeholder="What is your question?"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                required
                disabled={isSubmitting}
                maxLength={200}
              />
            </div>

            {/* Options */}
            <div className="poll-form-group" style={{ gap: '8px' }}>
              <label className="poll-label">Options *</label>
              {options.map((opt, idx) => (
                <div key={idx} className="poll-option-row">
                  <input
                    type="text"
                    className="poll-input poll-option-input"
                    placeholder={`Option ${idx + 1}`}
                    value={opt}
                    onChange={e => handleOptionChange(idx, e.target.value)}
                    required={idx < 2}
                    disabled={isSubmitting}
                    maxLength={100}
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      className="poll-btn-icon"
                      onClick={() => removeOptionField(idx)}
                      disabled={isSubmitting}
                      title="Remove option"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}

              {options.length < 20 && (
                <button
                  type="button"
                  className="poll-btn-add"
                  onClick={addOptionField}
                  disabled={isSubmitting}
                >
                  <Plus size={16} /> Add Option
                </button>
              )}
            </div>

            {/* Settings */}
            <div className="poll-form-group" style={{ gap: '12px', marginTop: '4px' }}>
              <label className="poll-label">Settings</label>
              
              <div>
                <label className="poll-checkbox-row">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={e => setIsAnonymous(e.target.checked)}
                    disabled={isSubmitting}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--chat-primary, #6366f1)' }}
                  />
                  <span className="poll-checkbox-title">Anonymous Poll</span>
                </label>
                <div className="poll-checkbox-desc">Responses are anonymous. Voter names and avatars are hidden from everyone.</div>
              </div>

              <div>
                <label className="poll-checkbox-row">
                  <input
                    type="checkbox"
                    checked={allowMultipleVotes}
                    onChange={e => setAllowMultipleVotes(e.target.checked)}
                    disabled={isSubmitting}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--chat-primary, #6366f1)' }}
                  />
                  <span className="poll-checkbox-title">Multiple Choices</span>
                </label>
                <div className="poll-checkbox-desc">Allow participants to vote for more than one option.</div>
              </div>

              <div>
                <label className="poll-checkbox-row">
                  <input
                    type="checkbox"
                    checked={hasExpiry}
                    onChange={e => setHasExpiry(e.target.checked)}
                    disabled={isSubmitting}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--chat-primary, #6366f1)' }}
                  />
                  <span className="poll-checkbox-title">Set Poll Expiration</span>
                </label>
                <div className="poll-checkbox-desc">Automatically close the poll at a specific date and time.</div>
              </div>

              {hasExpiry && (
                <div className="poll-form-group" style={{ marginLeft: '26px' }}>
                  <input
                    type="datetime-local"
                    className="poll-input"
                    value={expiresAt}
                    onChange={e => setExpiresAt(e.target.value)}
                    required
                    disabled={isSubmitting}
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              )}
            </div>

            {/* Preview Section */}
            {question.trim() && (
              <div className="poll-form-group">
                <label className="poll-label">Live Preview</label>
                <div className="poll-preview-box">
                  <div style={{ fontWeight: '600', fontSize: '14.5px', marginBottom: '8px', color: 'var(--text-primary, #ffffff)' }}>
                    📊 {question}
                  </div>
                  {options.filter(Boolean).map((opt, idx) => (
                    <div key={idx} style={{
                      padding: '10px 14px',
                      border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
                      borderRadius: '8px',
                      fontSize: '13px',
                      background: 'var(--bg-elevated, rgba(255,255,255,0.04))',
                      marginBottom: '6px',
                      color: 'var(--text-primary, #ffffff)',
                      fontWeight: '500'
                    }}>
                      {opt}
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text-muted, #64748b)', marginTop: '8px' }}>
                    <span>{isAnonymous ? '👤 Anonymous' : '👥 Public'}</span>
                    <span>•</span>
                    <span>{allowMultipleVotes ? '☑️ Multiple Choice' : '🔘 Single Choice'}</span>
                    {hasExpiry && expiresAt && (
                      <>
                        <span>•</span>
                        <span>⏳ Expires: {new Date(expiresAt).toLocaleString()}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="poll-footer-row">
            <button
              type="button"
              className="group-btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="group-btn-primary"
              disabled={isSubmitting || !question.trim() || options.filter(o => o.trim()).length < 2}
            >
              {isSubmitting ? 'Creating Poll...' : 'Create Poll'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePollModal;
