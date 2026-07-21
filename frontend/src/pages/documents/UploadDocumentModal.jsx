import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { Upload, X, Shield, FileText, Check } from 'lucide-react';

const PROJECT_CATEGORIES = [
  'Design Files',
  'API Documentation',
  'Technical Documents',
  'Requirement Documents',
  'Contracts',
  'Project Reports',
  'Architecture Diagrams'
];

const GENERAL_CATEGORIES = [
  'HR',
  'Finance',
  'Legal',
  'Company Policies',
  'Training Materials',
  'Templates',
  'Others'
];

const ROLES_LIST = [
  { id: 'super_admin', name: 'Super Admin' },
  { id: 'company_admin', name: 'Company Admin' },
  { id: 'branch_admin', name: 'Branch Admin' },
  { id: 'manager', name: 'Manager' },
  { id: 'team_leader', name: 'Team Leader' },
  { id: 'hr', name: 'HR Admin' },
  { id: 'employee', name: 'Employee' }
];

const UploadDocumentModal = ({ isOpen, onClose, initialDocument = null }) => {
  const { 
    addToast, 
    projectsList, 
    departments, 
    allEmployees, 
    documentsList, 
    addDocument, 
    createVersion,
    updateRecord 
  } = useApp();

  const fileInputRef = useRef(null);
  
  const [scope, setScope] = useState('GENERAL'); // GENERAL | PROJECT
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileBase64, setFileBase64] = useState('');
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [category, setCategory] = useState('Others');
  
  // Scope specific
  const [projectId, setProjectId] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  
  // Visibility
  const [visibility, setVisibility] = useState('Company Wide');
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  
  // Duplicate Resolution State
  const [duplicateDoc, setDuplicateDoc] = useState(null);
  const [resolveOption, setResolveOption] = useState(null); // 'version' | 'replace' | 'keep'
  const [versionComment, setVersionComment] = useState('');
  const [majorUpdate, setMajorUpdate] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Sync category defaults on scope change
  useEffect(() => {
    if (scope === 'PROJECT') {
      setCategory(PROJECT_CATEGORIES[0]);
      setVisibility('Project Members');
    } else {
      setCategory(GENERAL_CATEGORIES[0]);
      setVisibility('Company Wide');
    }
  }, [scope]);

  // Load selected file details
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);

    // Auto-detect extension and clean title name
    const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    setName(nameWithoutExt);

    // Read file as base64
    const reader = new FileReader();
    reader.onload = () => {
      setFileBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('warning', 'Document name is required.');
      return;
    }
    if (!selectedFile && !initialDocument) {
      addToast('warning', 'Please choose a file to upload.');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = selectedFile ? selectedFile.name.split('.').pop().toLowerCase() : (initialDocument?.type?.toLowerCase() || 'bin');
      const sizeStr = selectedFile 
        ? (selectedFile.size < 1024 * 1024 
            ? `${(selectedFile.size / 1024).toFixed(1)} KB` 
            : `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`)
        : (initialDocument?.size || '1.0 MB');

      const tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean);

      // Determine active project/department details
      let projName = '';
      if (scope === 'PROJECT') {
        const proj = projectsList.find(p => p.id === projectId);
        projName = proj ? proj.name : '';
      }

      // Check for duplicates (same name and scope) if we are not resolving yet
      if (!resolveOption) {
        const duplicate = documentsList.find(
          d => d.name.toLowerCase() === name.trim().toLowerCase() && 
          d.documentScope === scope && 
          d.status !== 'Deleted'
        );

        if (duplicate) {
          setDuplicateDoc(duplicate);
          setResolveOption('version'); // default resolution strategy
          setIsUploading(false);
          return;
        }
      }

      // Execute Action based on resolution selection
      if (resolveOption === 'version' && duplicateDoc) {
        // Upload New Version
        await createVersion(duplicateDoc.id, {
          fileUrl: fileBase64,
          size: sizeStr,
          comment: versionComment || 'Uploaded new version',
          majorUpdate
        });
      } else if (resolveOption === 'replace' && duplicateDoc) {
        // Replace existing
        await updateRecord(duplicateDoc.id, {
          fileUrl: fileBase64,
          size: sizeStr,
          lastModifiedBy: 'Operator',
          lastModifiedDate: new Date().toISOString().split('T')[0]
        });
        addToast('success', 'Document replaced successfully.');
      } else {
        // Standard Upload (includes 'keep' rename)
        let finalName = name.trim();
        if (resolveOption === 'keep' && duplicateDoc) {
          finalName = `${finalName} (Copy)`;
        }

        const payload = {
          name: finalName,
          description,
          tags: tagsArray,
          documentScope: scope,
          projectId: scope === 'PROJECT' ? projectId : null,
          projectName: scope === 'PROJECT' ? projName : null,
          departmentId: scope === 'GENERAL' ? departmentName : null, // mapping label as id for simplicity
          departmentName: scope === 'GENERAL' ? departmentName : null,
          category,
          visibility,
          visibilityDetails: {
            roles: selectedRoles,
            userIds: selectedUserIds
          },
          type: fileExt.toUpperCase(),
          size: sizeStr,
          fileUrl: fileBase64
        };

        await addDocument(payload);
      }

      handleResetClose();
    } catch (err) {
      console.error('Document submission error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleResetClose = () => {
    setSelectedFile(null);
    setFileBase64('');
    setName('');
    setDescription('');
    setTags('');
    setScope('GENERAL');
    setProjectId('');
    setDepartmentName('');
    setVisibility('Company Wide');
    setSelectedRoles([]);
    setSelectedUserIds([]);
    setDuplicateDoc(null);
    setResolveOption(null);
    setVersionComment('');
    setMajorUpdate(false);
    onClose();
  };

  const activeProjects = projectsList.filter(p => p.status !== 'Archived');

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleResetClose}
      title={duplicateDoc ? 'Duplicate File Detected' : 'Upload Document'}
      size={duplicateDoc ? 'sm' : 'md'}
    >
      {duplicateDoc ? (
        // Duplicate Resolution Screen
        <div className="flex-column gap-4 padding-1">
          <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '16px', borderRadius: 'var(--radius-lg)' }} className="flex-column gap-2">
            <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '600' }}>
              A document named "{name}" already exists.
            </span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Choose how you would like to resolve this conflict:
            </span>
          </div>

          <div className="flex-column gap-2">
            <label className={`form-radio-card ${resolveOption === 'version' ? 'active' : ''}`} style={{ display: 'flex', gap: '12px', padding: '12px', border: '1px solid var(--border-color-dark)', borderRadius: 'var(--radius-md)', cursor: 'pointer', background: resolveOption === 'version' ? 'rgba(219, 39, 119, 0.05)' : 'none' }}>
              <input type="radio" name="resolve" checked={resolveOption === 'version'} onChange={() => setResolveOption('version')} />
              <div>
                <strong style={{ display: 'block', fontSize: '0.875rem' }}>Upload New Version (v{(parseFloat(duplicateDoc.version || '1.0') + 0.1).toFixed(1)})</strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Retain file history and bump document version count.</span>
              </div>
            </label>

            <label className={`form-radio-card ${resolveOption === 'replace' ? 'active' : ''}`} style={{ display: 'flex', gap: '12px', padding: '12px', border: '1px solid var(--border-color-dark)', borderRadius: 'var(--radius-md)', cursor: 'pointer', background: resolveOption === 'replace' ? 'rgba(219, 39, 119, 0.05)' : 'none' }}>
              <input type="radio" name="resolve" checked={resolveOption === 'replace'} onChange={() => setResolveOption('replace')} />
              <div>
                <strong style={{ display: 'block', fontSize: '0.875rem' }}>Replace Existing File</strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Overwrite the file uploader URL without saving history.</span>
              </div>
            </label>

            <label className={`form-radio-card ${resolveOption === 'keep' ? 'active' : ''}`} style={{ display: 'flex', gap: '12px', padding: '12px', border: '1px solid var(--border-color-dark)', borderRadius: 'var(--radius-md)', cursor: 'pointer', background: resolveOption === 'keep' ? 'rgba(219, 39, 119, 0.05)' : 'none' }}>
              <input type="radio" name="resolve" checked={resolveOption === 'keep'} onChange={() => setResolveOption('keep')} />
              <div>
                <strong style={{ display: 'block', fontSize: '0.875rem' }}>Keep Both Files</strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Rename the new file to "{name} (Copy)" and save as new.</span>
              </div>
            </label>
          </div>

          {resolveOption === 'version' && (
            <div className="flex-column gap-3 padding-top-1">
              <div className="form-group flex-column gap-1">
                <label>Version Comment</label>
                <input
                  type="text"
                  placeholder="e.g. Fixed section 4 typos"
                  value={versionComment}
                  onChange={e => setVersionComment(e.target.value)}
                />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input type="checkbox" checked={majorUpdate} onChange={e => setMajorUpdate(e.target.checked)} />
                <span>This is a major version release (bump to v{(parseInt(duplicateDoc.version || '1.0') + 1).toFixed(1)})</span>
              </label>
            </div>
          )}

          <div className="flex-row gap-3 justify-end mt-2">
            <Button variant="secondary" onClick={() => setDuplicateDoc(null)}>
              Back
            </Button>
            <Button variant="primary" onClick={handleUploadSubmit} disabled={isUploading} loading={isUploading}>
              Resolve & Upload
            </Button>
          </div>
        </div>
      ) : (
        // Standard Upload Form
        <form onSubmit={handleUploadSubmit} className="flex-column gap-3 padding-1">
          {/* Scope selection */}
          <div className="form-group flex-column gap-1">
            <label>Document Location Scope</label>
            <div style={{ display: 'flex', gap: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="radio" checked={scope === 'GENERAL'} onChange={() => setScope('GENERAL')} />
                <span>General Documents</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="radio" checked={scope === 'PROJECT'} onChange={() => setScope('PROJECT')} />
                <span>Project Documents</span>
              </label>
            </div>
          </div>

          {/* File input */}
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
                  padding: '16px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px dashed var(--border-color-dark)',
                  borderRadius: 'var(--radius-lg)',
                  color: 'var(--text-secondary)',
                  transition: 'all 0.2s',
                  textAlign: 'center'
                }}
              >
                <Upload size={18} />
                <span style={{ fontSize: '0.85rem' }}>
                  {selectedFile ? selectedFile.name : 'Drag & drop or browse local files...'}
                </span>
              </div>
            </div>
          </div>

          <div className="form-group flex-column gap-1">
            <label>Document Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Employee Guidelines"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="form-group flex-column gap-1">
            <label>Description (Optional)</label>
            <textarea
              placeholder="Provide a brief summary of the file contents..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              style={{ width: '100%', resize: 'none' }}
            />
          </div>

          {/* Metadata bindings per scope */}
          {scope === 'PROJECT' ? (
            <>
              <div className="form-group flex-column gap-1">
                <label>Select Project Folder</label>
                <select required value={projectId} onChange={e => setProjectId(e.target.value)}>
                  <option value="">Select active project folder...</option>
                  {activeProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.projectCode || p.id})</option>
                  ))}
                </select>
              </div>

              <div className="form-group flex-column gap-1">
                <label>Project Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)}>
                  {PROJECT_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="form-group flex-column gap-1">
                <label>Visibilty Level</label>
                <select value={visibility} onChange={e => setVisibility(e.target.value)}>
                  <option value="Project Members">All Project Members</option>
                  <option value="Project Managers">Project Managers & Leaders</option>
                  <option value="Specific Roles">Specific Roles only</option>
                  <option value="Custom Users">Selected Employees only</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="form-group flex-column gap-1">
                <label>Associated Department (Optional)</label>
                <select value={departmentName} onChange={e => setDepartmentName(e.target.value)}>
                  <option value="">No department tag</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group flex-column gap-1">
                <label>General Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)}>
                  {GENERAL_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="form-group flex-column gap-1">
                <label>Visibility Level</label>
                <select value={visibility} onChange={e => setVisibility(e.target.value)}>
                  <option value="Company Wide">Company Wide (Public)</option>
                  <option value="Department Only">Department Members Only</option>
                  <option value="Selected Employees">Specific Employees</option>
                  <option value="Private">Private (Upload Owner Only)</option>
                </select>
              </div>
            </>
          )}

          {/* Conditional Multi-select details */}
          {visibility === 'Specific Roles' && (
            <div className="form-group flex-column gap-1">
              <label>Select Allowed Roles</label>
              <div className="flex-row gap-2 flex-wrap" style={{ border: '1px solid var(--border-color-dark)', padding: '10px', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.1)' }}>
                {ROLES_LIST.map(role => {
                  const isChecked = selectedRoles.includes(role.id);
                  return (
                    <label key={role.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '4px 8px', background: isChecked ? 'rgba(219,39,119,0.15)' : 'none', borderRadius: '4px', border: '1px solid var(--border-color-dark)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={isChecked} onChange={() => {
                        setSelectedRoles(prev => prev.includes(role.id) ? prev.filter(r => r !== role.id) : [...prev, role.id]);
                      }} style={{ display: 'none' }} />
                      {role.name}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {(visibility === 'Selected Employees' || visibility === 'Custom Users') && (
            <div className="form-group flex-column gap-1">
              <label>Select Allowed Employees</label>
              <div className="flex-column gap-1" style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--border-color-dark)', padding: '8px', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.1)' }}>
                {allEmployees.map(emp => {
                  const isChecked = selectedUserIds.includes(emp.id);
                  return (
                    <label key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', padding: '4px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={isChecked} onChange={() => {
                        setSelectedUserIds(prev => prev.includes(emp.id) ? prev.filter(uid => uid !== emp.id) : [...prev, emp.id]);
                      }} />
                      <span>{emp.name} ({emp.designation || emp.role})</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="form-group flex-column gap-1">
            <label>Tags (Comma separated)</label>
            <input
              type="text"
              placeholder="e.g. guidelines, onboarding, general"
              value={tags}
              onChange={e => setTags(e.target.value)}
            />
          </div>

          <div className="flex-row gap-3 justify-end mt-2">
            <Button type="button" variant="secondary" onClick={handleResetClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isUploading} loading={isUploading}>
              Upload
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default UploadDocumentModal;
