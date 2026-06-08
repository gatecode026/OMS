import React, { useState } from 'react';
import Modal from '../../common/Modal';
import { useApp } from '../../../context/AppContext';

const UploadFileModal = ({
  isOpen,
  onClose,
  projectName = 'SaaS Platform v2.0'
}) => {
  const { addToast } = useApp();
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file) {
      addToast('error', 'Please select a file.');
      return;
    }
    addToast('success', `File "${file.name}" uploaded successfully for project "${projectName}"!`);
    onClose();
    setFile(null);
    setDescription('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Upload Project File`}>
      <form onSubmit={handleSubmit} className="flex-column gap-4 padding-4">
        {/* Project Name */}
        <div className="flex-column gap-1 bg-surface padding-2 rounded border border-border">
          <span className="text-xs text-text-muted bold-text uppercase">Project Target</span>
          <span className="bold-text text-sm text-white mt-1">{projectName}</span>
        </div>

        {/* File Selection */}
        <div className="flex-column gap-1">
          <label className="text-xs text-text-muted bold-text uppercase">Select File *</label>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            required
            className="padding-2 border-border text-xs"
            style={{ padding: '8px 12px' }}
          />
        </div>

        {/* File Description */}
        <div className="flex-column gap-1">
          <label className="text-xs text-text-muted bold-text uppercase">File Description / Remarks</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add brief description about the file contents..."
            rows={2}
            className="padding-2 border-border"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex-row justify-end gap-3 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="padding-2 text-xs bold-text bg-surface border border-border rounded px-4 transition-all"
            style={{ cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="padding-2 text-xs bold-text bg-primary-500 hover:bg-primary-hover text-white rounded px-5 transition-all"
            style={{ border: 'none', cursor: 'pointer', background: 'var(--color-primary)' }}
          >
            Upload File
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default UploadFileModal;
