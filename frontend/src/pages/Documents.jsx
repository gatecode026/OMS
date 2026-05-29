import React, { useState } from 'react';
import './Documents.css';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Skeleton from '../components/common/Skeleton';
import {
  FolderClosed, Upload, Search, FileText, FileImage, File,
  Download, Trash2, Eye, FolderOpen, Clock, User
} from 'lucide-react';

const mockDocuments = [
  {
    id: 'DOC-001',
    name: 'Employee Handbook 2026.pdf',
    type: 'PDF',
    size: '2.4 MB',
    category: 'HR Policies',
    uploadedBy: 'Sophia Laurent',
    uploadDate: '2026-05-01',
    downloads: 23,
    color: '#ef4444',
    icon: FileText
  },
  {
    id: 'DOC-002',
    name: 'Remote Work Policy v2.pdf',
    type: 'PDF',
    size: '890 KB',
    category: 'HR Policies',
    uploadedBy: 'Sophia Laurent',
    uploadDate: '2026-05-26',
    downloads: 38,
    color: '#ef4444',
    icon: FileText
  },
  {
    id: 'DOC-003',
    name: 'Q2 Payroll Summary.xlsx',
    type: 'XLSX',
    size: '1.1 MB',
    category: 'Payroll',
    uploadedBy: 'Sarah Connor',
    uploadDate: '2026-05-29',
    downloads: 5,
    color: '#10b981',
    icon: FileText
  },
  {
    id: 'DOC-004',
    name: 'Brand Logo Pack.zip',
    type: 'ZIP',
    size: '14.2 MB',
    category: 'Marketing',
    uploadedBy: 'Aiko Tanaka',
    uploadDate: '2026-05-20',
    downloads: 12,
    color: '#8b5cf6',
    icon: FileImage
  },
  {
    id: 'DOC-005',
    name: 'System Architecture Diagram.png',
    type: 'PNG',
    size: '3.8 MB',
    category: 'Engineering',
    uploadedBy: 'Elena Rostova',
    uploadDate: '2026-05-15',
    downloads: 9,
    color: '#3b82f6',
    icon: FileImage
  },
  {
    id: 'DOC-006',
    name: 'Q2 Sales Performance Report.pdf',
    type: 'PDF',
    size: '1.6 MB',
    category: 'Reports',
    uploadedBy: 'Marcus Vance',
    uploadDate: '2026-05-28',
    downloads: 7,
    color: '#f59e0b',
    icon: FileText
  },
  {
    id: 'DOC-007',
    name: 'GDPR Compliance Audit 2026.docx',
    type: 'DOCX',
    size: '540 KB',
    category: 'Compliance',
    uploadedBy: 'Sarah Connor',
    uploadDate: '2026-04-30',
    downloads: 4,
    color: '#06b6d4',
    icon: FileText
  },
  {
    id: 'DOC-008',
    name: 'Sprint Review Presentation.pptx',
    type: 'PPTX',
    size: '5.2 MB',
    category: 'Engineering',
    uploadedBy: 'Elena Rostova',
    uploadDate: '2026-05-22',
    downloads: 11,
    color: '#3b82f6',
    icon: File
  }
];

const categories = ['All', ...new Set(mockDocuments.map(d => d.category))];

const typeColorMap = {
  PDF: '#ef4444', XLSX: '#10b981', PNG: '#8b5cf6',
  ZIP: '#f59e0b', DOCX: '#3b82f6', PPTX: '#f97316'
};

const Documents = () => {
  const isLoading = usePageLoading(500);
  const { addToast, showConfirm } = useApp();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [docs, setDocs] = useState(mockDocuments);

  const filtered = docs.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.uploadedBy.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'All' || d.category === category;
    return matchSearch && matchCat;
  });

  const totalSize = '30.2 MB';

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
            <p className="ann-page-sub">{docs.length} documents • {totalSize} total</p>
          </div>
        </div>
        <Button variant="primary" icon={Upload} onClick={() => addToast('success', 'File upload dialog would open here.')}>
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
          const Icon = doc.icon;
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
                  onClick={() => addToast('info', `Opening preview for "${doc.name}"...`)}
                >
                  <Eye size={14} />
                </button>
                <button
                  className="doc-action-btn"
                  title="Download"
                  onClick={() => addToast('success', `Downloading "${doc.name}"...`)}
                >
                  <Download size={14} />
                </button>
                <button
                  className="doc-action-btn doc-action-danger"
                  title="Delete"
                  onClick={() => showConfirm(
                    'Delete Document',
                    `Delete "${doc.name}" permanently?`,
                    () => {
                      setDocs(prev => prev.filter(d => d.id !== doc.id));
                      addToast('warning', 'Document deleted.');
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

    </div>
  );
};

export default Documents;
