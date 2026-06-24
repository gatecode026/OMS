import React from 'react';
import './Toast.css';
import { CheckCircle, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

const Toast = ({ id, type, message, action }) => {
  const iconMap = {
    success: <CheckCircle className="toast-icon text-success" size={18} />,
    error: <AlertCircle className="toast-icon text-danger" size={18} />,
    warning: <AlertTriangle className="toast-icon text-warning" size={18} />,
    info: <Info className="toast-icon text-info" size={18} />
  };

  return (
    <div className={`toast-item toast-${type} animate-slide-up`}>
      <div className="toast-content-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {iconMap[type]}
          <span className="toast-message">{message}</span>
        </div>
        {action && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              action.onClick();
            }}
            className="toast-action-btn"
            style={{
              background: 'var(--chat-primary, #6366f1)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 10px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              marginLeft: '12px',
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
};

export const ToastContainer = () => {
  const { toasts } = useApp();

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <Toast key={toast.id} {...toast} />
      ))}
    </div>
  );
};

export default Toast;
