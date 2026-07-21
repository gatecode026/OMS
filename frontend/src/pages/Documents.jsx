import React, { useState, useRef, useEffect } from 'react';
import './Documents.css';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Skeleton from '../components/common/Skeleton';
import Modal from '../components/common/Modal';
import {
  FolderOpen, Upload, Search, FileText, Download, Trash2, Eye, Clock, User, 
  Grid, List, Filter, FileDown, Calendar, RefreshCw, X, ShieldAlert, Archive
} from 'lucide-react';

// Modular Subcomponents
import DocumentDashboard from './documents/DocumentDashboard';
import ProjectDocuments from './documents/ProjectDocuments';
import GeneralDocuments from './documents/GeneralDocuments';
import UploadDocumentModal from './documents/UploadDocumentModal';
import DocumentDetails from './documents/DocumentDetails';
import DocumentPreview from './documents/DocumentPreview';

const typeColorMap = {
  PDF: '#ef4444', XLSX: '#10b981', PNG: '#8b5cf6',
  ZIP: '#f59e0b', DOCX: '#3b82f6', PPTX: '#f97316'
};

const Documents = () => {
  const isLoading = usePageLoading(400);
  const { 
    addToast, 
    showConfirm, 
    documentsList, 
    deleteDocument, 
    restoreDocument,
    archiveDocument,
    downloadDocument, 
    currentUser, 
    currentUserRole 
  } = useApp();

  // Active section view tab: 'dashboard' | 'project' | 'general' | 'bin'
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Layout views
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterFormat, setFilterFormat] = useState('All');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterUploader, setFilterUploader] = useState('');

  // Selection states (for bulk actions)
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  
  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [selectedDocForDetails, setSelectedDocForDetails] = useState(null);
  
  // Export Report Dialog state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');

  // Bulk operations states
  const [isBulkMoving, setIsBulkMoving] = useState(false);
  
  // Sync selectedDocForDetails when documentsList changes
  useEffect(() => {
    if (selectedDocForDetails) {
      const fresh = documentsList.find(d => d.id === selectedDocForDetails.id);
      setSelectedDocForDetails(fresh || null);
    }
  }, [documentsList, selectedDocForDetails]);

  // Document file downloader (uses proxy path to avoid CORS issues)
  const handleDownloadFile = (doc) => {
    if (!doc.fileUrl) {
      addToast('warning', 'No download link available.');
      return;
    }

    if (doc.fileUrl.startsWith('data:')) {
      const [meta, b64] = doc.fileUrl.split(',');
      const mime = meta.match(/:(.*?);/)?.[1] || 'application/octet-stream';
      const binary = atob(b64);
      const arr = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
      const blob = new Blob([arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const fileExt = doc.type ? doc.type.toLowerCase() : 'bin';
      link.download = doc.name.endsWith(`.${fileExt}`) ? doc.name : `${doc.name}.${fileExt}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      downloadDocument(doc.id);
      addToast('success', `Downloaded "${doc.name}" successfully.`);
      return;
    }

    const token = localStorage.getItem('saas_token') || sessionStorage.getItem('saas_token') || '';
    const base = (window.API_URL || '') + '/api/v1';
    const params = new URLSearchParams({ token, download: 'true' });
    const proxyUrl = `${base}/documents/${doc.id}/file?${params.toString()}`;

    const link = document.createElement('a');
    link.href = proxyUrl;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('success', `Downloading "${doc.name}"...`);
  };

  // Bulk Operations Handlers
  const handleToggleSelectAll = (docsToToggle) => {
    const allSelected = docsToToggle.every(d => selectedDocIds.includes(d.id));
    if (allSelected) {
      setSelectedDocIds(prev => prev.filter(id => !docsToToggle.some(d => d.id === id)));
    } else {
      setSelectedDocIds(prev => {
        const next = [...prev];
        docsToToggle.forEach(d => {
          if (!next.includes(d.id)) next.push(d.id);
        });
        return next;
      });
    }
  };

  const handleBulkDelete = () => {
    showConfirm(
      'Bulk Delete Documents',
      `Delete all ${selectedDocIds.length} selected documents permanently? This action is irreversible.`,
      async () => {
        for (const id of selectedDocIds) {
          await deleteDocument(id);
        }
        setSelectedDocIds([]);
        addToast('success', 'Selected documents deleted successfully.');
      },
      'danger'
    );
  };

  const handleBulkArchive = () => {
    showConfirm(
      'Bulk Archive Documents',
      `Archive all ${selectedDocIds.length} selected documents?`,
      async () => {
        for (const id of selectedDocIds) {
          await archiveDocument(id);
        }
        setSelectedDocIds([]);
        addToast('success', 'Selected documents archived successfully.');
      },
      'warning'
    );
  };

  const handleExecuteExport = () => {
    const token = localStorage.getItem('saas_token') || sessionStorage.getItem('saas_token') || '';
    const base = (window.API_URL || '') + '/api/v1';
    const params = new URLSearchParams({
      token,
      format: exportFormat,
      category: filterCategory !== 'All' ? filterCategory : '',
      type: filterFormat !== 'All' ? filterFormat : '',
      dateFrom: filterDateFrom,
      dateTo: filterDateTo,
      uploadedBy: filterUploader
    });

    const exportUrl = `${base}/documents/reports?${params.toString()}`;
    window.open(exportUrl, '_blank');
    setShowExportModal(false);
    addToast('success', `Report generated and downloading in ${exportFormat.toUpperCase()} format.`);
  };

  // Compile matching files for general views (Recycle Bin / Search results)
  const queryMatchedDocs = React.useMemo(() => {
    return documentsList.filter(d => {
      // Status Filter
      if (activeTab === 'bin') {
        if (d.status !== 'Deleted') return false;
      } else {
        if (d.status === 'Deleted') return false;
      }

      // Scope matches if general / project tabs are active
      if (activeTab === 'project' && d.documentScope !== 'PROJECT') return false;
      if (activeTab === 'general' && d.documentScope !== 'GENERAL') return false;

      // Text query search
      const textMatch = d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.uploadedBy.toLowerCase().includes(search.toLowerCase()) ||
        (d.tags || []).some(t => t.toLowerCase().includes(search.toLowerCase()));

      if (!textMatch) return false;

      // Category filter
      if (filterCategory !== 'All' && d.category !== filterCategory) return false;

      // Format filter
      if (filterFormat !== 'All' && d.type !== filterFormat) return false;

      // Date range filter
      if (filterDateFrom && new Date(d.uploadDate) < new Date(filterDateFrom)) return false;
      if (filterDateTo && new Date(d.uploadDate) > new Date(filterDateTo)) return false;

      // Uploader filter
      if (filterUploader && !d.uploadedBy.toLowerCase().includes(filterUploader.toLowerCase())) return false;

      return true;
    });
  }, [documentsList, activeTab, search, filterCategory, filterFormat, filterDateFrom, filterDateTo, filterUploader]);

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

      {/* Premium Subheader Panel */}
      <div className="card docs-header">
        <div className="docs-header-left">
          <div className="docs-header-icon">
            <FolderOpen size={22} />
          </div>
          <div>
            <h2 className="ann-page-title" style={{ color: 'var(--text-primary)' }}>Document Vault</h2>
            <p className="ann-page-sub">{documentsList.length} total elements monitored</p>
          </div>
        </div>

        <div className="flex-row gap-3">
          <Button variant="secondary" icon={FileDown} onClick={() => setShowExportModal(true)}>
            Export Details
          </Button>
          <Button variant="primary" icon={Upload} onClick={() => setShowUploadModal(true)}>
            Upload Document
          </Button>
        </div>
      </div>

      {/* Main Navigation Sub-tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color-dark)', paddingBottom: '8px' }}>
        <button 
          className={`notif-filter-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => { setActiveTab('dashboard'); setSelectedDocForDetails(null); }}
        >
          Overview Stats
        </button>
        <button 
          className={`notif-filter-btn ${activeTab === 'project' ? 'active' : ''}`}
          onClick={() => { setActiveTab('project'); setSelectedDocForDetails(null); }}
        >
          Project Documents
        </button>
        <button 
          className={`notif-filter-btn ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => { setActiveTab('general'); setSelectedDocForDetails(null); }}
        >
          General Documents
        </button>
        <button 
          className={`notif-filter-btn ${activeTab === 'bin' ? 'active' : ''}`}
          onClick={() => { setActiveTab('bin'); setSelectedDocForDetails(null); }}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          Recycle Bin
          {documentsList.filter(d => d.status === 'Deleted').length > 0 && (
            <span style={{ fontSize: '0.7rem', background: '#ef4444', color: '#fff', padding: '1px 6px', borderRadius: '10px' }}>
              {documentsList.filter(d => d.status === 'Deleted').length}
            </span>
          )}
        </button>
      </div>

      {/* Toolbar - Search, Layout and Filters */}
      {activeTab !== 'dashboard' && (
        <div className="card docs-toolbar flex-column gap-3">
          <div className="flex-row gap-3 justify-between align-center" style={{ width: '100%' }}>
            
            <div className="dept-search-wrap" style={{ flex: 1, maxWidth: '400px' }}>
              <Search size={16} className="dept-search-icon" />
              <input
                className="dept-search-input"
                placeholder="Search documents by name, tags, description..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="flex-row gap-2">
              <Button 
                variant="secondary" 
                icon={Filter} 
                onClick={() => setShowFilters(!showFilters)}
                style={{ background: showFilters ? 'rgba(219,39,119,0.08)' : 'none', color: showFilters ? 'var(--accent-color)' : 'var(--text-secondary)' }}
              >
                Filters
              </Button>
              <div className="flex-row gap-1" style={{ border: '1px solid var(--border-color-dark)', padding: '2px', borderRadius: 'var(--radius-md)' }}>
                <button 
                  onClick={() => setViewMode('grid')}
                  style={{ background: viewMode === 'grid' ? 'rgba(255,255,255,0.05)' : 'none', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', color: viewMode === 'grid' ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                >
                  <Grid size={15} />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  style={{ background: viewMode === 'list' ? 'rgba(255,255,255,0.05)' : 'none', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', color: viewMode === 'list' ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                >
                  <List size={15} />
                </button>
              </div>
            </div>

          </div>

          {/* Expandable Advanced Filters Drawer */}
          {showFilters && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '16px', width: '100%' }}>
              <div className="form-group flex-column gap-1">
                <label style={{ fontSize: '0.78rem' }}>Format Type</label>
                <select value={filterFormat} onChange={e => setFilterFormat(e.target.value)} style={{ fontSize: '0.8rem' }}>
                  <option value="All">All Formats</option>
                  <option value="PDF">PDF Documents</option>
                  <option value="XLSX">Excel Sheets (XLSX)</option>
                  <option value="DOCX">Word Documents (DOCX)</option>
                  <option value="PNG">Image Files (PNG/JPG)</option>
                  <option value="ZIP">ZIP Archives</option>
                </select>
              </div>

              <div className="form-group flex-column gap-1">
                <label style={{ fontSize: '0.78rem' }}>Uploaded After</label>
                <input 
                  type="date" 
                  value={filterDateFrom} 
                  onChange={e => setFilterDateFrom(e.target.value)} 
                  style={{ fontSize: '0.8rem' }}
                />
              </div>

              <div className="form-group flex-column gap-1">
                <label style={{ fontSize: '0.78rem' }}>Uploaded Before</label>
                <input 
                  type="date" 
                  value={filterDateTo} 
                  onChange={e => setFilterDateTo(e.target.value)} 
                  style={{ fontSize: '0.8rem' }}
                />
              </div>

              <div className="form-group flex-column gap-1">
                <label style={{ fontSize: '0.78rem' }}>Uploader Name</label>
                <input 
                  type="text" 
                  placeholder="Search uploader..." 
                  value={filterUploader} 
                  onChange={e => setFilterUploader(e.target.value)} 
                  style={{ fontSize: '0.8rem' }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Content Layout panels */}
      <div className="flex-row gap-4" style={{ display: 'flex', width: '100%', flex: 1 }}>
        
        {/* Left Side Content Container */}
        <div style={{ flex: 1, minWidth: 0 }}>
          
          {activeTab === 'dashboard' && (
            <DocumentDashboard onNavigateToSection={setActiveTab} />
          )}

          {activeTab === 'project' && (
            <ProjectDocuments 
              onSelectDoc={setSelectedDocForDetails}
              onPreviewDoc={setPreviewDoc}
              onDownloadDoc={handleDownloadFile}
              onDeleteDoc={(doc) => showConfirm('Delete Document', `Move "${doc.name}" to Recycle Bin?`, async () => deleteDocument(doc.id), 'warning')}
              onArchiveDoc={(doc) => archiveDocument(doc.id)}
              onRestoreDoc={(doc) => restoreDocument(doc.id)}
              viewMode={viewMode}
              search={search}
              currentUserRole={currentUserRole}
            />
          )}

          {activeTab === 'general' && (
            <GeneralDocuments 
              onSelectDoc={setSelectedDocForDetails}
              onPreviewDoc={setPreviewDoc}
              onDownloadDoc={handleDownloadFile}
              onDeleteDoc={(doc) => showConfirm('Delete Document', `Move "${doc.name}" to Recycle Bin?`, async () => deleteDocument(doc.id), 'warning')}
              onArchiveDoc={(doc) => archiveDocument(doc.id)}
              onRestoreDoc={(doc) => restoreDocument(doc.id)}
              viewMode={viewMode}
              search={search}
            />
          )}

          {/* Recycle Bin Tab View */}
          {activeTab === 'bin' && (
            <div className="flex-column gap-4 animate-fade-in">
              <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', padding: '16px', borderRadius: 'var(--radius-lg)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <ShieldAlert size={22} style={{ color: '#ef4444' }} />
                <div>
                  <h4 style={{ margin: '0 0 2px 0', fontSize: '0.875rem', color: 'var(--text-primary)' }}>Recycle Bin Storage</h4>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Soft-deleted documents remain here and are reviewable before permanent purging.</span>
                </div>
              </div>

              {queryMatchedDocs.length === 0 ? (
                <div className="card flex-column align-center justify-center" style={{ padding: '40px', textAlign: 'center' }}>
                  <Trash2 size={40} style={{ color: 'var(--text-secondary)', marginBottom: '12px', opacity: 0.3 }} />
                  <h4 style={{ margin: 0, fontWeight: '600', color: 'var(--text-primary)' }}>Recycle Bin is empty</h4>
                </div>
              ) : (
                <div className="flex-column gap-2">
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 10px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={queryMatchedDocs.length > 0 && queryMatchedDocs.every(d => selectedDocIds.includes(d.id))}
                        onChange={() => handleToggleSelectAll(queryMatchedDocs)} 
                      />
                      <span>Select all recycle items</span>
                    </label>
                    <span>{queryMatchedDocs.length} elements</span>
                  </div>

                  <div className="flex-column gap-3">
                    {queryMatchedDocs.map(doc => {
                      const isSelected = selectedDocIds.includes(doc.id);
                      return (
                        <div 
                          key={doc.id} 
                          className={`card doc-card flex-row justify-between align-center`} 
                          style={{ padding: '12px 16px', display: 'flex', gap: '16px', borderLeft: isSelected ? '3px solid var(--accent-color)' : '1px solid var(--border-color-dark)' }}
                        >
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={() => setSelectedDocIds(prev => prev.includes(doc.id) ? prev.filter(id => id !== doc.id) : [...prev, doc.id])} 
                            />
                            <FileText size={18} style={{ color: typeColorMap[doc.type] }} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span 
                                style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)', cursor: 'pointer' }}
                                onClick={() => setSelectedDocForDetails(doc)}
                              >
                                {doc.name}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                Scope: {doc.documentScope} | Type: {doc.type} | Size: {doc.size}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px' }}>
                            <Button 
                              size="sm" 
                              variant="secondary" 
                              icon={RefreshCw} 
                              onClick={() => restoreDocument(doc.id)}
                            >
                              Restore
                            </Button>
                            <Button 
                              size="sm" 
                              variant="secondary" 
                              icon={Trash2} 
                              style={{ border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444' }} 
                              onClick={() => showConfirm('Permanent Delete', `Permanently delete "${doc.name}"? This is irreversible.`, () => deleteDocument(doc.id), 'danger')}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right Side Inspector Drawer */}
        {selectedDocForDetails && (
          <DocumentDetails 
            doc={selectedDocForDetails}
            onClose={() => setSelectedDocForDetails(null)}
            onPreviewDoc={setPreviewDoc}
            onDownloadDoc={handleDownloadFile}
          />
        )}

      </div>

      {/* Floating Bulk Action Toolbar */}
      {selectedDocIds.length > 0 && (
        <div className="bulk-actions-toolbar animate-fade-in">
          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>
            {selectedDocIds.length} items selected
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button size="sm" variant="secondary" icon={Archive} onClick={handleBulkArchive}>
              Bulk Archive
            </Button>
            <Button size="sm" variant="secondary" icon={Trash2} style={{ color: '#ef4444' }} onClick={handleBulkDelete}>
              Bulk Delete
            </Button>
            <button 
              onClick={() => setSelectedDocIds([])}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Export Selection Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Documents Details"
        size="sm"
      >
        <div className="flex-column gap-3 padding-1">
          <div className="form-group flex-column gap-1">
            <label>Report Format</label>
            <select value={exportFormat} onChange={e => setExportFormat(e.target.value)} style={{ width: '100%' }}>
              <option value="csv">CSV Spreadsheet (.csv)</option>
              <option value="excel">Microsoft Excel (.xls)</option>
              <option value="pdf">Print Ready Document (.pdf)</option>
            </select>
          </div>
          <div className="flex-row gap-3 justify-end mt-2">
            <Button variant="secondary" onClick={() => setShowExportModal(false)}>Cancel</Button>
            <Button variant="primary" icon={FileDown} onClick={handleExecuteExport}>Export</Button>
          </div>
        </div>
      </Modal>

      {/* Upload Modal Mounting */}
      <UploadDocumentModal 
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
      />

      {/* Preview Modal Mounting */}
      {previewDoc && (
        <DocumentPreview 
          isOpen={!!previewDoc}
          doc={previewDoc}
          onClose={() => setPreviewDoc(null)}
          onDownloadDoc={handleDownloadFile}
        />
      )}

    </div>
  );
};

export default Documents;
