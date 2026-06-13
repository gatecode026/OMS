import { useState, useMemo } from 'react';
import './MyProfile.css';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import Button from '../components/common/Button';
import Avatar from '../components/common/Avatar';
import Skeleton from '../components/common/Skeleton';
import {
  User, Mail, Phone, MapPin, Briefcase, Shield, Clock,
  Lock, Check, Download, Share2, Globe, Building, Cpu
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
  return (
    <div className="profile-hero-card">
      <div className="hero-card-banner" />
      <div className="hero-card-content">
        <div className="hero-left-col">
          <div className="hero-avatar-glow">
            {user.photoUrl ? (
              <img src={user.photoUrl} alt={user.name} />
            ) : (
              <Avatar name={user.name} size="xl" src={user.avatar} />
            )}
          </div>
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
  return (
    <div className="professional-info-card">
      <h4><Briefcase size={16} /> Professional Placement</h4>
      <div className="info-table-grid">
        {[
          { label: 'Employee ID', value: user.employeeId || user.id || '—', icon: Shield },
          { label: 'Designation', value: user.designation || '—', icon: User },
          { label: 'Department', value: user.department || '—', icon: Building },
          { label: 'Team Name', value: user.team || '—', icon: User },
          { label: 'Reporting Team Leader', value: user.teamLeader || '—', icon: User },
          { label: 'Reporting Project Manager', value: user.projectManager || '—', icon: User },
          { label: 'Office Location', value: user.branch || '—', icon: MapPin },
          { label: 'Employment Type', value: user.employeeType || '—', icon: Briefcase },
        ].map((cell, idx) => {
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
    addToast
  } = useApp();

  // Active Tab state for form panels
  const [activeTab, setActiveTab] = useState('personal'); // personal, contact

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
  };

  const handleShareProfile = () => {
    if (!currentUser) return;
    const shareUrl = `${window.location.origin}/employees/${currentUser.id}`;
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

  const isSameAddress = currentUser.permanentAddress === currentUser.currentAddress;

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
          <Button variant="secondary" icon={Download} onClick={handleDownloadDataJSON}>
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
    </div>
  );
};

export default MyProfile;
