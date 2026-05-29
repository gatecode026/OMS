import React, { useEffect, useRef } from 'react';
import './SlideOver.css';
import { X } from 'lucide-react';

const SlideOver = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  width = 'md' // 'sm', 'md', 'lg'
}) => {
  const backdropRef = useRef(null);

  // Esc Key Closer and Body Scroll Lock
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === backdropRef.current) {
      onClose();
    }
  };

  return (
    <div
      ref={backdropRef}
      className="slide-over-backdrop animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div className={`slide-over-container slide-over-${width} animate-slide-in-right`}>
        <div className="slide-over-header">
          <h3 className="slide-over-title">{title}</h3>
          <button
            className="slide-over-close-btn"
            onClick={onClose}
            aria-label="Close panel"
          >
            <X size={18} />
          </button>
        </div>

        <div className="slide-over-body">
          {children}
        </div>

        {footer && (
          <div className="slide-over-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default SlideOver;
