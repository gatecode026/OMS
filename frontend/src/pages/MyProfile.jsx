import React, { useState, useEffect, useMemo } from 'react';
import './MyProfile.css';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import Button from '../components/common/Button';
import Avatar from '../components/common/Avatar';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import Skeleton from '../components/common/Skeleton';
import {
  User, Edit2, Save, Camera, Mail, Phone, MapPin, Calendar,
  Briefcase, Shield, Key, Clock, CheckCircle, Globe, Lock,
  Bell, Eye, Monitor, FileText, Zap, ChevronDown, Check,
  Search, Download, Trash2, AlertTriangle, ShieldAlert, Cpu,
  Laptop, Smartphone, FileUp, X, RefreshCw, Landmark, Percent,
  Building, CheckSquare, Sparkles, Share2, EyeOff, Plus
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const MyProfile = () => {
  const isLoading = usePageLoading(600);
  const {
    currentUser,
    currentUserRole,
    setCurrentUserRole,
    employees,
    updateEmployee,
    addToast
  } = useApp();

  // Active Tab state for form panels
  const [activeTab, setActiveTab] = useState('personal'); // personal, contact, documents, banking, security, activity

  // Modals Visibility States
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isUploadDocOpen, setIsUploadDocOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isUpdateBankOpen, setIsUpdateBankOpen] = useState(false);
  const [isMfaWizardOpen, setIsMfaWizardOpen] = useState(false);
  const [isViewDocOpen, setIsViewDocOpen] = useState(false);
  const [isLoginHistoryOpen, setIsLoginHistoryOpen] = useState(false);

  // Impersonate state
  const [selectedImpersonateUser, setSelectedImpersonateUser] = useState('');

  // Selected document to view in preview modal
  const [previewDoc, setPreviewDoc] = useState(null);

  // Form edit states
  const [personalForm, setPersonalForm] = useState({
    name: '',
    gender: 'Male',
    dob: '',
    maritalStatus: 'Single',
    bloodGroup: 'O+',
    nationality: 'Indian',
    aadhaarNumber: '',
    panNumber: '',
    emergencyName: '',
    emergencyRelation: '',
    emergencyMobile: '',
    emergencyAlternate: ''
  });

  const [contactForm, setContactForm] = useState({
    personalEmail: '',
    personalMobile: '',
    alternateContact: '',
    currentAddress: { line1: '', city: '', state: '', pincode: '', country: 'India' },
    permanentAddress: { line1: '', city: '', state: '', pincode: '', country: 'India' },
    sameAsCurrent: false
  });

  const [bankForm, setBankForm] = useState({
    accountName: '',
    bankName: '',
    branch: '',
    accountNumber: '',
    confirmAccountNumber: '',
    ifsc: '',
    upiId: ''
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // MFA Wizard State
  const [mfaStep, setMfaStep] = useState(1);
  const [mfaMethod, setMfaMethod] = useState('email'); // email, mobile, authenticator
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState('');

  // Document Upload Form State
  const [uploadDocForm, setUploadDocForm] = useState({
    category: 'Personal Documents', // Personal Documents, Employment Documents, Educational Documents
    docType: 'Aadhaar Card',
    fileData: null,
    fileName: '',
    remarks: ''
  });

  // Filter lists inside pages
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [activitySearchQuery, setActivitySearchQuery] = useState('');
  const [activityTypeFilter, setActivityTypeFilter] = useState('All');
  const [activityDateFilter, setActivityDateFilter] = useState('30days');

  // Simulated dynamic documents list state (synchronized with currentUser on load)
  const [localDocs, setLocalDocs] = useState([]);
  const [localActivities, setLocalActivities] = useState([]);

  // Session details list
  const [sessions, setSessions] = useState([
    { id: 'sess-1', device: 'Windows 11 PC - Chrome', ip: '192.168.1.15', location: 'Jaipur, India', status: 'Active Now', lastActive: 'Just now', icon: Laptop },
    { id: 'sess-2', device: 'iPhone 15 - Safari App', ip: '103.88.22.41', location: 'Mumbai, India', status: 'Active', lastActive: '2 hours ago', icon: Smartphone },
    { id: 'sess-3', device: 'macOS - Firefox', ip: '185.190.140.2', location: 'Delhi, India', status: 'Idle', lastActive: '1 day ago', icon: Laptop },
  ]);

  // Collapsible accordion states for Documents tab categories
  const [accordionOpen, setAccordionOpen] = useState({
    personal: true,
    employment: true,
    educational: true
  });

  // Sync state with AppContext current user
  useEffect(() => {
    if (currentUser) {
      setPersonalForm({
        name: currentUser.name || '',
        gender: currentUser.gender || 'Male',
        dob: currentUser.dob || '',
        maritalStatus: currentUser.maritalStatus || 'Single',
        bloodGroup: currentUser.bloodGroup || 'O+',
        nationality: currentUser.nationality || 'Indian',
        aadhaarNumber: currentUser.aadhaarNumber || '',
        panNumber: currentUser.panNumber || '',
        emergencyName: currentUser.emergencyContactName || currentUser.emergencyName || '',
        emergencyRelation: currentUser.emergencyContactRelation || currentUser.emergencyRelation || '',
        emergencyMobile: currentUser.emergencyContactPhone || currentUser.emergencyMobile || '',
        emergencyAlternate: currentUser.emergencyContactPhoneAlt || currentUser.emergencyAlternate || ''
      });

      setContactForm({
        personalEmail: currentUser.personalEmail || '',
        personalMobile: currentUser.phone || currentUser.personalMobile || '',
        alternateContact: currentUser.alternatePhone || currentUser.alternateContact || '',
        currentAddress: {
          line1: currentUser.currentAddress?.line1 || '',
          city: currentUser.currentAddress?.city || '',
          state: currentUser.currentAddress?.state || '',
          pincode: currentUser.currentAddress?.pincode || '',
          country: currentUser.currentAddress?.country || 'India'
        },
        permanentAddress: {
          line1: currentUser.permanentAddress?.line1 || '',
          city: currentUser.permanentAddress?.city || '',
          state: currentUser.permanentAddress?.state || '',
          pincode: currentUser.permanentAddress?.pincode || '',
          country: currentUser.permanentAddress?.country || 'India'
        },
        sameAsCurrent: false
      });

      setBankForm({
        accountName: currentUser.bank?.accountName || currentUser.name || '',
        bankName: currentUser.bank?.bankName || currentUser.bankName || '',
        branch: currentUser.bank?.branch || currentUser.bankBranch || '',
        accountNumber: currentUser.bank?.accountNumber || currentUser.bankAccountNumber || '',
        confirmAccountNumber: currentUser.bank?.accountNumber || currentUser.bankAccountNumber || '',
        ifsc: currentUser.bank?.ifsc || currentUser.bankIfscCode || '',
        upiId: currentUser.bank?.upiId || currentUser.bankUpiId || ''
      });

      if (currentUser.documents) {
        setLocalDocs(currentUser.documents);
      }
      if (currentUser.activities) {
        setLocalActivities(currentUser.activities);
      }
    }
  }, [currentUser]);

  // Profile completeness calculation items
  const profileCompletionItems = useMemo(() => {
    if (!currentUser) return [];
    return [
      { key: 'personal', name: 'Personal Information', weight: 20, completed: !!personalForm.name && !!personalForm.gender && !!personalForm.dob, targetTab: 'personal' },
      { key: 'professional', name: 'Professional Information', weight: 20, completed: !!currentUser.designation && !!currentUser.department && !!currentUser.branch, targetTab: 'overview' },
      { key: 'contact', name: 'Contact Details', weight: 15, completed: !!contactForm.personalEmail && !!contactForm.personalMobile && !!contactForm.currentAddress?.line1, targetTab: 'contact' },
      { key: 'documents', name: 'Identity Documents', weight: 25, completed: localDocs.length >= 3, labelDetail: `${localDocs.length}/3 uploaded`, targetTab: 'documents' },
      { key: 'bank', name: 'Bank Details', weight: 10, completed: !!bankForm.accountNumber && !!bankForm.ifsc, targetTab: 'banking' },
      { key: 'security', name: 'Security Settings', weight: 10, completed: currentUser.mfaEnabled?.email || currentUser.mfaEnabled?.mobile, labelDetail: 'MFA enabled', targetTab: 'security' }
    ];
  }, [currentUser, personalForm, contactForm, bankForm, localDocs]);

  // Sum total completion percentage
  const completionPercentage = useMemo(() => {
    return profileCompletionItems.reduce((acc, item) => acc + (item.completed ? item.weight : 0), 0);
  }, [profileCompletionItems]);

  const completionNextStep = useMemo(() => {
    const incomplete = profileCompletionItems.find(item => !item.completed);
    if (!incomplete) return 'Your profile is fully complete! 🎉';
    return `Next: Complete your ${incomplete.name} (${100 - completionPercentage}% remaining)`;
  }, [profileCompletionItems, completionPercentage]);

  // Recharts completion pie chart structure
  const pieData = useMemo(() => {
    return [
      { name: 'Completed', value: completionPercentage, color: 'var(--color-primary)' },
      { name: 'Incomplete', value: 100 - completionPercentage, color: 'var(--border-color)' }
    ];
  }, [completionPercentage]);

  // Form saving functions
  const savePersonalDetails = (updatedData = null) => {
    const dataToSave = updatedData || personalForm;
    if (currentUser?.id) {
      updateEmployee(currentUser.id, {
        name: dataToSave.name,
        gender: dataToSave.gender,
        dob: dataToSave.dob,
        maritalStatus: dataToSave.maritalStatus,
        bloodGroup: dataToSave.bloodGroup,
        nationality: dataToSave.nationality,
        aadhaarNumber: dataToSave.aadhaarNumber,
        panNumber: dataToSave.panNumber,
        emergencyContactName: dataToSave.emergencyName,
        emergencyContactRelation: dataToSave.emergencyRelation,
        emergencyContactPhone: dataToSave.emergencyMobile,
        emergencyContactPhoneAlt: dataToSave.emergencyAlternate
      });
      // Add Activity
      const newActivity = {
        id: `act-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        action: 'Profile Updated',
        details: 'Personal information updated'
      };
      setLocalActivities(prev => [newActivity, ...prev]);
      addToast('success', 'Personal details saved successfully.');
    }
  };

  const saveContactDetails = (updatedData = null) => {
    const dataToSave = updatedData || contactForm;
    if (currentUser?.id) {
      const currentAddressStr = `${dataToSave.currentAddress.line1}, ${dataToSave.currentAddress.city}, ${dataToSave.currentAddress.state} - ${dataToSave.currentAddress.pincode}`;
      const permanentAddressStr = dataToSave.sameAsCurrent
        ? currentAddressStr
        : `${dataToSave.permanentAddress.line1}, ${dataToSave.permanentAddress.city}, ${dataToSave.permanentAddress.state} - ${dataToSave.permanentAddress.pincode}`;

      updateEmployee(currentUser.id, {
        personalEmail: dataToSave.personalEmail,
        phone: dataToSave.personalMobile,
        alternatePhone: dataToSave.alternateContact,
        currentAddress: currentAddressStr,
        permanentAddress: permanentAddressStr
      });
      const newActivity = {
        id: `act-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        action: 'Contact Updated',
        details: 'Contact details and addresses updated'
      };
      setLocalActivities(prev => [newActivity, ...prev]);
      addToast('success', 'Contact details saved successfully.');
    }
  };

  const saveBankDetails = () => {
    if (bankForm.accountNumber !== bankForm.confirmAccountNumber) {
      addToast('error', 'Account numbers do not match.');
      return;
    }
    if (bankForm.accountNumber.length < 9) {
      addToast('error', 'Account number must be at least 9 digits.');
      return;
    }
    if (bankForm.ifsc.length !== 11) {
      addToast('error', 'IFSC code must be exactly 11 characters.');
      return;
    }

    if (currentUser?.id) {
      updateEmployee(currentUser.id, {
        bankName: bankForm.bankName,
        bankAccountNumber: bankForm.accountNumber,
        bankIfscCode: bankForm.ifsc,
        bankUpiId: bankForm.upiId
      });
      const newActivity = {
        id: `act-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        action: 'Bank Details Updated',
        details: 'Salary bank account details verified'
      };
      setLocalActivities(prev => [newActivity, ...prev]);
      setIsUpdateBankOpen(false);
      addToast('success', 'Bank account details updated successfully.');
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!passwordForm.currentPassword) {
      addToast('error', 'Current password is required.');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      addToast('error', 'New password must be at least 8 characters.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      addToast('error', 'Passwords do not match.');
      return;
    }

    const newActivity = {
      id: `act-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      action: 'Password Changed',
      details: 'Account password changed securely'
    };
    setLocalActivities(prev => [newActivity, ...prev]);
    setIsChangePasswordOpen(false);
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    addToast('success', 'Password updated successfully.');
  };

  const handleMfaSubmit = () => {
    if (mfaStep === 1) {
      // Simulate code sending
      addToast('info', `Verification code sent to your registered ${mfaMethod === 'email' ? 'Email Address' : 'Mobile number'}.`);
      setMfaStep(2);
      setMfaError('');
    } else if (mfaStep === 2) {
      if (mfaCode.length !== 6 || isNaN(Number(mfaCode))) {
        setMfaError('Enter a valid 6-digit number.');
        return;
      }
      // Enable MFA
      if (currentUser?.id) {
        updateEmployee(currentUser.id, {
          mfaEnabled: {
            ...currentUser.mfaEnabled,
            email: mfaMethod === 'email' ? true : currentUser.mfaEnabled?.email,
            mobile: mfaMethod === 'mobile' ? true : currentUser.mfaEnabled?.mobile,
            authenticator: mfaMethod === 'authenticator' ? true : currentUser.mfaEnabled?.authenticator
          }
        });
        const newActivity = {
          id: `act-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          action: 'MFA Enabled',
          details: `Enabled MFA method: ${mfaMethod}`
        };
        setLocalActivities(prev => [newActivity, ...prev]);
        setIsMfaWizardOpen(false);
        setMfaStep(1);
        setMfaCode('');
        addToast('success', 'MFA verified and enabled successfully.');
      }
    }
  };

  const disableMfaMethod = (method) => {
    if (currentUser?.id) {
      updateEmployee(currentUser.id, {
        mfaEnabled: {
          ...currentUser.mfaEnabled,
          [method]: false
        }
      });
      const newActivity = {
        id: `act-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        action: 'MFA Disabled',
        details: `Disabled MFA method: ${method}`
      };
      setLocalActivities(prev => [newActivity, ...prev]);
      addToast('warning', `Disabled MFA method: ${method}`);
    }
  };

  // Avatar Image Upload
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        addToast('error', 'Photo exceeds size limit of 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        updateEmployee(currentUser.id, { photoUrl: reader.result, avatar: reader.result });
        const newActivity = {
          id: `act-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          action: 'Photo Updated',
          details: 'Profile avatar updated'
        };
        setLocalActivities(prev => [newActivity, ...prev]);
        addToast('success', 'Profile photo updated successfully!');
      };
      reader.readAsDataURL(file);
    }
  };

  // Mock Simulated File Upload
  const simulateFileUpload = (type) => {
    setUploadDocForm(prev => ({
      ...prev,
      fileName: `${prev.docType.toLowerCase().replace(/ /g, '_')}_verified.${type.toLowerCase()}`,
      fileData: `data:application/pdf;base64,JVBER...` // Simulated pdf header data
    }));
    addToast('info', `Selected simulated ${type} file.`);
  };

  // Document management operations
  const uploadNewDocument = () => {
    if (!uploadDocForm.fileName) {
      addToast('error', 'Select a file to upload.');
      return;
    }
    const newDoc = {
      id: `doc-${Date.now()}`,
      type: uploadDocForm.docType.toLowerCase().includes('aadhaar') ? 'aadhaar' : uploadDocForm.docType.toLowerCase().includes('pan') ? 'pan' : 'custom',
      name: uploadDocForm.docType,
      status: 'pending',
      uploadedAt: new Date().toISOString().split('T')[0],
      fileName: uploadDocForm.fileName,
      url: '#'
    };

    const updatedDocs = [newDoc, ...localDocs];
    setLocalDocs(updatedDocs);
    updateEmployee(currentUser.id, { documents: updatedDocs });

    const newActivity = {
      id: `act-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      action: 'Document Uploaded',
      details: `Uploaded ${newDoc.name} for verification`
    };
    setLocalActivities(prev => [newActivity, ...prev]);
    setIsUploadDocOpen(false);
    setUploadDocForm({ category: 'Personal Documents', docType: 'Aadhaar Card', fileData: null, fileName: '', remarks: '' });
    addToast('success', 'Document uploaded successfully. Verification pending.');
  };

  const deleteDocument = (docId, name) => {
    const updatedDocs = localDocs.filter(d => d.id !== docId);
    setLocalDocs(updatedDocs);
    updateEmployee(currentUser.id, { documents: updatedDocs });

    const newActivity = {
      id: `act-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      action: 'Document Deleted',
      details: `Removed document ${name}`
    };
    setLocalActivities(prev => [newActivity, ...prev]);
    addToast('warning', `Document "${name}" deleted.`);
  };

  const handleDownloadAll = () => {
    // Generate text/file content of docs structure and download
    const indexText = `Profile Documents Directory\nEmployee ID: ${currentUser.employeeId}\n\n` + 
      localDocs.map(d => `- [${d.name}] uploaded on ${d.uploadedAt} (${d.status})`).join('\n');
    const blob = new Blob([indexText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `employee_${currentUser.employeeId}_documents_index.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast('success', 'Downloaded verification documents package.');
  };

  const handleDownloadDataJSON = () => {
    const profileJSON = JSON.stringify({
      personal: personalForm,
      contact: contactForm,
      bank: bankForm,
      documents: localDocs
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
    const shareUrl = `${window.location.origin}/employees/${currentUser.id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      addToast('success', 'Profile link copied to clipboard.');
    });
  };

  // Revoke device session
  const revokeSession = (id, device) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    addToast('success', `Revoked active session for ${device}.`);
  };

  const logoutAllOtherSessions = () => {
    setSessions(prev => prev.filter(s => s.status.includes('Active Now')));
    addToast('success', 'Logged out of all other devices successfully.');
  };

  // Activity Timeline filters
  const filteredActivities = useMemo(() => {
    return localActivities.filter(act => {
      // 1. Search text
      if (activitySearchQuery) {
        const query = activitySearchQuery.toLowerCase();
        if (!act.action.toLowerCase().includes(query) && !act.details?.toLowerCase().includes(query)) {
          return false;
        }
      }
      // 2. Category filter
      if (activityTypeFilter !== 'All') {
        const actLower = act.action.toLowerCase();
        if (activityTypeFilter === 'Profile' && !actLower.includes('profile') && !actLower.includes('photo')) return false;
        if (activityTypeFilter === 'Documents' && !actLower.includes('document')) return false;
        if (activityTypeFilter === 'Security' && !actLower.includes('password') && !actLower.includes('mfa')) return false;
        if (activityTypeFilter === 'Banking' && !actLower.includes('bank')) return false;
        if (activityTypeFilter === 'Contact' && !actLower.includes('contact')) return false;
      }
      // 3. Date range filter
      if (activityDateFilter !== 'all') {
        const actDate = new Date(act.date);
        const today = new Date();
        const diffDays = Math.ceil((today - actDate) / (1000 * 60 * 60 * 24));
        if (activityDateFilter === '7days' && diffDays > 7) return false;
        if (activityDateFilter === '30days' && diffDays > 30) return false;
        if (activityDateFilter === '90days' && diffDays > 90) return false;
      }
      return true;
    });
  }, [localActivities, activitySearchQuery, activityTypeFilter, activityDateFilter]);

  // Export activities to CSV
  const handleExportActivitiesCSV = () => {
    const headers = 'Date,Activity,Details\n';
    const rows = filteredActivities.map(act => `${act.date},"${act.action}","${act.details || ''}"`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `profile_activity_${currentUser.employeeId}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast('success', 'Exported profile activities log.');
  };

  // Impersonation switch
  const handleImpersonateUser = () => {
    if (!selectedImpersonateUser) {
      addToast('error', 'Select a user to impersonate.');
      return;
    }
    const match = employees.find(e => e.id === selectedImpersonateUser);
    if (match) {
      setCurrentUserRole(match.roleId);
      addToast('success', `Impersonating ${match.name} (${match.role}).`);
    }
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

  // Rendering Document Status Badge
  const getDocStatusBadge = (status) => {
    let variant = 'neutral';
    let label = 'Not Uploaded';
    if (status === 'verified') { variant = 'success'; label = 'Verified ✅'; }
    else if (status === 'pending') { variant = 'warning'; label = 'Pending Verification ⏳'; }
    else if (status === 'rejected') { variant = 'danger'; label = 'Rejected ❌'; }
    else if (status === 'available') { variant = 'primary'; label = 'Available ✅'; }
    return <Badge variant={variant}>{label}</Badge>;
  };

  // Keyboard shortcut listener to scroll to tabs
  const handleCompleteScroll = (targetTab) => {
    if (targetTab === 'overview') {
      document.querySelector('.profile-columns-layout')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      setActiveTab(targetTab);
      setTimeout(() => {
        document.querySelector('.profile-tabs-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  if (isLoading) {
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

  return (
    <div className="profile-settings-page">
      {/* Hidden file input for Photo Upload */}
      <input
        type="file"
        id="avatar-photo-upload-input"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleAvatarChange}
      />

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
          <Button variant="primary" icon={Edit2} onClick={() => setIsEditProfileOpen(true)}>
            Edit Profile
          </Button>
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

      {/* ==================== 2. PROFILE COMPLETION STICKY BAR ==================== */}
      <div className="profile-completion-sticky-bar">
        <div className="completion-bar-info">
          <span className="completion-bar-title">Profile Completion: {completionPercentage}%</span>
          <span className="completion-bar-next-step">{completionNextStep}</span>
        </div>
        <div className="completion-progress-track">
          <div className="completion-progress-fill" style={{ width: `${completionPercentage}%` }}></div>
        </div>
        <span className="completion-percent-badge">{completionPercentage}%</span>
      </div>

      {/* ==================== 3. SECTION 1 & 2: TWO-COLUMN LAYOUT ==================== */}
      <div className="profile-columns-layout">
        {/* LEFT COLUMN (35%) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Profile Summary Card */}
          <div className="profile-summary-card">
            <div className="summary-card-banner" style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #7c3aed 100%)' }} />
            <div className="summary-card-avatar-wrap">
              {currentUser.photoUrl ? (
                <img src={currentUser.photoUrl} alt={currentUser.name} />
              ) : (
                <Avatar name={currentUser.name} size="2xl" />
              )}
              <button className="avatar-edit-overlay" onClick={() => document.getElementById('avatar-photo-upload-input').click()}>
                <Camera size={14} />
              </button>
            </div>
            
            <div className="summary-card-info">
              <h3>{currentUser.name}</h3>
              <span className="summary-card-id">{currentUser.employeeId}</span>
              
              <div style={{ marginTop: '12px' }}>
                <span className={`badge-status ${
                  currentUser.status === 'Active' ? 'active' :
                  currentUser.status === 'Probation' ? 'warning' :
                  currentUser.status === 'Confirmed' ? 'primary' : 'disabled'
                }`}>
                  {currentUser.status || 'Active'}
                </span>
              </div>

              <div className="summary-card-meta-list">
                <div className="summary-card-meta-item">
                  <span className="summary-card-meta-label">Designation</span>
                  <span className="summary-card-meta-value">{currentUser.designation || 'Specialist'}</span>
                </div>
                <div className="summary-card-meta-item">
                  <span className="summary-card-meta-label">Department</span>
                  <span className="summary-card-meta-value">{currentUser.department || 'Operations'}</span>
                </div>
                <div className="summary-card-meta-item">
                  <span className="summary-card-meta-label">Team</span>
                  <span className="summary-card-meta-value">{currentUser.teamName || 'Staff Core'}</span>
                </div>
                <div className="summary-card-meta-item">
                  <span className="summary-card-meta-label">Branch</span>
                  <span className="summary-card-meta-value">{currentUser.branch || 'Headquarters'}</span>
                </div>
                <div className="summary-card-meta-item">
                  <span className="summary-card-meta-label">Joining Date</span>
                  <span className="summary-card-meta-value">{currentUser.joiningDate || currentUser.joinDate || '01-01-2026'}</span>
                </div>
              </div>

              <div className="summary-card-actions">
                <Button variant="secondary" size="sm" icon={Camera} onClick={() => document.getElementById('avatar-photo-upload-input').click()}>
                  Change Photo
                </Button>
                <Button variant="secondary" size="sm" icon={Share2} onClick={handleShareProfile}>
                  Share URL
                </Button>
              </div>
            </div>
          </div>

          {/* Profile Completion Tracker */}
          <div className="completion-tracker-card">
            <div className="completion-tracker-header">
              <h4>Profile Tracker</h4>
              <span className="tracker-percentage-circle">{completionPercentage}%</span>
            </div>
            
            <div className="tracker-categories-list">
              {profileCompletionItems.map((item, idx) => (
                <div 
                  key={idx} 
                  className="tracker-category-item"
                  onClick={() => handleCompleteScroll(item.targetTab)}
                >
                  <div className="tracker-cat-name-icon">
                    {item.completed ? (
                      <CheckCircle size={14} className="text-success" />
                    ) : (
                      <Clock size={14} className="text-muted" />
                    )}
                    <span>{item.name}</span>
                  </div>
                  <span className={`tracker-cat-status ${item.completed ? 'status-completed' : 'status-incomplete'}`}>
                    {item.completed ? (item.labelDetail || 'Completed') : 'Incomplete'}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '16px' }}>
              <Button 
                variant="primary" 
                style={{ width: '100%' }}
                onClick={() => {
                  const incomplete = profileCompletionItems.find(i => !i.completed);
                  if (incomplete) handleCompleteScroll(incomplete.targetTab);
                }}
              >
                Complete Your Profile
              </Button>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="quick-actions-card">
            <h4>Quick Settings Panel</h4>
            <div className="quick-actions-grid">
              <div className="quick-action-button-card" onClick={() => setIsEditProfileOpen(true)}>
                <User size={18} className="quick-action-icon-wrapper" />
                <span className="quick-action-btn-lbl">Edit Profile</span>
              </div>
              <div className="quick-action-button-card" onClick={() => setIsUploadDocOpen(true)}>
                <FileUp size={18} className="quick-action-icon-wrapper" />
                <span className="quick-action-btn-lbl">Upload Document</span>
              </div>
              <div className="quick-action-button-card" onClick={() => setIsUpdateBankOpen(true)}>
                <Landmark size={18} className="quick-action-icon-wrapper" />
                <span className="quick-action-btn-lbl">Banking Details</span>
              </div>
              <div className="quick-action-button-card" onClick={() => setIsChangePasswordOpen(true)}>
                <Lock size={18} className="quick-action-icon-wrapper" />
                <span className="quick-action-btn-lbl">Change Password</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (65%) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Professional Information Card */}
          <div className="professional-info-card">
            <h4><Briefcase size={16} /> Professional Placement</h4>
            
            <div className="info-table-grid">
              <div className="info-grid-cell">
                <span className="info-cell-label">Employee ID</span>
                <span className="info-cell-value">{currentUser.employeeId}</span>
              </div>
              <div className="info-grid-cell">
                <span className="info-cell-label">Designation</span>
                <span className="info-cell-value">{currentUser.designation || 'Staff Officer'}</span>
              </div>
              <div className="info-grid-cell">
                <span className="info-cell-label">Department</span>
                <span className="info-cell-value">{currentUser.department || 'Operations'}</span>
              </div>
              <div className="info-grid-cell">
                <span className="info-cell-label">Team Name</span>
                <span className="info-cell-value">{currentUser.teamName || 'Staff Core'}</span>
              </div>
              <div className="info-grid-cell">
                <span className="info-cell-label">Reporting Team Leader</span>
                <span className="info-cell-value">{currentUser.reportingLeader || 'Ananya Gupta'}</span>
              </div>
              <div className="info-grid-cell">
                <span className="info-cell-label">Reporting Project Manager</span>
                <span className="info-cell-value">{currentUser.reportingPM || 'Kabir Mehta'}</span>
              </div>
              <div className="info-grid-cell">
                <span className="info-cell-label">Office Location</span>
                <span className="info-cell-value">{currentUser.branch || 'Jaipur HQ'}</span>
              </div>
              <div className="info-grid-cell">
                <span className="info-cell-label">Employment Type</span>
                <span className="info-cell-value">{currentUser.employmentType || 'Full-Time'}</span>
              </div>
            </div>
          </div>

          {/* Work Information Card */}
          <div className="work-info-card">
            <h4><Cpu size={16} /> Work Operations &amp; Shifts</h4>
            
            <div className="info-table-grid">
              <div className="info-grid-cell" style={{ gridColumn: 'span 2' }}>
                <span className="info-cell-label">Current Active Projects</span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                  <Badge variant="primary">SaaS Platform v2.0</Badge>
                  <Badge variant="info">Nexus Platform</Badge>
                  <Badge variant="neutral">UI Redesign 3.0</Badge>
                </div>
              </div>
              <div className="info-grid-cell">
                <span className="info-cell-label">Assigned Work Location</span>
                <span className="info-cell-value">{currentUser.workLocation || 'Office'}</span>
              </div>
              <div className="info-grid-cell">
                <span className="info-cell-label">Daily Shift Timing</span>
                <span className="info-cell-value">{currentUser.shift || '09:00 AM - 06:00 PM'}</span>
              </div>
            </div>

            <div className="work-timeline-container">
              <div className="work-timeline-header">
                <span className="info-cell-label">Employment Milestones</span>
                <span className="info-cell-value text-xs text-primary font-bold">Confirmed</span>
              </div>
              <div className="work-timeline-track">
                <div className="work-timeline-step-active" title="Probation Complete"></div>
                <div className="work-timeline-step-confirmed" title="Active Account"></div>
                <div className="work-timeline-step-empty"></div>
              </div>
              <div className="work-timeline-footer">
                <span>Probation (3 months)</span>
                <span>Confirmed (Active 12+ months)</span>
              </div>
            </div>
          </div>

          {/* Impersonation settings panel for Super Admins */}
          {currentUserRole === 'super_admin' && (
            <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
                <ShieldAlert size={16} className="text-danger" /> Admin Controls (Democratized Impersonation)
              </h4>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <select
                  value={selectedImpersonateUser}
                  onChange={(e) => setSelectedImpersonateUser(e.target.value)}
                  className="form-field-input"
                  style={{ flex: 1, minWidth: '200px' }}
                >
                  <option value="">-- Impersonate Employee --</option>
                  {employees.filter(e => e.id !== currentUser.id).map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                  ))}
                </select>
                <Button variant="danger" icon={Zap} onClick={handleImpersonateUser}>
                  Switch Identity
                </Button>
              </div>
            </div>
          )}

          {/* ==================== 4. SECTION 3: TABS CONTAINER (INSIDE RIGHT COLUMN) ==================== */}
          <div className="profile-tabs-card">
        {/* Tab switcher header */}
        <div className="profile-tabs-header-bar">
          {[
            { id: 'personal', label: 'Personal Details', icon: User },
            { id: 'contact', label: 'Contact & Address', icon: Phone },
            { id: 'documents', label: 'Official Documents', icon: FileText },
            { id: 'banking', label: 'Banking & Salary', icon: Landmark },
            { id: 'security', label: 'Account Security', icon: Shield },
            { id: 'activity', label: 'Activity Logs', icon: Clock }
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

        {/* ==================== TAB CONTENT ==================== */}

        {/* 4.1 TAB: PERSONAL INFORMATION */}
        {activeTab === 'personal' && (
          <div className="profile-tab-form-pane">
            <h4 className="form-section-header">Basic Details</h4>
            <div className="form-fields-grid">
              <div className="form-field-group">
                <label>Full Name</label>
                <input className="form-field-input" value={personalForm.name} disabled />
              </div>
              <div className="form-field-group">
                <label>Employee ID</label>
                <input className="form-field-input" value={currentUser.employeeId} disabled />
              </div>
              <div className="form-field-group">
                <label>Gender</label>
                <input className="form-field-input" value={personalForm.gender} disabled />
              </div>
              <div className="form-field-group">
                <label>Date of Birth</label>
                <input className="form-field-input" value={personalForm.dob} disabled />
              </div>
              <div className="form-field-group">
                <label>Marital Status</label>
                <input className="form-field-input" value={personalForm.maritalStatus} disabled />
              </div>
              <div className="form-field-group">
                <label>Blood Group</label>
                <input className="form-field-input" value={personalForm.bloodGroup} disabled />
              </div>
              <div className="form-field-group">
                <label>Nationality</label>
                <input className="form-field-input" value={personalForm.nationality} disabled />
              </div>
            </div>

            <h4 className="form-section-header mt-4">National Identities</h4>
            <div className="form-fields-grid">
              <div className="form-field-group">
                <label>Aadhaar Number</label>
                <input className="form-field-input font-mono" value={personalForm.aadhaarNumber || '—'} disabled />
              </div>
              <div className="form-field-group">
                <label>PAN Number</label>
                <input className="form-field-input font-mono" value={personalForm.panNumber || '—'} disabled />
              </div>
            </div>

            <h4 className="form-section-header mt-4">Emergency Contacts</h4>
            <div className="form-fields-grid">
              <div className="form-field-group">
                <label>Emergency Contact Person</label>
                <input className="form-field-input" value={personalForm.emergencyName} disabled />
              </div>
              <div className="form-field-group">
                <label>Relationship</label>
                <input className="form-field-input" value={personalForm.emergencyRelation} disabled />
              </div>
              <div className="form-field-group">
                <label>Mobile Number</label>
                <input className="form-field-input" value={personalForm.emergencyMobile} disabled />
              </div>
              <div className="form-field-group">
                <label>Alternate Mobile Number</label>
                <input className="form-field-input" value={personalForm.emergencyAlternate || '—'} disabled />
              </div>
            </div>

            <div className="form-actions-strip">
              <Button variant="primary" icon={Edit2} onClick={() => setIsEditProfileOpen(true)}>
                Edit Personal Info
              </Button>
            </div>
          </div>
        )}

        {/* 4.2 TAB: CONTACT INFORMATION */}
        {activeTab === 'contact' && (
          <div className="profile-tab-form-pane">
            <h4 className="form-section-header">Official Channels</h4>
            <div className="form-fields-grid">
              <div className="form-field-group">
                <label>Official Email (Verified ✅)</label>
                <input className="form-field-input" value={currentUser.officialEmail || currentUser.email} disabled />
              </div>
              <div className="form-field-group">
                <label>Official Mobile (Verified ✅)</label>
                <input className="form-field-input" value={currentUser.officialMobile || currentUser.phone} disabled />
              </div>
              <div className="form-field-group">
                <label>Extension Number</label>
                <input className="form-field-input" value="1025" disabled />
              </div>
            </div>

            <h4 className="form-section-header mt-4">Personal Contact Channels</h4>
            <div className="form-fields-grid">
              <div className="form-field-group">
                <label>Personal Email</label>
                <input
                  className="form-field-input"
                  value={contactForm.personalEmail}
                  onChange={(e) => setContactForm({ ...contactForm, personalEmail: e.target.value })}
                />
              </div>
              <div className="form-field-group">
                <label>Personal Mobile</label>
                <input
                  className="form-field-input"
                  value={contactForm.personalMobile}
                  onChange={(e) => setContactForm({ ...contactForm, personalMobile: e.target.value })}
                />
              </div>
              <div className="form-field-group">
                <label>Alternate Contact</label>
                <input
                  className="form-field-input"
                  value={contactForm.alternateContact}
                  onChange={(e) => setContactForm({ ...contactForm, alternateContact: e.target.value })}
                />
              </div>
            </div>

            <h4 className="form-section-header mt-4">Current Address</h4>
            <div className="form-fields-grid">
              <div className="form-field-group full-width">
                <label>Address Line 1</label>
                <input
                  className="form-field-input"
                  value={contactForm.currentAddress.line1}
                  onChange={(e) => setContactForm({
                    ...contactForm,
                    currentAddress: { ...contactForm.currentAddress, line1: e.target.value }
                  })}
                />
              </div>
              <div className="form-field-group">
                <label>City</label>
                <input
                  className="form-field-input"
                  value={contactForm.currentAddress.city}
                  onChange={(e) => setContactForm({
                    ...contactForm,
                    currentAddress: { ...contactForm.currentAddress, city: e.target.value }
                  })}
                />
              </div>
              <div className="form-field-group">
                <label>State</label>
                <input
                  className="form-field-input"
                  value={contactForm.currentAddress.state}
                  onChange={(e) => setContactForm({
                    ...contactForm,
                    currentAddress: { ...contactForm.currentAddress, state: e.target.value }
                  })}
                />
              </div>
              <div className="form-field-group">
                <label>Postal Code</label>
                <input
                  className="form-field-input"
                  value={contactForm.currentAddress.pincode}
                  onChange={(e) => setContactForm({
                    ...contactForm,
                    currentAddress: { ...contactForm.currentAddress, pincode: e.target.value }
                  })}
                />
              </div>
              <div className="form-field-group">
                <label>Country</label>
                <input className="form-field-input" value="India" disabled />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
              <input
                type="checkbox"
                id="sameAsCurrentCheck"
                checked={contactForm.sameAsCurrent}
                onChange={(e) => setContactForm({ ...contactForm, sameAsCurrent: e.target.checked })}
              />
              <label htmlFor="sameAsCurrentCheck" className="text-sm font-semibold text-text-secondary cursor-pointer">
                Permanent Address is same as Current Address
              </label>
            </div>

            {!contactForm.sameAsCurrent && (
              <>
                <h4 className="form-section-header mt-4">Permanent Address</h4>
                <div className="form-fields-grid">
                  <div className="form-field-group full-width">
                    <label>Address Line 1</label>
                    <input
                      className="form-field-input"
                      value={contactForm.permanentAddress.line1}
                      onChange={(e) => setContactForm({
                        ...contactForm,
                        permanentAddress: { ...contactForm.permanentAddress, line1: e.target.value }
                      })}
                    />
                  </div>
                  <div className="form-field-group">
                    <label>City</label>
                    <input
                      className="form-field-input"
                      value={contactForm.permanentAddress.city}
                      onChange={(e) => setContactForm({
                        ...contactForm,
                        permanentAddress: { ...contactForm.permanentAddress, city: e.target.value }
                      })}
                    />
                  </div>
                  <div className="form-field-group">
                    <label>State</label>
                    <input
                      className="form-field-input"
                      value={contactForm.permanentAddress.state}
                      onChange={(e) => setContactForm({
                        ...contactForm,
                        permanentAddress: { ...contactForm.permanentAddress, state: e.target.value }
                      })}
                    />
                  </div>
                  <div className="form-field-group">
                    <label>Postal Code</label>
                    <input
                      className="form-field-input"
                      value={contactForm.permanentAddress.pincode}
                      onChange={(e) => setContactForm({
                        ...contactForm,
                        permanentAddress: { ...contactForm.permanentAddress, pincode: e.target.value }
                      })}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="form-actions-strip">
              <Button variant="primary" icon={Save} onClick={() => saveContactDetails()}>
                Save Contact details
              </Button>
            </div>
          </div>
        )}

        {/* 4.3 TAB: DOCUMENTS */}
        {activeTab === 'documents' && (
          <div className="profile-tab-form-pane">
            <div className="flex-row justify-between items-center w-full gap-4 flex-wrap">
              <div className="topbar-search-bar" style={{ flex: 1, maxWidth: '400px' }}>
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by document name or type"
                  value={docSearchQuery}
                  onChange={(e) => setDocSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex-row gap-3">
                <Button variant="primary" icon={Plus} onClick={() => setIsUploadDocOpen(true)}>
                  Upload Document
                </Button>
                <Button variant="secondary" icon={Download} onClick={handleDownloadAll}>
                  Download All (ZIP)
                </Button>
              </div>
            </div>

            {/* Accordion Categories */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
              {/* Category 1: Personal Documents */}
              <div className="docs-category-section">
                <div 
                  className="docs-category-header"
                  onClick={() => setAccordionOpen({ ...accordionOpen, personal: !accordionOpen.personal })}
                >
                  <span className="docs-category-title"><User size={16} /> Personal Documents</span>
                  <ChevronDown size={16} style={{ transform: accordionOpen.personal ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </div>
                {accordionOpen.personal && (
                  <div className="docs-category-content-list">
                    {localDocs
                      .filter(d => ['aadhaar', 'pan', 'passport', 'license', 'custom'].includes(d.type))
                      .filter(d => !docSearchQuery || d.name.toLowerCase().includes(docSearchQuery.toLowerCase()))
                      .map(doc => (
                        <div key={doc.id} className="doc-record-row">
                          <div className="doc-meta-col">
                            <FileText size={18} className="text-primary" />
                            <div>
                              <div className="doc-name-txt">{doc.name}</div>
                              <span className="doc-uploaded-at">Uploaded at: {doc.uploadedAt}</span>
                            </div>
                          </div>
                          <div className="doc-actions-col">
                            {getDocStatusBadge(doc.status)}
                            <button className="action-btn-mini view-btn" title="View Document" onClick={() => { setPreviewDoc(doc); setIsViewDocOpen(true); }}><Eye size={12} /></button>
                            <button className="action-btn-mini edit-btn" title="Replace" onClick={() => setIsUploadDocOpen(true)}><RefreshCw size={12} /></button>
                            <button className="action-btn-mini danger-btn" title="Delete" onClick={() => deleteDocument(doc.id, doc.name)}><Trash2 size={12} /></button>
                          </div>
                        </div>
                      ))}
                    {localDocs.filter(d => ['aadhaar', 'pan', 'passport', 'license', 'custom'].includes(d.type)).length === 0 && (
                      <span className="text-muted text-xs italic p-4 text-center">No personal documents found.</span>
                    )}
                  </div>
                )}
              </div>

              {/* Category 2: Employment Documents */}
              <div className="docs-category-section">
                <div 
                  className="docs-category-header"
                  onClick={() => setAccordionOpen({ ...accordionOpen, employment: !accordionOpen.employment })}
                >
                  <span className="docs-category-title"><Briefcase size={16} /> Employment Documents</span>
                  <ChevronDown size={16} style={{ transform: accordionOpen.employment ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </div>
                {accordionOpen.employment && (
                  <div className="docs-category-content-list">
                    {localDocs
                      .filter(d => ['offer_letter', 'contract', 'promotion'].includes(d.type))
                      .filter(d => !docSearchQuery || d.name.toLowerCase().includes(docSearchQuery.toLowerCase()))
                      .map(doc => (
                        <div key={doc.id} className="doc-record-row">
                          <div className="doc-meta-col">
                            <FileText size={18} className="text-primary" />
                            <div>
                              <div className="doc-name-txt">{doc.name}</div>
                              <span className="doc-uploaded-at">Issued on: {doc.uploadedAt}</span>
                            </div>
                          </div>
                          <div className="doc-actions-col">
                            {getDocStatusBadge(doc.status || 'available')}
                            <button className="action-btn-mini view-btn" title="View Document" onClick={() => { setPreviewDoc(doc); setIsViewDocOpen(true); }}><Eye size={12} /></button>
                            <button className="action-btn-mini edit-btn" title="Download" onClick={() => handleDownloadAll()}><Download size={12} /></button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Category 3: Educational Documents */}
              <div className="docs-category-section">
                <div 
                  className="docs-category-header"
                  onClick={() => setAccordionOpen({ ...accordionOpen, educational: !accordionOpen.educational })}
                >
                  <span className="docs-category-title"><Landmark size={16} /> Educational Certificates</span>
                  <ChevronDown size={16} style={{ transform: accordionOpen.educational ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </div>
                {accordionOpen.educational && (
                  <div className="docs-category-content-list">
                    {localDocs
                      .filter(d => ['certificate', 'degree'].includes(d.type))
                      .filter(d => !docSearchQuery || d.name.toLowerCase().includes(docSearchQuery.toLowerCase()))
                      .map(doc => (
                        <div key={doc.id} className="doc-record-row">
                          <div className="doc-meta-col">
                            <FileText size={18} className="text-primary" />
                            <div>
                              <div className="doc-name-txt">{doc.name}</div>
                              <span className="doc-uploaded-at">Uploaded at: {doc.uploadedAt}</span>
                            </div>
                          </div>
                          <div className="doc-actions-col">
                            {getDocStatusBadge(doc.status)}
                            <button className="action-btn-mini view-btn" title="View Document" onClick={() => { setPreviewDoc(doc); setIsViewDocOpen(true); }}><Eye size={12} /></button>
                          </div>
                        </div>
                      ))}
                    {localDocs.filter(d => ['certificate', 'degree'].includes(d.type)).length === 0 && (
                      <span className="text-muted text-xs italic p-4 text-center">No certificates uploaded yet. Click Upload to add.</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 4.4 TAB: BANKING INFORMATION */}
        {activeTab === 'banking' && (
          <div className="profile-tab-form-pane">
            <div className="bank-verified-shield-banner">
              <Shield size={18} />
              <span>Direct Salary Deposit Verified Account ✅</span>
            </div>

            <h4 className="form-section-header">Salary Account Info</h4>
            <div className="form-fields-grid">
              <div className="form-field-group">
                <label>Account Holder Name</label>
                <input className="form-field-input" value={bankForm.accountName} disabled />
              </div>
              <div className="form-field-group">
                <label>Bank Name</label>
                <input className="form-field-input" value={bankForm.bankName || 'Not Verified'} disabled />
              </div>
              <div className="form-field-group">
                <label>Branch Name</label>
                <input className="form-field-input" value={bankForm.branch || '—'} disabled />
              </div>
              <div className="form-field-group">
                <label>Account Number (Masked)</label>
                <input 
                  className="form-field-input font-mono" 
                  value={bankForm.accountNumber ? `XXXXXX${bankForm.accountNumber.slice(-4)}` : '—'} 
                  disabled 
                />
              </div>
              <div className="form-field-group">
                <label>IFSC Code</label>
                <input className="form-field-input font-mono" value={bankForm.ifsc} disabled />
              </div>
              <div className="form-field-group">
                <label>UPI ID (Optional)</label>
                <input className="form-field-input" value={bankForm.upiId || '—'} disabled />
              </div>
            </div>

            <h4 className="form-section-header mt-4">Deposit Statistics</h4>
            <div className="form-fields-grid">
              <div className="form-field-group">
                <label>Salary Deposit Status</label>
                <div style={{ marginTop: '4px' }}><Badge variant="success">Active Depositing</Badge></div>
              </div>
              <div className="form-field-group">
                <label>Last Salary Credited Date</label>
                <input className="form-field-input" value="31 May 2026" disabled />
              </div>
              <div className="form-field-group">
                <label>Upcoming Payday</label>
                <input className="form-field-input" value="30 Jun 2026" disabled />
              </div>
            </div>

            <div className="form-actions-strip">
              <Button variant="primary" icon={Landmark} onClick={() => setIsUpdateBankOpen(true)}>
                Update Bank Details
              </Button>
            </div>
          </div>
        )}

        {/* 4.5 TAB: SECURITY SETTINGS */}
        {activeTab === 'security' && (
          <div className="profile-tab-form-pane">
            <h4 className="form-section-header">Sign In Credentials</h4>
            <div className="form-fields-grid">
              <div className="form-field-group">
                <label>Username</label>
                <input className="form-field-input" value={currentUser.name?.toLowerCase().replace(/ /g, '_') || 'user'} disabled />
              </div>
              <div className="form-field-group">
                <label>Employee ID</label>
                <input className="form-field-input" value={currentUser.employeeId} disabled />
              </div>
              <div className="form-field-group">
                <label>Assigned Permission Role</label>
                <input className="form-field-input" value={currentUserRole || 'employee'} disabled />
              </div>
            </div>

            <h4 className="form-section-header mt-4">Password Credentials</h4>
            <div className="form-fields-grid">
              <div className="form-field-group">
                <label>Last Changed</label>
                <span className="text-sm font-semibold text-text-primary">30 days ago</span>
              </div>
              <div className="form-field-group" style={{ display: 'flex', flexDirection: 'row', gap: '12px', alignItems: 'center' }}>
                <Button variant="secondary" icon={Lock} onClick={() => setIsChangePasswordOpen(true)}>
                  Change Password
                </Button>
                <Button variant="ghost" size="sm">
                  Send Reset Link
                </Button>
              </div>
            </div>

            <h4 className="form-section-header mt-4">Multi-Factor Authentication (MFA)</h4>
            <div className="tracker-categories-list">
              <div className="tracker-category-item" style={{ cursor: 'default' }}>
                <div className="tracker-cat-name-icon">
                  <CheckSquare size={14} className={currentUser.mfaEnabled?.email ? 'text-success' : 'text-muted'} />
                  <span>Email Verification OTP</span>
                </div>
                {currentUser.mfaEnabled?.email ? (
                  <Button variant="secondary" size="sm" onClick={() => disableMfaMethod('email')}>Disable</Button>
                ) : (
                  <Button variant="primary" size="sm" onClick={() => { setMfaMethod('email'); setIsMfaWizardOpen(true); }}>Enable</Button>
                )}
              </div>

              <div className="tracker-category-item" style={{ cursor: 'default' }}>
                <div className="tracker-cat-name-icon">
                  <CheckSquare size={14} className={currentUser.mfaEnabled?.mobile ? 'text-success' : 'text-muted'} />
                  <span>SMS/Mobile Verification OTP</span>
                </div>
                {currentUser.mfaEnabled?.mobile ? (
                  <Button variant="secondary" size="sm" onClick={() => disableMfaMethod('mobile')}>Disable</Button>
                ) : (
                  <Button variant="primary" size="sm" onClick={() => { setMfaMethod('mobile'); setIsMfaWizardOpen(true); }}>Enable</Button>
                )}
              </div>
            </div>

            <h4 className="form-section-header mt-4">Active Devices &amp; Security Audits</h4>
            <div className="docs-category-content-list" style={{ padding: 0 }}>
              {sessions.map(sess => (
                <div key={sess.id} className="doc-record-row">
                  <div className="doc-meta-col">
                    <Monitor size={18} className="text-primary" />
                    <div>
                      <div className="doc-name-txt">{sess.device}</div>
                      <span className="doc-uploaded-at">IP: {sess.ip} | Location: {sess.location} ({sess.status})</span>
                    </div>
                  </div>
                  {sess.status === 'Active Now' ? (
                    <Badge variant="success">Current Session</Badge>
                  ) : (
                    <Button variant="secondary" size="sm" onClick={() => revokeSession(sess.id, sess.device)}>Revoke Access</Button>
                  )}
                </div>
              ))}
            </div>

            <div className="form-actions-strip" style={{ justifyContent: 'space-between' }}>
              <Button variant="secondary" icon={Clock} onClick={() => setIsLoginHistoryOpen(true)}>
                Review Login History
              </Button>
              <Button variant="danger" icon={X} onClick={logoutAllOtherSessions}>
                Logout All Other Devices
              </Button>
            </div>
          </div>
        )}

        {/* 4.6 TAB: ACTIVITY TIMELINE */}
        {activeTab === 'activity' && (
          <div className="profile-tab-form-pane">
            <div className="flex-row justify-between items-center w-full gap-4 flex-wrap">
              <div className="topbar-search-bar" style={{ flex: 1, maxWidth: '300px' }}>
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Filter logs by keyword"
                  value={activitySearchQuery}
                  onChange={(e) => setActivitySearchQuery(e.target.value)}
                />
              </div>
              
              <div className="flex-row gap-3 flex-wrap">
                <select 
                  className="form-field-input" 
                  style={{ width: '150px' }}
                  value={activityTypeFilter}
                  onChange={(e) => setActivityTypeFilter(e.target.value)}
                >
                  <option value="All">All Types</option>
                  <option value="Profile">Profile Updates</option>
                  <option value="Documents">Documents</option>
                  <option value="Banking">Banking</option>
                  <option value="Security">Security</option>
                  <option value="Contact">Contacts</option>
                </select>

                <select 
                  className="form-field-input" 
                  style={{ width: '150px' }}
                  value={activityDateFilter}
                  onChange={(e) => setActivityDateFilter(e.target.value)}
                >
                  <option value="all">All Dates</option>
                  <option value="7days">Last 7 days</option>
                  <option value="30days">Last 30 days</option>
                  <option value="90days">Last 90 days</option>
                </select>

                <Button variant="secondary" icon={Download} onClick={handleExportActivitiesCSV}>
                  Export Log
                </Button>
              </div>
            </div>

            <div className="activity-timeline-strip">
              {filteredActivities.map(act => (
                <div key={act.id} className="timeline-record-item animate-fade-in">
                  <div className={`timeline-dot ${
                    act.action.includes('Password') || act.action.includes('MFA') ? 'danger' :
                    act.action.includes('Bank') ? 'success' : 'primary'
                  }`}></div>
                  <div className="timeline-item-meta">{act.date}</div>
                  <div className="timeline-item-title">{act.action}</div>
                  <div className="timeline-item-desc">{act.details}</div>
                </div>
              ))}
              {filteredActivities.length === 0 && (
                <span className="text-muted text-xs italic text-center p-6">No matching activity records found for this period.</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  </div>

      {/* ==================== 5. FOOTER ==================== */}
      <div className="profile-footer-panel">
        <div className="footer-meta-fields">
          <div className="footer-meta-field">Employee ID: <span>{currentUser.employeeId}</span></div>
          <div className="footer-meta-field">Department: <span>{currentUser.department || 'Operations'}</span></div>
          <div className="footer-meta-field">Branch Placement: <span>{currentUser.branch || 'Jaipur HQ'}</span></div>
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

      {/* ==================== MODAL: EDIT PROFILE ==================== */}
      <Modal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        title="Edit Personal Information"
        size="lg"
        footer={
          <div className="modal-actions-wrapper">
            <Button variant="secondary" onClick={() => setIsEditProfileOpen(false)}>Cancel</Button>
            <Button variant="primary" icon={Save} onClick={() => { savePersonalDetails(); setIsEditProfileOpen(false); }}>Save Changes</Button>
          </div>
        }
      >
        <div className="profile-tab-form-pane">
          <h4 className="form-section-header" style={{ marginTop: 0 }}>Identity Details</h4>
          <div className="form-fields-grid">
            <div className="form-field-group">
              <label>Full Name *</label>
              <input
                className="form-field-input"
                value={personalForm.name}
                onChange={(e) => setPersonalForm({ ...personalForm, name: e.target.value })}
                required
              />
            </div>
            <div className="form-field-group">
              <label>Marital Status</label>
              <select
                className="form-field-input"
                value={personalForm.maritalStatus}
                onChange={(e) => setPersonalForm({ ...personalForm, maritalStatus: e.target.value })}
              >
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
              </select>
            </div>
            <div className="form-field-group">
              <label>Gender</label>
              <select
                className="form-field-input"
                value={personalForm.gender}
                onChange={(e) => setPersonalForm({ ...personalForm, gender: e.target.value })}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-field-group">
              <label>Date of Birth</label>
              <input
                type="date"
                className="form-field-input"
                value={personalForm.dob}
                onChange={(e) => setPersonalForm({ ...personalForm, dob: e.target.value })}
              />
            </div>
            <div className="form-field-group">
              <label>Blood Group</label>
              <input
                className="form-field-input"
                value={personalForm.bloodGroup}
                onChange={(e) => setPersonalForm({ ...personalForm, bloodGroup: e.target.value })}
              />
            </div>
            <div className="form-field-group">
              <label>Nationality</label>
              <input
                className="form-field-input"
                value={personalForm.nationality}
                onChange={(e) => setPersonalForm({ ...personalForm, nationality: e.target.value })}
              />
            </div>
          </div>

          <h4 className="form-section-header mt-4">Emergency Contact Person</h4>
          <div className="form-fields-grid">
            <div className="form-field-group">
              <label>Full Name</label>
              <input
                className="form-field-input"
                value={personalForm.emergencyName}
                onChange={(e) => setPersonalForm({ ...personalForm, emergencyName: e.target.value })}
              />
            </div>
            <div className="form-field-group">
              <label>Relationship</label>
              <input
                className="form-field-input"
                value={personalForm.emergencyRelation}
                onChange={(e) => setPersonalForm({ ...personalForm, emergencyRelation: e.target.value })}
              />
            </div>
            <div className="form-field-group">
              <label>Mobile Number</label>
              <input
                className="form-field-input"
                value={personalForm.emergencyMobile}
                onChange={(e) => setPersonalForm({ ...personalForm, emergencyMobile: e.target.value })}
              />
            </div>
            <div className="form-field-group">
              <label>Alternate Mobile</label>
              <input
                className="form-field-input"
                value={personalForm.emergencyAlternate}
                onChange={(e) => setPersonalForm({ ...personalForm, emergencyAlternate: e.target.value })}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* ==================== MODAL: UPLOAD DOCUMENT ==================== */}
      <Modal
        isOpen={isUploadDocOpen}
        onClose={() => setIsUploadDocOpen(false)}
        title="Upload Document"
        size="md"
        footer={
          <div className="modal-actions-wrapper">
            <Button variant="secondary" onClick={() => setIsUploadDocOpen(false)}>Cancel</Button>
            <Button variant="primary" icon={Save} onClick={uploadNewDocument}>Upload Document</Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-field-group">
            <label>Document Category</label>
            <select
              className="form-field-input"
              value={uploadDocForm.category}
              onChange={(e) => setUploadDocForm({ ...uploadDocForm, category: e.target.value })}
            >
              <option value="Personal Documents">Personal Documents</option>
              <option value="Employment Documents">Employment Documents</option>
              <option value="Educational Documents">Educational Documents</option>
            </select>
          </div>

          <div className="form-field-group">
            <label>Document Type</label>
            <select
              className="form-field-input"
              value={uploadDocForm.docType}
              onChange={(e) => setUploadDocForm({ ...uploadDocForm, docType: e.target.value })}
            >
              <option value="Aadhaar Card">Aadhaar Card</option>
              <option value="PAN Card">PAN Card</option>
              <option value="Passport">Passport</option>
              <option value="Driving License">Driving License</option>
              <option value="Graduation Certificate">Graduation Certificate</option>
              <option value="Offer Letter">Offer Letter</option>
            </select>
          </div>

          <div className="document-uploader-mock-zone flex-column items-center justify-center" style={{ border: '2px dashed var(--border-color)', borderRadius: '10px', padding: '24px', textAlign: 'center' }}>
            <FileUp size={36} className="text-muted mb-2" />
            <p className="uploader-main-txt" style={{ fontSize: '0.88rem', fontWeight: 600 }}>Select simulated files to upload</p>
            <p className="uploader-sub-txt" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Only PDF, JPG and PNG are supported (Max 5MB)</p>
            
            <div className="simulated-upload-buttons-row mt-3 flex-row gap-2" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button type="button" className="mock-upload-btn" onClick={() => simulateFileUpload('PDF')}>Simulate PDF</button>
              <button type="button" className="mock-upload-btn" onClick={() => simulateFileUpload('PNG')}>Simulate PNG</button>
            </div>
            {uploadDocForm.fileName && (
              <span className="text-xs text-primary font-bold mt-2 block">Selected: {uploadDocForm.fileName}</span>
            )}
          </div>

          <div className="form-field-group">
            <label>Remarks</label>
            <textarea
              className="form-field-input"
              rows={2}
              value={uploadDocForm.remarks}
              onChange={(e) => setUploadDocForm({ ...uploadDocForm, remarks: e.target.value })}
              placeholder="Any additional details..."
            />
          </div>
        </div>
      </Modal>

      {/* ==================== MODAL: UPDATE BANK DETAILS ==================== */}
      <Modal
        isOpen={isUpdateBankOpen}
        onClose={() => setIsUpdateBankOpen(false)}
        title="Update Bank Account Details"
        size="md"
        footer={
          <div className="modal-actions-wrapper">
            <Button variant="secondary" onClick={() => setIsUpdateBankOpen(false)}>Cancel</Button>
            <Button variant="primary" icon={Save} onClick={saveBankDetails}>Save Bank Details</Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-field-group">
            <label>Account Holder Name *</label>
            <input
              className="form-field-input"
              value={bankForm.accountName}
              onChange={(e) => setBankForm({ ...bankForm, accountName: e.target.value })}
              required
            />
          </div>
          <div className="form-field-group">
            <label>Bank Name *</label>
            <input
              className="form-field-input"
              value={bankForm.bankName}
              onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
              required
            />
          </div>
          <div className="form-field-group">
            <label>Branch Name *</label>
            <input
              className="form-field-input"
              value={bankForm.branch}
              onChange={(e) => setBankForm({ ...bankForm, branch: e.target.value })}
              required
            />
          </div>
          <div className="form-field-group">
            <label>Account Number *</label>
            <input
              type="password"
              className="form-field-input"
              value={bankForm.accountNumber}
              onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
              required
            />
          </div>
          <div className="form-field-group">
            <label>Confirm Account Number *</label>
            <input
              className="form-field-input"
              value={bankForm.confirmAccountNumber}
              onChange={(e) => setBankForm({ ...bankForm, confirmAccountNumber: e.target.value })}
              required
            />
          </div>
          <div className="form-field-group">
            <label>IFSC Code *</label>
            <input
              className="form-field-input font-mono"
              maxLength={11}
              value={bankForm.ifsc}
              onChange={(e) => setBankForm({ ...bankForm, ifsc: e.target.value.toUpperCase() })}
              required
            />
          </div>
          <div className="form-field-group">
            <label>UPI ID (Optional)</label>
            <input
              className="form-field-input"
              value={bankForm.upiId}
              onChange={(e) => setBankForm({ ...bankForm, upiId: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      {/* ==================== MODAL: CHANGE PASSWORD ==================== */}
      <Modal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        title="Change Password"
        size="md"
        footer={
          <div className="modal-actions-wrapper">
            <Button variant="secondary" onClick={() => setIsChangePasswordOpen(false)}>Cancel</Button>
            <Button variant="primary" icon={Lock} onClick={handlePasswordSubmit}>Update Password</Button>
          </div>
        }
      >
        <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-field-group">
            <label>Current Password *</label>
            <input
              type="password"
              className="form-field-input"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              required
            />
          </div>
          <div className="form-field-group">
            <label>New Password *</label>
            <input
              type="password"
              className="form-field-input"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              required
            />
            {passwordForm.newPassword && (
              <div className="password-meter-bar">
                <div className={`password-meter-fill ${getPasswordStrength()}`}></div>
              </div>
            )}
            <span className="text-xs text-muted">Password must contain 8+ characters, capital letter, and a number.</span>
          </div>
          <div className="form-field-group">
            <label>Confirm New Password *</label>
            <input
              type="password"
              className="form-field-input"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              required
            />
          </div>
        </form>
      </Modal>

      {/* ==================== MODAL: ENABLE MFA ==================== */}
      <Modal
        isOpen={isMfaWizardOpen}
        onClose={() => { setIsMfaWizardOpen(false); setMfaStep(1); }}
        title="Enable Multi-Factor Authentication"
        size="md"
        footer={
          <div className="modal-actions-wrapper">
            <Button variant="secondary" onClick={() => { setIsMfaWizardOpen(false); setMfaStep(1); }}>Cancel</Button>
            <Button variant="primary" onClick={handleMfaSubmit}>
              {mfaStep === 1 ? 'Send Code' : 'Verify and Enable'}
            </Button>
          </div>
        }
      >
        {mfaStep === 1 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p className="text-sm text-text-secondary">
              Select verification method to secure your account updates:
            </p>
            <div className="tracker-categories-list">
              <div 
                className={`tracker-category-item ${mfaMethod === 'email' ? 'active' : ''}`}
                style={{ cursor: 'pointer', border: mfaMethod === 'email' ? '2px solid var(--color-primary)' : '1px solid var(--border-color)' }}
                onClick={() => setMfaMethod('email')}
              >
                <div className="tracker-cat-name-icon">
                  <Mail size={16} />
                  <span>Email Verification Code</span>
                </div>
              </div>
              <div 
                className={`tracker-category-item ${mfaMethod === 'mobile' ? 'active' : ''}`}
                style={{ cursor: 'pointer', border: mfaMethod === 'mobile' ? '2px solid var(--color-primary)' : '1px solid var(--border-color)' }}
                onClick={() => setMfaMethod('mobile')}
              >
                <div className="tracker-cat-name-icon">
                  <Phone size={16} />
                  <span>SMS Mobile Code</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p className="text-sm text-text-secondary">
              Enter the 6-digit confirmation code sent to your {mfaMethod}:
            </p>
            <div className="form-field-group">
              <input
                maxLength={6}
                placeholder="000000"
                className="form-field-input font-mono text-center text-lg font-bold"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
              />
              {mfaError && <span className="text-xs text-danger font-semibold">{mfaError}</span>}
            </div>
          </div>
        )}
      </Modal>

      {/* ==================== MODAL: VIEW DOCUMENT PREVIEW ==================== */}
      <Modal
        isOpen={isViewDocOpen}
        onClose={() => setIsViewDocOpen(false)}
        title={previewDoc ? previewDoc.name : 'Document Preview'}
        size="lg"
        footer={<Button variant="secondary" onClick={() => setIsViewDocOpen(false)}>Close Preview</Button>}
      >
        {previewDoc && (
          <div className="document-preview-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="document-verified-banner flex-row justify-between items-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px 16px' }}>
              <div className="flex-center gap-2">
                <FileText size={16} className="text-primary" />
                <span className="font-semibold text-sm">{previewDoc.fileName || `${previewDoc.name.toLowerCase().replace(/ /g, '_')}.pdf`}</span>
              </div>
              {getDocStatusBadge(previewDoc.status)}
            </div>

            <div className="mock-pdf-viewport flex-column items-center justify-center" style={{ height: '360px', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
              <FileUp size={48} className="text-muted mb-3" />
              <h4 style={{ fontWeight: 700 }}>Simulated Document Viewport</h4>
              <p className="text-xs text-muted max-w-sm mt-1 px-4">
                This viewport simulates the rendered secure document verification server for {previewDoc.name}. Cryptographic checksum keys verified successfully.
              </p>
              <div className="mt-4">
                <Button variant="secondary" icon={Download} onClick={handleDownloadAll}>Download Document</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ==================== MODAL: LOGIN HISTORY ==================== */}
      <Modal
        isOpen={isLoginHistoryOpen}
        onClose={() => setIsLoginHistoryOpen(false)}
        title="Review Account Login History"
        size="md"
        footer={<Button variant="secondary" onClick={() => setIsLoginHistoryOpen(false)}>Close Log</Button>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { date: '06 Jun 2026 09:15 AM', device: 'Chrome on Windows 11', ip: '192.168.1.15', status: 'Success' },
            { date: '05 Jun 2026 08:30 PM', device: 'Firefox on macOS', ip: '185.190.140.2', status: 'Success' },
            { date: '04 Jun 2026 10:10 AM', device: 'Safari on iPhone 15', ip: '103.88.22.41', status: 'Success' },
            { date: '02 Jun 2026 11:45 AM', device: 'Chrome on Windows 11', ip: '192.168.1.15', status: 'Failed Password', fail: true }
          ].map((log, idx) => (
            <div key={idx} style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-elevated)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="font-semibold text-sm text-text-primary">{log.device}</div>
                <div className="text-xs text-muted mt-1">IP: {log.ip} | Time: {log.date}</div>
              </div>
              <Badge variant={log.fail ? 'danger' : 'success'}>
                {log.status}
              </Badge>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default MyProfile;
