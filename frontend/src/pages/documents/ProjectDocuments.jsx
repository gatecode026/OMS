import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Folder, ChevronRight, FileText, Calendar, User, Eye, Download, Trash2, ArrowLeft, Archive, RefreshCw } from 'lucide-react';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';

const ProjectDocuments = ({ 
  onSelectDoc, 
  onPreviewDoc, 
  onDownloadDoc, 
  onDeleteDoc, 
  onArchiveDoc,
  onRestoreDoc,
  onMoveDoc,
  viewMode = 'grid',
  search = '',
  currentUserRole
}) => {
  const { getDocumentFolders, documentsList, projectsList } = useApp();
  
  const [folders, setFolders] = useState({ active: [], archived: [] });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'archived'

  // Navigation states
  const [currentProject, setCurrentProject] = useState(null); // project folder object
  const [currentCategory, setCurrentCategory] = useState(null); // string category

  const loadFolders = async () => {
    try {
      const data = await getDocumentFolders();
      if (data && data.projectFolders) {
        setFolders(data.projectFolders);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadFolders();
  }, [documentsList, projectsList]);

  // Navigate Back handler
  const handleBack = () => {
    if (currentCategory) {
      setCurrentCategory(null);
    } else if (currentProject) {
      setCurrentProject(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-row justify-center align-center" style={{ minHeight: '200px' }}>
        <span style={{ color: 'var(--text-secondary)' }}>Loading project vaults...</span>
      </div>
    );
  }

  const projectList = activeTab === 'active' ? folders.active : folders.archived;

  // ── VIEW 1: PROJECTS LIST ──
  if (!currentProject) {
    const filteredProjects = projectList.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase())
    );

    return (
      <div className="flex-column gap-4">
        {/* Toggle between Active and Archived Project Folders */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color-dark)', paddingBottom: '8px' }}>
          <button 
            className={`notif-filter-btn ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            Active Projects ({folders.active.length})
          </button>
          <button 
            className={`notif-filter-btn ${activeTab === 'archived' ? 'active' : ''}`}
            onClick={() => setActiveTab('archived')}
          >
            Archived Projects ({folders.archived.length})
          </button>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="card flex-column align-center justify-center" style={{ padding: '40px', textAlign: 'center' }}>
            <Folder size={48} style={{ color: 'var(--text-secondary)', marginBottom: '16px', opacity: 0.4 }} />
            <h4 style={{ margin: 0, fontWeight: '600', color: 'var(--text-primary)' }}>No project folders found</h4>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {activeTab === 'active' ? 'Active projects list is empty.' : 'No archived project folders.'}
            </span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
            {filteredProjects.map(proj => (
              <div 
                key={proj.id} 
                className="card doc-card animate-fade-in" 
                style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px' }}
                onClick={() => setCurrentProject(proj)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: 'rgba(219,39,119,0.08)', color: 'var(--accent-color)', width: '44px', height: '44px', borderRadius: '10px', display: 'flex', alignItems: 'center', justify: 'center' }}>
                    <Folder size={22} fill="rgba(219,39,119,0.2)" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }} title={proj.name}>
                      {proj.name}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Code: {proj.code}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── VIEW 2: PROJECT CATEGORIES ──
  if (currentProject && !currentCategory) {
    return (
      <div className="flex-column gap-4">
        {/* Navigation Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={handleBack} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
            <ArrowLeft size={16} /> Back to Projects
          </button>
          <ChevronRight size={14} style={{ color: 'var(--text-secondary)' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>{currentProject.name}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
          {currentProject.categories.map(cat => {
            // Count matching documents inside this project & category
            const count = documentsList.filter(d => 
              d.documentScope === 'PROJECT' && 
              d.projectId === currentProject.id && 
              d.category === cat &&
              d.status !== 'Deleted'
            ).length;

            return (
              <div 
                key={cat} 
                className="card doc-card animate-fade-in" 
                style={{ cursor: 'pointer', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}
                onClick={() => setCurrentCategory(cat)}
              >
                <div style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <Folder size={18} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {cat}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    {count} documents
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── VIEW 3: DOCUMENTS LIST INSIDE CATEGORY ──
  const categoryDocs = documentsList.filter(d => 
    d.documentScope === 'PROJECT' && 
    d.projectId === currentProject.id && 
    d.category === currentCategory &&
    d.status !== 'Deleted' &&
    (d.name.toLowerCase().includes(search.toLowerCase()) || d.uploadedBy.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex-column gap-4">
      {/* Navigation Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <button onClick={() => setCurrentProject(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}>
          Projects
        </button>
        <ChevronRight size={12} style={{ color: 'var(--text-secondary)' }} />
        <button onClick={() => setCurrentCategory(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}>
          {currentProject.name}
        </button>
        <ChevronRight size={12} style={{ color: 'var(--text-secondary)' }} />
        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>{currentCategory}</span>
      </div>

      {categoryDocs.length === 0 ? (
        <div className="card flex-column align-center justify-center" style={{ padding: '40px', textAlign: 'center' }}>
          <FileText size={40} style={{ color: 'var(--text-secondary)', marginBottom: '12px', opacity: 0.3 }} />
          <h4 style={{ margin: 0, fontWeight: '600', color: 'var(--text-primary)' }}>No documents found</h4>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Upload documents inside this category folder to view them.
          </span>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'docs-grid' : 'flex-column gap-3'}>
          {categoryDocs.map(doc => {
            const isOwner = doc.uploadedBy === currentUserRole || doc.uploadedBy === 'Operator'; // mock or standard
            return (
              <div 
                key={doc.id} 
                className="card doc-card animate-fade-in" 
                style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative' }}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px', borderRadius: '8px', color: 'var(--accent-color)' }}>
                    <FileText size={20} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                    <span 
                      style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}
                      title={doc.name}
                      onClick={() => onSelectDoc(doc)}
                    >
                      {doc.name}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      Size: {doc.size} | Ver: {doc.version}
                    </span>
                  </div>
                </div>

                <div className="doc-uploader" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  <User size={10} />
                  <span>{doc.uploadedBy}</span>
                  <span>•</span>
                  <Calendar size={10} />
                  <span>{doc.uploadDate}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '10px', marginTop: '4px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{doc.downloads || 0} downloads</span>
                  
                  <div className="doc-actions" style={{ display: 'flex', gap: '4px' }}>
                    <button className="doc-action-btn" title="Preview" onClick={() => onPreviewDoc(doc)}>
                      <Eye size={13} />
                    </button>
                    <button className="doc-action-btn" title="Download" onClick={() => onDownloadDoc(doc)}>
                      <Download size={13} />
                    </button>
                    
                    {doc.status !== 'Archived' ? (
                      <button className="doc-action-btn" title="Archive" onClick={() => onArchiveDoc(doc)}>
                        <Archive size={13} />
                      </button>
                    ) : (
                      <button className="doc-action-btn" title="Restore" onClick={() => onRestoreDoc(doc)}>
                        <RefreshCw size={13} />
                      </button>
                    )}

                    <button className="doc-action-btn doc-action-danger" title="Delete" onClick={() => onDeleteDoc(doc)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProjectDocuments;
