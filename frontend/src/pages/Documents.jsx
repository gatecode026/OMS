import React, { useState, useRef } from 'react';
import './Documents.css';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Skeleton from '../components/common/Skeleton';
import Modal from '../components/common/Modal';
import {
  FolderClosed, Upload, Search, FileText, FileImage, File,
  Download, Trash2, Eye, FolderOpen, Clock, User
} from 'lucide-react';

const typeColorMap = {
  PDF: '#ef4444', XLSX: '#10b981', PNG: '#8b5cf6',
  ZIP: '#f59e0b', DOCX: '#3b82f6', PPTX: '#f97316'
};

const getIconForType = (type) => {
  const t = type ? type.toUpperCase() : 'FILE';
  if (t === 'PDF' || t === 'DOCX') return FileText;
  if (t === 'PNG' || t === 'JPG') return FileImage;
  return File;
};

const Documents = () => {
  const isLoading = usePageLoading(500);
  const { addToast, showConfirm, documentsList, addDocument, deleteDocument, currentUser, currentUserRole } = useApp();
  const isEmployee = currentUserRole === 'employee';
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadForm, setUploadForm] = useState({ name: '', type: 'PDF', category: isEmployee ? 'Project' : 'HR Policies', size: '1.2 MB' });
  const fileInputRef = useRef(null);

  const visibleDocs = React.useMemo(() => {
    if (isEmployee) {
      return documentsList.filter(d => d.category === 'Project' || d.category === 'Reports' || d.category === 'HR Policies');
    }
    return documentsList;
  }, [documentsList, isEmployee]);

  const categories = React.useMemo(() => {
    const allCats = ['All', 'Project', 'HR Policies', 'Payroll', 'Marketing', 'Engineering', 'Reports', 'Compliance'];
    if (isEmployee) {
      return allCats.filter(c => c === 'All' || c === 'Project' || c === 'Reports' || c === 'HR Policies');
    }
    return allCats;
  }, [isEmployee]);

  const filtered = visibleDocs.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.uploadedBy.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'All' || d.category === category;
    return matchSearch && matchCat;
  });

  const computeTotalSize = (list) => {
    let sum = 0;
    list.forEach(d => {
      const sizeStr = d.size || '0 KB';
      const num = parseFloat(sizeStr);
      if (sizeStr.toUpperCase().includes('MB')) {
        sum += num;
      } else if (sizeStr.toUpperCase().includes('KB')) {
        sum += num / 1024;
      }
    });
    return sum.toFixed(1) + ' MB';
  };
  const totalSize = computeTotalSize(visibleDocs);

  const handleCloseModal = () => {
    setShowUploadModal(false);
    setSelectedFile(null);
    setUploadForm({ name: '', type: 'PDF', category: 'HR Policies', size: '1.2 MB' });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);

    // Auto-detect extension
    const ext = file.name.split('.').pop().toUpperCase();
    let type = 'PDF';
    if (['PDF'].includes(ext)) type = 'PDF';
    else if (['XLSX', 'XLS'].includes(ext)) type = 'XLSX';
    else if (['PNG', 'JPG', 'JPEG', 'GIF'].includes(ext)) type = 'PNG';
    else if (['ZIP', 'RAR', '7Z', 'TAR', 'GZ'].includes(ext)) type = 'ZIP';
    else if (['DOCX', 'DOC'].includes(ext)) type = 'DOCX';
    else if (['PPTX', 'PPT'].includes(ext)) type = 'PPTX';

    // Format size
    let sizeStr = '0 KB';
    if (file.size < 1024 * 1024) {
      sizeStr = `${(file.size / 1024).toFixed(1)} KB`;
    } else {
      sizeStr = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
    }

    // Remove extension from name for cleaner title
    const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;

    setUploadForm(prev => ({
      ...prev,
      name: nameWithoutExt,
      type: type,
      size: sizeStr
    }));
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadForm.name.trim()) {
      addToast('warning', 'Document name is required.');
      return;
    }

    let fileBase64 = '';
    if (selectedFile) {
      try {
        fileBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(selectedFile);
          reader.onload = () => resolve(reader.result);
          reader.onerror = (error) => reject(error);
        });
      } catch (err) {
        console.error('FileReader error:', err);
        addToast('danger', 'Failed to read the selected file.');
        return;
      }
    }

    const docData = {
      name: uploadForm.name,
      type: uploadForm.type,
      category: uploadForm.category,
      size: uploadForm.size,
      uploadedBy: currentUser?.name || 'Unknown',
      uploadDate: new Date().toISOString().split('T')[0],
      downloads: 0,
      fileUrl: fileBase64
    };
    await addDocument(docData);
    handleCloseModal();
  };

  const handleDownloadFile = async (doc) => {
    if (!doc.fileUrl) {
      addToast('warning', 'No download file available.');
      return;
    }
    addToast('info', `Downloading "${doc.name}"...`);
    try {
      const response = await fetch(doc.fileUrl);
      if (!response.ok) throw new Error('Failed to fetch file');
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      const fileExt = doc.type ? doc.type.toLowerCase() : 'bin';
      link.download = doc.name.endsWith(`.${fileExt}`) ? doc.name : `${doc.name}.${fileExt}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      addToast('success', `Downloaded "${doc.name}" successfully.`);
    } catch (err) {
      console.error('Download failed, falling back to open:', err);
      window.open(doc.fileUrl, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="documents-page">
        <div className="docs-grid">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="card" style={{ height: 180 }}>
              <Skeleton variant="rect" height="100%" width="100%" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="documents-page">

      {/* Header */}
      <div className="card docs-header">
        <div className="docs-header-left">
          <div className="docs-header-icon">
            <FolderOpen size={22} />
          </div>
          <div>
            <h2 className="ann-page-title">Document Vault</h2>
            <p className="ann-page-sub">{visibleDocs.length} documents • {totalSize} total</p>
          </div>
        </div>
        <Button variant="primary" icon={Upload} onClick={() => setShowUploadModal(true)}>
          Upload Document
        </Button>
      </div>

      {/* Toolbar */}
      <div className="card docs-toolbar">
        <div className="dept-search-wrap">
          <Search size={16} className="dept-search-icon" />
          <input
            className="dept-search-input"
            placeholder="Search documents..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="docs-filters">
          {categories.map(c => (
            <button
              key={c}
              className={`notif-filter-btn ${category === c ? 'active' : ''}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Grid */}
      <div className="docs-grid">
        {filtered.map(doc => {
          const Icon = getIconForType(doc.type);
          const typeColor = typeColorMap[doc.type] || '#64748b';
          return (
            <div key={doc.id} className="card doc-card animate-fade-in">
              <div className="doc-card-icon" style={{ background: `${typeColor}18`, color: typeColor }}>
                <Icon size={28} />
              </div>

              <div className="doc-type-badge" style={{ background: `${typeColor}20`, color: typeColor }}>
                {doc.type}
              </div>

              <h4 className="doc-name" title={doc.name}>{doc.name}</h4>

              <div className="doc-meta">
                <span className="doc-size">{doc.size}</span>
                <Badge variant="neutral">{doc.category}</Badge>
              </div>

              <div className="doc-uploader">
                <User size={11} />
                <span>{doc.uploadedBy}</span>
                <Clock size={11} />
                <span>{doc.uploadDate}</span>
              </div>

              <div className="doc-actions">
                <button
                  className="doc-action-btn"
                  title="Preview"
                  onClick={async () => {
                    if (doc.fileUrl) {
                      if (doc.fileUrl.startsWith('data:')) {
                        try {
                          const response = await fetch(doc.fileUrl);
                          const blob = await response.blob();
                          const blobUrl = URL.createObjectURL(blob);
                          window.open(blobUrl, '_blank');
                        } catch (err) {
                          console.error('Failed to generate preview blob:', err);
                          addToast('danger', 'Failed to load preview.');
                        }
                      } else {
                        window.open(doc.fileUrl, '_blank');
                      }
                    } else {
                      addToast('warning', 'No preview file available.');
                    }
                  }}
                >
                  <Eye size={14} />
                </button>
                <button
                  className="doc-action-btn"
                  title="Download"
                  onClick={() => handleDownloadFile(doc)}
                >
                  <Download size={14} />
                </button>
                <button
                  className="doc-action-btn doc-action-danger"
                  title="Delete"
                  onClick={() => showConfirm(
                    'Delete Document',
                    `Delete "${doc.name}" permanently?`,
                    async () => {
                      await deleteDocument(doc.id);
                    },
                    'danger'
                  )}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="doc-downloads">
                <Download size={11} />
                <span>{doc.downloads} downloads</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload Document Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={handleCloseModal}
        title="Upload Document"
        size="sm"
      >
        <form onSubmit={handleUploadSubmit} className="flex-column gap-3 padding-1">
          <div className="form-group flex-column gap-1">
            <label>Choose File</label>
            <div className="file-upload-wrapper" style={{ position: 'relative' }}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  opacity: 0,
                  width: '100%',
                  height: '100%',
                  cursor: 'pointer',
                  zIndex: 2
                }}
              />
              <div
                className="file-upload-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px dashed var(--border-color-dark)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-secondary)',
                  transition: 'all 0.2s',
                  textAlign: 'center'
                }}
              >
                <Upload size={16} />
                <span style={{ fontSize: '0.85rem' }}>
                  {selectedFile ? selectedFile.name : 'Choose local file...'}
                </span>
              </div>
            </div>
          </div>

          <div className="form-group flex-column gap-1">
            <label>Document Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Employee Handbook 2026.pdf"
              value={uploadForm.name}
              onChange={e => setUploadForm({ ...uploadForm, name: e.target.value })}
              style={{ width: '100%' }}
            />
          </div>

          <div className="form-group flex-column gap-1">
            <label>Document Category</label>
            <select
              value={uploadForm.category}
              onChange={e => setUploadForm({ ...uploadForm, category: e.target.value })}
              style={{ width: '100%' }}
            >
              {categories.filter(c => c !== 'All').map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="form-group flex-column gap-1">
            <label>File Type</label>
            <select
              value={uploadForm.type}
              onChange={e => setUploadForm({ ...uploadForm, type: e.target.value })}
              style={{ width: '100%' }}
            >
              <option value="PDF">PDF Document</option>
              <option value="XLSX">Excel Sheet (XLSX)</option>
              <option value="PNG">Image file (PNG)</option>
              <option value="ZIP">ZIP Archive</option>
              <option value="DOCX">Word Document (DOCX)</option>
              <option value="PPTX">PowerPoint Presentation (PPTX)</option>
            </select>
          </div>

          <div className="form-group flex-column gap-1">
            <label>File Size</label>
            <input
              type="text"
              required
              placeholder="e.g. 1.2 MB"
              value={uploadForm.size}
              onChange={e => setUploadForm({ ...uploadForm, size: e.target.value })}
              style={{ width: '100%' }}
            />
          </div>

          <div className="flex-row gap-3 justify-end mt-2">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Upload
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default Documents;
