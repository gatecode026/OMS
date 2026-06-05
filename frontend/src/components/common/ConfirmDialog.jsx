import React from 'react';
import Modal from './Modal';
import './ConfirmDialog.css';
import { AlertTriangle, HelpCircle } from 'lucide-react';

const ConfirmDialog = ({
  isOpen,
  title = 'Are you sure?',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  confirmType = 'primary' // 'primary', 'danger', 'warning'
}) => {
  console.log('ConfirmDialog: rendered, isOpen =', isOpen, 'has onCancel =', !!onCancel, 'has onConfirm =', !!onConfirm);
  const isDanger = confirmType === 'danger';
  const isWarning = confirmType === 'warning';

  const handleCancelClick = (e) => {
    console.log('ConfirmDialog: Cancel button clicked');
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (onCancel) {
      onCancel(e);
    } else {
      console.warn('ConfirmDialog: onCancel is missing');
    }
  };

  const handleConfirmClick = (e) => {
    console.log('ConfirmDialog: Confirm button clicked');
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (onConfirm) {
      onConfirm(e);
    } else {
      console.warn('ConfirmDialog: onConfirm is missing');
    }
  };

  const footer = (
    <>
      <button 
        type="button"
        className="btn btn-secondary btn-md" 
        onClick={handleCancelClick}
      >
        {cancelText}
      </button>
      <button 
        type="button"
        className={`btn btn-${isDanger ? 'danger' : 'primary'} btn-md`} 
        onClick={handleConfirmClick}
      >
        {confirmText}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancelClick}
      title={title}
      size="sm"
      footer={footer}
    >
      <div className="confirm-body">
        <div className={`confirm-icon-holder confirm-type-${confirmType}`}>
          {isDanger || isWarning ? <AlertTriangle size={24} /> : <HelpCircle size={24} />}
        </div>
        <div className="confirm-message-container">
          <p className="confirm-message">{message}</p>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
