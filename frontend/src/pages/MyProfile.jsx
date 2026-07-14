import { useState, useMemo, useRef } from 'react';
import './MyProfile.css';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import { encodeEmployeeId } from '../utils/hashId';
import Button from '../components/common/Button';
import Avatar from '../components/common/Avatar';
import Skeleton from '../components/common/Skeleton';
import Modal from '../components/common/Modal';
import { ImageKitUploadService } from '../services/imagekitUploadService';
import {
  User, Mail, Phone, MapPin, Briefcase, Shield, Clock,
  Lock, Check, Download, Share2, Globe, Building, Cpu, Activity,
  FileText, FileCode, File, Camera
} from 'lucide-react';

// ─── REDESIGNED SUB-COMPONENTS ─────────────────────────────────────────────

const StatusBadge = ({ status }) => {
  const isGreen = status === 'Active' || status === 'Confirmed';
  const isYellow = status === 'Probation' || status === 'Pending';
  const className = isGreen ? 'hero-badge-active' : isYellow ? 'hero-badge-warning' : 'hero-badge-disabled';
  return (
    <span className={`hero-status-pill ${className}`}>
      <span className="hero-status-dot"></span>
      {status || 'Active'}
    </span>
  );
};

const ProfileHeroCard = ({ user }) => {
  const { patchCurrentUserAvatar, token, addToast } = useApp();
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleTriggerUpload = () => {
    if (isUploading) return;
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('error', 'Please select a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      addToast('error', 'Image size must be less than 5MB');
      return;
    }

    try {
      setIsUploading(true);
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
      });

      const uploadRes = await fetch(`/api/v1/chat/imagekit/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fileData: base64Data,
          fileName: file.name
        })
      });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}));
        throw new Error(errData.message || `Upload failed (Status ${uploadRes.status})`);
      }

      const uploadResult = await uploadRes.json();
      if (uploadResult.status !== 'success' || !uploadResult.data) {
        throw new Error(uploadResult.message || 'Upload failed');
      }

      const imageUrl = uploadResult.data.url;

      // Use the dedicated self-service avatar endpoint — bypasses permission matrix
      const res = await fetch(`/api/v1/employees/${user.id}/avatar`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ avatar: imageUrl, photoUrl: imageUrl })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to save profile image');
      }

      const data = await res.json();
      // Update global context so sidebar/header reflect the new photo immediately (no extra API call)
      patchCurrentUserAvatar(user.id, imageUrl);
      addToast('success', 'Profile image updated successfully!');
    } catch (err) {
      console.error('Failed to update avatar:', err);
      addToast('error', err.message || 'Error occurred while updating profile image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadQR = (employeeId, companyId) => {
    try {
      const data = JSON.stringify({ employeeId, companyId });
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data)}`;
      
      const img = new Image();
      img.crossOrigin = 'anonymous'; // request CORS access
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const dataURL = canvas.toDataURL('image/png');
          
          const link = document.createElement('a');
          link.href = dataURL;
          link.download = `employee_qr_${employeeId}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch (canvasErr) {
          console.error('Canvas export failed, falling back to direct tab:', canvasErr);
          window.open(qrUrl, '_blank');
        }
      };
      img.onerror = (err) => {
        console.error('Failed to load QR image for canvas download, opening in new tab:', err);
        window.open(qrUrl, '_blank');
      };
      img.src = qrUrl;
    } catch (err) {
      console.error('Failed to download QR code:', err);
    }
  };

  return (
    <div className="profile-hero-card">
      <div className="hero-card-banner" />
      <div className="hero-card-content">
        <div className="hero-left-col">
          <div 
            className="hero-avatar-glow" 
            style={{ cursor: 'pointer' }} 
            onClick={handleTriggerUpload}
            title="Click to change profile picture"
          >
            {user.photoUrl ? (
              <img src={user.photoUrl} alt={user.name} />
            ) : (
              <Avatar name={user.name} size="xl" src={user.avatar} />
            )}
            <div className="avatar-edit-overlay">
              <Camera size={18} style={{ color: '#fff' }} />
              <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#fff', marginTop: '2px' }}>Change</span>
            </div>
            {isUploading && (
              <div className="avatar-edit-overlay" style={{ opacity: 1, background: 'rgba(9, 13, 22, 0.8)' }}>
                <div className="avatar-upload-spinner" />
                <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#fff', marginTop: '6px' }}>Uploading...</span>
              </div>
            )}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept="image/*"
            onChange={handleFileChange}
          />
          <div className="hero-primary-info">
            <h3>{user.name}</h3>
            <p className="hero-designation">{user.designation || '—'}</p>
            <p className="hero-dept-tag">{user.department || '—'}</p>
            <StatusBadge status={user.status || 'Active'} />
          </div>
        </div>
        <div className="hero-right-divider" />
        <div className="hero-right-col">
          <div className="hero-meta-grid">
            <div className="hero-meta-item">
              <span className="hero-meta-label">Employee ID</span>
              <span className="hero-meta-value font-mono">{user.employeeId || user.id || '—'}</span>
            </div>
            <div className="hero-meta-item">
              <span className="hero-meta-label">Team Placement</span>
              <span className="hero-meta-value">{user.team || '—'}</span>
            </div>
            <div className="hero-meta-item">
              <span className="hero-meta-label">Branch / Location</span>
              <span className="hero-meta-value">{user.branch || '—'}</span>
            </div>
            <div className="hero-meta-item">
              <span className="hero-meta-label">Joining Date</span>
              <span className="hero-meta-value">{user.joinDate || '—'}</span>
            </div>
            <div className="hero-meta-item">
              <span className="hero-meta-label">Employment Type</span>
              <span className="hero-meta-value">{user.employeeType || '—'}</span>
            </div>
          </div>
        </div>
        <div className="hero-right-divider" />
        <div className="hero-qr-col" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 10px', gap: '8px', zIndex: 5, minWidth: '120px' }}>
          <div style={{ background: '#ffffff', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(JSON.stringify({ employeeId: user.employeeId || user.id, companyId: user.companyId || 'COMP-A' }))}`} 
              alt="Profile QR Code" 
              width="90" 
              height="90" 
              style={{ display: 'block', borderRadius: '4px' }} 
            />
          </div>
          <button 
            onClick={() => handleDownloadQR(user.employeeId || user.id, user.companyId || 'COMP-A')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: 'none',
              background: 'transparent',
              color: 'var(--color-primary)',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              padding: '4px 8px',
              borderRadius: '4px',
              transition: 'background 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(217,70,239,0.05)'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          >
            <Download size={12} /> Download QR
          </button>
        </div>
      </div>
    </div>
  );
};

const ProgressTracker = ({ items, percentage, nextStep }) => {
  return (
    <div className="premium-progress-card">
      <div className="progress-card-header">
        <div className="progress-header-left">
          <h4>Profile Completeness</h4>
          <span className="progress-subtitle">{nextStep}</span>
        </div>
        <div className="progress-header-right">
          <span className="progress-percentage-val">{percentage}%</span>
        </div>
      </div>

      <div className="segmented-progress-bar">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(segment => {
          const isActive = percentage >= segment * 10;
          return (
            <div 
              key={segment} 
              className={`progress-segment ${isActive ? 'active' : ''}`}
            />
          );
        })}
      </div>

      <div className="progress-checklist-grid">
        {items.map((item, idx) => (
          <div key={idx} className={`checklist-tile ${item.completed ? 'completed' : 'incomplete'}`}>
            <div className="tile-icon-wrap">
              {item.completed ? <Check size={14} className="text-success" style={{ color: '#4ade80' }} /> : <Clock size={14} className="text-muted" />}
            </div>
            <div className="tile-details">
              <span className="tile-title">{item.name}</span>
              <span className="tile-weight">Weight: {item.weight}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProfessionalPlacementCard = ({ user }) => {
  const roleKey = (user.roleId || user.role || '').toLowerCase();
  const designationLower = (user.designation || '').toLowerCase();

  const isSuperAdmin = roleKey === 'super_admin' || roleKey === 'company_admin' || designationLower.includes('admin');
  const isHR = roleKey === 'hr' || designationLower.includes('hr');
  const isBranchAdmin = roleKey === 'branch_admin';
  const isManager = roleKey === 'manager' || designationLower.includes('manager');
  const isTeamLeader = roleKey === 'team_leader' || designationLower.includes('team leader') || designationLower.includes('team_leader');

  const cells = [
    { label: 'Employee ID', value: user.employeeId || user.id || '—', icon: Shield },
    { label: 'Designation', value: user.designation || '—', icon: User },
    { label: 'Department', value: user.department || '—', icon: Building },
    { label: 'Team Name', value: user.team || '—', icon: User },
    { label: 'Reporting Team Leader', value: user.teamLeader || '—', icon: User },
    { label: 'Office Location', value: user.branch || '—', icon: MapPin },
    { label: 'Employment Type', value: user.employeeType || '—', icon: Briefcase },
  ].filter(cell => {
    if (isManager) {
      return ['Employee ID', 'Designation', 'Office Location'].includes(cell.label);
    }
    if (isSuperAdmin || isHR || isBranchAdmin) {
      return !['Team Name', 'Reporting Team Leader'].includes(cell.label);
    }
    if (isTeamLeader) {
      return cell.label !== 'Reporting Team Leader';
    }
    return true;
  });

  return (
    <div className="professional-info-card">
      <h4><Briefcase size={16} /> Professional Placement</h4>
      <div className="info-table-grid">
        {cells.map((cell, idx) => {
          const Icon = cell.icon;
          return (
            <div key={idx} className="info-grid-cell">
              <span className="info-cell-label">
                <Icon size={12} style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }} />
                {cell.label}
              </span>
              <span className="info-cell-value">{cell.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const WorkOperationsCard = ({ user }) => {
  const monthsActive = useMemo(() => {
    if (!user.joinDate) return 0;
    const join = new Date(user.joinDate);
    if (isNaN(join.getTime())) return 0;
    return (new Date() - join) / (1000 * 60 * 60 * 24 * 30.4);
  }, [user.joinDate]);

  const isProbationComplete = monthsActive >= 3;
  const isConfirmed = monthsActive >= 12;

  return (
    <div className="work-info-card">
      <h4><Cpu size={16} /> Work Operations &amp; Shifts</h4>
      <div className="info-table-grid">
        <div className="info-grid-cell" style={{ gridColumn: 'span 2' }}>
          <span className="info-cell-label">Current Active Projects</span>
          <span className="info-cell-value">
            {user.currentProjectsCount !== undefined ? `${user.currentProjectsCount} Active Projects` : '0 Active Projects'}
          </span>
        </div>
        <div className="info-grid-cell">
          <span className="info-cell-label">Assigned Work Location</span>
          <span className="info-cell-value">{user.workLocation || '—'}</span>
        </div>
        <div className="info-grid-cell">
          <span className="info-cell-label">Daily Shift Timing</span>
          <span className="info-cell-value">{user.shift || user.shiftTiming || '—'}</span>
        </div>
      </div>

      <div className="work-timeline-container">
        <span className="info-cell-label">Employment Milestones</span>
        <div className="work-timeline-track">
          <div className={isProbationComplete ? "work-timeline-step-active" : "work-timeline-step-empty"} title="Probation (3 months)" />
          <div className={isConfirmed ? "work-timeline-step-confirmed" : "work-timeline-step-empty"} title="Confirmed (12+ months)" />
        </div>
        <div className="work-timeline-footer">
          <span>Joined: {user.joinDate || '—'}</span>
          <span>{isConfirmed ? 'Confirmed' : isProbationComplete ? 'Active Account' : 'In Probation'}</span>
        </div>
      </div>
    </div>
  );
};

const ContactCard = ({ title, fields }) => {
  return (
    <div className="info-display-card">
      <div className="info-card-header">
        <div className="info-card-icon-wrap primary">
          <Mail size={16} />
        </div>
        <h3>{title}</h3>
      </div>
      <div className="info-card-grid">
        {fields.map((field, idx) => {
          const Icon = field.icon || Phone;
          return (
            <div key={idx} className="info-card-item">
              <span className="info-item-label">
                <Icon size={12} style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }} />
                {field.label}
              </span>
              <span className="info-item-value">{field.value || '—'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AddressCard = ({ title, address, fallbackString, isSameBadge }) => {
  const hasDetails = address && (address.line1 || address.city || address.state || address.pincode);
  
  return (
    <div className="info-display-card">
      <div className="info-card-header">
        <div className="info-card-icon-wrap warning">
          <MapPin size={16} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '6px' }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          {isSameBadge && (
            <span className="same-address-badge">
              Same as Current Address
            </span>
          )}
        </div>
      </div>
      {hasDetails ? (
        <div className="info-card-grid">
          {[
            { label: 'Address Line 1', value: address.line1, icon: MapPin },
            { label: 'City', value: address.city, icon: Globe },
            { label: 'State', value: address.state, icon: Globe },
            { label: 'Postal Code', value: address.pincode, icon: Shield },
            { label: 'Country', value: address.country || 'India', icon: Globe }
          ].map((field, idx) => {
            const Icon = field.icon;
            return (
              <div key={idx} className={`info-card-item ${field.label === 'Address Line 1' ? 'full-width' : ''}`}>
                <span className="info-item-label">
                  <Icon size={12} style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }} />
                  {field.label}
                </span>
                <span className="info-item-value">{field.value || '—'}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="info-card-grid">
          <div className="info-card-item full-width">
            <span className="info-item-label">Address Details</span>
            <span className="info-item-value">{fallbackString || 'Not Provided'}</span>
          </div>
        </div>
      )}
    </div>
  );
};

const MyProfile = () => {
  const isLoading = usePageLoading(600);
  const {
    currentUser,
    currentUserRole,
    addToast,
    employees,
    branches,
    departments,
    projectsList,
    tasks,
    leaveRequests,
    activityLogs
  } = useApp();

  // Active Tab state for form panels
  const [activeTab, setActiveTab] = useState('personal'); // personal, contact
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  // Profile completeness calculation items
  const profileCompletionItems = useMemo(() => {
    if (!currentUser) return [];
    
    const hasPersonal = !!currentUser.name && !!currentUser.gender && !!currentUser.dob;
    const hasProfessional = !!currentUser.designation && !!currentUser.department && !!currentUser.branch;
    
    // Address checking helper
    const hasCurrentAddress = typeof currentUser.currentAddress === 'string'
      ? !!currentUser.currentAddress
      : !!(currentUser.currentAddress?.line1 || currentUser.currentAddress?.city);
      
    const hasContact = !!currentUser.personalEmail && !!(currentUser.phone || currentUser.personalMobile) && hasCurrentAddress;

    return [
      { key: 'personal', name: 'Personal Information', weight: 40, completed: hasPersonal, targetTab: 'personal' },
      { key: 'professional', name: 'Professional Information', weight: 30, completed: hasProfessional, targetTab: 'overview' },
      { key: 'contact', name: 'Contact & Address Details', weight: 30, completed: hasContact, targetTab: 'contact' }
    ];
  }, [currentUser]);

  // Sum total completion percentage
  const completionPercentage = useMemo(() => {
    return profileCompletionItems.reduce((acc, item) => acc + (item.completed ? item.weight : 0), 0);
  }, [profileCompletionItems]);

  const completionNextStep = useMemo(() => {
    const incomplete = profileCompletionItems.find(item => !item.completed);
    if (!incomplete) return 'Your profile is fully complete! 🎉';
    return `Next: Complete your ${incomplete.name} (${100 - completionPercentage}% remaining)`;
  }, [profileCompletionItems, completionPercentage]);

  const handleDownloadDataJSON = () => {
    if (!currentUser) return;
    const profileJSON = JSON.stringify({
      personal: {
        name: currentUser.name || '',
        gender: currentUser.gender || '',
        dob: currentUser.dob || '',
        maritalStatus: currentUser.maritalStatus || '',
        bloodGroup: currentUser.bloodGroup || '',
        nationality: currentUser.nationality || '',
        aadhaarNumber: currentUser.aadhaarNumber || '',
        panNumber: currentUser.panNumber || '',
        emergencyName: currentUser.emergencyContactName || currentUser.emergencyName || '',
        emergencyRelation: currentUser.emergencyContactRelation || currentUser.emergencyRelation || '',
        emergencyMobile: currentUser.emergencyContactPhone || currentUser.emergencyMobile || '',
        emergencyAlternate: currentUser.emergencyContactPhoneAlt || currentUser.emergencyAlternate || ''
      },
      contact: {
        personalEmail: currentUser.personalEmail || '',
        personalMobile: currentUser.phone || currentUser.personalMobile || '',
        alternateContact: currentUser.alternatePhone || currentUser.alternateContact || '',
        currentAddress: currentUser.currentAddress || '',
        permanentAddress: currentUser.permanentAddress || ''
      }
    }, null, 2);
    const blob = new Blob([profileJSON], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `profile_export_${currentUser.employeeId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast('success', 'Profile data JSON exported successfully.');
    setShowDownloadModal(false);
  };

  const handleDownloadPDF = () => {
    if (!currentUser) return;
    
    const getAddressString = (addr) => {
      if (!addr) return '—';
      if (typeof addr === 'string') return addr;
      if (typeof addr === 'object') {
        const parts = [addr.line1, addr.city, addr.state].filter(Boolean);
        const base = parts.join(', ');
        return addr.pincode ? `${base} - ${addr.pincode}` : (base || '—');
      }
      return String(addr);
    };

    const roleKey = (currentUser.roleId || currentUser.role || '').toLowerCase();
    const designationLower = (currentUser.designation || '').toLowerCase();

    const isSuperAdmin = roleKey === 'super_admin' || roleKey === 'company_admin' || designationLower.includes('admin');
    const isHR = roleKey === 'hr' || designationLower.includes('hr');
    const isBranchAdmin = roleKey === 'branch_admin';
    const isManager = roleKey === 'manager' || designationLower.includes('manager');
    const isTeamLeader = roleKey === 'team_leader' || designationLower.includes('team leader') || designationLower.includes('team_leader');

    const pdfCells = [
      { label: 'Designation', value: currentUser.designation || '—' },
      { label: 'Department', value: currentUser.department || '—' },
      { label: 'Office Location', value: currentUser.branch || '—' },
      { label: 'Employment Type', value: currentUser.employeeType || '—' },
      { label: 'Joining Date', value: currentUser.joinDate || '—' },
      { label: 'Shift Timing', value: currentUser.shift || currentUser.shiftTiming || '—' }
    ].filter(cell => {
      if (isManager) {
        return ['Designation', 'Office Location'].includes(cell.label);
      }
      return true;
    });

    const pdfCellsHTML = pdfCells.map(c => `
      <div class="field"><span class="label">${c.label}</span><span class="value">${c.value}</span></div>
    `).join('');

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      addToast('error', 'Popup blocked. Please allow popups to export PDF.');
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>${currentUser.name} - Profile Report</title>
          <style>
            body { font-family: 'Inter', system-ui, -apple-system, sans-serif; padding: 40px; color: #1e293b; background: #fff; line-height: 1.5; }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; }
            .header-cell { vertical-align: middle; }
            h1 { margin: 0; color: #0f172a; font-size: 24px; font-weight: 800; }
            .subtitle { color: #64748b; font-size: 13px; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
            .section { margin-bottom: 25px; }
            .section-title { font-size: 14px; font-weight: 700; color: #4f46e5; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.05em; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px 30px; }
            .field { display: flex; flex-direction: column; }
            .label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 3px; letter-spacing: 0.5px; }
            .value { font-size: 13px; color: #0f172a; font-weight: 500; }
            .full-width { grid-column: span 2; }
            .footer { margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 11px; color: #94a3b8; text-align: center; }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td class="header-cell">
                <h1>${currentUser.name}</h1>
                <div class="subtitle">Employee Profile Report — ID: ${currentUser.employeeId || currentUser.id || '—'}</div>
              </td>
            </tr>
          </table>
          
          <div class="section">
            <div class="section-title">Professional Placement</div>
            <div class="grid">
              ${pdfCellsHTML}
            </div>
          </div>

          <div class="section">
            <div class="section-title">Personal Details</div>
            <div class="grid">
              <div class="field"><span class="label">Gender</span><span class="value">${currentUser.gender || '—'}</span></div>
              <div class="field"><span class="label">Date of Birth</span><span class="value">${currentUser.dob ? new Date(currentUser.dob).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</span></div>
              <div class="field"><span class="label">Marital Status</span><span class="value">${currentUser.maritalStatus || '—'}</span></div>
              <div class="field"><span class="label">Blood Group</span><span class="value">${currentUser.bloodGroup || '—'}</span></div>
              <div class="field"><span class="label">Nationality</span><span class="value">${currentUser.nationality || '—'}</span></div>
              <div class="field"><span class="label">Aadhaar Number</span><span class="value">${currentUser.aadhaarNumber ? `•••• •••• ${currentUser.aadhaarNumber.slice(-4)}` : '—'}</span></div>
              <div class="field"><span class="label">PAN Number</span><span class="value">${currentUser.panNumber ? `••••••${currentUser.panNumber.slice(-4)}` : '—'}</span></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Contact & Addresses</div>
            <div class="grid">
              <div class="field"><span class="label">Official Email</span><span class="value">${currentUser.officialEmail || currentUser.email || '—'}</span></div>
              <div class="field"><span class="label">Official Mobile</span><span class="value">${currentUser.officialMobile || currentUser.phone || '—'}</span></div>
              <div class="field"><span class="label">Personal Email</span><span class="value">${currentUser.personalEmail || '—'}</span></div>
              <div class="field"><span class="label">Personal Mobile</span><span class="value">${currentUser.phone || currentUser.personalMobile || '—'}</span></div>
              <div class="field full-width"><span class="label">Current Address</span><span class="value">${getAddressString(currentUser.currentAddress)}</span></div>
              <div class="field full-width"><span class="label">Permanent Address</span><span class="value">${getAddressString(currentUser.permanentAddress)}</span></div>
            </div>
          </div>

          <div class="footer">
            Gatecode Office Management System (OMS) • Confidential Document • Generated on ${new Date().toLocaleDateString()}
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    addToast('success', 'Profile PDF report generated.');
    setShowDownloadModal(false);
  };

  const handleDownloadWord = () => {
    if (!currentUser) return;

    const getAddressString = (addr) => {
      if (!addr) return '—';
      if (typeof addr === 'string') return addr;
      if (typeof addr === 'object') {
        const parts = [addr.line1, addr.city, addr.state].filter(Boolean);
        const base = parts.join(', ');
        return addr.pincode ? `${base} - ${addr.pincode}` : (base || '—');
      }
      return String(addr);
    };

    const roleKey = (currentUser.roleId || currentUser.role || '').toLowerCase();
    const designationLower = (currentUser.designation || '').toLowerCase();

    const isSuperAdmin = roleKey === 'super_admin' || roleKey === 'company_admin' || designationLower.includes('admin');
    const isHR = roleKey === 'hr' || designationLower.includes('hr');
    const isBranchAdmin = roleKey === 'branch_admin';
    const isManager = roleKey === 'manager' || designationLower.includes('manager');
    const isTeamLeader = roleKey === 'team_leader' || designationLower.includes('team leader') || designationLower.includes('team_leader');

    const wordCells = [
      { label: 'Designation', value: currentUser.designation || '—' },
      { label: 'Department', value: currentUser.department || '—' },
      { label: 'Office Location', value: currentUser.branch || '—' },
      { label: 'Employment Type', value: currentUser.employeeType || '—' },
      { label: 'Joining Date', value: currentUser.joinDate || '—' },
      { label: 'Shift Timing', value: currentUser.shift || currentUser.shiftTiming || '—' }
    ].filter(cell => {
      if (isManager) {
        return ['Designation', 'Office Location'].includes(cell.label);
      }
      return true;
    });

    let wordRowsHTML = '';
    for (let i = 0; i < wordCells.length; i += 2) {
      const cell1 = wordCells[i];
      const cell2 = wordCells[i + 1] || { label: '', value: '' };
      wordRowsHTML += `
        <tr>
          <td><span class="label">${cell1.label}</span><span class="value">${cell1.value}</span></td>
          <td>${cell2.label ? `<span class="label">${cell2.label}</span><span class="value">${cell2.value}</span>` : ''}</td>
        </tr>
      `;
    }

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <title>${currentUser.name} - Profile Report</title>
          <!--[if gte mso 9]>
          <xml>
            <w:WordDocument>
              <w:View>Print</w:View>
              <w:Zoom>100</w:Zoom>
            </w:WordDocument>
          </xml>
          <![endif]-->
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333333; }
            h1 { color: #000000; font-size: 22px; border-bottom: 2px solid #4f46e5; padding-bottom: 8px; margin-bottom: 20px; }
            .section { margin-bottom: 25px; }
            .section-title { font-size: 14px; font-weight: bold; color: #4f46e5; border-bottom: 1px solid #cccccc; padding-bottom: 4px; margin-bottom: 15px; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            td { padding: 6px; vertical-align: top; width: 50%; }
            .label { font-size: 10px; color: #666666; font-weight: bold; text-transform: uppercase; display: block; margin-bottom: 2px; }
            .value { font-size: 13px; color: #000000; }
          </style>
        </head>
        <body>
          <h1>${currentUser.name}</h1>
          <p><strong>Employee ID:</strong> ${currentUser.employeeId || currentUser.id || '—'}</p>
          
          <div class="section">
            <div class="section-title">Professional Placement</div>
            <table>
              ${wordRowsHTML}
            </table>
          </div>

          <div class="section">
            <div class="section-title">Personal Details</div>
            <table>
              <tr>
                <td><span class="label">Gender</span><span class="value">${currentUser.gender || '—'}</span></td>
                <td><span class="label">Date of Birth</span><span class="value">${currentUser.dob ? new Date(currentUser.dob).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</span></td>
              </tr>
              <tr>
                <td><span class="label">Marital Status</span><span class="value">${currentUser.maritalStatus || '—'}</span></td>
                <td><span class="label">Blood Group</span><span class="value">${currentUser.bloodGroup || '—'}</span></td>
              </tr>
              <tr>
                <td><span class="label">Nationality</span><span class="value">${currentUser.nationality || '—'}</span></td>
                <td><span class="label">Aadhaar Number</span><span class="value">${currentUser.aadhaarNumber ? `•••• •••• ${currentUser.aadhaarNumber.slice(-4)}` : '—'}</span></td>
              </tr>
              <tr>
                <td><span class="label">PAN Number</span><span class="value">${currentUser.panNumber ? `••••••${currentUser.panNumber.slice(-4)}` : '—'}</span></td>
                <td></td>
              </tr>
            </table>
          </div>

          <div class="section">
            <div class="section-title">Contact & Addresses</div>
            <table>
              <tr>
                <td><span class="label">Official Email</span><span class="value">${currentUser.officialEmail || currentUser.email || '—'}</span></td>
                <td><span class="label">Official Mobile</span><span class="value">${currentUser.officialMobile || currentUser.phone || '—'}</span></td>
              </tr>
              <tr>
                <td><span class="label">Personal Email</span><span class="value">${currentUser.personalEmail || '—'}</span></td>
                <td><span class="label">Personal Mobile</span><span class="value">${currentUser.phone || currentUser.personalMobile || '—'}</span></td>
              </tr>
              <tr>
                <td colspan="2"><span class="label">Current Address</span><span class="value">${getAddressString(currentUser.currentAddress)}</span></td>
              </tr>
              <tr>
                <td colspan="2"><span class="label">Permanent Address</span><span class="value">${getAddressString(currentUser.permanentAddress)}</span></td>
              </tr>
            </table>
          </div>
        </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `profile_report_${currentUser.employeeId}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast('success', 'Profile data Word Document exported successfully.');
    setShowDownloadModal(false);
  };

  const handleShareProfile = () => {
    if (!currentUser) return;
    const shareUrl = `${window.location.origin}/employees/${encodeEmployeeId(currentUser.id)}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      addToast('success', 'Profile link copied to clipboard.');
    });
  };

  if (isLoading || !currentUser) {
    return (
      <div className="profile-settings-page flex-column grid-gap">
        <div className="card" style={{ height: '70px' }}><Skeleton variant="rect" height="100%" /></div>
        <div className="card" style={{ height: '80px' }}><Skeleton variant="rect" height="100%" /></div>
        <div className="profile-columns-layout">
          <div className="card" style={{ height: '400px' }}><Skeleton variant="rect" height="100%" /></div>
          <div className="card" style={{ height: '400px' }}><Skeleton variant="rect" height="100%" /></div>
        </div>
      </div>
    );
  }

  // Address variables helper
  const currentAddrFallback = typeof currentUser.currentAddress === 'string' ? currentUser.currentAddress : '';
  const currentAddrObj = typeof currentUser.currentAddress === 'object' ? currentUser.currentAddress : null;

  const permAddrFallback = typeof currentUser.permanentAddress === 'string' ? currentUser.permanentAddress : '';
  const permAddrObj = typeof currentUser.permanentAddress === 'object' ? currentUser.permanentAddress : null;

  const isSameAddress = (currentUser.permanentAddress === currentUser.currentAddress) || (
    currentAddrObj && permAddrObj &&
    currentAddrObj.line1 === permAddrObj.line1 &&
    currentAddrObj.city === permAddrObj.city &&
    currentAddrObj.state === permAddrObj.state &&
    currentAddrObj.pincode === permAddrObj.pincode
  );

  if (currentUserRole === 'company_admin') {
    // Get filtered recent activity logs for this tenant (first 6 logs)
    const companyLogs = (activityLogs || []).slice(0, 6);

    // Metrics calculation
    const empCount = employees?.length || 0;
    const branchCount = branches?.length || 0;
    const deptCount = departments?.length || 0;
    const projectCount = projectsList?.length || 0;
    const taskCount = tasks?.length || 0;
    const pendingLeaveCount = leaveRequests?.filter(r => r.status === 'Pending').length || 0;

    return (
      <div className="profile-settings-page animate-fade-in flex-column grid-gap">
        {/* ==================== 1. HEADER ==================== */}
        <div className="profile-page-header">
          <div className="profile-header-title-section">
            <div className="profile-header-title-row">
              <h2>My Profile</h2>
              <span className="security-badge">
                <Lock size={12} /> Personal Account Management Center
              </span>
            </div>
            <p className="profile-header-subtitle">
              Manage your personal information, professional details, contact information, official documents, bank account details, and account preferences from a single secure profile management center.
            </p>
          </div>
        </div>

        {/* ==================== TWO-COLUMN LAYOUT ==================== */}
        <div className="profile-columns-layout">
          {/* LEFT COLUMN: HERO CARD & METRICS REPORT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* HERO BOX */}
            <div className="profile-hero-card" style={{ padding: '30px 24px' }}>
              <div className="hero-card-banner" />
              <div className="hero-card-content" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div className="hero-avatar-glow" style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-primary, #6366f1), var(--color-secondary, #4f46e5))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)' }}>
                  <Shield size={36} style={{ color: '#fff' }} />
                </div>
                <div className="hero-primary-info" style={{ marginTop: 0 }}>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '1.4rem', fontWeight: 800 }}>{currentUser.name}</h3>
                  <p className="hero-designation" style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Company Administrator</p>
                  <p className="hero-dept-tag" style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{currentUser.email}</p>
                </div>
              </div>
            </div>

            {/* REPORT CARD */}
            <div className="card" style={{ padding: '24px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <Building size={16} /> Organization Metrics Report
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                {[
                  { label: 'Total Employees', value: empCount, color: 'var(--color-primary)' },
                  { label: 'Active Projects', value: projectCount, color: '#06b6d4' },
                  { label: 'Pending Tasks', value: taskCount, color: '#f59e0b' },
                  { label: 'Pending Leaves', value: pendingLeaveCount, color: '#ec4899' },
                  { label: 'Agency Branches', value: branchCount, color: '#10b981' },
                  { label: 'Departments', value: deptCount, color: '#8b5cf6' }
                ].map((stat, idx) => (
                  <div key={idx} style={{ padding: '16px', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{stat.label}</span>
                    <strong style={{ fontSize: '1.5rem', color: stat.color }}>{stat.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: RECENT SYSTEM ACTIVITY LOGS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="card" style={{ padding: '24px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <Activity size={16} /> Recent System Activity Logs
              </h4>
              {companyLogs.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                  {companyLogs.map((log, i) => (
                    <div key={i} style={{ padding: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>{log.action || log.description}</span>
                        <span style={{
                          fontSize: '0.72rem',
                          background: log.status === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: log.status === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
                          padding: '2px 8px', borderRadius: '10px', fontWeight: 600
                        }}>{log.status || 'success'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <span>Module: {log.module || 'System'}</span>
                        <span>{log.timestamp || new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No recent activity logs found.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-settings-page">
      {/* ==================== 1. HEADER ==================== */}
      <div className="profile-page-header">
        <div className="profile-header-title-section">
          <div className="profile-header-title-row">
            <h2>My Profile</h2>
            <span className="security-badge">
              <Lock size={12} /> Personal Account Management Center
            </span>
          </div>
          <p className="profile-header-subtitle">
            Manage your personal information, professional details, contact information, official documents, bank account details, and account preferences from a single secure profile management center.
          </p>
        </div>
        <div className="profile-header-actions">
          <Button variant="secondary" icon={Download} onClick={() => setShowDownloadModal(true)}>
            Download Data
          </Button>
          {currentUserRole === 'super_admin' && (
            <Button variant="secondary" icon={Share2} onClick={handleShareProfile}>
              Share Profile
            </Button>
          )}
        </div>
      </div>

      {/* ==================== TWO-COLUMN LAYOUT ==================== */}
      <div className="profile-columns-layout">
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <ProfileHeroCard user={currentUser} />
          <ProgressTracker 
            items={profileCompletionItems} 
            percentage={completionPercentage} 
            nextStep={completionNextStep} 
          />
          <WorkOperationsCard user={currentUser} />
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <ProfessionalPlacementCard user={currentUser} />

          {/* Tab Card Switcher */}
          <div className="profile-tabs-card">
            <div className="profile-tabs-header-bar">
              {[
                { id: 'personal', label: 'Personal Details', icon: User },
                { id: 'contact', label: 'Contact & Address', icon: Phone }
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`profile-tab-header-btn ${activeTab === tab.id ? 'active' : ''}`}
                  >
                    <Icon size={16} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB CONTENT */}
            {activeTab === 'personal' && (
              <div className="profile-info-cards-container">
                {/* IDENTITY & DEMOGRAPHICS */}
                <div className="info-display-card">
                  <div className="info-card-header">
                    <div className="info-card-icon-wrap primary">
                      <User size={18} />
                    </div>
                    <h3>Identity &amp; Demographics</h3>
                  </div>
                  <div className="info-card-grid">
                    <div className="info-card-item">
                      <span className="info-item-label">Full Name</span>
                      <span className="info-item-value">{currentUser.name || '—'}</span>
                    </div>
                    <div className="info-card-item">
                      <span className="info-item-label">Employee ID</span>
                      <span className="info-item-value font-mono">{currentUser.employeeId || '—'}</span>
                    </div>
                    <div className="info-card-item">
                      <span className="info-item-label">Gender</span>
                      <span className="info-item-value">{currentUser.gender || '—'}</span>
                    </div>
                    <div className="info-card-item">
                      <span className="info-item-label">Date of Birth</span>
                      <span className="info-item-value">
                        {currentUser.dob ? new Date(currentUser.dob).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not Provided'}
                      </span>
                    </div>
                    <div className="info-card-item">
                      <span className="info-item-label">Marital Status</span>
                      <span className="info-item-value">{currentUser.maritalStatus || '—'}</span>
                    </div>
                    <div className="info-card-item">
                      <span className="info-item-label">Blood Group</span>
                      <span className="info-item-value highlight-blood">{currentUser.bloodGroup || 'Not Provided'}</span>
                    </div>
                    <div className="info-card-item">
                      <span className="info-item-label">Nationality</span>
                      <span className="info-item-value">{currentUser.nationality || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* NATIONAL IDENTITIES */}
                <div className="info-display-card">
                  <div className="info-card-header">
                    <div className="info-card-icon-wrap warning">
                      <Shield size={18} />
                    </div>
                    <h3>National Identities</h3>
                  </div>
                  <div className="info-card-grid">
                    <div className="info-card-item">
                      <span className="info-item-label">Aadhaar Number</span>
                      <span className="info-item-value font-mono secured-value">
                        {currentUser.aadhaarNumber ? `•••• •••• ${currentUser.aadhaarNumber.slice(-4)}` : 'Not Provided'}
                      </span>
                    </div>
                    <div className="info-card-item">
                      <span className="info-item-label">PAN Number</span>
                      <span className="info-item-value font-mono secured-value">
                        {currentUser.panNumber ? `••••••${currentUser.panNumber.slice(-4)}` : 'Not Provided'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* EMERGENCY CONTACTS */}
                <div className="info-display-card">
                  <div className="info-card-header">
                    <div className="info-card-icon-wrap danger">
                      <Phone size={18} />
                    </div>
                    <h3>Emergency Contacts</h3>
                  </div>
                  <div className="info-card-grid">
                    <div className="info-card-item">
                      <span className="info-item-label">Contact Person</span>
                      <span className="info-item-value">{currentUser.emergencyContactName || currentUser.emergencyName || 'Not Provided'}</span>
                    </div>
                    <div className="info-card-item">
                      <span className="info-item-label">Relationship</span>
                      <span className="info-item-value">{currentUser.emergencyContactRelation || currentUser.emergencyRelation || '—'}</span>
                    </div>
                    <div className="info-card-item">
                      <span className="info-item-label">Mobile Number</span>
                      <span className="info-item-value font-mono">{currentUser.emergencyContactPhone || currentUser.emergencyMobile || 'Not Provided'}</span>
                    </div>
                    <div className="info-card-item">
                      <span className="info-item-label">Alternate Mobile</span>
                      <span className="info-item-value font-mono">{currentUser.emergencyContactPhoneAlt || currentUser.emergencyAlternate || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'contact' && (
              <div className="profile-info-cards-container">
                {/* OFFICIAL CONTACT CHANNELS */}
                <ContactCard
                  title="Official Contact Channels"
                  fields={[
                    { label: 'Official Email (Verified)', value: currentUser.officialEmail || currentUser.email, icon: Mail },
                    { label: 'Official Mobile (Verified)', value: currentUser.officialMobile || currentUser.phone, icon: Phone },
                    { label: 'Extension Number', value: '1025', icon: Phone }
                  ]}
                />

                {/* PERSONAL CONTACT CHANNELS */}
                <ContactCard
                  title="Personal Contact Channels"
                  fields={[
                    { label: 'Personal Email', value: currentUser.personalEmail, icon: Mail },
                    { label: 'Personal Mobile', value: currentUser.phone || currentUser.personalMobile, icon: Phone },
                    { label: 'Alternate Contact', value: currentUser.alternatePhone || currentUser.alternateContact, icon: Phone }
                  ]}
                />

                {/* CURRENT ADDRESS */}
                <AddressCard
                  title="Current Address"
                  address={currentAddrObj}
                  fallbackString={currentAddrFallback}
                />

                {/* PERMANENT ADDRESS */}
                <AddressCard
                  title="Permanent Address"
                  address={permAddrObj}
                  fallbackString={permAddrFallback}
                  isSameBadge={isSameAddress}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==================== 4. FOOTER ==================== */}
      <div className="profile-footer-panel">
        <div className="footer-meta-fields">
          <div className="footer-meta-field">Employee ID: <span>{currentUser.employeeId || currentUser.id || '—'}</span></div>
          <div className="footer-meta-field">Department: <span>{currentUser.department || '—'}</span></div>
          <div className="footer-meta-field">Branch Placement: <span>{currentUser.branch || '—'}</span></div>
          <div className="footer-meta-field">Profile Completion: <span>{completionPercentage}%</span></div>
        </div>
        <div className="footer-meta-fields">
          <div className="footer-status-indicator">
            <span className="status-dot-green"></span>
            Account Status: <span>Active</span>
          </div>
          <div className="footer-status-indicator">
            <span className="status-dot-green"></span>
            Security Status: <span>Protected</span>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        title="Choose Export Format"
        size="md"
      >
        <div className="export-options-grid">
          <div className="export-option-card" onClick={handleDownloadDataJSON}>
            <div className="export-option-icon json-icon">
              <FileCode size={24} />
            </div>
            <div className="export-option-details">
              <h4>JSON Data Format</h4>
              <p>Raw profile structure. Perfect for developer exports, backups, or machine readability.</p>
            </div>
            <div className="export-option-action">
              <Download size={16} />
            </div>
          </div>

          <div className="export-option-card" onClick={handleDownloadPDF}>
            <div className="export-option-icon pdf-icon">
              <FileText size={24} />
            </div>
            <div className="export-option-details">
              <h4>PDF Document</h4>
              <p>Print-ready, beautifully styled report layout. Ideal for printing or official archives.</p>
            </div>
            <div className="export-option-action">
              <Download size={16} />
            </div>
          </div>

          <div className="export-option-card" onClick={handleDownloadWord}>
            <div className="export-option-icon word-icon">
              <File size={24} />
            </div>
            <div className="export-option-details">
              <h4>MS Word Document</h4>
              <p>Microsoft Word compatible document (.doc). Ideal for offline editing and documentation.</p>
            </div>
            <div className="export-option-action">
              <Download size={16} />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MyProfile;
