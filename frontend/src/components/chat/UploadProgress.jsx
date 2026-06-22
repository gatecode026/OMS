/**
 * @file src/components/chat/UploadProgress.jsx
 * @description UploadProgress component rendering file upload status cards, speed, ETA, cancel, retry, and file previews.
 */

import React, { useState, useEffect } from 'react';

// Helper to format file sizes
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Helper to format upload speeds
const formatSpeed = (bytesPerSec) => {
  if (!bytesPerSec || bytesPerSec === 0) return '0 B/s';
  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.floor(Math.log(bytesPerSec) / Math.log(k));
  return parseFloat((bytesPerSec / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Helper to format ETA
const formatEta = (seconds) => {
  if (seconds === null || seconds === undefined || isNaN(seconds) || seconds < 0) return '';
  if (seconds === 0) return '0s';
  if (seconds < 60) return `${seconds}s remaining`;
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s remaining`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m remaining`;
};

// Get file type icon and color based on name/type
const getFileIconInfo = (name, type) => {
  const ext = name.split('.').pop().toLowerCase();
  
  // Audio
  if (type.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext)) {
    return { icon: '🎵', color: '#a855f7', label: 'Audio' };
  }
  // Video
  if (type.startsWith('video/') || ['mp4', 'avi', 'mov', 'webm', 'mkv'].includes(ext)) {
    return { icon: '🎥', color: '#ec4899', label: 'Video' };
  }
  // Archives
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) {
    return { icon: '📦', color: '#eab308', label: 'Archive' };
  }
  // Documents
  if (['pdf'].includes(ext)) {
    return { icon: '📄', color: '#ef4444', label: 'PDF Document' };
  }
  if (['doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) {
    return { icon: '📝', color: '#3b82f6', label: 'Document' };
  }
  // Spreadsheets
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) {
    return { icon: '📊', color: '#10b981', label: 'Spreadsheet' };
  }
  // Presentations
  if (['ppt', 'pptx', 'odp'].includes(ext)) {
    return { icon: '📉', color: '#f97316', label: 'Presentation' };
  }
  // Default File
  return { icon: '📎', color: '#6b7280', label: 'File' };
};

export const UploadProgress = ({ item, onCancel, onRetry, onRemove }) => {
  const { id, file, name, size, progress, speed, eta, status, error } = item;
  const [imagePreview, setImagePreview] = useState(null);

  // Generate local object URL for image previews
  useEffect(() => {
    if (file && file.type.startsWith('image/')) {
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      return () => URL.revokeObjectURL(previewUrl);
    }
  }, [file]);

  const fileInfo = getFileIconInfo(name, file.type);
  const isImage = file.type.startsWith('image/');

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 16px',
      background: 'rgba(30, 41, 59, 0.7)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '16px',
      width: '100%',
      maxWidth: '520px',
      margin: '6px 0',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
      fontFamily: "'Inter', system-ui, sans-serif",
      position: 'relative',
      overflow: 'hidden',
      animation: 'slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .upload-action-btn {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.8);
          border-radius: 8px;
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .upload-action-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          color: #ffffff;
        }
      `}</style>

      {/* ── Visual Preview (Image Thumbnail or File Type Icon) ── */}
      <div style={{
        width: '46px',
        height: '46px',
        borderRadius: '10px',
        background: isImage ? 'transparent' : 'rgba(255, 255, 255, 0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '22px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
        flexShrink: 0
      }}>
        {isImage && imagePreview ? (
          <img 
            src={imagePreview} 
            alt="Preview" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
        ) : (
          <span style={{ color: fileInfo.color }}>{fileInfo.icon}</span>
        )}
      </div>

      {/* ── Metadata & Progress Detail ── */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, gap: '4px' }}>
        {/* Row 1: File Name and Action buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <span style={{
            color: '#f8fafc',
            fontWeight: '600',
            fontSize: '13px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }} title={name}>
            {name}
          </span>
          <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '500', flexShrink: 0 }}>
            {formatBytes(size)}
          </span>
        </div>

        {/* Row 2: Progress Slider Bar */}
        <div style={{
          width: '100%',
          height: '6px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '3px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: status === 'failed' 
              ? '#ef4444' 
              : status === 'success' 
                ? '#10b981' 
                : 'linear-gradient(90deg, #6366f1, #3b82f6)',
            borderRadius: '3px',
            transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }} />
        </div>

        {/* Row 3: Status details, Speed, ETA */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
          {status === 'uploading' && (
            <span style={{ color: '#38bdf8', fontWeight: '500' }}>
              Uploading... {progress}%
            </span>
          )}
          {status === 'success' && (
            <span style={{ color: '#4ade80', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
              ✓ Ready to Send
            </span>
          )}
          {status === 'failed' && (() => {
            let errorTitle = '❌ Upload Failed';
            let errorReason = error || 'Unknown error occurred';
            
            const lowerErr = (error || '').toLowerCase();
            if (lowerErr.includes('authenticated') || lowerErr.includes('auth') || lowerErr.includes('signature') || lowerErr.includes('credentials') || lowerErr.includes('key')) {
              errorTitle = '❌ Authentication Failed';
              errorReason = 'Invalid or mismatched ImageKit credentials (verify Public/Private keys in environment)';
            } else if (lowerErr.includes('401')) {
              errorTitle = '❌ Upload Failed';
              errorReason = 'Auth endpoint returned 401 Unauthorized';
            } else if (lowerErr.includes('25mb') || lowerErr.includes('limit of 25mb')) {
              errorTitle = '❌ Limit Exceeded';
              errorReason = 'File exceeds the 25MB free-tier limit. Please upgrade your ImageKit plan.';
            } else if (lowerErr.includes('500mb') || lowerErr.includes('too large')) {
              errorTitle = '❌ Limit Exceeded';
              errorReason = 'File size exceeds the 500MB maximum allowed limit.';
            }
            
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
                <span style={{ color: '#f87171', fontWeight: '600' }}>
                  {errorTitle}
                </span>
                <span style={{ color: '#fca5a5', fontSize: '10.5px', wordBreak: 'break-word', whiteSpace: 'normal', display: 'block', marginTop: '2px' }} title={error}>
                  Reason: {errorReason}
                </span>
              </div>
            );
          })()}

          {status === 'uploading' && (
            <div style={{ display: 'flex', gap: '8px', color: '#94a3b8' }}>
              <span>{formatSpeed(speed)}</span>
              {eta > 0 && <span>• {formatEta(eta)}</span>}
            </div>
          )}
        </div>
      </div>

      {/* ── Action Control Actions (Right Side) ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '4px' }}>
        {status === 'uploading' && (
          <button 
            className="upload-action-btn"
            onClick={() => onCancel(id)}
            title="Cancel upload"
            style={{ color: '#f87171', borderColor: 'rgba(248, 113, 113, 0.2)' }}
          >
            ✕ Cancel
          </button>
        )}
        {status === 'failed' && (
          <div style={{ display: 'flex', gap: '4px' }}>
            <button 
              className="upload-action-btn"
              onClick={() => onRetry(id)}
              title="Retry upload"
              style={{ color: '#60a5fa', borderColor: 'rgba(96, 165, 250, 0.2)' }}
            >
              🔄 Retry
            </button>
            <button 
              className="upload-action-btn"
              onClick={() => onRemove(id)}
              title="Remove card"
              style={{ padding: '4px 6px' }}
            >
              ✕
            </button>
          </div>
        )}
        {status === 'success' && (
          <button 
            className="upload-action-btn"
            onClick={() => onRemove(id)}
            title="Remove attachment"
            style={{ padding: '4px 6px', background: 'transparent', border: 'none' }}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

export default UploadProgress;
