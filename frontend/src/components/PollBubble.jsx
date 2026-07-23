/**
 * @file src/components/PollBubble.jsx
 * @description Interactive Poll Bubble for rendering polls inside messages.
 *   Enforces anonymity/publicity, multiple choice logic, automatic expiry check,
 *   and administrative controls (close, reopen, delete).
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useChat } from '../context/ChatContext';
import { Check, Users, Lock, Unlock, Calendar, Trash2, Trophy } from 'lucide-react';
import Avatar from './common/Avatar';

const PollBubble = ({ message, isOwn }) => {
  const { currentUser, employees, token, addToast } = useApp();
  const { socket } = useChat();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const poll = (message && typeof message.pollId === 'object' && message.pollId !== null)
    ? message.pollId
    : (message && typeof message.poll === 'object' && message.poll !== null)
      ? message.poll
      : null;

  if (!poll || typeof poll !== 'object') {
    return (
      <div style={{ fontStyle: 'italic', padding: '10px', color: 'var(--text-muted, #94a3b8)' }}>
        [Poll details unavailable]
      </div>
    );
  }

  const {
    _id: pollId,
    question,
    options = [],
    allowMultipleVotes,
    isAnonymous,
    expiresAt,
    isClosed,
    createdBy,
    totalVotes = 0
  } = poll;

  const getRemainingTimeText = (expiry) => {
    if (!expiry) return null;
    const now = new Date();
    const exp = new Date(expiry);
    const diffMs = exp - now;
    if (diffMs <= 0) return 'Expired';
    
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      const hoursPart = diffHours % 24;
      return `Expires in: ${diffDays}d ${hoursPart}h`;
    }
    if (diffHours > 0) {
      const minsPart = diffMins % 60;
      return `Expires in: ${diffHours}h ${minsPart}m`;
    }
    if (diffMins > 0) {
      const secsPart = diffSecs % 60;
      return `Expires in: ${diffMins}m ${secsPart}s`;
    }
    return `Expires in: ${diffSecs}s`;
  };

  const [timeLeft, setTimeLeft] = useState(() => getRemainingTimeText(expiresAt));

  useEffect(() => {
    if (!expiresAt || isClosed) return;
    
    setTimeLeft(getRemainingTimeText(expiresAt));

    const interval = setInterval(() => {
      const text = getRemainingTimeText(expiresAt);
      setTimeLeft(text);
      if (text === 'Expired') {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, isClosed]);

  // Check if current user has voted for each option
  const myUserId = currentUser?.id;
  const hasVotedOption = (opt) => opt.votes?.includes(myUserId);

  // Administrative checks
  const isCreator = createdBy === myUserId;
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  const canManage = isCreator || isAdmin;

  // Calculate percentages
  const totalVotesCount = options.reduce((sum, opt) => sum + (opt.votes?.length || 0), 0);
  const getPercentage = (opt) => {
    if (totalVotesCount === 0) return 0;
    return Math.round(((opt.votes?.length || 0) / totalVotesCount) * 100);
  };

  // Find winner option(s) if closed/ended
  const maxVotes = Math.max(...options.map(o => o.votes?.length || 0));
  const isWinner = (opt) => {
    return (isClosed || (expiresAt && new Date(expiresAt) <= new Date())) && 
           opt.votes?.length > 0 && 
           opt.votes?.length === maxVotes;
  };

  // Handle vote cast
  const handleVote = async (optionId) => {
    if (isClosed) {
      addToast?.('info', 'This poll is closed.');
      return;
    }
    if (expiresAt && new Date(expiresAt) <= new Date()) {
      addToast?.('info', 'This poll has expired.');
      return;
    }

    setIsSubmitting(true);
    try {
      const apiUrl = window.API_URL || window.location.origin;
      const res = await fetch(`${apiUrl}/api/v1/chat/polls/${pollId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ optionId })
      });

      const data = await res.json();
      if (!res.ok) {
        addToast?.('error', data.message || 'Failed to submit vote');
      }
    } catch (err) {
      console.error('[PollBubble] Vote error:', err);
      addToast?.('error', 'Network error. Failed to vote.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Poll Actions (Close / Reopen / Delete)
  const handleAction = async (action) => {
    const actionUrl = `${window.API_URL || window.location.origin}/api/v1/chat/polls/${pollId}/${action}`;
    const method = action === 'delete' ? 'DELETE' : 'POST';

    try {
      const res = await fetch(action === 'delete' ? `${window.API_URL || window.location.origin}/api/v1/chat/polls/${pollId}` : actionUrl, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        addToast?.('success', `Poll ${action}d successfully`);
      } else {
        addToast?.('error', data.message || `Failed to ${action} poll`);
      }
    } catch (err) {
      console.error(`[PollBubble] Action ${action} error:`, err);
      addToast?.('error', `Failed to perform action: ${action}`);
    }
  };

  // Resolve voter initials/avatar for public lists
  const renderVoters = (votesList) => {
    if (isAnonymous || !votesList || votesList.length === 0) return null;

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', marginRight: '4px' }}>
          {votesList.slice(0, 5).map((voterId, idx) => {
            const emp = (employees || []).find(e => e.id === voterId);
            const name = emp?.name || voterId;
            const avatar = emp?.avatar || '';
            return (
              <div
                key={voterId}
                style={{
                  marginLeft: idx === 0 ? '0' : '-8px',
                  border: '1.5px solid var(--bg-card, #ffffff)',
                  borderRadius: '50%',
                  zIndex: 5 - idx
                }}
                title={name}
              >
                <Avatar name={name} src={avatar} size="xs" />
              </div>
            );
          })}
        </div>
        {votesList.length > 5 && (
          <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>
            +{votesList.length - 5} more
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="poll-bubble-container" style={{
      minWidth: '280px',
      maxWidth: '440px',
      padding: '16px',
      borderRadius: '16px',
      background: 'var(--bg-card, #ffffff)',
      border: '1px solid var(--chat-border, #e2e8f0)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      <style>{`
        .poll-bubble-container {
          color: var(--text-primary, #0f172a);
        }
        .poll-question {
          font-weight: 700;
          font-size: 15px;
          line-height: 1.4;
          margin-bottom: 2px;
        }
        .poll-meta-header {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: var(--text-muted, #64748b);
        }
        .poll-option-item {
          position: relative;
          width: 100%;
          border: 1.5px solid var(--chat-border, #cbd5e1);
          border-radius: 10px;
          padding: 10px 14px;
          cursor: ${isClosed ? 'default' : 'pointer'};
          background: transparent;
          overflow: hidden;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .poll-option-item:hover {
          border-color: ${isClosed ? 'var(--chat-border, #cbd5e1)' : 'var(--chat-primary, #6366f1)'};
          background: ${isClosed ? 'transparent' : 'rgba(99, 102, 241, 0.02)'};
        }
        .poll-option-winner {
          border-color: #eab308 !important;
          background: rgba(234, 179, 8, 0.02);
        }
        .poll-option-voted {
          border-color: var(--chat-primary, #6366f1) !important;
        }
        .poll-progress-bg {
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          background: rgba(99, 102, 241, 0.08);
          z-index: 1;
          transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .poll-progress-winner-bg {
          background: rgba(234, 179, 8, 0.1) !important;
        }
        .poll-option-content {
          position: relative;
          z-index: 2;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13.5px;
          font-weight: 500;
          width: 100%;
        }
        .poll-voter-info {
          position: relative;
          z-index: 2;
          width: 100%;
        }
        .poll-control-bar {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          border-top: 1px solid var(--chat-border, #e2e8f0);
          padding-top: 10px;
          margin-top: 4px;
        }
        .poll-control-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary, #475569);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 6px;
          transition: background 0.15s;
        }
        .poll-control-btn:hover {
          background: var(--chat-border, rgba(0, 0, 0, 0.05));
          color: var(--chat-primary, #6366f1);
        }
        .poll-control-btn-danger:hover {
          color: #ef4444 !important;
          background: rgba(239, 68, 68, 0.05);
        }
      `}</style>

      {/* Meta header */}
      <div className="poll-meta-header">
        {isAnonymous ? (
          <>
            <Lock size={12} />
            <span>Anonymous Poll</span>
          </>
        ) : (
          <>
            <Unlock size={12} />
            <span>Public Poll</span>
          </>
        )}
        <span>•</span>
        <span>{allowMultipleVotes ? 'Multiple choices' : 'Single choice'}</span>
        {isClosed && (
          <>
            <span>•</span>
            <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Closed</span>
          </>
        )}
      </div>

      {/* Question */}
      <div className="poll-question">
        📊 {question}
      </div>

      {/* Options timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {options.map((opt) => {
          const voted = hasVotedOption(opt);
          const percent = getPercentage(opt);
          const winner = isWinner(opt);

          return (
            <div
              key={opt.optionId}
              className={`poll-option-item ${voted ? 'poll-option-voted' : ''} ${winner ? 'poll-option-winner' : ''}`}
              onClick={() => !isSubmitting && handleVote(opt.optionId)}
            >
              {/* Animated Progress layer */}
              <div
                className={`poll-progress-bg ${winner ? 'poll-progress-winner-bg' : ''}`}
                style={{ width: `${percent}%` }}
              />

              {/* Text detail */}
              <div className="poll-option-content">
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {opt.text}
                  {voted && <Check size={14} style={{ color: 'var(--chat-primary, #6366f1)' }} />}
                  {winner && <Trophy size={14} style={{ color: '#eab308' }} />}
                </span>
                <span style={{ color: 'var(--text-secondary, #475569)', fontSize: '12px' }}>
                  {percent}% ({opt.votes?.length || 0})
                </span>
              </div>

              {/* Voter stack (if public and has votes) */}
              {!isAnonymous && opt.votes && opt.votes.length > 0 && (
                <div className="poll-voter-info">
                  {renderVoters(opt.votes)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Expiry display */}
      {expiresAt && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: timeLeft === 'Expired' || isClosed ? '#ef4444' : 'var(--text-muted, #64748b)' }}>
          <Calendar size={12} />
          <span>
            {isClosed ? 'Closed' : timeLeft} (Expires: {new Date(expiresAt).toLocaleString()})
          </span>
        </div>
      )}

      {/* Administrative actions */}
      {canManage && (
        <div className="poll-control-bar">
          {!isClosed ? (
            <button className="poll-control-btn" onClick={() => handleAction('close')}>
              Close Poll
            </button>
          ) : (
            <button className="poll-control-btn" onClick={() => handleAction('reopen')}>
              Reopen Poll
            </button>
          )}
          <button className="poll-control-btn poll-control-btn-danger" onClick={() => handleAction('delete')}>
            <Trash2 size={12} /> Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default PollBubble;
