import React, { useState } from 'react';
import Modal from '../../common/Modal';
import { useApp } from '../../../context/AppContext';

const UploadFileModal = ({
  isOpen,
  onClose,
  project,
  projectName = 'SaaS Platform v2.0'
}) => {
  const { addToast, addDocument, updateProject, currentUser } = useApp();
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      addToast('error', 'Please select a file.');
      return;
    }

    let fileBase64 = '';
    try {
      fileBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
      });
    } catch (err) {
      console.error('FileReader error:', err);
      addToast('danger', 'Failed to read the selected file.');
      return;
    }

    const docName = file.name;
    const docType = file.name.split('.').pop() || 'file';
    const docSize = `${(file.size / 1024).toFixed(1)} KB`;
    const targetProjectName = project?.name || projectName;

    const docData = {
      name: docName,
      type: docType,
      category: 'Project',
      size: docSize,
      uploadedBy: currentUser?.name || 'Employee',
      uploadDate: new Date().toISOString().split('T')[0],
      downloads: 0,
      fileUrl: fileBase64,
      remarks: `Uploaded for project: ${targetProjectName}. ${description}`
    };

    // 1. Upload file globally to Documents collection
    const result = await addDocument(docData);
    if (result) {
      // 2. Link file locally to the Project model's documents list
      if (project) {
        const currentDocs = project.documents || [];
        const newDocs = [
          ...currentDocs,
          {
            name: docName,
            type: docType,
            size: docSize,
            uploadedBy: currentUser?.name || 'Employee',
            downloadUrl: result.fileUrl || result.downloadUrl || fileBase64
          }
        ];
        
        await updateProject(project.id, { documents: newDocs });
      }

      onClose();
      setFile(null);
      setDescription('');
    }
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
