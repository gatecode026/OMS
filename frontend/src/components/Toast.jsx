import React from 'react';
import './Toast.css';
import { CheckCircle, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

const Toast = ({ id, type, message }) => {
  const iconMap = {
    success: <CheckCircle className="toast-icon text-success" size={18} />,
    error: <AlertCircle className="toast-icon text-danger" size={18} />,
    warning: <AlertTriangle className="toast-icon text-warning" size={18} />,
    info: <Info className="toast-icon text-info" size={18} />
  };

  return (
    <div className={`toast-item toast-${type} animate-slide-up`}>
      <div className="toast-content-wrapper">
        {iconMap[type]}
        <span className="toast-message">{message}</span>
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
