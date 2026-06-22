import React, { useEffect } from 'react';

const PDFPreviewModal = ({ src, fileName, onClose }) => {

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleDownload = async () => {
    if (!src) return;

    let blob = null;
    // Parse base64 if needed
    if (src.startsWith('data:')) {
      try {
        const arr = src.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        blob = new Blob([u8arr], { type: mime });
      } catch (e) {
        console.warn('[PDFPreviewModal] Base64 parse failed:', e);
      }
    }

    // Fetch remote PDF URL
    if (!blob && !src.startsWith('data:')) {
      try {
        const res = await fetch(src);
        if (res.ok) {
          blob = await res.blob();
        }
      } catch (err) {
        console.warn('[PDFPreviewModal] Fetch blob failed:', err);
      }
    }

    // Try modern showSaveFilePicker to ask where to save
    if (blob && window.showSaveFilePicker) {
      try {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: fileName || 'document.pdf'
        });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (err) {
        if (err.name === 'AbortError') {
          console.log('[PDFPreviewModal] Save picker cancelled by user');
          return;
        }
        console.warn('[PDFPreviewModal] Save file picker error, falling back:', err);
      }
    }

    // Fallback: standard link download
    if (blob) {
      const localUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = localUrl;
      link.download = fileName || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(localUrl);
    } else {
      const link = document.createElement('a');
      link.href = src;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.download = fileName || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-card, #ffffff)',
          borderRadius: '16px',
          border: '1px solid var(--chat-border, #e2e8f0)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: '90vw',
          height: '85vh',
          maxWidth: '1000px',
          maxHeight: '800px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'chatFadeInUp 0.2s ease-out'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid var(--chat-border, #e2e8f0)',
            backgroundColor: 'var(--bg-card, #ffffff)',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
            {/* PDF Badge Icon */}
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#fee2e2',
                border: '1.5px solid #fca5a5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                flexShrink: 0
              }}
            >
              📄
            </div>
            <span
              style={{
                fontWeight: 600,
                fontSize: '15px',
                color: 'var(--text-primary, #1e293b)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
              title={fileName}
            >
              {fileName || 'Document.pdf'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            {/* Download Button */}
            <button
              onClick={handleDownload}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'var(--chat-primary, #6366f1)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download
            </button>

            {/* Close Cross Button */}
            <button
              onClick={onClose}
              style={{
                background: 'rgba(0,0,0,0.05)',
                border: 'none',
                color: 'var(--text-primary, #1e293b)',
                borderRadius: '8px',
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--chat-hover, #f1f5f9)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
            >
              Close
            </button>
          </div>
        </div>

        {/* PDF Frame Viewer */}
        <div style={{ flex: 1, overflow: 'hidden', background: '#525659', position: 'relative' }}>
          <iframe
            src={src}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title={fileName}
          />
        </div>
      </div>
    </div>
  );
};

export default PDFPreviewModal;
