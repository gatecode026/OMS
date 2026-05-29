import React from 'react';
import Modal from './Modal';
import Button from './Button';
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
  const isDanger = confirmType === 'danger';
  const isWarning = confirmType === 'warning';

  const footer = (
    <>
      <Button variant="secondary" onClick={onCancel}>
        {cancelText}
      </Button>
      <Button variant={isDanger ? 'danger' : 'primary'} onClick={onConfirm}>
        {confirmText}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
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
