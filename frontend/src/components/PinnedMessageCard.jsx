/**
 * @file src/components/PinnedMessageCard.jsx
 * @description Card component for individual pinned messages. Includes type-specific icons
 *   and previews, timestamps, click-to-navigate action, and role-based unpin permission checks.
 */

import React from 'react';
import { Pin, Trash2, Calendar, FileText, Package, Paperclip, Mic } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

const PinnedMessageCard = ({ msg, conversation, currentUser, onUnpin, onNavigate }) => {
  const isDirect = conversation?.type === 'direct';
  const myParticipant = conversation?.participants?.find(p => p.employeeId === currentUser?.id);
  const canUnpin = isDirect || myParticipant?.isAdmin;

  // Formatting helpers
  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getAvatarBg = (name) => {
    const colors = [
      '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
      '#3b82f6', '#ef4444', '#14b8a6', '#f97316', '#84cc16'
    ];
    return colors[(name?.charCodeAt(0) || 0) % colors.length];
  };

  const renderContentPreview = () => {
    const { messageType, text, attachment } = msg;

    if (messageType === 'image') {
      return (
        <div className="pinned-card-media-preview">
          {attachment?.url ? (
            <img src={attachment.url} alt="Attachment" className="pinned-card-thumbnail" />
          ) : (
            <div className="pinned-card-media-placeholder">🖼 Image Attachment</div>
          )}
        </div>
      );
    }

    if (messageType === 'file') {
      const fileName = attachment?.fileName || 'Attachment';
      const isZip = fileName.endsWith('.zip') || fileName.endsWith('.rar') || fileName.endsWith('.7z');
      const isPdf = fileName.endsWith('.pdf');

      return (
        <div className="pinned-card-file-preview">
          {isPdf ? (
            <FileText size={16} className="file-icon pdf-icon" />
          ) : isZip ? (
            <Package size={16} className="file-icon zip-icon" />
          ) : (
            <Paperclip size={16} className="file-icon" />
          )}
          <span className="pinned-card-filename" title={fileName}>{fileName}</span>
        </div>
      );
    }

    if (messageType === 'audio') {
      return (
        <div className="pinned-card-audio-preview">
          <Mic size={16} className="audio-icon" />
          <span>Voice Message</span>
        </div>
      );
    }

    // Default: text or fallback
    return (
      <div className="pinned-card-text">
        <MarkdownRenderer content={text} />
      </div>
    );
  };

  return (
    <div 
      className="pinned-message-card"
      onClick={() => onNavigate(msg.messageId)}
      title="Click to jump to this message"
    >
      <div className="pinned-card-header">
        <div className="pinned-card-sender-info">
          {msg.senderAvatar ? (
            <img src={msg.senderAvatar} alt={msg.senderName} className="pinned-card-avatar" />
          ) : (
            <div 
              className="pinned-card-avatar-letter"
              style={{ backgroundColor: getAvatarBg(msg.senderName) }}
            >
              {msg.senderName?.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="pinned-card-sender-meta">
            <span className="pinned-card-sender-name">{msg.senderName}</span>
            <span className="pinned-card-timestamp" title={formatDate(msg.originalTimestamp)}>
              {formatTime(msg.originalTimestamp)}
            </span>
          </div>
        </div>

        {canUnpin && (
          <button 
            className="pinned-card-unpin-btn"
            onClick={(e) => {
              e.stopPropagation();
              onUnpin(msg.messageId);
            }}
            title="Unpin Message"
          >
            <Trash2 size={14} />
            <span>Unpin</span>
          </button>
        )}
      </div>

      <div className="pinned-card-body">
        {renderContentPreview()}
      </div>

      <div className="pinned-card-footer">
        <Pin size={11} className="pin-footer-icon" />
        <span>
          Pinned by {msg.pinnedByName || (msg.pinnedBy === currentUser?.id ? 'You' : 'Someone')} on {formatDate(msg.pinnedTimestamp)} at {formatTime(msg.pinnedTimestamp)}
        </span>
      </div>
    </div>
  );
};

export default PinnedMessageCard;
