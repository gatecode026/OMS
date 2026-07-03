import React, { useEffect, useState, useRef } from 'react';
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
  const [animateState, setAnimateState] = useState('closed'); // 'opening', 'open', 'closing', 'closed'
  const backdropRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setAnimateState('opening');
      const timer = setTimeout(() => setAnimateState('open'), 50);
      document.body.style.overflow = 'hidden';
      return () => clearTimeout(timer);
    } else {
      if (animateState === 'open' || animateState === 'opening') {
        setAnimateState('closing');
        const timer = setTimeout(() => {
          setAnimateState('closed');
          document.body.style.overflow = '';
        }, 250); // matches transition speed
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen]);

  // Esc Key Closer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (animateState === 'closed') return null;

  const handleBackdropClick = (e) => {
    if (e.target === backdropRef.current) {
      onClose();
    }
  };

  const isTransitioningIn = animateState === 'opening' || animateState === 'open';

  return (
    <div
      ref={backdropRef}
      className={`slide-over-backdrop ${isTransitioningIn ? 'is-open' : ''}`}
      onClick={handleBackdropClick}
    >
      <div className={`slide-over-container slide-over-${width} ${isTransitioningIn ? 'is-open' : ''}`}>
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
