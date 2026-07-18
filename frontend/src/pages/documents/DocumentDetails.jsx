import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Calendar, User, Download, Edit2, Check, ArrowRight, Share2, Eye, Database } from 'lucide-react';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';

const DocumentDetails = ({ doc, onClose, onPreviewDoc, onDownloadDoc }) => {
  const { updateRecord, moveDocument, projectsList, departments, allEmployees } = useApp();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '', tags: '', visibility: '' });
  
  const [isMoving, setIsMoving] = useState(false);
  const [moveScope, setMoveScope] = useState('GENERAL');
  const [moveProjectId, setMoveProjectId] = useState('');
  const [moveDepartment, setMoveDepartment] = useState('');

  useEffect(() => {
    if (doc) {
      setEditForm({
        name: doc.name || '',
        description: doc.description || '',
        tags: (doc.tags || []).join(', '),
        visibility: doc.visibility || 'Company Wide'
      });
      setMoveScope(doc.documentScope || 'GENERAL');
      setMoveProjectId(doc.projectId || '');
      setMoveDepartment(doc.departmentName || '');
      setIsEditing(false);
      setIsMoving(false);
    }
  }, [doc]);

  if (!doc) return null;

  const handleSaveMetadata = async () => {
    try {
      const tagsArray = editForm.tags.split(',').map(t => t.trim()).filter(Boolean);
      await updateRecord(doc.id, {
        name: editForm.name,
        description: editForm.description,
        tags: tagsArray,
        visibility: editForm.visibility
      });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMoveAction = async () => {
    try {
      let projName = '';
      if (moveScope === 'PROJECT') {
        const proj = projectsList.find(p => p.id === moveProjectId);
        projName = proj ? proj.name : '';
      }

      await moveDocument(doc.id, {
        scope: moveScope,
        projectId: moveScope === 'PROJECT' ? moveProjectId : null,
        projectName: moveScope === 'PROJECT' ? projName : null,
        departmentId: moveScope === 'GENERAL' ? moveDepartment : null,
        departmentName: moveScope === 'GENERAL' ? moveDepartment : null
      });
      setIsMoving(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Helper to build a backend-proxied URL for a specific historical version
  const getProxyUrlForVersion = (versionItem) => {
    if (!versionItem?.fileUrl) return null;
    const token = localStorage.getItem('saas_token') || sessionStorage.getItem('saas_token') || '';
    const base = (window.API_URL || '') + '/api/v1';
    const params = new URLSearchParams({ token, download: 'true' });
    return `${base}/documents/${doc.id}/file?${params.toString()}`; // Version downloads fallback to direct serve
  };

  const handleDownloadVersion = (ver) => {
    if (ver.fileUrl.startsWith('data:')) {
      const meta = ver.fileUrl.split(',')[0];
      const mime = meta.match(/:(.*?);/)?.[1] || 'application/octet-stream';
      const binary = atob(ver.fileUrl.split(',')[1]);
      const arr = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
      const blob = new Blob([arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const ext = doc.type?.toLowerCase() || 'bin';
      link.download = `${doc.name}_v${ver.version}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      return;
    }

    const proxyUrl = getProxyUrlForVersion(ver);
    const link = document.createElement('a');
    link.href = proxyUrl;
    link.download = `${doc.name}_v${ver.version}.${doc.type?.toLowerCase() || 'bin'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="card documents-drawer animate-fade-in" style={{ width: '400px', display: 'flex', flexDirection: 'column', height: '100%', position: 'sticky', top: '24px', alignSelf: 'flex-start', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
      
      {/* Drawer Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color-dark)', paddingBottom: '12px', marginBottom: '16px' }}>
        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>Document Inspector</h4>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <X size={18} />
        </button>
      </div>

      {/* Main Metadata Display */}
      <div className="flex-column gap-4">
        
        {isEditing ? (
          <div className="flex-column gap-3">
            <div className="form-group flex-column gap-1">
              <label>Name</label>
              <input 
                type="text" 
                value={editForm.name} 
                onChange={e => setEditForm({ ...editForm, name: e.target.value })} 
              />
            </div>
            <div className="form-group flex-column gap-1">
              <label>Description</label>
              <textarea 
                value={editForm.description} 
                onChange={e => setEditForm({ ...editForm, description: e.target.value })} 
                rows={3}
                style={{ resize: 'none', width: '100%' }}
              />
            </div>
            <div className="form-group flex-column gap-1">
              <label>Visibility</label>
              <select 
                value={editForm.visibility} 
                onChange={e => setEditForm({ ...editForm, visibility: e.target.value })}
              >
                <option value="Company Wide">Company Wide</option>
                <option value="Department Only">Department Only</option>
                <option value="Project Members">Project Members</option>
                <option value="Project Managers">Project Managers</option>
                <option value="Private">Private</option>
              </select>
            </div>
            <div className="form-group flex-column gap-1">
              <label>Tags (comma-separated)</label>
              <input 
                type="text" 
                value={editForm.tags} 
                onChange={e => setEditForm({ ...editForm, tags: e.target.value })} 
              />
            </div>
            <div className="flex-row gap-2 justify-end">
              <Button size="sm" variant="secondary" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button size="sm" variant="primary" icon={Check} onClick={handleSaveMetadata}>Save</Button>
            </div>
          </div>
        ) : isMoving ? (
          <div className="flex-column gap-3" style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px dashed var(--border-color-dark)' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-primary)' }}>Move Document</span>
            
            <div className="form-group flex-column gap-1">
              <label>Target Scope</label>
              <select value={moveScope} onChange={e => setMoveScope(e.target.value)}>
                <option value="GENERAL">General Documents</option>
                <option value="PROJECT">Project Documents</option>
              </select>
            </div>

            {moveScope === 'PROJECT' ? (
              <div className="form-group flex-column gap-1">
                <label>Select Project Folder</label>
                <select value={moveProjectId} onChange={e => setMoveProjectId(e.target.value)}>
                  <option value="">Select project...</option>
                  {projectsList.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="form-group flex-column gap-1">
                <label>Select Department Category</label>
                <select value={moveDepartment} onChange={e => setMoveDepartment(e.target.value)}>
                  <option value="">No department</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex-row gap-2 justify-end">
              <Button size="sm" variant="secondary" onClick={() => setIsMoving(false)}>Cancel</Button>
              <Button size="sm" variant="primary" icon={ArrowRight} onClick={handleMoveAction}>Move</Button>
            </div>
          </div>
        ) : (
          <div className="flex-column gap-3">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 4px 0' }}>{doc.name}</h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>ID: {doc.id}</span>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button className="doc-action-btn" title="Edit Metadata" onClick={() => setIsEditing(true)}>
                  <Edit2 size={12} />
                </button>
                <button className="doc-action-btn" title="Move Location" onClick={() => setIsMoving(true)}>
                  <Share2 size={12} />
                </button>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              {doc.description || <i>No description provided.</i>}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
              {doc.tags?.map(t => (
                <Badge key={t} variant="neutral">{t}</Badge>
              ))}
            </div>
          </div>
        )}

        <hr style={{ border: 'none', borderBottom: '1px solid rgba(255,255,255,0.03)', margin: 0 }} />

        {/* Metadata Details List */}
        <div className="flex-column gap-2" style={{ fontSize: '0.8rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Location Scope</span>
            <span style={{ fontWeight: '600' }}>{doc.documentScope}</span>
          </div>
          {doc.documentScope === 'PROJECT' ? (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Project Link</span>
              <span style={{ fontWeight: '600' }}>{doc.projectName || doc.projectId}</span>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Department Link</span>
              <span style={{ fontWeight: '600' }}>{doc.departmentName || '—'}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Visibility Mode</span>
            <span style={{ fontWeight: '600', color: 'var(--accent-color)' }}>{doc.visibility}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Category Folder</span>
            <span style={{ fontWeight: '600' }}>{doc.category}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>File Format</span>
            <span style={{ fontWeight: '600' }}>{doc.type}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Total Size</span>
            <span style={{ fontWeight: '600' }}>{doc.size}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Total Downloads</span>
            <span style={{ fontWeight: '600' }}>{doc.downloads || 0} times</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Last View Time</span>
            <span style={{ fontWeight: '600' }}>{doc.lastViewedAt ? new Date(doc.lastViewedAt).toLocaleTimeString() : '—'}</span>
          </div>
        </div>

        <hr style={{ border: 'none', borderBottom: '1px solid rgba(255,255,255,0.03)', margin: 0 }} />

        {/* Version History Timeline */}
        <div className="flex-column gap-3">
          <h5 style={{ margin: 0, fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Database size={13} /> Version History Timeline
          </h5>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: '12px', marginLeft: '6px' }}>
            {/* Current Active Version */}
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '-17px', top: '4px', width: '9px', height: '9px', borderRadius: '50%', background: 'var(--accent-color)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <strong style={{ fontSize: '0.82rem' }}>Version {doc.version} (Active)</strong>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Uploaded by {doc.uploadedBy} • {doc.uploadDate}</span>
                </div>
                <button className="doc-action-btn" title="Download Version" onClick={() => onDownloadDoc(doc)}>
                  <Download size={11} />
                </button>
              </div>
            </div>

            {/* Historical Versions */}
            {doc.versions && doc.versions.length > 0 ? (
              doc.versions.map((ver, idx) => (
                <div key={ver.id || idx} style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-17px', top: '4px', width: '9px', height: '9px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <strong style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Version {ver.version}</strong>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Uploaded by {ver.uploadedBy} • {ver.uploadedAt ? new Date(ver.uploadedAt).toLocaleDateString() : '—'}</span>
                      {ver.comment && <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', marginTop: '2px' }}>"{ver.comment}"</span>}
                    </div>
                    <button className="doc-action-btn" title="Download Version" onClick={() => handleDownloadVersion(ver)}>
                      <Download size={11} />
                    </button>
                  </div>
                </div>
              ))
            ) : null}
          </div>
        </div>

      </div>

    </div>
  );
};

export default DocumentDetails;
