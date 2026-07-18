import React from 'react';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import { Download, X, Eye } from 'lucide-react';

const DocumentPreview = ({ doc, isOpen, onClose, onDownloadDoc }) => {
  if (!doc) return null;

  // Build a backend-proxied URL for a document
  const getProxyUrl = (download = false) => {
    if (!doc?.fileUrl) return null;
    if (doc.fileUrl.startsWith('data:')) return doc.fileUrl;
    
    const token = localStorage.getItem('saas_token') || sessionStorage.getItem('saas_token') || '';
    const base = (window.API_URL || '') + '/api/v1';
    const params = new URLSearchParams({ token });
    if (download) params.set('download', 'true');
    return `${base}/documents/${doc.id}/file?${params.toString()}`;
  };

  const fileUrl = getProxyUrl();
  const isImage = doc.type === 'PNG' || doc.type === 'JPG' || doc.type === 'JPEG' || (doc.fileUrl && /\.(png|jpg|jpeg|gif|webp)$/i.test(doc.fileUrl));
  const isPdf = doc.type === 'PDF' || (doc.fileUrl && /\.pdf$/i.test(doc.fileUrl));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={doc.name || 'Document Preview'}
      size="md"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px' }}>
        
        {/* Preview Frame */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '380px', 
          width: '100%', 
          overflow: 'hidden', 
          background: 'rgba(0,0,0,0.15)', 
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color-dark)'
        }}>
          {isImage ? (
            <img 
              src={fileUrl} 
              alt={doc.name} 
              style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: '4px' }} 
            />
          ) : isPdf ? (
            <iframe 
              src={fileUrl} 
              title={doc.name} 
              style={{ width: '100%', height: '60vh', border: 'none', borderRadius: '4px' }} 
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '32px' }}>
              <Eye size={48} style={{ color: 'var(--text-secondary)', marginBottom: '16px', opacity: 0.3 }} />
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.85rem' }}>
                Preview is not supported for this file format ({doc.type}).
              </p>
              <Button onClick={() => { onDownloadDoc(doc); onClose(); }}>
                Download File
              </Button>
            </div>
          )}
        </div>

        {/* Action Panel */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Size: {doc.size} | Version {doc.version}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
            <Button variant="primary" size="sm" icon={Download} onClick={() => { onDownloadDoc(doc); onClose(); }}>Download</Button>
          </div>
        </div>

      </div>
    </Modal>
  );
};

export default DocumentPreview;
