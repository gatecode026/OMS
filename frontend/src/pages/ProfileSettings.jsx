import React, { useState, useEffect } from 'react';
import './ProfileSettings.css';
import { useApp } from '../context/AppContext';
import Button from '../components/common/Button';
import Avatar from '../components/common/Avatar';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import {
  User, Edit2, Save, Camera, Mail, Phone, MapPin, Calendar,
  Briefcase, Shield, Key, Clock, CheckCircle, Globe, Lock,
  Bell, Eye, Monitor, FileText, Zap, ChevronDown, Check,
  Search, Download, Trash, AlertTriangle, ShieldAlert, Cpu,
  Laptop, Smartphone, FileUp, X, RefreshCw
} from 'lucide-react';

const ProfileSettings = () => {
  const {
    currentUser,
    currentUserRole,
    setCurrentUserRole,
    employees,
    updateEmployee,
    addToast,
    theme,
    setThemeMode,
    accentColor,
    setAccentColor,
    fontSize,
    setFontSize,
    sidebarDense,
    setSidebarDense,
    generalSettings,
    setGeneralSettings,
    notificationSettings,
    setNotificationSettings,
    securitySettings,
    setSecuritySettings,
    activityLogs,
    addActivityLog,
    roles,
    showConfirm
  } = useApp();

  // Active Tab state
  const [activeTab, setActiveTab] = useState('overview');

  // Form Editing States
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState(false);

  // Form fields states
  const [personalForm, setPersonalForm] = useState({
    name: '',
    username: '',
    email: '',
    personalEmail: '',
    phone: '',
    dob: '',
    maritalStatus: 'Single',
    nationality: 'Indian',
    currentAddress: '',
    permanentAddress: '',
    city: 'Jaipur',
    state: 'Rajasthan',
    country: 'India'
  });

  const [professionalForm, setProfessionalForm] = useState({
    designation: '',
    department: '',
    branch: '',
    joinDate: '',
    employmentType: 'Full-Time',
    probationEndDate: '',
    contractEndDate: '',
    employmentStatus: 'Confirmed',
    bankName: '',
    bankAccountNumber: '',
    bankIfscCode: '',
    bankUpiId: ''
  });

  // Password fields state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // MFA settings local state
  const [mfaEnabled, setMfaEnabled] = useState(false);

  // Local Sessions state
  const [sessions, setSessions] = useState([
    { id: 'sess-1', device: 'Windows 11 PC - Chrome', ip: '192.168.1.15', location: 'Jaipur, India', status: 'Active Now', lastActive: 'Just now', icon: Laptop },
    { id: 'sess-2', device: 'iPhone 15 - Safari App', ip: '103.88.22.41', location: 'Mumbai, India', status: 'Active', lastActive: '2 hours ago', icon: Smartphone },
    { id: 'sess-3', device: 'macOS - Firefox', ip: '185.190.140.2', location: 'Delhi, India', status: 'Idle', lastActive: '1 day ago', icon: Laptop },
  ]);

  // Local Documents state
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [docCategoryFilter, setDocCategoryFilter] = useState('All');

  // Activity log search and filter states
  const [logSearch, setLogSearch] = useState('');
  const [logModuleFilter, setLogModuleFilter] = useState('All');
  const [logStatusFilter, setLogStatusFilter] = useState('All');

  // Emergency Control search
  const [emergencyUserSearch, setEmergencyUserSearch] = useState('');
  const [selectedImpersonateUser, setSelectedImpersonateUser] = useState('');

  // Modals visibility states
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isMfaModalOpen, setIsMfaModalOpen] = useState(false);
  const [isUploadDocModalOpen, setIsUploadDocModalOpen] = useState(false);
  const [isOrgChartOpen, setIsOrgChartOpen] = useState(false);
  const [selectedSessionDetails, setSelectedSessionDetails] = useState(null);
  const [selectedActivityDetails, setSelectedActivityDetails] = useState(null);

  // MFA Setup wizard states
  const [mfaCode, setMfaCode] = useState('');
  const [mfaVerifyError, setMfaVerifyError] = useState('');

  // Upload Document form state
  const [uploadDocForm, setUploadDocForm] = useState({
    category: 'Identity',
    fileName: '',
    fileSize: '—',
    remarks: '',
    fileData: ''
  });

  // Sync Form States when Current User changes
  useEffect(() => {
    if (currentUser) {
      setPersonalForm({
        name: currentUser.name || '',
        username: currentUser.username || currentUser.name?.toLowerCase().replace(/ /g, '_') || '',
        email: currentUser.email || currentUser.officialEmail || '',
        personalEmail: currentUser.personalEmail || '',
        phone: currentUser.phone || currentUser.contactNumber || '',
        dob: currentUser.dob || '',
        maritalStatus: currentUser.maritalStatus || 'Single',
        nationality: currentUser.nationality || 'Indian',
        currentAddress: currentUser.currentAddress || '',
        permanentAddress: currentUser.permanentAddress || '',
        city: currentUser.city || 'Jaipur',
        state: currentUser.state || 'Rajasthan',
        country: currentUser.country || 'India'
      });

      setProfessionalForm({
        designation: currentUser.designation || '',
        department: currentUser.department || '',
        branch: currentUser.branch || '',
        joinDate: currentUser.joinDate || '',
        employmentType: currentUser.employmentType || 'Full-Time',
        probationEndDate: currentUser.probationEndDate || '',
        contractEndDate: currentUser.contractEndDate || '',
        employmentStatus: currentUser.employmentStatus || 'Confirmed',
        bankName: currentUser.bankName || '',
        bankAccountNumber: currentUser.bankAccountNumber || '',
        bankIfscCode: currentUser.bankIfscCode || '',
        bankUpiId: currentUser.bankUpiId || ''
      });

      setMfaEnabled(currentUser.securityInfo?.mfaStatus === 'Enabled');

      // Load documents from mock data if available
      if (currentUser.documents) {
        setUploadedDocs(currentUser.documents);
      }
    }
  }, [currentUser]);

  // Determine Tab list based on active user role
  const allTabs = [
    { id: 'overview', label: 'Overview', icon: User, roles: ['super_admin', 'dept_admin', 'branch_admin', 'project_manager', 'team_leader', 'employee'] },
    { id: 'personal', label: 'Personal Info', icon: User, roles: ['super_admin', 'dept_admin', 'branch_admin', 'project_manager', 'team_leader', 'employee'] },
    { id: 'professional', label: 'Professional Info', icon: Briefcase, roles: ['super_admin', 'dept_admin', 'branch_admin', 'project_manager', 'team_leader', 'employee'] },
    { id: 'security', label: 'Security', icon: Shield, roles: ['super_admin', 'dept_admin', 'branch_admin', 'project_manager', 'team_leader', 'employee'] },
    { id: 'notifications', label: 'Notifications', icon: Bell, roles: ['super_admin', 'dept_admin', 'branch_admin', 'project_manager', 'team_leader', 'employee'] },
    { id: 'appearance', label: 'Appearance', icon: Eye, roles: ['super_admin', 'dept_admin', 'branch_admin', 'project_manager', 'team_leader', 'employee'] },
    { id: 'sessions', label: 'Active Sessions', icon: Monitor, roles: ['super_admin', 'dept_admin', 'branch_admin', 'project_manager', 'team_leader', 'employee'] },
    { id: 'activity', label: 'Activity Logs', icon: Clock, roles: ['super_admin', 'dept_admin', 'branch_admin', 'team_leader'] }, // Excluded for PM, Employee
    { id: 'documents', label: 'Documents', icon: FileText, roles: ['super_admin', 'dept_admin', 'branch_admin', 'project_manager', 'team_leader', 'employee'] },
    { id: 'emergency', label: 'Emergency Controls', icon: Zap, roles: ['super_admin'] },
    { id: 'special', label: 'Special Access', icon: Key, roles: ['super_admin'] },
  ];

  const visibleTabs = allTabs.filter(tab => tab.roles.includes(currentUserRole));

  const getBannerImage = () => {
    const banners = {
      super_admin: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1964&auto=format&fit=crop", // Wavy purple
      dept_admin: "https://images.unsplash.com/photo-1618005198143-e5283b519a7f?q=80&w=1964&auto=format&fit=crop", // Teal mesh
      branch_admin: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=1964&auto=format&fit=crop", // Blue-yellow abstract
      project_manager: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=1964&auto=format&fit=crop", // Red-orange energy
      team_leader: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1964&auto=format&fit=crop", // Dark minimal abstract
      employee: "https://images.unsplash.com/photo-1604871000636-074fa5117945?q=80&w=1964&auto=format&fit=crop" // Green-violet gradient
    };
    return banners[currentUserRole] || banners.employee;
  };

  // Ensure current tab is valid for the active role (fallback to overview if role changed)
  useEffect(() => {
    if (!visibleTabs.some(t => t.id === activeTab)) {
      setActiveTab('overview');
    }
  }, [currentUserRole, activeTab, visibleTabs]);

  // Form Save Handlers
  const handleSavePersonal = () => {
    if (currentUser?.id) {
      updateEmployee(currentUser.id, {
        name: personalForm.name,
        username: personalForm.username,
        personalEmail: personalForm.personalEmail,
        phone: personalForm.phone,
        dob: personalForm.dob,
        maritalStatus: personalForm.maritalStatus,
        nationality: personalForm.nationality,
        currentAddress: personalForm.currentAddress,
        permanentAddress: personalForm.permanentAddress,
        city: personalForm.city,
        state: personalForm.state,
        country: personalForm.country
      });
      addActivityLog('Updated Personal profile details', 'Profile');
    }
    setEditingPersonal(false);
  };

  const handleSaveProfessional = () => {
    if (currentUser?.id) {
      updateEmployee(currentUser.id, {
        designation: professionalForm.designation,
        department: professionalForm.department,
        branch: professionalForm.branch,
        joinDate: professionalForm.joinDate,
        employmentType: professionalForm.employmentType,
        probationEndDate: professionalForm.probationEndDate,
        contractEndDate: professionalForm.contractEndDate,
        employmentStatus: professionalForm.employmentStatus,
        bankName: professionalForm.bankName,
        bankAccountNumber: professionalForm.bankAccountNumber,
        bankIfscCode: professionalForm.bankIfscCode,
        bankUpiId: professionalForm.bankUpiId
      });
      addActivityLog('Updated Professional/Employment profile details', 'Profile');
    }
    setEditingProfessional(false);
  };

  // Password strength checker helper
  const getPasswordStrength = () => {
    const pass = passwordForm.newPassword;
    if (!pass) return '';
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    if (score <= 2) return 'weak';
    if (score === 3) return 'medium';
    return 'strong';
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!passwordForm.currentPassword) {
      addToast('error', 'Current password is required.');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      addToast('error', 'New password must be at least 8 characters long.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      addToast('error', 'Passwords do not match.');
      return;
    }

    addActivityLog('Changed user account password', 'Security');
    addToast('success', 'Password updated successfully!');
    setIsChangePasswordModalOpen(false);
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  // MFA toggle handler
  const handleMfaToggle = (e) => {
    const checked = e.target.checked;
    if (checked) {
      setMfaVerifyError('');
      setMfaCode('');
      setIsMfaModalOpen(true);
    } else {
      showConfirm(
        'Disable Multi-Factor Authentication',
        'Are you sure you want to disable MFA? Your account will be less secure.',
        () => {
          setMfaEnabled(false);
          if (currentUser?.id) {
            updateEmployee(currentUser.id, {
              securityInfo: {
                ...currentUser.securityInfo,
                mfaStatus: 'Disabled'
              }
            });
          }
          addActivityLog('Disabled Multi-Factor Authentication', 'Security', 'warning');
          addToast('warning', 'MFA has been disabled.');
        }
      );
    }
  };

  const verifyAndEnableMfa = () => {
    if (mfaCode.length !== 6 || isNaN(Number(mfaCode))) {
      setMfaVerifyError('Please enter a valid 6-digit verification code.');
      return;
    }

    // Success simulation
    setMfaEnabled(true);
    if (currentUser?.id) {
      updateEmployee(currentUser.id, {
        securityInfo: {
          ...currentUser.securityInfo,
          mfaStatus: 'Enabled'
        }
      });
    }
    addActivityLog('Enabled Multi-Factor Authentication (MFA)', 'Security');
    addToast('success', 'MFA enabled and verified successfully!');
    setIsMfaModalOpen(false);
  };

  // Active Sessions Actions
  const handleRevokeSession = (sessionId, device) => {
    showConfirm(
      'Terminate Session',
      `Are you sure you want to end the session for ${device}?`,
      () => {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        addActivityLog(`Revoked active device session: ${device}`, 'Security');
        addToast('success', `Session terminated for ${device}.`);
      }
    );
  };

  const handleLogoutAllOther = () => {
    showConfirm(
      'Logout of All Other Devices',
      'This will close all your sessions except the current active one.',
      () => {
        setSessions(prev => prev.filter(s => s.status.includes('Active Now')));
        addActivityLog('Terminated all other active user sessions', 'Security');
        addToast('success', 'Logged out of all other sessions.');
      }
    );
  };

  // Profile Avatar upload (FileReader functional)
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        addToast('error', 'Please upload a valid image file.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        updateEmployee(currentUser.id, { avatar: reader.result });
        addActivityLog('Uploaded new profile photo', 'Profile');
        addToast('success', 'Profile photo updated successfully!');
      };
      reader.readAsDataURL(file);
    }
  };

  // Document Upload handlers (FileReader functional)
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadDocForm(prev => ({
          ...prev,
          fileName: file.name,
          fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          fileData: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadDocSubmit = (e) => {
    e.preventDefault();
    if (!uploadDocForm.fileName) {
      addToast('error', 'Please select a file to upload.');
      return;
    }

    const newDoc = {
      id: `DOC-NEW-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      category: uploadDocForm.category,
      fileName: uploadDocForm.fileName,
      uploadDate: new Date().toISOString().split('T')[0],
      fileType: uploadDocForm.fileName.endsWith('.jpg') || uploadDocForm.fileName.endsWith('.png') ? 'image' : 'pdf',
      downloadUrl: uploadDocForm.fileData
    };

    const updated = [newDoc, ...uploadedDocs];
    setUploadedDocs(updated);
    if (currentUser?.id) {
      updateEmployee(currentUser.id, { documents: updated });
    }

    addActivityLog(`Uploaded new document: ${newDoc.fileName} (${newDoc.category})`, 'Documents');
    addToast('success', 'Document uploaded successfully!');
    setIsUploadDocModalOpen(false);
    setUploadDocForm({ category: 'Identity', fileName: '', fileSize: '—', remarks: '', fileData: '' });
  };

  const handleDownloadDoc = (doc) => {
    if (doc.downloadUrl && doc.downloadUrl !== '#') {
      const link = document.createElement('a');
      link.href = doc.downloadUrl;
      link.download = doc.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast('success', `Downloading ${doc.fileName}...`);
    } else {
      // Dynamic fallback for mock preloaded items - generates actual text download
      const sampleText = `Office Management Enterprise System\nDocument File: ${doc.fileName}\nCategory: ${doc.category}\nUpload Date: ${doc.uploadDate}\n\nThis is a dynamically reconstructed file for download verification.`;
      const blob = new Blob([sampleText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.fileName.replace(/\.[^/.]+$/, "") + ".txt";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addToast('success', `Downloaded verification file for ${doc.fileName}`);
    }
  };

  const handleDeleteDoc = (docId, fileName) => {
    showConfirm(
      'Delete Document',
      `Are you sure you want to permanently delete the document: ${fileName}?`,
      () => {
        const updated = uploadedDocs.filter(d => d.id !== docId);
        setUploadedDocs(updated);
        if (currentUser?.id) {
          updateEmployee(currentUser.id, { documents: updated });
        }
        addActivityLog(`Deleted document: ${fileName}`, 'Documents', 'warning');
        addToast('warning', `Document deleted: ${fileName}`);
      }
    );
  };

  // Activity Log filtering logic
  const filteredActivityLogs = activityLogs.filter(log => {
    // 1. Role boundaries for logs access
    if (currentUserRole === 'employee' || currentUserRole === 'project_manager') {
      // Employees and PMs only see their own logs
      if (log.employeeName !== currentUser?.name) return false;
    } else if (currentUserRole === 'team_leader') {
      // Team leaders see their own team's logs or logs in their department
      if (log.department !== currentUser?.department && log.employeeName !== currentUser?.name) return false;
    } else if (currentUserRole === 'dept_admin') {
      // Department admins see logs inside their department
      if (log.department !== currentUser?.department) return false;
    } else if (currentUserRole === 'branch_admin') {
      // Branch admins see all logs (simulated: full branch list)
      // No filter, full access
    }

    // 2. Search query filter
    if (logSearch) {
      const q = logSearch.toLowerCase();
      const matchAction = log.action.toLowerCase().includes(q);
      const matchModule = log.module.toLowerCase().includes(q);
      const matchName = log.employeeName.toLowerCase().includes(q);
      if (!matchAction && !matchModule && !matchName) return false;
    }

    // 3. Module filter
    if (logModuleFilter !== 'All') {
      if (log.module !== logModuleFilter) return false;
    }

    // 4. Status filter
    if (logStatusFilter !== 'All') {
      if (log.status !== logStatusFilter) return false;
    }

    return true;
  });

  // Hierarchy chart structural resolution
  const getOrgStructure = () => {
    if (!currentUser) return { manager: null, leader: null, peers: [] };
    
    // Find manager (Project Manager)
    const pmName = currentUser.projectManager;
    const manager = employees.find(e => e.name === pmName && e.roleId === 'project_manager') || 
                    employees.find(e => e.roleId === 'project_manager') || 
                    { name: pmName || 'Aarav Sharma', role: 'Project Manager', designation: 'Engineering Director' };

    // Find team leader
    const tlName = currentUser.teamLeader;
    const leader = employees.find(e => e.name === tlName && e.roleId === 'team_leader') || 
                   employees.find(e => e.roleId === 'team_leader') || 
                   { name: tlName || 'Ananya Gupta', role: 'Team Leader', designation: 'Senior Team Lead' };

    // Find peers (colleagues in same department / branch, excluding yourself, leader and manager)
    const peers = employees.filter(e => 
      e.department === currentUser.department && 
      e.id !== currentUser.id && 
      e.id !== leader.id && 
      e.id !== manager.id
    ).slice(0, 4);

    return { manager, leader, peers };
  };

  // Emergency controls impersonation handler
  const handleImpersonateClick = () => {
    if (!selectedImpersonateUser) {
      addToast('error', 'Please select a user to impersonate.');
      return;
    }
    const match = employees.find(e => e.id === selectedImpersonateUser);
    if (match) {
      setCurrentUserRole(match.roleId);
      addToast('success', `Impersonating ${match.name} (${match.role}). Click top-right to switch back.`);
      addActivityLog(`Super Admin impersonated user: ${match.name}`, 'Administration');
    }
  };

  const handleGlobalLockdown = () => {
    showConfirm(
      'System-Wide Security Lockdown',
      'WARNING: This will immediately invalidate all other active sessions and trigger security alerts.',
      () => {
        addActivityLog('System-wide security lockdown triggered by Super Admin', 'Security', 'danger');
        addToast('error', 'Global Lockdown activated! All other active sessions terminated.');
        setSessions(prev => prev.filter(s => s.status.includes('Active Now')));
      },
      'danger'
    );
  };

  const toggleUserLockStatus = (userId, name, currentStatus) => {
    const nextStatus = currentStatus === 'Disabled' ? 'Active' : 'Disabled';
    const actionText = nextStatus === 'Disabled' ? 'Lock Account' : 'Unlock Account';
    showConfirm(
      `${actionText} for ${name}`,
      `Are you sure you want to set status to ${nextStatus} for ${name}?`,
      () => {
        updateEmployee(userId, { status: nextStatus, accountStatus: nextStatus });
        addActivityLog(`${actionText} for employee: ${name}`, 'Administration', nextStatus === 'Disabled' ? 'warning' : 'success');
        addToast(nextStatus === 'Disabled' ? 'warning' : 'success', `${name} account is now ${nextStatus}.`);
      }
    );
  };

  // Profile completion timeline items
  const profileCompletionItems = [
    { title: 'Personal Information', completed: !!personalForm.name && !!personalForm.phone, desc: 'Contact details, address info.' },
    { title: 'Employment Metadata', completed: !!professionalForm.designation && !!professionalForm.department, desc: 'Designation, department placement.' },
    { title: 'Payment Credentials', completed: !!professionalForm.bankAccountNumber && !!professionalForm.bankIfscCode, desc: 'IFSC code and bank account.' },
    { title: 'Multi-Factor Setup', completed: mfaEnabled, desc: 'Activate 2FA security layer.' },
    { title: 'Documents Audit', completed: uploadedDocs.length > 0, desc: 'Upload professional identity credentials.' },
  ];

  const profileCompletionPercentage = Math.round(
    (profileCompletionItems.filter(i => i.completed).length / profileCompletionItems.length) * 100
  );

  return (
    <div className="profile-settings-page">
      {/* Hidden inputs for functional uploads */}
      <input
        type="file"
        id="avatar-upload-input"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleAvatarChange}
      />

      {/* Page Header */}
      <div className="profile-page-header">
        <div className="profile-header-title-section">
          <div className="profile-header-title-row">
            <h2>Profile Settings &amp; Account Management</h2>
            <span className="security-badge">
              <Lock size={12} /> Personal Account Management Center
            </span>
          </div>
          <span className="profile-header-subtitle">
            Manage your personal data, professional details, notifications, appearance, active sessions, and security keys.
          </span>
        </div>
        <div className="profile-header-actions">
          {activeTab === 'personal' && (
            editingPersonal ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => setEditingPersonal(false)}>Cancel</Button>
                <Button variant="primary" size="sm" icon={Save} onClick={handleSavePersonal}>Save Personal Info</Button>
              </>
            ) : (
              <Button variant="secondary" size="sm" icon={Edit2} onClick={() => setEditingPersonal(true)}>Edit Personal Info</Button>
            )
          )}
          {activeTab === 'professional' && currentUserRole === 'super_admin' && (
            editingProfessional ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => setEditingProfessional(false)}>Cancel</Button>
                <Button variant="primary" size="sm" icon={Save} onClick={handleSaveProfessional}>Save Professional Info</Button>
              </>
            ) : (
              <Button variant="secondary" size="sm" icon={Edit2} onClick={() => setEditingProfessional(true)}>Edit Professional Info</Button>
            )
          )}
          <Button variant="danger" size="sm" icon={Key} onClick={() => setIsChangePasswordModalOpen(true)}>
            Change Password
          </Button>
        </div>
      </div>

      {/* 6 Top Summary Cards */}
      <div className="profile-stats-row">
        {/* Profile Completion */}
        <div className="profile-stat-card border-bottom-primary">
          <div className="stat-card-header">
            <span className="stat-label">Profile Completion</span>
            <div className="stat-icon-wrap"><CheckCircle size={16} /></div>
          </div>
          <span className="stat-value">{profileCompletionPercentage}%</span>
          <div className="stat-footer">
            {profileCompletionPercentage === 100 ? 'All tasks complete' : 'Fields missing details'}
          </div>
        </div>

        {/* Security Score */}
        <div className="profile-stat-card border-bottom-success">
          <div className="stat-card-header">
            <span className="stat-label">Security Status</span>
            <div className="stat-icon-wrap"><Shield size={16} /></div>
          </div>
          <span className="stat-value">{mfaEnabled ? '98%' : '70%'}</span>
          <div className="stat-footer">
            {mfaEnabled ? 'MFA setup verified' : 'MFA is disabled'}
          </div>
        </div>

        {/* Last Login time */}
        <div className="profile-stat-card border-bottom-info">
          <div className="stat-card-header">
            <span className="stat-label">Last Login</span>
            <div className="stat-icon-wrap"><Clock size={16} /></div>
          </div>
          <span className="stat-value" style={{ fontSize: '1.05rem', marginTop: '4px' }}>
            {currentUser?.securityInfo?.lastLogin || 'Just now'}
          </span>
          <div className="stat-footer" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentUser?.securityInfo?.loginDevice || 'Windows 11'}
          </div>
        </div>

        {/* Active Sessions count */}
        <div className="profile-stat-card border-bottom-warning">
          <div className="stat-card-header">
            <span className="stat-label">Active Sessions</span>
            <div className="stat-icon-wrap"><Monitor size={16} /></div>
          </div>
          <span className="stat-value">{sessions.length} Devices</span>
          <div className="stat-footer">
            Across locations
          </div>
        </div>

        {/* Account Status */}
        <div className="profile-stat-card border-bottom-purple">
          <div className="stat-card-header">
            <span className="stat-label">Account Status</span>
            <div className="stat-icon-wrap"><User size={16} /></div>
          </div>
          <div>
            <span className={`badge-status ${currentUser?.status === 'Active' ? 'active' : currentUser?.status === 'Disabled' ? 'disabled' : 'suspended'}`}>
              {currentUser?.status || 'Active'}
            </span>
          </div>
          <div className="stat-footer">
            Status: {currentUser?.status || 'Active'}
          </div>
        </div>

        {/* Current Role */}
        <div className="profile-stat-card border-bottom-danger">
          <div className="stat-card-header">
            <span className="stat-label">Current Role</span>
            <div className="stat-icon-wrap"><ShieldAlert size={16} /></div>
          </div>
          <span className="stat-value" style={{ fontSize: '1.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentUser?.role || 'User'}
          </span>
          <div className="stat-footer">
            Dept: {currentUser?.department || 'Staff'}
          </div>
        </div>
      </div>

      {/* Tabs list bar */}
      <div className="tab-bar-card">
        <div className="profile-tabs-list">
          {visibleTabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Render */}
      <div className="profile-content-container">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="profile-grid-two-columns">
            {/* Left Col - Profile details and Completion checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="profile-hero-section">
                <div className="profile-hero-banner">
                  <div className="profile-hero-overlay" />
                  <img
                    src={getBannerImage()}
                    alt="Cover"
                    className="profile-hero-banner-image"
                  />
                </div>
                <div className="profile-hero-body">
                  <div className="profile-hero-avatar-wrap" style={{ width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '50%', background: 'var(--bg-card)', border: '4px solid var(--bg-card)' }}>
                    {currentUser?.avatar ? (
                      <img src={currentUser.avatar} alt={currentUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Avatar name={currentUser?.name} size="2xl" />
                    )}
                    <button className="avatar-edit-overlay" title="Update Profile Photo" onClick={() => document.getElementById('avatar-upload-input').click()}>
                      <Camera size={14} />
                    </button>
                  </div>
                  <div className="profile-hero-meta-details" style={{ flex: 1, paddingLeft: '8px' }}>
                    <div className="profile-hero-name">{currentUser?.name}</div>
                    <div className="profile-hero-badge-row">
                      <span className="profile-hero-role-badge">{currentUser?.role}</span>
                      <span className="profile-hero-branch-badge">{currentUser?.branch} Office</span>
                    </div>
                    <div className="profile-hero-quick-stats">
                      <span><Mail size={13} /> {currentUser?.email}</span>
                      <span><Phone size={13} /> {currentUser?.phone}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="profile-card">
                <div className="profile-card-title-section">
                  <div className="profile-card-title"><CheckCircle size={16} /> Profile Completion Checklist</div>
                  <span className="profile-card-subtitle">{profileCompletionPercentage}% Complete</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {profileCompletionItems.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <div style={{ color: item.completed ? 'var(--color-success)' : 'var(--text-muted)' }}>
                        <CheckCircle size={18} fill={item.completed ? 'rgba(16,185,129,0.1)' : 'none'} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', textDecoration: item.completed ? 'line-through' : 'none', opacity: item.completed ? 0.7 : 1 }}>
                          {item.title}
                        </span>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{item.desc}</p>
                      </div>
                      <Badge variant={item.completed ? 'success' : 'secondary'} size="sm">
                        {item.completed ? 'Done' : 'Pending'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Col - Personal Activity log timeline & quick actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="profile-card">
                <div className="profile-card-title-section">
                  <div className="profile-card-title"><Clock size={16} /> Activity Timeline</div>
                  <span className="profile-card-subtitle">Your last 8 activities</span>
                </div>
                <div className="profile-timeline">
                  {activityLogs
                    .filter(log => log.employeeName === currentUser?.name)
                    .slice(0, 8)
                    .map((item, idx) => (
                      <div className="timeline-item" key={item.id || idx}>
                        <div className={`timeline-dot ${item.status || 'info'}`} />
                        <div className="timeline-content">
                          <div className="timeline-header">
                            <span className="timeline-title">{item.module}</span>
                            <span className="timeline-time">{item.timestamp}</span>
                          </div>
                          <p className="timeline-desc" style={{ margin: 0 }}>{item.action}</p>
                        </div>
                      </div>
                    ))}
                  {activityLogs.filter(log => log.employeeName === currentUser?.name).length === 0 && (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      No recent activities recorded.
                    </div>
                  )}
                </div>
              </div>

              <div className="profile-card">
                <div className="profile-card-title-section">
                  <div className="profile-card-title"><Zap size={16} /> Quick Actions</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <Button variant="secondary" onClick={() => setIsChangePasswordModalOpen(true)}>Change Password</Button>
                  <Button variant="secondary" onClick={() => setIsMfaModalOpen(true)}>Configure MFA Settings</Button>
                  <Button variant="ghost" onClick={() => setIsOrgChartOpen(true)}>View Organisation Chart</Button>
                  <Button variant="ghost" onClick={() => addToast('success', 'Profile data exported successfully!')}>Export Profile PDF</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PERSONAL INFO */}
        {activeTab === 'personal' && (
          <div className="profile-card">
            <div className="profile-card-title-section">
              <div className="profile-card-title"><User size={16} /> Personal Account Credentials</div>
              <span className="profile-card-subtitle">Manage details that represent you in communication files and directory sheets.</span>
            </div>
            
            <div className="form-grid">
              {/* Full Name */}
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  disabled={!editingPersonal}
                  value={personalForm.name}
                  onChange={e => setPersonalForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              {/* Username */}
              <div className="form-group">
                <label>Username {currentUserRole === 'employee' && '🔒 (Read-Only)'}</label>
                <input
                  type="text"
                  disabled={!editingPersonal || currentUserRole === 'employee'}
                  value={personalForm.username}
                  onChange={e => setPersonalForm(prev => ({ ...prev, username: e.target.value }))}
                />
              </div>

              {/* Official Email */}
              <div className="form-group">
                <label>Official Email {['employee', 'project_manager', 'team_leader'].includes(currentUserRole) && '🔒 (Read-Only)'}</label>
                <input
                  type="email"
                  disabled={!editingPersonal || ['employee', 'project_manager', 'team_leader'].includes(currentUserRole)}
                  value={personalForm.email}
                  onChange={e => setPersonalForm(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>

              {/* Personal Email */}
              <div className="form-group">
                <label>Personal Email</label>
                <input
                  type="email"
                  disabled={!editingPersonal}
                  value={personalForm.personalEmail}
                  onChange={e => setPersonalForm(prev => ({ ...prev, personalEmail: e.target.value }))}
                />
              </div>

              {/* Contact phone */}
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="text"
                  disabled={!editingPersonal}
                  value={personalForm.phone}
                  onChange={e => setPersonalForm(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>

              {/* Date of birth */}
              <div className="form-group">
                <label>Date of Birth</label>
                <input
                  type="date"
                  disabled={!editingPersonal}
                  value={personalForm.dob}
                  onChange={e => setPersonalForm(prev => ({ ...prev, dob: e.target.value }))}
                />
              </div>

              {/* Marital Status */}
              <div className="form-group">
                <label>Marital Status</label>
                <select
                  disabled={!editingPersonal}
                  value={personalForm.maritalStatus}
                  onChange={e => setPersonalForm(prev => ({ ...prev, maritalStatus: e.target.value }))}
                >
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>

              {/* Nationality */}
              <div className="form-group">
                <label>Nationality</label>
                <input
                  type="text"
                  disabled={!editingPersonal}
                  value={personalForm.nationality}
                  onChange={e => setPersonalForm(prev => ({ ...prev, nationality: e.target.value }))}
                />
              </div>

              {/* Current Address */}
              <div className="form-group form-group-full">
                <label>Current Address</label>
                <textarea
                  rows={2}
                  disabled={!editingPersonal}
                  value={personalForm.currentAddress}
                  onChange={e => setPersonalForm(prev => ({ ...prev, currentAddress: e.target.value }))}
                />
              </div>

              {/* Permanent Address */}
              <div className="form-group form-group-full">
                <label>Permanent Address</label>
                <textarea
                  rows={2}
                  disabled={!editingPersonal}
                  value={personalForm.permanentAddress}
                  onChange={e => setPersonalForm(prev => ({ ...prev, permanentAddress: e.target.value }))}
                />
              </div>

              {/* City */}
              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  disabled={!editingPersonal}
                  value={personalForm.city}
                  onChange={e => setPersonalForm(prev => ({ ...prev, city: e.target.value }))}
                />
              </div>

              {/* State */}
              <div className="form-group">
                <label>State</label>
                <input
                  type="text"
                  disabled={!editingPersonal}
                  value={personalForm.state}
                  onChange={e => setPersonalForm(prev => ({ ...prev, state: e.target.value }))}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PROFESSIONAL INFO */}
        {activeTab === 'professional' && (
          <div className="profile-card">
            <div className="profile-card-title-section">
              <div className="profile-card-title">
                <Briefcase size={16} /> Employment &amp; Financial Information
              </div>
              <span className="profile-card-subtitle">
                {currentUserRole === 'super_admin'
                  ? 'As Super Admin, you are authorized to edit professional metadata and bank details below.'
                  : 'Professional and bank details are read-only. Contact Operations to request changes.'}
              </span>
            </div>
            
            <div className="form-grid">
              {/* Designation */}
              <div className="form-group">
                <label>Designation</label>
                <input
                  type="text"
                  disabled={!editingProfessional || currentUserRole !== 'super_admin'}
                  value={professionalForm.designation}
                  onChange={e => setProfessionalForm(prev => ({ ...prev, designation: e.target.value }))}
                />
              </div>

              {/* Department */}
              <div className="form-group">
                <label>Department</label>
                <input
                  type="text"
                  disabled={!editingProfessional || currentUserRole !== 'super_admin'}
                  value={professionalForm.department}
                  onChange={e => setProfessionalForm(prev => ({ ...prev, department: e.target.value }))}
                />
              </div>

              {/* Branch */}
              <div className="form-group">
                <label>Branch</label>
                <input
                  type="text"
                  disabled={!editingProfessional || currentUserRole !== 'super_admin'}
                  value={professionalForm.branch}
                  onChange={e => setProfessionalForm(prev => ({ ...prev, branch: e.target.value }))}
                />
              </div>

              {/* Join date */}
              <div className="form-group">
                <label>Joining Date</label>
                <input
                  type="date"
                  disabled={!editingProfessional || currentUserRole !== 'super_admin'}
                  value={professionalForm.joinDate}
                  onChange={e => setProfessionalForm(prev => ({ ...prev, joinDate: e.target.value }))}
                />
              </div>

              {/* Employment type */}
              <div className="form-group">
                <label>Employment Type</label>
                <select
                  disabled={!editingProfessional || currentUserRole !== 'super_admin'}
                  value={professionalForm.employmentType}
                  onChange={e => setProfessionalForm(prev => ({ ...prev, employmentType: e.target.value }))}
                >
                  <option value="Full-Time">Full-Time</option>
                  <option value="Part-Time">Part-Time</option>
                  <option value="Contract">Contract</option>
                  <option value="Internship">Internship</option>
                </select>
              </div>

              {/* Probation End date */}
              <div className="form-group">
                <label>Probation End Date</label>
                <input
                  type="date"
                  disabled={!editingProfessional || currentUserRole !== 'super_admin'}
                  value={professionalForm.probationEndDate}
                  onChange={e => setProfessionalForm(prev => ({ ...prev, probationEndDate: e.target.value }))}
                />
              </div>

              {/* Contract End date */}
              <div className="form-group">
                <label>Contract End Date</label>
                <input
                  type="date"
                  disabled={!editingProfessional || currentUserRole !== 'super_admin'}
                  value={professionalForm.contractEndDate}
                  onChange={e => setProfessionalForm(prev => ({ ...prev, contractEndDate: e.target.value }))}
                />
              </div>

              {/* Employment Status */}
              <div className="form-group">
                <label>Employment Status</label>
                <select
                  disabled={!editingProfessional || currentUserRole !== 'super_admin'}
                  value={professionalForm.employmentStatus}
                  onChange={e => setProfessionalForm(prev => ({ ...prev, employmentStatus: e.target.value }))}
                >
                  <option value="Confirmed">Confirmed</option>
                  <option value="Probation">Probation</option>
                  <option value="Notice Period">Notice Period</option>
                </select>
              </div>

              <div className="form-group-full" style={{ borderTop: '1px solid var(--border-color)', marginTop: '16px', paddingTop: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.92rem', color: 'var(--text-primary)' }}>Bank &amp; Payment Details</h4>
              </div>

              {/* Bank name */}
              <div className="form-group">
                <label>Bank Name</label>
                <input
                  type="text"
                  disabled={!editingProfessional || currentUserRole !== 'super_admin'}
                  value={professionalForm.bankName}
                  onChange={e => setProfessionalForm(prev => ({ ...prev, bankName: e.target.value }))}
                />
              </div>

              {/* Bank Acc */}
              <div className="form-group">
                <label>Account Number</label>
                <input
                  type="text"
                  disabled={!editingProfessional || currentUserRole !== 'super_admin'}
                  value={professionalForm.bankAccountNumber}
                  onChange={e => setProfessionalForm(prev => ({ ...prev, bankAccountNumber: e.target.value }))}
                />
              </div>

              {/* Bank IFSC */}
              <div className="form-group">
                <label>IFSC Code</label>
                <input
                  type="text"
                  disabled={!editingProfessional || currentUserRole !== 'super_admin'}
                  value={professionalForm.bankIfscCode}
                  onChange={e => setProfessionalForm(prev => ({ ...prev, bankIfscCode: e.target.value }))}
                />
              </div>

              {/* Bank UPI ID */}
              <div className="form-group">
                <label>UPI ID</label>
                <input
                  type="text"
                  disabled={!editingProfessional || currentUserRole !== 'super_admin'}
                  value={professionalForm.bankUpiId}
                  onChange={e => setProfessionalForm(prev => ({ ...prev, bankUpiId: e.target.value }))}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SECURITY */}
        {activeTab === 'security' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="profile-card">
              <div className="profile-card-title-section">
                <div className="profile-card-title"><Shield size={16} /> Multi-Factor Authentication (MFA)</div>
                <span className="profile-card-subtitle">Secure your login workflow with 6-digit dynamic codes.</span>
              </div>
              <div className="options-list">
                <div className="option-item">
                  <div className="option-info">
                    <span className="option-title">Authenticator App Verification (MFA)</span>
                    <span className="option-desc">Use Google Authenticator or Microsoft Authenticator to generate verification codes.</span>
                  </div>
                  <div>
                    <label className="switch-control">
                      <input
                        type="checkbox"
                        checked={mfaEnabled}
                        onChange={handleMfaToggle}
                      />
                      <span className="switch-slider" />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="profile-card">
              <div className="profile-card-title-section">
                <div className="profile-card-title"><AlertTriangle size={16} /> Security Settings &amp; Login Rules</div>
                <span className="profile-card-subtitle">Manage automated rules to protect your workplace identity.</span>
              </div>
              <div className="options-list">
                <div className="option-item">
                  <div className="option-info">
                    <span className="option-title">Alert on Suspicious Logins</span>
                    <span className="option-desc">Send email notification if login is from a new device or location.</span>
                  </div>
                  <div>
                    <label className="switch-control">
                      <input
                        type="checkbox"
                        checked={securitySettings.loginAlerts}
                        onChange={e => setSecuritySettings({ ...securitySettings, loginAlerts: e.target.checked })}
                      />
                      <span className="switch-slider" />
                    </label>
                  </div>
                </div>

                <div className="option-item">
                  <div className="option-info">
                    <span className="option-title">Session Inactivity Timeout</span>
                    <span className="option-desc">Automatically sign out after period of inactivity.</span>
                  </div>
                  <div>
                    <select
                      style={{ padding: '6px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px' }}
                      value={securitySettings.sessionTimeout}
                      onChange={e => setSecuritySettings({ ...securitySettings, sessionTimeout: e.target.value })}
                    >
                      <option value="15 minutes">15 minutes</option>
                      <option value="30 minutes">30 minutes</option>
                      <option value="1 hour">1 hour</option>
                      <option value="4 hours">4 hours</option>
                      <option value="Never">Never</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div className="profile-card">
            <div className="profile-card-title-section">
              <div className="profile-card-title"><Bell size={16} /> Notification Channels &amp; Digests</div>
              <span className="profile-card-subtitle">Select when and where you want to be notified about workflow operations.</span>
            </div>

            <div className="options-list">
              <div className="option-item">
                <div className="option-info">
                  <span className="option-title">Email Notifications</span>
                  <span className="option-desc">Receive critical activity summaries on your official email address.</span>
                </div>
                <div>
                  <label className="switch-control">
                    <input
                      type="checkbox"
                      checked={notificationSettings.emailNotifs}
                      onChange={e => setNotificationSettings({ ...notificationSettings, emailNotifs: e.target.checked })}
                    />
                    <span className="switch-slider" />
                  </label>
                </div>
              </div>

              <div className="option-item">
                <div className="option-info">
                  <span className="option-title">Push Notifications</span>
                  <span className="option-desc">Show desktop slide notifications for updates on your tasks.</span>
                </div>
                <div>
                  <label className="switch-control">
                    <input
                      type="checkbox"
                      checked={notificationSettings.pushNotifs}
                      onChange={e => setNotificationSettings({ ...notificationSettings, pushNotifs: e.target.checked })}
                    />
                    <span className="switch-slider" />
                  </label>
                </div>
              </div>

              <div className="option-item">
                <div className="option-info">
                  <span className="option-title">Leave Request Updates</span>
                  <span className="option-desc">Notify on approval, rejection, or submission updates of leave requests.</span>
                </div>
                <div>
                  <label className="switch-control">
                    <input
                      type="checkbox"
                      checked={notificationSettings.leaveAlerts}
                      onChange={e => setNotificationSettings({ ...notificationSettings, leaveAlerts: e.target.checked })}
                    />
                    <span className="switch-slider" />
                  </label>
                </div>
              </div>

              <div className="option-item">
                <div className="option-info">
                  <span className="option-title">Weekly Productivity Digest</span>
                  <span className="option-desc">A weekly report summarizing tasks solved, attendance speed, and metrics.</span>
                </div>
                <div>
                  <label className="switch-control">
                    <input
                      type="checkbox"
                      checked={notificationSettings.weeklyDigest}
                      onChange={e => setNotificationSettings({ ...notificationSettings, weeklyDigest: e.target.checked })}
                    />
                    <span className="switch-slider" />
                  </label>
                </div>
              </div>

              {['super_admin', 'dept_admin', 'branch_admin'].includes(currentUserRole) && (
                <div className="option-item">
                  <div className="option-info">
                    <span className="option-title">Security Audit Events (Admin Only)</span>
                    <span className="option-desc">Receive real-time alerts on locked users, failed logins, and impersonations.</span>
                  </div>
                  <div>
                    <label className="switch-control">
                      <input
                        type="checkbox"
                        checked={notificationSettings.securityAlerts}
                        onChange={e => setNotificationSettings({ ...notificationSettings, securityAlerts: e.target.checked })}
                      />
                      <span className="switch-slider" />
                    </label>
                  </div>
                </div>
              )}

              <div className="option-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '12px' }}>
                <div className="option-info">
                  <span className="option-title">Quiet Hours / Do Not Disturb</span>
                  <span className="option-desc">Mute all non-critical notifications during your personal offline hours.</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', width: '100%' }}>
                  <select style={{ padding: '6px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px' }}>
                    <option>09:00 PM</option>
                    <option>10:00 PM</option>
                    <option>11:00 PM</option>
                    <option>12:00 AM</option>
                  </select>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>to</span>
                  <select style={{ padding: '6px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px' }}>
                    <option>07:00 AM</option>
                    <option>08:00 AM</option>
                    <option>09:00 AM</option>
                  </select>
                  <Button variant="ghost" size="sm" onClick={() => addToast('success', 'Quiet hours saved.')}>Save Interval</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: APPEARANCE */}
        {activeTab === 'appearance' && (
          <div className="profile-card">
            <div className="profile-card-title-section">
              <div className="profile-card-title"><Eye size={16} /> Theme &amp; Accessibility Preferences</div>
              <span className="profile-card-subtitle">Customise layouts, font sizing, and visual accent keys.</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Theme pick */}
              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>Display Mode</h4>
                <div className="theme-picker-grid">
                  <div className={`theme-card ${theme === 'light' ? 'active' : ''}`} onClick={() => setThemeMode('light')}>
                    <div className="theme-preview-circle light" />
                    <span>Light Mode</span>
                  </div>
                  <div className={`theme-card ${theme === 'dark' ? 'active' : ''}`} onClick={() => setThemeMode('dark')}>
                    <div className="theme-preview-circle dark" />
                    <span>Dark Mode</span>
                  </div>
                </div>
              </div>

              {/* Accent Picker */}
              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>Primary Accent Color</h4>
                <div className="accent-picker-row">
                  {[
                    { hex: '#d946ef', name: 'Magenta' },
                    { hex: '#2563eb', name: 'Royal Blue' },
                    { hex: '#10b981', name: 'Emerald' },
                    { hex: '#f59e0b', name: 'Amber' },
                    { hex: '#ef4444', name: 'Rose Red' },
                    { hex: '#8b5cf6', name: 'Amethyst Purple' }
                  ].map(colorSwatch => (
                    <button
                      key={colorSwatch.hex}
                      className={`accent-color-btn ${accentColor === colorSwatch.hex ? 'active' : ''}`}
                      style={{ backgroundColor: colorSwatch.hex }}
                      title={colorSwatch.name}
                      onClick={() => {
                        setAccentColor(colorSwatch.hex);
                        addToast('success', `Accent color changed to ${colorSwatch.name}`);
                      }}
                    >
                      {accentColor === colorSwatch.hex && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accessibility options */}
              <div className="form-grid">
                {/* Font Size */}
                <div className="form-group">
                  <label>Font Size</label>
                  <select
                    value={fontSize}
                    onChange={e => {
                      setFontSize(e.target.value);
                      addToast('success', `Font size set to ${e.target.value}`);
                    }}
                  >
                    <option value="small">Small (Dense Layout)</option>
                    <option value="medium">Medium (Standard)</option>
                    <option value="large">Large (Accessible)</option>
                  </select>
                </div>

                {/* Sidebar density */}
                <div className="form-group">
                  <label>Sidebar Dense Mode</label>
                  <select
                    value={sidebarDense ? 'dense' : 'default'}
                    onChange={e => {
                      setSidebarDense(e.target.value === 'dense');
                      addToast('success', `Dense Mode ${e.target.value === 'dense' ? 'Activated' : 'Deactivated'}`);
                    }}
                  >
                    <option value="default">Default Width (Standard)</option>
                    <option value="dense">Dense Width (Collapsed Icons)</option>
                  </select>
                </div>

                {/* Language selection */}
                <div className="form-group">
                  <label>Language Preference</label>
                  <select
                    value={generalSettings.language}
                    onChange={e => {
                      setGeneralSettings({ ...generalSettings, language: e.target.value });
                      addToast('success', `Language changed to ${e.target.value}`);
                    }}
                  >
                    <option value="English (IN)">English (IN)</option>
                    <option value="English (US)">English (US)</option>
                    <option value="Hindi (हिन्दी)">Hindi (हिन्दी)</option>
                    <option value="Japanese (日本語)">Japanese (日本語)</option>
                    <option value="French (Français)">French (Français)</option>
                    <option value="German (Deutsch)">German (Deutsch)</option>
                  </select>
                </div>

                {/* Timezone */}
                <div className="form-group">
                  <label>Preferred Timezone</label>
                  <select
                    value={generalSettings.timezone}
                    onChange={e => {
                      setGeneralSettings({ ...generalSettings, timezone: e.target.value });
                      addToast('success', `Timezone configured to ${e.target.value}`);
                    }}
                  >
                    <option value="IST (UTC+5:30)">IST (UTC+5:30) - Delhi, Mumbai</option>
                    <option value="GMT (UTC+0:00)">GMT (UTC+0:00) - London</option>
                    <option value="EST (UTC-5:00)">EST (UTC-5:00) - New York</option>
                    <option value="PST (UTC-8:00)">PST (UTC-8:00) - Los Angeles</option>
                    <option value="JST (UTC+9:00)">JST (UTC+9:00) - Tokyo</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: ACTIVE SESSIONS */}
        {activeTab === 'sessions' && (
          <div className="profile-card">
            <div className="profile-card-title-section" style={{ flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div className="profile-card-title"><Monitor size={16} /> Device Session Control Panel</div>
                <span className="profile-card-subtitle">Review active logins and terminate sessions of misplaced devices.</span>
              </div>
              <Button variant="danger" size="sm" onClick={handleLogoutAllOther}>
                Logout of All Other Devices
              </Button>
            </div>

            <div className="table-wrapper">
              <table className="profile-table">
                <thead>
                  <tr>
                    <th>Device/Agent</th>
                    <th>IP Address</th>
                    <th>Location</th>
                    <th>Last Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(s => {
                    const DeviceIcon = s.icon;
                    return (
                      <tr key={s.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <DeviceIcon size={16} style={{ color: 'var(--text-muted)' }} />
                            <div>
                              <span style={{ fontWeight: 600 }}>{s.device}</span>
                              {s.status === 'Active Now' && (
                                <span style={{ marginLeft: '6px', fontSize: '0.7rem', padding: '1px 4px', background: 'var(--color-primary-light)', color: 'var(--color-primary)', borderRadius: '4px', fontWeight: 'bold' }}>
                                  Current
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td><code>{s.ip}</code></td>
                        <td>{s.location}</td>
                        <td>{s.lastActive}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedSessionDetails(s)}>Details</Button>
                            {s.status !== 'Active Now' && (
                              <Button variant="danger" size="sm" onClick={() => handleRevokeSession(s.id, s.device)}>Revoke</Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 8: ACTIVITY LOGS */}
        {activeTab === 'activity' && (
          <div className="profile-card">
            <div className="profile-card-title-section">
              <div className="profile-card-title"><FileText size={16} /> Enterprise Security Activity Audit Trail</div>
              <span className="profile-card-subtitle">
                {currentUserRole === 'super_admin' ? 'Displaying global system audit logs.' : `Displaying logs associated with department: ${currentUser?.department}.`}
              </span>
            </div>

            {/* Filter controls row */}
            <div className="filter-row">
              <input
                type="text"
                className="filter-search-input form-group input"
                placeholder="Search action details or actors..."
                value={logSearch}
                onChange={e => setLogSearch(e.target.value)}
                style={{ padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px' }}
              />
              
              <select
                className="filter-select"
                value={logModuleFilter}
                onChange={e => setLogModuleFilter(e.target.value)}
                style={{ padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px' }}
              >
                <option value="All">All Modules</option>
                <option value="Profile">Profile</option>
                <option value="Security">Security</option>
                <option value="Attendance">Attendance</option>
                <option value="Tasks">Tasks</option>
                <option value="Leaves">Leaves</option>
                <option value="Administration">Administration</option>
              </select>

              <select
                className="filter-select"
                value={logStatusFilter}
                onChange={e => setLogStatusFilter(e.target.value)}
                style={{ padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px' }}
              >
                <option value="All">All Statuses</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="danger">Danger</option>
              </select>

              <Button variant="secondary" size="sm" onClick={() => addToast('success', 'Logs downloaded as CSV.')}>Export CSV</Button>
            </div>

            <div className="table-wrapper">
              <table className="profile-table">
                <thead>
                  <tr>
                    <th>Log ID</th>
                    <th>Actor Name</th>
                    <th>Action Done</th>
                    <th>Module</th>
                    <th>Timestamp</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActivityLogs.map(log => (
                    <tr key={log.id}>
                      <td><code>{log.id}</code></td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{log.employeeName || log.actor || 'System'}</span>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{log.department || 'Operations'}</div>
                      </td>
                      <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.action}</td>
                      <td>
                        <span style={{ fontSize: '0.78rem', background: 'rgba(100, 116, 139, 0.12)', color: 'var(--text-primary)', padding: '2px 6px', borderRadius: '4px' }}>
                          {log.module}
                        </span>
                      </td>
                      <td>{log.timestamp}</td>
                      <td>
                        <span className={`badge-status ${log.status === 'success' ? 'active' : log.status === 'danger' ? 'suspended' : 'disabled'}`}>
                          {log.status === 'success' ? 'Success' : log.status === 'danger' ? 'Danger' : 'Warning'}
                        </span>
                      </td>
                      <td>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedActivityDetails(log)}>Inspect</Button>
                      </td>
                    </tr>
                  ))}
                  {filteredActivityLogs.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                        No activity records found matching filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 9: DOCUMENTS */}
        {activeTab === 'documents' && (
          <div className="profile-card">
            <div className="profile-card-title-section" style={{ flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div className="profile-card-title"><FileText size={16} /> Employee Credentials Storage</div>
                <span className="profile-card-subtitle">Keep copies of identity cards, contracts, tax files, and certs.</span>
              </div>
              <Button variant="primary" size="sm" icon={FileUp} onClick={() => setIsUploadDocModalOpen(true)}>
                Upload Document
              </Button>
            </div>

            {/* Filters */}
            <div className="filter-row">
              <select
                className="filter-select"
                value={docCategoryFilter}
                onChange={e => setDocCategoryFilter(e.target.value)}
                style={{ padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px' }}
              >
                <option value="All">All Categories</option>
                <option value="Identity">Identity Proofs</option>
                <option value="Contract">Contracts &amp; Letters</option>
                <option value="Finance">Financial Forms</option>
                <option value="Certificates">Certificates</option>
              </select>
            </div>

            <div className="doc-grid">
              {uploadedDocs
                .filter(doc => docCategoryFilter === 'All' || doc.category === docCategoryFilter)
                .map(doc => (
                  <div className="doc-card" key={doc.id}>
                    <div className={`doc-icon-wrap ${doc.fileType === 'pdf' ? 'pdf' : 'excel'}`}>
                      <FileText size={20} />
                    </div>
                    <div className="doc-info">
                      <span className="doc-name" title={doc.fileName}>{doc.fileName}</span>
                      <span className="doc-meta">{doc.category} • {doc.uploadDate}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="modal-close-btn" title="Download Document" onClick={() => handleDownloadDoc(doc)}>
                        <Download size={14} />
                      </button>
                      <button className="modal-close-btn" title="Delete Document" onClick={() => handleDeleteDoc(doc.id, doc.fileName)} style={{ color: 'var(--color-danger)' }}>
                        <Trash size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              {uploadedDocs.filter(doc => docCategoryFilter === 'All' || doc.category === docCategoryFilter).length === 0 && (
                <div style={{ gridColumn: 'span 4', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No uploaded credentials inside this category.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 10: EMERGENCY CONTROLS (SUPER ADMIN ONLY) */}
        {activeTab === 'emergency' && currentUserRole === 'super_admin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="profile-card">
              <div className="profile-card-title-section">
                <div className="profile-card-title"><Zap size={16} /> Impersonate Workspace User</div>
                <span className="profile-card-subtitle">Temporarily view the application as another employee to debug access policies.</span>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  style={{ flex: 1, minWidth: '220px', padding: '10px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px' }}
                  value={selectedImpersonateUser}
                  onChange={e => setSelectedImpersonateUser(e.target.value)}
                >
                  <option value="">Choose employee to impersonate...</option>
                  {employees
                    .filter(e => e.id !== currentUser?.id)
                    .map(e => (
                      <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                    ))}
                </select>
                <Button variant="danger" onClick={() => handleImpersonateClick()}>
                  Start Impersonation Session
                </Button>
              </div>
            </div>

            <div className="profile-card">
              <div className="profile-card-title-section" style={{ flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div className="profile-card-title"><ShieldAlert size={16} /> System-Wide Lockouts &amp; Status Controls</div>
                  <span className="profile-card-subtitle">Suspend, restrict or lock database users in emergency threat cases.</span>
                </div>
                <Button variant="danger" onClick={handleGlobalLockdown}>
                  Trigger Security Lockdown
                </Button>
              </div>

              {/* User Lock list */}
              <div style={{ marginBottom: '12px' }}>
                <input
                  type="text"
                  placeholder="Filter users by name or department..."
                  className="form-group input"
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px' }}
                  value={emergencyUserSearch}
                  onChange={e => setEmergencyUserSearch(e.target.value)}
                />
              </div>

              <div className="table-wrapper">
                <table className="profile-table">
                  <thead>
                    <tr>
                      <th>Employee Name</th>
                      <th>Department</th>
                      <th>Account Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees
                      .filter(e => {
                        if (e.id === currentUser?.id) return false;
                        if (emergencyUserSearch) {
                          const q = emergencyUserSearch.toLowerCase();
                          return e.name.toLowerCase().includes(q) || e.department.toLowerCase().includes(q);
                        }
                        return true;
                      })
                      .slice(0, 5)
                      .map(e => (
                        <tr key={e.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{e.name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{e.role} ({e.id})</div>
                          </td>
                          <td>{e.department}</td>
                          <td>
                            <span className={`badge-status ${e.status === 'Active' ? 'active' : 'suspended'}`}>
                              {e.status || 'Active'}
                            </span>
                          </td>
                          <td>
                            <Button
                              variant={e.status === 'Disabled' ? 'primary' : 'danger'}
                              size="sm"
                              onClick={() => toggleUserLockStatus(e.id, e.name, e.status)}
                            >
                              {e.status === 'Disabled' ? 'Unlock Account' : 'Lock Account'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 11: SPECIAL ACCESS MATRIX (SUPER ADMIN ONLY) */}
        {activeTab === 'special' && currentUserRole === 'super_admin' && (
          <div className="profile-card">
            <div className="profile-card-title-section">
              <div className="profile-card-title"><Key size={16} /> Roles Permission Matrix Override</div>
              <span className="profile-card-subtitle">Global verification chart matching system route controls to dashboard modules.</span>
            </div>

            <div className="table-wrapper">
              <table className="profile-table">
                <thead>
                  <tr>
                    <th>Module Name</th>
                    <th>Super Admin</th>
                    <th>Dept Admin</th>
                    <th>Branch Admin</th>
                    <th>Proj Manager</th>
                    <th>Team Leader</th>
                    <th>Employee</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { module: 'Dashboard', sa: '✅ R/W', da: '👁️ Read', ba: '👁️ Read', pm: '👁️ Read', tl: '👁️ Read', em: '👁️ Read' },
                    { module: 'Employees', sa: '✅ R/W', da: '✅ R/W', ba: '✅ R/W', pm: '👁️ Read', tl: '👁️ Read', em: '❌ None' },
                    { module: 'Attendance', sa: '✅ R/W', da: '✅ R/W', ba: '✅ R/W', pm: '👁️ Read', tl: '👁️ Read', em: '👁️ Check In' },
                    { module: 'Leave Management', sa: '✅ R/W', da: '✅ R/W', ba: '✅ R/W', pm: '✅ R/W', tl: '✅ R/W', em: '👁️ Request' },
                    { module: 'Tasks & Projects', sa: '✅ R/W', da: '✅ R/W', ba: '✅ R/W', pm: '✅ R/W', tl: '✅ R/W', em: '👁️ Update' },
                    { module: 'Payroll Data', sa: '✅ R/W', da: '❌ None', ba: '✅ R/W', pm: '❌ None', tl: '❌ None', em: '👁️ Payslips' },
                    { module: 'Roles & Settings', sa: '✅ R/W', da: '❌ None', ba: '👁️ Read', pm: '❌ None', tl: '❌ None', em: '❌ None' }
                  ].map((row, index) => (
                    <tr key={index}>
                      <td style={{ fontWeight: 600 }}>{row.module}</td>
                      <td><span style={{ fontSize: '0.8rem' }}>{row.sa}</span></td>
                      <td><span style={{ fontSize: '0.8rem' }}>{row.da}</span></td>
                      <td><span style={{ fontSize: '0.8rem' }}>{row.ba}</span></td>
                      <td><span style={{ fontSize: '0.8rem' }}>{row.pm}</span></td>
                      <td><span style={{ fontSize: '0.8rem' }}>{row.tl}</span></td>
                      <td><span style={{ fontSize: '0.8rem' }}>{row.em}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* ── MODALS ── */}

      {/* 1. Change Password Modal */}
      <Modal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
        title="Change Account Password"
        footer={
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', width: '100%' }}>
            <Button variant="ghost" onClick={() => setIsChangePasswordModalOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={handlePasswordSubmit}>Update Password</Button>
          </div>
        }
      >
        <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label><Lock size={12} /> Current Password</label>
            <div className="input-with-icon">
              <input
                type={showCurrentPass ? 'text' : 'password'}
                placeholder="Enter current password"
                value={passwordForm.currentPassword}
                onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              />
              <button
                type="button"
                className="input-icon-btn"
                onClick={() => setShowCurrentPass(!showCurrentPass)}
              >
                <Eye size={16} />
              </button>
            </div>
          </div>

          <div className="form-group">
            <label><Key size={12} /> New Password</label>
            <div className="input-with-icon">
              <input
                type={showNewPass ? 'text' : 'password'}
                placeholder="Minimum 8 characters"
                value={passwordForm.newPassword}
                onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              />
              <button
                type="button"
                className="input-icon-btn"
                onClick={() => setShowNewPass(!showNewPass)}
              >
                <Eye size={16} />
              </button>
            </div>
            {passwordForm.newPassword && (
              <div className="password-strength-container">
                <div className="strength-bar">
                  <div className={`strength-fill ${getPasswordStrength()}`} />
                </div>
                <span className={`strength-text ${getPasswordStrength()}`}>
                  Password strength: {getPasswordStrength().toUpperCase()}
                </span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label><Key size={12} /> Confirm New Password</label>
            <div className="input-with-icon">
              <input
                type={showConfirmPass ? 'text' : 'password'}
                placeholder="Re-enter new password"
                value={passwordForm.confirmPassword}
                onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              />
              <button
                type="button"
                className="input-icon-btn"
                onClick={() => setShowConfirmPass(!showConfirmPass)}
              >
                <Eye size={16} />
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* 2. Enable MFA Setup Modal */}
      <Modal
        isOpen={isMfaModalOpen}
        onClose={() => setIsMfaModalOpen(false)}
        title="Setup Multi-Factor Authentication"
        footer={
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', width: '100%' }}>
            <Button variant="ghost" onClick={() => setIsMfaModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={verifyAndEnableMfa}>Verify &amp; Enable</Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Scan the QR code below using your authenticator application (Google Authenticator, Authy) then input the generated 6-digit code.
          </p>

          <div style={{ background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <img
              src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=otpauth://totp/OfficeManagement:aarav.sharma@saas.com?secret=JBSWY3DPEHPK3PXP&issuer=OfficeManagement"
              alt="MFA QR Code"
              style={{ width: '150px', height: '150px' }}
            />
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Secret Key: <code>JBSWY3DPEHPK3PXP</code>
          </div>

          <div className="form-group" style={{ width: '100%', maxWidth: '240px' }}>
            <label style={{ justifyContent: 'center' }}>6-Digit Verification Code</label>
            <input
              type="text"
              maxLength={6}
              placeholder="e.g. 123456"
              style={{ textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.15em' }}
              value={mfaCode}
              onChange={e => setMfaCode(e.target.value)}
            />
            {mfaVerifyError && (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-danger)' }}>{mfaVerifyError}</span>
            )}
          </div>
        </div>
      </Modal>

      {/* 3. Upload Document Modal */}
      <Modal
        isOpen={isUploadDocModalOpen}
        onClose={() => setIsUploadDocModalOpen(false)}
        title="Upload Credential Document"
        footer={
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', width: '100%' }}>
            <Button variant="ghost" onClick={() => setIsUploadDocModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleUploadDocSubmit}>Upload Credential</Button>
          </div>
        }
      >
        <form onSubmit={handleUploadDocSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label>Document Category</label>
            <select
              value={uploadDocForm.category}
              onChange={e => setUploadDocForm({ ...uploadDocForm, category: e.target.value })}
            >
              <option value="Identity">Identity Proof</option>
              <option value="Contract">Employment Contract / Offer Letter</option>
              <option value="Finance">Financial Forms / Cancelled Cheque</option>
              <option value="Certificates">Certificates &amp; Achievements</option>
            </select>
          </div>

          <div className="form-group">
            <label>Choose File</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input
                type="file"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                id="doc-upload-file-input"
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  readOnly
                  placeholder="No file chosen"
                  value={uploadDocForm.fileName}
                  style={{ flex: 1 }}
                  onClick={() => document.getElementById('doc-upload-file-input').click()}
                />
                <Button variant="secondary" onClick={() => document.getElementById('doc-upload-file-input').click()}>
                  Browse File
                </Button>
              </div>
            </div>
            {uploadDocForm.fileName && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Selected file size: {uploadDocForm.fileSize}
              </span>
            )}
          </div>

          <div className="form-group">
            <label>Remarks / Notes</label>
            <textarea
              rows={2}
              placeholder="Add short description about the uploaded credential..."
              value={uploadDocForm.remarks}
              onChange={e => setUploadDocForm({ ...uploadDocForm, remarks: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* 4. Organisation Chart Modal */}
      <Modal
        isOpen={isOrgChartOpen}
        onClose={() => setIsOrgChartOpen(false)}
        title="Organisation Hierarchy Tree"
        size="lg"
        footer={<Button variant="ghost" onClick={() => setIsOrgChartOpen(false)}>Close Hierarchy Chart</Button>}
      >
        {(() => {
          const { manager, leader, peers } = getOrgStructure();
          return (
            <div className="org-chart-tree">
              {/* Level 1: Manager */}
              {manager && (
                <>
                  <div className="org-node">
                    <span className="org-node-badge manager">Director / PM</span>
                    <span className="org-node-title">{manager.name}</span>
                    <span className="org-node-role">{manager.designation}</span>
                  </div>
                  <div className="org-connector-line" />
                </>
              )}

              {/* Level 2: Team Leader */}
              {leader && (
                <>
                  <div className="org-node">
                    <span className="org-node-badge leader">Team Leader</span>
                    <span className="org-node-title">{leader.name}</span>
                    <span className="org-node-role">{leader.designation}</span>
                  </div>
                  <div className="org-connector-line" />
                </>
              )}

              {/* Level 3: Active User (Highlighted) */}
              <div className="org-node active-user" style={{ borderStyle: 'solid', borderWidth: '2px' }}>
                <span className="org-node-badge you">You</span>
                <span className="org-node-title" style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>{currentUser?.name}</span>
                <span className="org-node-role">{currentUser?.designation || currentUser?.role}</span>
              </div>

              {/* Level 4: Colleagues / Peers */}
              {peers.length > 0 && (
                <>
                  <div className="org-connector-line" />
                  <div className="org-peers-row">
                    {peers.map((peer, idx) => (
                      <div className="org-node" key={peer.id || idx} style={{ minWidth: '160px', padding: '10px' }}>
                        <span className="org-node-badge">Colleague</span>
                        <span className="org-node-title" style={{ fontSize: '0.85rem' }}>{peer.name}</span>
                        <span className="org-node-role" style={{ fontSize: '0.7rem' }}>{peer.designation}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* 5. Session Details Modal */}
      <Modal
        isOpen={!!selectedSessionDetails}
        onClose={() => setSelectedSessionDetails(null)}
        title="Device Session Inspection"
        footer={<Button variant="ghost" onClick={() => setSelectedSessionDetails(null)}>Close Inspection</Button>}
      >
        {selectedSessionDetails && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
              {selectedSessionDetails.device.includes('iPhone') ? <Smartphone size={24} /> : <Laptop size={24} />}
              <div>
                <h4 style={{ margin: 0 }}>{selectedSessionDetails.device}</h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {selectedSessionDetails.id}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem' }}>
              <div>
                <strong>IP Address:</strong>
                <p style={{ margin: '4px 0 0 0' }}><code>{selectedSessionDetails.ip}</code></p>
              </div>
              <div>
                <strong>Location:</strong>
                <p style={{ margin: '4px 0 0 0' }}>{selectedSessionDetails.location}</p>
              </div>
              <div>
                <strong>Session Status:</strong>
                <p style={{ margin: '4px 0 0 0' }}>{selectedSessionDetails.status}</p>
              </div>
              <div>
                <strong>Last Activity Timestamp:</strong>
                <p style={{ margin: '4px 0 0 0' }}>{selectedSessionDetails.lastActive}</p>
              </div>
            </div>

            <div style={{ background: 'var(--bg-elevated)', padding: '10px', borderRadius: '6px', fontSize: '0.78rem', color: 'var(--text-muted)', border: '1px solid var(--border-color)', marginTop: '8px' }}>
              <strong>Browser User Agent:</strong>
              <p style={{ margin: '4px 0 0 0', fontFamily: 'monospace' }}>
                Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* 6. Activity Log Details Modal */}
      <Modal
        isOpen={!!selectedActivityDetails}
        onClose={() => setSelectedActivityDetails(null)}
        title="Audit Activity Metadata"
        footer={<Button variant="ghost" onClick={() => setSelectedActivityDetails(null)}>Close Inspection</Button>}
      >
        {selectedActivityDetails && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
              <ShieldAlert size={24} style={{ color: 'var(--color-primary)' }} />
              <div>
                <h4 style={{ margin: 0 }}>Audit Entry: {selectedActivityDetails.id}</h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Module: {selectedActivityDetails.module}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem' }}>
              <div>
                <strong>Actor User:</strong>
                <p style={{ margin: '4px 0 0 0' }}>{selectedActivityDetails.employeeName || selectedActivityDetails.actor || 'System User'}</p>
              </div>
              <div>
                <strong>Department:</strong>
                <p style={{ margin: '4px 0 0 0' }}>{selectedActivityDetails.department || 'Operations'}</p>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <strong>Action Executed:</strong>
                <p style={{ margin: '4px 0 0 0', background: 'var(--bg-elevated)', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                  {selectedActivityDetails.action}
                </p>
              </div>
              <div>
                <strong>Trigger Time:</strong>
                <p style={{ margin: '4px 0 0 0' }}>{selectedActivityDetails.timestamp}</p>
              </div>
              <div>
                <strong>Result Status:</strong>
                <p style={{ margin: '4px 0 0 0' }}>
                  <span className={`badge-status ${selectedActivityDetails.status === 'success' ? 'active' : 'suspended'}`}>
                    {selectedActivityDetails.status === 'success' ? 'Success' : 'Warning'}
                  </span>
                </p>
              </div>
            </div>

            <div style={{ background: 'var(--bg-elevated)', padding: '10px', borderRadius: '6px', fontSize: '0.78rem', color: 'var(--text-muted)', border: '1px solid var(--border-color)', marginTop: '8px' }}>
              <strong>Execution Context IP:</strong>
              <p style={{ margin: '4px 0 0 0', fontFamily: 'monospace' }}>
                {selectedActivityDetails.ip || '192.168.1.42'}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ProfileSettings;
