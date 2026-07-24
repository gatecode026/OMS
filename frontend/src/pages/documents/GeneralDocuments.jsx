import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Folder, ChevronRight, FileText, Calendar, User, Eye, Download, Trash2, ArrowLeft, Archive, RefreshCw } from 'lucide-react';
import Badge from '../../components/common/Badge';

const GeneralDocuments = ({ 
  onSelectDoc, 
  onPreviewDoc, 
  onDownloadDoc, 
  onDeleteDoc,
  onArchiveDoc,
  onRestoreDoc,
  onMoveDoc,
  viewMode = 'grid',
  search = ''
}) => {
  const { getDocumentFolders, documentsList } = useApp();
  
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentFolder, setCurrentFolder] = useState(null); // folder object

  const loadFolders = async () => {
    setLoading(true);
    try {
      const data = await getDocumentFolders();
      if (data && data.generalFolders) {
        setFolders(data.generalFolders);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFolders();
  }, [getDocumentFolders, documentsList]);

  if (loading) {
    return (
      <div className="flex-row justify-center align-center" style={{ minHeight: '200px' }}>
        <span style={{ color: 'var(--text-secondary)' }}>Loading general folders...</span>
      </div>
    );
  }

  // ── VIEW 1: FOLDERS LIST ──
  if (!currentFolder) {
    const filteredFolders = folders.filter(f => 
      f.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
        {filteredFolders.map(folder => {
          // Count documents in this general category
          const count = documentsList.filter(d => 
            d.documentScope === 'GENERAL' && 
            d.category === folder.name &&
            d.status !== 'Deleted'
          ).length;

          return (
            <div 
              key={folder.key} 
              className="card doc-card animate-fade-in" 
              style={{ cursor: 'pointer', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}
              onClick={() => setCurrentFolder(folder)}
            >
              <div style={{ background: 'rgba(219,39,119,0.08)', color: 'var(--accent-color)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Folder size={24} fill="rgba(219,39,119,0.2)" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {folder.name}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {count} documents
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── VIEW 2: DOCUMENTS IN FOLDER ──
  const folderDocs = documentsList.filter(d => 
    d.documentScope === 'GENERAL' && 
    d.category === currentFolder.name &&
    d.status !== 'Deleted' &&
    (d.name.toLowerCase().includes(search.toLowerCase()) || d.uploadedBy.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex-column gap-4">
      {/* Navigation Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button onClick={() => setCurrentFolder(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
          <ArrowLeft size={16} /> Back to Categories
        </button>
        <ChevronRight size={14} style={{ color: 'var(--text-secondary)' }} />
        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>{currentFolder.name}</span>
      </div>

      {folderDocs.length === 0 ? (
        <div className="card flex-column align-center justify-center" style={{ padding: '40px', textAlign: 'center' }}>
          <FileText size={40} style={{ color: 'var(--text-secondary)', marginBottom: '12px', opacity: 0.3 }} />
          <h4 style={{ margin: 0, fontWeight: '600', color: 'var(--text-primary)' }}>No documents found</h4>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Upload documents inside this category to view them.
          </span>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'docs-grid' : 'flex-column gap-3'}>
          {folderDocs.map(doc => (
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
          ))}
        </div>
      )}
    </div>
  );
};

export default GeneralDocuments;
