/**
 * @file src/components/AttachmentCard.jsx
 * @description Premium WhatsApp-style attachment preview card with circular progress overlay.
 */

import { useState, useEffect } from 'react';

const getFileIconInfo = (name, type) => {
  const ext = name.split('.').pop().toLowerCase();
  
  if (type.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext)) {
    return { icon: '🎵', color: '#a855f7', label: 'Audio' };
  }
  if (type.startsWith('video/') || ['mp4', 'avi', 'mov', 'webm', 'mkv'].includes(ext)) {
    return { icon: '🎥', color: '#ec4899', label: 'Video' };
  }
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) {
    return { icon: '📦', color: '#eab308', label: 'Archive' };
  }
  if (['pdf'].includes(ext)) {
    return { icon: '📄', color: '#ef4444', label: 'PDF' };
  }
  if (['doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) {
    return { icon: '📝', color: '#3b82f6', label: 'Document' };
  }
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) {
    return { icon: '📊', color: '#10b981', label: 'Spreadsheet' };
  }
  if (['ppt', 'pptx', 'odp'].includes(ext)) {
    return { icon: '📉', color: '#f97316', label: 'Presentation' };
  }
  return { icon: '📎', color: '#6b7280', label: 'File' };
};

export const AttachmentCard = ({ item, onCancel, onRetry, onRemove }) => {
  const { id, file, name, progress, status, error } = item;
  const [imagePreview, setImagePreview] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);

  // Generate local previews for images and videos
  useEffect(() => {
    if (!file) return;

    let url = '';
    if (file.type.startsWith('image/')) {
      url = URL.createObjectURL(file);
      const currentUrl = url;
      Promise.resolve().then(() => {
        setImagePreview(currentUrl);
      });
    } else if (file.type.startsWith('video/')) {
      url = URL.createObjectURL(file);
      const currentUrl = url;
      Promise.resolve().then(() => {
        setVideoPreview(currentUrl);
      });
    }

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [file]);

  const isImage = file?.type?.startsWith('image/');
  const isVideo = file?.type?.startsWith('video/');
  const fileInfo = getFileIconInfo(name, file?.type || '');

  return (
    <div style={{
      position: 'relative',
      width: '84px',
      height: '84px',
      borderRadius: '12px',
      background: 'var(--bg-elevated, #edf2f7)',
      border: '1px solid var(--chat-border, rgba(0, 0, 0, 0.08))',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
      flexShrink: 0,
      userSelect: 'none',
      fontFamily: "'Inter', system-ui, sans-serif"
    }}>
      {/* ── 1. Thumbnail / File Icon Preview ── */}
      {isImage && imagePreview ? (
        <img
          src={imagePreview}
          alt="Preview"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : isVideo && videoPreview ? (
        <video
          src={videoPreview}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          muted
          playsInline
        />
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          padding: '6px'
        }}>
          <span style={{ fontSize: '24px', color: fileInfo.color }}>{fileInfo.icon}</span>
          <span style={{
            fontSize: '9.5px',
            color: 'var(--text-muted, #718096)',
            textAlign: 'center',
            width: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginTop: '4px',
            fontWeight: '600'
          }} title={name}>
            {name}
          </span>
        </div>
      )}

      {/* ── 2. Circular Upload Progress Overlay ── */}
      {status === 'uploading' && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(1px)',
          zIndex: 10
        }}>
          <svg width="42" height="42" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="rgba(255, 255, 255, 0.2)"
              strokeWidth="3.5"
            />
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="#6366f1"
              strokeWidth="3.5"
              strokeDasharray="94.2"
              strokeDashoffset={94.2 - (94.2 * (progress || 0)) / 100}
              style={{ transition: 'stroke-dashoffset 0.15s linear' }}
            />
          </svg>
          <span style={{
            position: 'absolute',
            color: '#ffffff',
            fontSize: '10px',
            fontWeight: '700'
          }}>
            {progress || 0}%
          </span>

          {/* Close/Cancel Button in overlay */}
          <button
            onClick={() => onCancel(id)}
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: 'rgba(0, 0, 0, 0.5)',
              border: 'none',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '9px',
              cursor: 'pointer',
              fontWeight: 'bold',
              lineHeight: 1
            }}
            title="Cancel upload"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── 3. Failed State Overlay ── */}
      {status === 'failed' && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          padding: '4px'
        }}>
          <span style={{ fontSize: '16px', color: '#f87171', marginBottom: '4px' }} title={error || 'Upload failed'}>⚠️</span>
          
          <button
            onClick={() => onRetry(id)}
            style={{
              background: '#3b82f6',
              border: 'none',
              color: '#fff',
              borderRadius: '12px',
              padding: '3px 8px',
              fontSize: '9px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
            title="Retry Upload"
          >
            Retry
          </button>

          {/* Remove Button in overlay */}
          <button
            onClick={() => onRemove(id)}
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: 'rgba(0, 0, 0, 0.5)',
              border: 'none',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '9px',
              cursor: 'pointer',
              fontWeight: 'bold',
              lineHeight: 1
            }}
            title="Remove card"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── 4. Success Card Hover Close Button ── */}
      {status === 'success' && (
        <button
          onClick={() => onRemove(id)}
          style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            background: 'rgba(0, 0, 0, 0.5)',
            border: 'none',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            cursor: 'pointer',
            fontWeight: 'bold',
            zIndex: 5,
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            transition: 'background 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'}
          title="Remove attachment"
        >
          ✕
        </button>
      )}

      {/* Success Badge */}
      {status === 'success' && (
        <div style={{
          position: 'absolute',
          bottom: '4px',
          right: '4px',
          background: '#10b981',
          color: '#fff',
          borderRadius: '50%',
          width: '14px',
          height: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '8px',
          fontWeight: 'bold',
          zIndex: 5,
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
        }}>
          ✓
        </div>
      )}
    </div>
  );
};

export default AttachmentCard;
