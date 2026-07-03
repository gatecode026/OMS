/**
 * @file src/pages/chat/MessageInput.jsx
 * @description Message compose bar with direct ImageKit uploads, progress view, drag-and-drop, and Send validation.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import VoiceRecorder from './VoiceRecorder';
import { useChat } from '../../context/ChatContext';
import { useApp } from '../../context/AppContext';
import useFileUpload from '../../hooks/useFileUpload';
import AttachmentCard from '../../components/AttachmentCard';
import FormattingToolbar from '../../components/FormattingToolbar';
import MarkdownPreview from '../../components/MarkdownPreview';
import { FileText, Image, Headphones, BarChart2, Calendar, CheckSquare, Type } from 'lucide-react';

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB Large File Support

const MessageInput = ({ activeConvId, onSend, onTypingStart, onTypingStop }) => {
  const { conversations } = useChat();
  const { currentUser: simulatedUser } = useApp();
  const currentUser = React.useMemo(() => {
    try {
      const saved = localStorage.getItem('saas_user');
      return saved ? JSON.parse(saved) : simulatedUser;
    } catch (e) {
      return simulatedUser;
    }
  }, [simulatedUser]);
  
  const conv = conversations?.find(c => c.id === activeConvId);
  
  const isManagerOrAdmin = (user) => {
    if (!user) return false;
    const role = user.roleId || user.role || '';
    const designation = user.designation || '';
    const isManagementRole = ['super_admin', 'dept_admin', 'branch_admin', 'manager'].includes(role.toLowerCase());
    const isManagerDesignation = designation.toLowerCase().includes('manager');
    return isManagementRole || isManagerDesignation;
  };

  const isGroupAdmin = conv?.participants?.find(p => p.employeeId === currentUser?.id)?.isAdmin === true;

  const canCreatePollOrTask = isManagerOrAdmin(currentUser) || isGroupAdmin;

  const [message, setMessage] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);

  const fileInputRef = useRef(null);
  const docInputRef = useRef(null);
  const mediaInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const textareaRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const plusMenuRef = useRef(null);
  const formattingToolbarRef = useRef(null);

  // Typing tracking refs
  const isTypingRef = useRef(false);
  const typingIntervalRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Hook for client-side uploads directly to ImageKit
  const {
    queue: allQueue,
    startUpload,
    cancelUpload,
    retryUpload,
    clearQueue,
    removeQueueItem
  } = useFileUpload();

  // Filter queue for active conversation
  const queue = allQueue.filter(item => item.convId === activeConvId);
  const isUploading = queue.some(item => item.status === 'uploading');

  // Auto-resize textarea
  const resizeTextarea = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, []);

  const onTypingStartRef = useRef(onTypingStart);
  const onTypingStopRef = useRef(onTypingStop);

  useEffect(() => {
    onTypingStartRef.current = onTypingStart;
    onTypingStopRef.current = onTypingStop;
  }, [onTypingStart, onTypingStop]);

  const stopTypingState = useCallback(() => {
    if (isTypingRef.current) {
      onTypingStopRef.current?.();
      isTypingRef.current = false;
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiPickerRef.current && 
          !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
      if (formattingToolbarRef.current && 
          !formattingToolbarRef.current.contains(e.target)) {
        setShowToolbar(false);
      }
      if (plusMenuRef.current && 
          !plusMenuRef.current.contains(e.target) && 
          !e.target.closest('.plus-trigger-btn')) {
        setShowPlusMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener(
      'mousedown', handleClickOutside
    );
  }, []);

  // Handle typing cleanup on conversation change
  useEffect(() => {
    return () => {
      stopTypingState();
    };
  }, [activeConvId, stopTypingState]);

  // Handle voice recording status propagation
  useEffect(() => {
    if (isRecording) {
      // 1. Clear any existing typing timeouts/intervals
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }

      // 2. Set active flag and notify recording start
      isTypingRef.current = true;
      onTypingStartRef.current?.(true);

      // 3. Set a 3-second recurring interval to keep recording status alive on backend
      typingIntervalRef.current = setInterval(() => {
        if (isTypingRef.current) {
          onTypingStartRef.current?.(true);
        }
      }, 3000);
    } else {
      // If we are no longer recording, stop recording/typing state immediately
      stopTypingState();
    }

    return () => {
      // Clear interval on cleanup
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
    };
  }, [isRecording, stopTypingState]);

  // Handle typing cleanup on window unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      stopTypingState();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [stopTypingState]);

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
    const val = e.target.value;
    setMessage(val);
    resizeTextarea();

    if (!val.trim()) {
      stopTypingState();
      return;
    }

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      onTypingStartRef.current?.();

      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = setInterval(() => {
        if (isTypingRef.current) {
          onTypingStartRef.current?.();
        }
      }, 3000);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      stopTypingState();
    }, 1500);
  };

  const handleBlur = () => {
    stopTypingState();
  };

  const handleFormat = useCallback((prefix, suffix) => {
    const ta = textareaRef.current;
    if (!ta) return;

    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = message;
    const selectedText = text.substring(start, end);
    const before = text.substring(0, start);
    const after = text.substring(end);

    const replacement = prefix + selectedText + suffix;
    const newValue = before + replacement + after;
    
    setMessage(newValue);

    setTimeout(() => {
      ta.focus();
      const newCursorStart = start + prefix.length;
      const newCursorEnd = start + prefix.length + selectedText.length;
      ta.setSelectionRange(newCursorStart, newCursorEnd);
      resizeTextarea();
    }, 10);
  }, [message, resizeTextarea]);

  const handleSend = useCallback(() => {
    // Prevent sending while uploads are in progress
    if (isUploading) return;

    const trimmedText = message.trim();
    
    // 1. Send text message if present
    if (trimmedText) {
      onSend(trimmedText, 'text');
      setMessage('');
      setIsPreviewMode(false); // Reset preview mode
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

    // 3. Clear the upload queue for this conversation
    clearQueue(activeConvId);

    stopTypingState();
  }, [message, queue, isUploading, onSend, stopTypingState, clearQueue, activeConvId]);

  const handleKeyDown = (e) => {
    // 1. Check for formatting keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase();
      if (key === 'b') {
        e.preventDefault();
        handleFormat('**', '**');
        return;
      }
      if (key === 'i') {
        e.preventDefault();
        handleFormat('*', '*');
        return;
      }
      if (key === 'e') {
        e.preventDefault();
        handleFormat('`', '`');
        return;
      }
      if (e.shiftKey && key === 'x') {
        e.preventDefault();
        handleFormat('~', '~');
        return;
      }
      if (e.shiftKey && key === 'c') {
        e.preventDefault();
        handleFormat('```\n', '\n```');
        return;
      }
    }

    // 2. Original enter key handler
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
      startUpload(file, activeConvId);
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
      startUpload(file, activeConvId);
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
          padding: '10px 16px',
          display: 'flex',
          flexDirection: 'row',
          gap: '10px',
          borderBottom: '1px solid var(--border-color, #e2e8f0)',
          overflowX: 'auto',
          width: '100%',
          boxSizing: 'border-box',
          scrollbarWidth: 'thin'
        }}>
          {queue.map(item => (
            <AttachmentCard
              key={item.id}
              item={item}
              onCancel={cancelUpload}
              onRetry={retryUpload}
              onRemove={removeQueueItem}
            />
          ))}
        </div>
      )}

      {/* Rich Text Formatting Toolbar removed from above */}

      {/* Input composition row */}
      <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '8px' }}>
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
            {/* ── Plus Actions Menu Button ────────────────── */}
            <div className="plus-menu-container">
              <style>{`
                .plus-menu-container {
                  position: relative;
                  display: inline-block;
                }
                .plus-actions-menu {
                  position: absolute;
                  bottom: 56px;
                  left: 0;
                  background: #182229;
                  border-radius: 16px;
                  padding: 8px;
                  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
                  display: flex;
                  flex-direction: column;
                  gap: 2px;
                  z-index: 1001;
                  min-width: 210px;
                  animation: menu-fade-in 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes menu-fade-in {
                  from { opacity: 0; transform: translateY(10px) scale(0.95); }
                  to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .plus-action-item {
                  display: flex;
                  align-items: center;
                  gap: 12px;
                  padding: 8px 12px;
                  color: #e9edef;
                  font-size: 14.5px;
                  font-weight: 500;
                  cursor: pointer;
                  border-radius: 10px;
                  background: transparent;
                  border: none;
                  width: 100%;
                  text-align: left;
                  transition: background 0.15s;
                }
                .plus-action-item:hover {
                  background: rgba(255, 255, 255, 0.08);
                }
                .plus-icon-circle {
                  width: 32px;
                  height: 32px;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: #fff;
                  flex-shrink: 0;
                }
              `}</style>

              <button
                className={`msg-input-attach-btn plus-trigger-btn ${showPlusMenu ? 'active' : ''}`}
                onClick={() => setShowPlusMenu(prev => !prev)}
                title="Attach (+)"
                type="button"
                style={{
                  color: showPlusMenu ? 'var(--color-primary, #6366f1)' : 'inherit',
                  fontWeight: 'bold',
                  fontSize: '20px',
                  lineHeight: '1'
                }}
              >
                +
              </button>

              {showPlusMenu && (
                <div className="plus-actions-menu" ref={plusMenuRef}>
                  <button className="plus-action-item" type="button" onClick={() => { setShowPlusMenu(false); docInputRef.current?.click(); }}>
                    <div className="plus-icon-circle" style={{ backgroundColor: '#7f5af0' }}><FileText size={16} /></div>
                    Document
                  </button>
                  <button className="plus-action-item" type="button" onClick={() => { setShowPlusMenu(false); mediaInputRef.current?.click(); }}>
                    <div className="plus-icon-circle" style={{ backgroundColor: '#005af0' }}><Image size={16} /></div>
                    Photos & videos
                  </button>
                  <button className="plus-action-item" type="button" onClick={() => { setShowPlusMenu(false); audioInputRef.current?.click(); }}>
                    <div className="plus-icon-circle" style={{ backgroundColor: '#f97316' }}><Headphones size={16} /></div>
                    Audio
                  </button>
                  {conv?.type === 'group' && (
                    <button
                      className="plus-action-item"
                      type="button"
                      onClick={() => { setShowPlusMenu(false); window.dispatchEvent(new CustomEvent('open-create-poll')); }}
                      disabled={!canCreatePollOrTask}
                      title={!canCreatePollOrTask ? "Only group admins or management (managers) can create polls" : ""}
                      style={!canCreatePollOrTask ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                    >
                      <div className="plus-icon-circle" style={{ backgroundColor: '#eab308' }}><BarChart2 size={16} /></div>
                      Poll {!canCreatePollOrTask && '🔒'}
                    </button>
                  )}
                  <button
                    className="plus-action-item"
                    type="button"
                    onClick={() => { setShowPlusMenu(false); window.dispatchEvent(new CustomEvent('create-task-from-message', { detail: {} })); }}
                    disabled={!canCreatePollOrTask}
                    title={!canCreatePollOrTask ? "Only group admins or management (managers) can assign tasks" : ""}
                    style={!canCreatePollOrTask ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                  >
                    <div className="plus-icon-circle" style={{ backgroundColor: '#10b981' }}><CheckSquare size={16} /></div>
                    Assign Task {!canCreatePollOrTask && '🔒'}
                  </button>
                  <button className="plus-action-item" type="button" onClick={() => { setShowPlusMenu(false); alert('Create Event simulation.'); }}>
                    <div className="plus-icon-circle" style={{ backgroundColor: '#e11d48' }}><Calendar size={16} /></div>
                    Event
                  </button>
                </div>
              )}
            </div>

            {/* Hidden native input file selectors */}
            <input
              ref={docInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z"
              style={{ display: 'none' }}
              onChange={handleFileChange}
              multiple
            />
            <input
              ref={mediaInputRef}
              type="file"
              accept="image/*,video/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
              multiple
            />
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
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

            <div style={{ position: 'relative' }} ref={formattingToolbarRef}>
              <button
                className={`msg-input-attach-btn ${showToolbar ? 'active' : ''}`}
                onClick={() => setShowToolbar(prev => !prev)}
                title="Formatting Options (Aa)"
                type="button"
                style={{ 
                  color: showToolbar 
                    ? 'var(--chat-primary, #6366f1)' 
                    : 'var(--text-muted, #94a3b8)',
                  backgroundColor: showToolbar
                    ? 'var(--chat-active-bg, #eef2ff)'
                    : 'var(--chat-input-bg, #f8fafc)',
                  border: showToolbar ? '1px solid var(--chat-primary, #6366f1)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <Type size={18} />
              </button>

              {showToolbar && (
                <div className="formatting-toolbar-popup animate-slide-down" style={{
                  position: 'absolute',
                  bottom: '56px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 1010,
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.1)',
                  border: '1px solid var(--chat-border, #e2e8f0)',
                  backgroundColor: 'var(--bg-card, #ffffff)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  minWidth: 'max-content'
                }}>
                  <style>{`
                    .formatting-toolbar-popup .formatting-toolbar {
                      border-bottom: none !important;
                      background: transparent !important;
                      padding: 4px 8px !important;
                      width: 100% !important;
                      gap: 6px !important;
                    }
                    .formatting-toolbar-popup .formatting-tool-btn {
                      width: 30px !important;
                      height: 30px !important;
                      border-radius: 8px !important;
                      transition: all 0.15s ease !important;
                    }
                    .formatting-toolbar-popup .formatting-tool-btn:hover {
                      background-color: var(--chat-hover, #f1f5f9) !important;
                      transform: translateY(-1px);
                    }
                  `}</style>
                  <FormattingToolbar
                    onFormat={handleFormat}
                    onTogglePreview={() => setIsPreviewMode(prev => !prev)}
                    isPreviewMode={isPreviewMode}
                    visibleMode={showToolbar}
                    onClose={() => {
                      setShowToolbar(false);
                      setIsPreviewMode(false);
                    }}
                  />
                </div>
              )}
            </div>

            {isPreviewMode ? (
              <div className="msg-input-preview-wrap" style={{ flex: 1, minHeight: '38px', boxSizing: 'border-box' }}>
                <MarkdownPreview content={message} />
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                className="msg-input-textarea"
                placeholder="Type a message..."
                value={message}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                rows={1}
              />
            )}

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
