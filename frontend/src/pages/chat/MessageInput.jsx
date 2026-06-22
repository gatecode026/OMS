/**
 * @file src/pages/chat/MessageInput.jsx
 * @description Message compose bar with direct ImageKit uploads, progress view, drag-and-drop, and Send validation.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import VoiceRecorder from './VoiceRecorder';
import useFileUpload from '../../hooks/useFileUpload';
import UploadProgress from '../../components/chat/UploadProgress';

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB Large File Support

const MessageInput = ({ activeConvId, onSend, onTypingStart, onTypingStop }) => {
  const [message, setMessage] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const emojiPickerRef = useRef(null);

  // Hook for client-side uploads directly to ImageKit
  const {
    queue,
    isUploading,
    startUpload,
    cancelUpload,
    retryUpload,
    clearQueue,
    removeQueueItem
  } = useFileUpload();

  // Clear pending/completed uploads when conversation changes or input unmounts
  useEffect(() => {
    clearQueue();
  }, [activeConvId, clearQueue]);

  // Auto-resize textarea
  const resizeTextarea = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiPickerRef.current && 
          !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener(
      'mousedown', handleClickOutside
    );
  }, []);

  const handleEmojiSelect = (emoji) => {
    const ta = textareaRef.current;
    const cursor = ta?.selectionStart ?? message.length;
    const newMsg = 
      message.slice(0, cursor) + 
      emoji.native + 
      message.slice(cursor);
    setMessage(newMsg);
    setShowEmojiPicker(false);
    setTimeout(() => {
      if (ta) {
        ta.focus();
        const pos = cursor + emoji.native.length;
        ta.setSelectionRange(pos, pos);
        resizeTextarea();
      }
    }, 10);
  };

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
    // Prevent sending while uploads are in progress
    if (isUploading) return;

    const trimmedText = message.trim();
    
    // 1. Send text message if present
    if (trimmedText) {
      onSend(trimmedText, 'text');
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }

    // 2. Send each successfully uploaded file in the queue
    const successfulUploads = queue.filter(item => item.status === 'success');
    successfulUploads.forEach(item => {
      const type = item.file.type.startsWith('image/') ? 'image' : 'file';
      const content = `📎 ${item.name}`;
      
      onSend(content, type, {
        fileName: item.result.fileName,
        fileSize: item.result.fileSize,
        fileType: item.result.fileType,
        url: item.result.url,
        thumbnailUrl: item.result.thumbnailUrl,
        imageKitFileId: item.result.imageKitFileId,
        imageKitFilePath: item.result.imageKitFilePath
      });
    });

    // 3. Clear the upload queue
    clearQueue();

    onTypingStop?.();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  }, [message, queue, isUploading, onSend, onTypingStop, clearQueue]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Ensure we don't send if button is disabled
      const isSendDisabled = isUploading || (!message.trim() && !queue.some(item => item.status === 'success'));
      if (!isSendDisabled) {
        handleSend();
      }
    }
  };

  // File attachment selection
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      if (file.size > MAX_FILE_SIZE) {
        alert(`File "${file.name}" is too large. Maximum 500 MB allowed.`);
        return;
      }
      startUpload(file);
    });
    e.target.value = '';
  };

  // Drag and drop handlers
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    files.forEach(file => {
      if (file.size > MAX_FILE_SIZE) {
        alert(`File "${file.name}" is too large. Maximum 500 MB allowed.`);
        return;
      }
      startUpload(file);
    });
  };

  // Sending state checks
  const hasText = message.trim().length > 0;
  const hasAttachments = queue.length > 0;
  const showSendButton = hasText || hasAttachments;
  const isSendDisabled = isUploading || (!hasText && !queue.some(item => item.status === 'success'));

  // Voice send handler
  const handleVoiceSend = useCallback((content, type, meta) => {
    onSend(content, type, meta);
    setIsRecording(false);
  }, [onSend]);

  return (
    <div
      className={`msg-input-container ${isDragOver ? 'msg-input-drag-over' : ''}`}
      onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      style={{ display: 'flex', flexDirection: 'column', width: '100%' }}
    >
      {isDragOver && (
        <div className="msg-drop-overlay">
          <div className="msg-drop-label">📎 Drop files to upload & send</div>
        </div>
      )}

      {/* ── Attachment Preview / Upload Progress Container ── */}
      {queue.length > 0 && (
        <div className="msg-input-uploads-container" style={{
          padding: '8px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          borderBottom: '1px solid var(--border-color, #e2e8f0)',
          maxHeight: '240px',
          overflowY: 'auto',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {queue.map(item => (
            <UploadProgress
              key={item.id}
              item={item}
              onCancel={cancelUpload}
              onRetry={retryUpload}
              onRemove={removeQueueItem}
            />
          ))}
        </div>
      )}

      {/* Input composition row */}
      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        {/* ── Voice recorder (shown when recording) ────────────── */}
        {isRecording && (
          <VoiceRecorder
            onSend={handleVoiceSend}
            onCancel={() => setIsRecording(false)}
          />
        )}

        {/* ── Normal compose bar (hidden while recording) ─────── */}
        {!isRecording && (
          <>
            {/* ── Attachment button ────────────────────────────────── */}
            <button
              className="msg-input-attach-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Attach files"
              type="button"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z"
              style={{ display: 'none' }}
              onChange={handleFileChange}
              multiple
            />

            <div style={{ position: 'relative' }} ref={emojiPickerRef}>
              <button
                className="msg-input-attach-btn"
                onClick={() => setShowEmojiPicker(prev => !prev)}
                title="Emoji (😊)"
                type="button"
                style={{ 
                  color: showEmojiPicker 
                    ? 'var(--color-primary, #6366f1)' 
                    : 'inherit' 
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" 
                  fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                  <line x1="9" y1="9" x2="9.01" y2="9"/>
                  <line x1="15" y1="9" x2="15.01" y2="9"/>
                </svg>
              </button>

              {showEmojiPicker && (
                <div style={{
                  position: 'absolute',
                  bottom: '52px',
                  left: '0',
                  zIndex: 1000,
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                  border: '1px solid var(--border-color, #e2e8f0)'
                }}>
                  <Picker
                    data={data}
                    onEmojiSelect={handleEmojiSelect}
                    theme="auto"
                    previewPosition="none"
                    skinTonePosition="none"
                    maxFrequentRows={2}
                    perLine={8}
                    set="native"
                    locale="en"
                  />
                </div>
              )}
            </div>

            <textarea
              ref={textareaRef}
              className="msg-input-textarea"
              placeholder="Type a message..."
              value={message}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              rows={1}
            />

            {/* ── Mic button (show when nothing typed and no files attached) ─────────────── */}
            {!showSendButton && (
              <button
                className="msg-input-attach-btn msg-input-mic-btn"
                onClick={() => setIsRecording(true)}
                title="Record voice message"
                type="button"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              </button>
            )}

            {/* ── Send button (show when text typed or files attached) ───────────────── */}
            {showSendButton && (
              <button
                className={`msg-input-send-btn ${isSendDisabled ? '' : 'msg-input-send-active'}`}
                onClick={handleSend}
                disabled={isSendDisabled}
                title={isSendDisabled ? "Uploading files..." : "Send message (Enter)"}
                type="button"
                style={isSendDisabled ? {
                  opacity: 0.5,
                  cursor: 'not-allowed',
                  backgroundColor: 'var(--border-color, #cbd5e1)',
                  color: 'var(--text-muted, #94a3b8)'
                } : {}}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MessageInput;
