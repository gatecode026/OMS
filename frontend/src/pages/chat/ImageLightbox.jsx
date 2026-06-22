import React, { useEffect, useState, useCallback } from 'react';

const ImageLightbox = ({ src, fileName, onClose }) => {
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  // Zoom with mouse wheel
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setZoom(prev => Math.min(Math.max(0.5, prev - e.deltaY * 0.001), 4));
  }, []);

  // Drag to pan when zoomed
  const handleMouseDown = (e) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Download image
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = fileName || 'image';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.92)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onWheel={handleWheel}
    >
      {/* Top toolbar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
        zIndex: 10000
      }}>
        <span style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>
          {fileName || 'Image'}
        </span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Zoom out */}
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
            style={btnStyle} title="Zoom Out">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" 
              stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </button>
          {/* Zoom level */}
          <span style={{ color: '#fff', fontSize: '13px', minWidth: '40px', textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </span>
          {/* Zoom in */}
          <button onClick={() => setZoom(z => Math.min(4, z + 0.25))}
            style={btnStyle} title="Zoom In">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" 
              stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="11" y1="8" x2="11" y2="14"/>
              <line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </button>
          {/* Reset zoom */}
          <button onClick={() => { setZoom(1); setPosition({ x: 0, y: 0 }); }}
            style={btnStyle} title="Reset">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" 
              stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
          </button>
          {/* Download */}
          <button onClick={handleDownload} style={btnStyle} title="Download">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" 
              stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
          {/* Close */}
          <button onClick={onClose} style={{ ...btnStyle, marginLeft: '8px' }} title="Close (Esc)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" 
              stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Image */}
      <img
        src={src}
        alt={fileName}
        style={{
          maxWidth: zoom === 1 ? '90vw' : 'none',
          maxHeight: zoom === 1 ? '85vh' : 'none',
          objectFit: 'contain',
          transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
          transition: isDragging ? 'none' : 'transform 0.15s ease',
          cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
          userSelect: 'none',
          borderRadius: '4px'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        draggable={false}
      />

      {/* Bottom hint */}
      <div style={{
        position: 'fixed', bottom: '20px',
        color: 'rgba(255,255,255,0.4)', fontSize: '12px', textAlign: 'center'
      }}>
        Scroll to zoom · Drag to pan · ESC to close
      </div>
    </div>
  );
};

const btnStyle = {
  background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.2)',
  color: '#fff', borderRadius: '8px',
  padding: '6px', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'background 0.2s'
};

export default ImageLightbox;
