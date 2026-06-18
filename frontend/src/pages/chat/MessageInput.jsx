/**
 * @file src/pages/chat/MessageInput.jsx
 * @description Message compose bar — textarea, attachment, send button, typing events.
 */

import React, { useState, useRef, useCallback } from 'react';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const MessageInput = ({ onSend, onTypingStart, onTypingStop }) => {
  const [message, setMessage] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto-resize textarea
  const resizeTextarea = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, []);

  const handleChange = (e) => {
    setMessage(e.target.value);
    resizeTextarea();

    // Typing events
    onTypingStart?.();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onTypingStop?.();
    }, 2500);
  };

  const handleSend = useCallback(() => {
    const trimmed = message.trim();
    if (!trimmed) return;
    onSend(trimmed, 'text');
    setMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    onTypingStop?.();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  }, [message, onSend, onTypingStop]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // File attachment
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      alert('File too large. Maximum 5 MB allowed.');
      return;
    }
    const isImage = file.type.startsWith('image/');
    const type = isImage ? 'image' : 'file';
    
    const reader = new FileReader();
    reader.onload = () => {
      onSend(`📎 ${file.name}`, type, {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        url: reader.result
      });
    };
    reader.onerror = (err) => {
      console.error('[Chat] FileReader error:', err);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Drag and drop
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        alert('File too large. Maximum 5 MB allowed.');
        return;
      }
      const isImage = file.type.startsWith('image/');
      const type = isImage ? 'image' : 'file';
      
      const reader = new FileReader();
      reader.onload = () => {
        onSend(`📎 ${file.name}`, type, {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          url: reader.result
        });
      };
      reader.onerror = (err) => {
        console.error('[Chat] FileReader error:', err);
      };
      reader.readAsDataURL(file);
    }
  };

  const canSend = message.trim().length > 0;

  return (
    <div
      className={`msg-input-container ${isDragOver ? 'msg-input-drag-over' : ''}`}
      onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="msg-drop-overlay">
          <div className="msg-drop-label">📎 Drop file to send</div>
        </div>
      )}

      {/* ── Attachment button ────────────────────────────────── */}
      <button
        className="msg-input-attach-btn"
        onClick={() => fileInputRef.current?.click()}
        title="Attach file"
        type="button"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
        </svg>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <textarea
        ref={textareaRef}
        className="msg-input-textarea"
        placeholder="Type a message..."
        value={message}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        rows={1}
      />

      {/* ── Send button ──────────────────────────────────────── */}
      <button
        className={`msg-input-send-btn ${canSend ? 'msg-input-send-active' : ''}`}
        onClick={handleSend}
        disabled={!canSend}
        title="Send message (Enter)"
        type="button"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"/>
          <polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
      </button>
    </div>
  );
};

export default MessageInput;
