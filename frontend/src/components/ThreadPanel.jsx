/**
 * @file src/components/ThreadPanel.jsx
 * @description Collapsible thread panel for Slack-style message threads.
 *   Shows root message, replies timeline, followers, status controls, and reply composer.
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useChat } from '../context/ChatContext';
import { useApp } from '../context/AppContext';
import MarkdownRenderer from './MarkdownRenderer';
import MessageInput from '../pages/chat/MessageInput';
import Avatar from './common/Avatar';
import { X, Bell, BellOff, CheckCircle2, AlertCircle, ArrowLeft, Search } from 'lucide-react';
import { formatTime } from '../pages/chat/ConversationsList';

const ThreadPanel = ({ onClose }) => {
  const {
    activeThread,
    activeThreadReplies,
    isLoadingThreadReplies,
    sendThreadReply,
    followThread,
    unfollowThread,
    updateThreadStatus,
    markThreadAsRead
  } = useChat();

  const { currentUser, addToast } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const scrollContainerRef = useRef(null);

  // Mark thread as read when replies change or panel is focused
  useEffect(() => {
    if (activeThread?._id) {
      markThreadAsRead(activeThread._id);
    }
  }, [activeThread?._id, activeThreadReplies.length, markThreadAsRead]);

  // Scroll to bottom on new replies
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [activeThreadReplies.length]);

  const isFollower = useMemo(() => {
    if (!activeThread || !currentUser) return false;
    return activeThread.followers?.includes(currentUser.id);
  }, [activeThread, currentUser]);

  const canManageStatus = useMemo(() => {
    if (!activeThread || !currentUser) return false;
    return (
      currentUser.role === 'admin' ||
      currentUser.role === 'super_admin' ||
      currentUser.roleId === 'admin' ||
      currentUser.roleId === 'super_admin' ||
      activeThread.createdBy === currentUser.id
    );
  }, [activeThread, currentUser]);

  const handleToggleFollow = () => {
    if (!activeThread) return;
    if (isFollower) {
      unfollowThread(activeThread._id);
    } else {
      followThread(activeThread._id);
    }
  };

  const handleStatusChange = (newStatus) => {
    if (!activeThread) return;
    updateThreadStatus(activeThread._id, newStatus);
  };

  const handleSendReply = async (content, type = 'text', media = null) => {
    if (!activeThread) return false;
    return await sendThreadReply(content, type, media);
  };

  // Filter replies based on search query
  const filteredReplies = useMemo(() => {
    if (!searchQuery.trim()) return activeThreadReplies;
    const q = searchQuery.toLowerCase().trim();
    return activeThreadReplies.filter(reply => 
      reply.content?.toLowerCase().includes(q) ||
      reply.senderName?.toLowerCase().includes(q)
    );
  }, [activeThreadReplies, searchQuery]);

  if (!activeThread) return null;

  const rootMsg = activeThread.rootMessage || {};

  return (
    <div className="thread-panel">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="thread-panel-header">
        <div className="thread-header-left">
          <button className="thread-back-btn-mobile" onClick={onClose} title="Back to Chat">
            <ArrowLeft size={20} />
          </button>
          <div className="thread-title-wrap">
            <h3 className="thread-title">Thread</h3>
            <span className="thread-subtitle">in conversation</span>
          </div>
        </div>

        <div className="thread-header-actions">
          {/* Search Toggle */}
          <button 
            className={`thread-action-icon-btn ${showSearch ? 'active' : ''}`} 
            onClick={() => setShowSearch(!showSearch)} 
            title="Search in thread"
          >
            <Search size={18} />
          </button>

          {/* Follow/Unfollow Toggle */}
          <button 
            className={`thread-action-icon-btn ${isFollower ? 'following' : ''}`} 
            onClick={handleToggleFollow} 
            title={isFollower ? 'Unfollow thread' : 'Follow thread'}
          >
            {isFollower ? <BellOff size={18} /> : <Bell size={18} />}
          </button>

          {/* Thread Status Control */}
          {canManageStatus ? (
            <div className="thread-status-dropdown">
              <button className={`thread-status-badge badge-${activeThread.status}`}>
                {activeThread.status === 'open' && '🟢 Open'}
                {activeThread.status === 'resolved' && '🟡 Resolved'}
                {activeThread.status === 'closed' && '🔴 Closed'}
              </button>
              <div className="status-dropdown-content">
                {activeThread.status !== 'open' && (
                  <button onClick={() => handleStatusChange('open')}>Reopen Thread</button>
                )}
                {activeThread.status !== 'resolved' && (
                  <button onClick={() => handleStatusChange('resolved')}>Resolve Thread</button>
                )}
                {activeThread.status !== 'closed' && (
                  <button onClick={() => handleStatusChange('closed')}>Close Thread</button>
                )}
              </div>
            </div>
          ) : (
            <span className={`thread-status-badge-static badge-${activeThread.status}`}>
              {activeThread.status === 'open' && '🟢 Open'}
              {activeThread.status === 'resolved' && '🟡 Resolved'}
              {activeThread.status === 'closed' && '🔴 Closed'}
            </span>
          )}

          {/* Close Panel */}
          <button className="thread-close-btn" onClick={onClose} title="Close Panel">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* ── SEARCH BAR ──────────────────────────────────────────────────── */}
      {showSearch && (
        <div className="thread-search-bar animate-slide-down">
          <Search size={16} className="thread-search-icon" />
          <input 
            type="text" 
            placeholder="Search replies..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)}
            className="thread-search-input-field"
            autoFocus
          />
          {searchQuery && (
            <button className="thread-search-clear" onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>
      )}

      {/* ── SCROLL TIMELINE ─────────────────────────────────────────────── */}
      <div className="thread-timeline" ref={scrollContainerRef}>
        {/* Root Message Card */}
        <div className="thread-root-card">
          <div className="thread-card-header">
            <Avatar 
              name={rootMsg.senderName || 'User'} 
              src={rootMsg.senderAvatar} 
              size="md" 
              className="thread-card-avatar"
            />
            <div className="thread-card-meta">
              <span className="thread-card-sender">{rootMsg.senderName || 'Unknown'}</span>
              <span className="thread-card-time">{formatTime(rootMsg.createdAt)}</span>
            </div>
          </div>
          <div className="thread-card-body">
            {rootMsg.contentType === 'markdown' ? (
              <MarkdownRenderer content={rootMsg.content} />
            ) : (
              <p className="thread-card-text">{rootMsg.content}</p>
            )}

            {/* Root Media Attachment */}
            {rootMsg.media && rootMsg.media.url && (
              <div className="thread-media-attach">
                {rootMsg.type === 'image' && (
                  <img src={rootMsg.media.url} alt="Attachment" className="thread-media-img" />
                )}
                {rootMsg.type === 'file' && (
                  <div className="thread-file-card">
                    <span className="file-icon">📄</span>
                    <div className="file-details">
                      <a href={rootMsg.media.url} target="_blank" rel="noopener noreferrer" className="file-link">
                        {rootMsg.media.fileName || 'Download Attachment'}
                      </a>
                      <span className="file-size">
                        {rootMsg.media.fileSize ? `${(rootMsg.media.fileSize / 1024 / 1024).toFixed(2)} MB` : ''}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Replies Divider */}
        <div className="thread-replies-divider">
          <span>{activeThread.replyCount} {activeThread.replyCount === 1 ? 'reply' : 'replies'}</span>
          <div className="divider-line" />
        </div>

        {/* Replies Timeline */}
        <div className="thread-replies-list">
          {isLoadingThreadReplies && activeThreadReplies.length === 0 ? (
            <div className="thread-loading">
              <div className="thread-spinner" />
              <span>Loading replies...</span>
            </div>
          ) : filteredReplies.length === 0 ? (
            <div className="thread-empty-replies">
              {searchQuery ? 'No replies match your search.' : 'No replies yet. Start the conversation!'}
            </div>
          ) : (
            filteredReplies.map((reply) => {
              const isOwn = reply.senderId === currentUser?.id;
              return (
                <div key={reply.id} className={`thread-reply-item ${isOwn ? 'own-reply' : ''}`}>
                  <Avatar 
                    name={reply.senderName} 
                    src={reply.senderAvatar} 
                    size="sm" 
                    className="reply-avatar"
                  />
                  <div className="reply-content-box">
                    <div className="reply-meta-row">
                      <span className="reply-sender-name">{reply.senderName}</span>
                      <span className="reply-sent-time">{formatTime(reply.createdAt)}</span>
                    </div>
                    <div className="reply-body-text">
                      {reply.contentType === 'markdown' ? (
                        <MarkdownRenderer content={reply.content} />
                      ) : (
                        <p>{reply.content}</p>
                      )}
                      
                      {/* Reply Attachments */}
                      {reply.media && reply.media.url && (
                        <div className="reply-media-attach">
                          {reply.type === 'image' && (
                            <img src={reply.media.url} alt="Attachment" className="reply-media-img" />
                          )}
                          {reply.type === 'file' && (
                            <div className="reply-file-card">
                              <span className="file-icon">📄</span>
                              <div className="file-details">
                                <a href={reply.media.url} target="_blank" rel="noopener noreferrer" className="file-link">
                                  {reply.media.fileName || 'Download Attachment'}
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Status checks */}
                    {isOwn && reply._deliveryStatus && (
                      <span className={`reply-delivery-status status-${reply._deliveryStatus}`}>
                        {reply._deliveryStatus === 'sending' && '⏳ sending'}
                        {reply._deliveryStatus === 'failed' && '⚠️ failed'}
                        {reply._deliveryStatus === 'delivered' && '✓'}
                        {reply._deliveryStatus === 'seen' && '✓✓'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── COMPOSER FOOTER ─────────────────────────────────────────────── */}
      <div className="thread-panel-footer">
        {activeThread.status === 'closed' ? (
          <div className="thread-closed-banner">
            <AlertCircle size={18} />
            <span>This thread has been closed. No further replies can be added.</span>
          </div>
        ) : (
          <MessageInput 
            activeConvId={activeThread._id} 
            onSend={handleSendReply}
            onTypingStart={null}
            onTypingStop={null}
          />
        )}
      </div>
    </div>
  );
};

export default ThreadPanel;
