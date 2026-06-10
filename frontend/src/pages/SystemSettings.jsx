import React, { useState, useEffect } from 'react';
import './Settings.css';
import { useApp } from '../context/AppContext';
import Button from '../components/common/Button';
import {
  Settings, Bell, Shield, Globe, Palette, Database, Mail,
  Smartphone, Lock, Users, Save, RefreshCw, Check, ChevronRight,
  Moon, Sun, Zap, Type, Layout, Building2, GitMerge, Clock,
  CalendarDays, Briefcase, KanbanSquare, ShieldAlert, FileText,
  Share2, Activity, Play, Plus, Trash2, Eye, EyeOff, CheckCircle2,
  Cloud, Download, Upload, AlertCircle, Sparkles, Server, Cpu,
  ShieldCheck, HelpCircle, HardDrive, Key, Megaphone, Terminal
} from 'lucide-react';

const sidebarGroups = [
  {
    title: 'Organization',
    items: [
      { id: 'company', label: 'Company Profile', icon: Building2 },
      { id: 'structure', label: 'Structure & Teams', icon: GitMerge }
    ]
  },
  {
    title: 'Workforce & Policies',
    items: [
      { id: 'employee', label: 'Employee Settings', icon: Users },
      { id: 'attendance', label: 'Attendance Rules', icon: Clock },
      { id: 'leave', label: 'Leave Policies', icon: CalendarDays },
      { id: 'payroll', label: 'Payroll & Salaries', icon: DollarSignIcon }
    ]
  },
  {
    title: 'Operations',
    items: [
      { id: 'project', label: 'Project Config', icon: Briefcase },
      { id: 'task', label: 'Task Rules', icon: KanbanSquare },
      { id: 'workflow', label: 'Approval Matrices', icon: Share2 }
    ]
  },
  {
    title: 'Access & Security',
    items: [
      { id: 'roles', label: 'Roles & Access', icon: Lock },
      { id: 'security', label: 'Security & IPs', icon: Shield },
      { id: 'compliance', label: 'Audit & GDPR', icon: ShieldAlert }
    ]
  },
  {
    title: 'Branding & Theme',
    items: [
      { id: 'appearance', label: 'Branding & Theme', icon: Palette }
    ]
  },
  {
    title: 'Communications',
    items: [
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'announcements', label: 'Announcements', icon: Megaphone },
      { id: 'documents', label: 'File Upload Rules', icon: FileText }
    ]
  },
  {
    title: 'Gateway & Integrations',
    items: [
      { id: 'email', label: 'Email SMTP', icon: Mail },
      { id: 'sms', label: 'SMS Gateway', icon: Smartphone },
      { id: 'integrations', label: 'Integrations', icon: Zap },
      { id: 'backup', label: 'Backup & Restore', icon: Database }
    ]
  },
  {
    title: 'Exports & Activity',
    items: [
      { id: 'reports', label: 'Config Reports', icon: Download },
      { id: 'activity', label: 'Recent Activities', icon: Activity },
      { id: 'admin', label: 'Super Admin Center', icon: Sparkles }
    ]
  }
];

// Helper Lucide wrapper for DollarSign because of name conflicts sometimes
function DollarSignIcon(props) {
  return <Briefcase {...props} />;
}

const ToggleSwitch = ({ checked, onChange, label, desc }) => (
  <div className="setting-toggle-row">
    <div className="setting-toggle-info">
      <span className="setting-item-label">{label}</span>
      {desc && <span className="setting-item-desc">{desc}</span>}
    </div>
    <button
      className={`toggle-switch ${checked ? 'toggle-on' : ''}`}
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
    >
      <span className="toggle-thumb" />
    </button>
  </div>
);

const SettingsInput = ({ label, value, onChange, type = 'text', placeholder, disabled = false }) => (
  <div className="settings-field">
    <label className="settings-field-label">{label}</label>
    <input
      type={type}
      className="settings-input"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
    />
  </div>
);

const SettingsSelect = ({ label, value, onChange, options }) => (
  <div className="settings-field">
    <label className="settings-field-label">{label}</label>
    <select
      className="settings-input"
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      {options.map(opt => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  </div>
);

const countries = ['India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'United Arab Emirates', 'Singapore'];

const statesByCountry = {
  'India': ['Delhi', 'Haryana', 'Maharashtra', 'Karnataka', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh'],
  'United States': ['California', 'New York', 'Texas', 'Florida', 'Washington'],
  'United Kingdom': ['London', 'England', 'Scotland', 'Wales'],
  'Canada': ['Ontario', 'British Columbia', 'Quebec', 'Alberta'],
  'Australia': ['New South Wales', 'Victoria', 'Queensland', 'Western Australia'],
  'United Arab Emirates': ['Dubai', 'Abu Dhabi', 'Sharjah'],
  'Singapore': ['Central Region', 'East Region', 'North Region']
};

const citiesByState = {
  'Haryana': ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Rohtak'],
  'Delhi': ['New Delhi', 'Dwarka', 'Rohini', 'Saket'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Thane'],
  'Karnataka': ['Bangalore', 'Mysore', 'Hubli', 'Mangalore'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad'],
  'Uttar Pradesh': ['Noida', 'Ghaziabad', 'Lucknow', 'Kanpur'],
  'California': ['Los Angeles', 'San Francisco', 'San Diego', 'San Jose'],
  'New York': ['New York City', 'Buffalo', 'Rochester', 'Syracuse'],
  'Texas': ['Houston', 'Austin', 'Dallas', 'San Antonio'],
  'Florida': ['Miami', 'Orlando', 'Tampa', 'Jacksonville'],
  'Washington': ['Seattle', 'Spokane', 'Tacoma'],
  'London': ['London', 'Croydon', 'Ealing'],
  'England': ['Birmingham', 'Manchester', 'Leeds'],
  'Ontario': ['Toronto', 'Ottawa', 'Mississauga'],
  'British Columbia': ['Vancouver', 'Victoria', 'Burnaby'],
  'New South Wales': ['Sydney', 'Newcastle', 'Wollongong'],
  'Victoria': ['Melbourne', 'Geelong', 'Ballarat'],
  'Dubai': ['Dubai City', 'Jebel Ali'],
  'Abu Dhabi': ['Abu Dhabi City', 'Al Ain'],
  'Central Region': ['Singapore Downtown', 'Bukit Merah'],
  'East Region': ['Tampines', 'Bedok'],
  'North Region': ['Woodlands', 'Yishun']
};

const SystemSettings = () => {
  const {
    addToast,
    currentUser,
    currentUserRole,
    setCurrentUserRole,
    employees = [],
    // Theme
    theme,
    setThemeMode,
    // Appearance
    accentColor,
    setAccentColor,
    fontSize,
    setFontSize,
    sidebarDense,
    setSidebarDense,
    // Shared state contexts
    generalSettings,
    setGeneralSettings,
    notificationSettings,
    setNotificationSettings,
    securitySettings,
    setSecuritySettings,
  } = useApp();

  const [activeSection, setActiveSection] = useState('company');
  const [saved, setSaved] = useState(false);

  const handleCountryChange = (c) => {
    const newStates = statesByCountry[c] || [];
    const defaultState = newStates[0] || '';
    const newCities = citiesByState[defaultState] || [];
    const defaultCity = newCities[0] || '';
    setCompanyProfile(prev => ({
      ...prev,
      country: c,
      state: defaultState,
      city: defaultCity
    }));
  };

  const handleStateChange = (s) => {
    const newCities = citiesByState[s] || [];
    const defaultCity = newCities[0] || '';
    setCompanyProfile(prev => ({
      ...prev,
      state: s,
      city: defaultCity
    }));
  };

  // 1. Company Profile Settings
  const [companyProfile, setCompanyProfile] = useState(() => {
    const savedData = localStorage.getItem('saas_company_profile');
    return savedData ? JSON.parse(savedData) : {
      companyName: 'Office Management Pvt. Ltd.',
      regNumber: 'U72200DL2026PTC394850',
      gstNumber: '07AAAAA1111A1Z1',
      panNumber: 'AAAAA1111A',
      cinNumber: 'L72200DL2026PLC394850',
      websiteUrl: 'https://office-management.com',
      officialEmail: 'admin@saas.com',
      officialPhone: '+91 11 4050 6070',
      address: 'Plot No. 12, Sector 18, Udyog Vihar',
      city: 'Gurugram',
      state: 'Haryana',
      country: 'India',
      postalCode: '122008'
    };
  });

  // 2. Branch list state
  const [branches, setBranches] = useState(() => {
    const savedData = localStorage.getItem('saas_branches_config');
    return savedData ? JSON.parse(savedData) : [
      { code: 'BR-DEL', name: 'Delhi Head Office', manager: '', status: 'Active' },
      { code: 'BR-MUM', name: 'Mumbai Branch', manager: '', status: 'Active' },
      { code: 'BR-BLR', name: 'Bangalore Tech Center', manager: '', status: 'Active' },
      { code: 'BR-JPR', name: 'Jaipur Operations', manager: '', status: 'Active' }
    ];
  });
  const [newBranch, setNewBranch] = useState({ code: '', name: '', manager: '', status: 'Active' });

  // 3. Departments list state
  const [departments, setDepartments] = useState(() => {
    const savedData = localStorage.getItem('saas_depts_config');
    return savedData ? JSON.parse(savedData) : [
      { id: '1', name: 'Engineering', head: '', capacity: 150 },
      { id: '2', name: 'Human Resources', head: '', capacity: 30 },
      { id: '3', name: 'Sales & Marketing', head: '', capacity: 80 },
      { id: '4', name: 'Operations', head: '', capacity: 120 },
      { id: '5', name: 'Finance', head: '', capacity: 25 }
    ];
  });
  const [newDept, setNewDept] = useState({ name: '', head: '', capacity: 50 });

  // 4. Employee Rules
  const [empSettings, setEmpSettings] = useState(() => {
    const savedData = localStorage.getItem('saas_emp_settings');
    return savedData ? JSON.parse(savedData) : {
      autoIdGen: true,
      idPrefix: 'EMP-',
      idSuffix: '-2026',
      startingSeq: '001',
      idType: 'Branch-Based',
      activeStatus: true,
      probationStatus: true,
      confirmedStatus: true,
      noticeStatus: true,
      resignedStatus: true,
      terminatedStatus: true
    };
  });

  // 5. Attendance Rules
  const [attendanceRules, setAttendanceRules] = useState(() => {
    const savedData = localStorage.getItem('saas_attendance_rules');
    return savedData ? JSON.parse(savedData) : {
      dailyHours: 8,
      weeklyHours: 40,
      shiftRules: 'Fixed Shift Rules',
      startTime: '09:00',
      endTime: '18:00',
      gracePeriod: 15,
      lateMarkLimit: 30,
      halfDayLimit: 120,
      overtimeRate: 1.5,
      autoPunchOut: true,
      punchOutTime: '21:00',
      attendanceReminders: true,
      missingAlerts: true
    };
  });

  // 6. Leave Rules
  const [leaveRules, setLeaveRules] = useState(() => {
    const savedData = localStorage.getItem('saas_leave_rules');
    return savedData ? JSON.parse(savedData) : {
      clBalance: 12,
      slBalance: 10,
      elBalance: 15,
      maternityBalance: 90,
      paternityBalance: 15,
      wfhBalance: 24,
      carryForwardLimit: 5,
      encashmentAllowed: true,
      holidayAdjustment: true
    };
  });

  // 7. Payroll Components
  const [payrollRules, setPayrollRules] = useState(() => {
    const savedData = localStorage.getItem('saas_payroll_rules');
    return savedData ? JSON.parse(savedData) : {
      cycle: 'Monthly Payroll',
      basicSalaryPct: 50,
      hraPct: 20,
      conveyanceFlat: 1600,
      medicalFlat: 1250,
      pfPct: 12,
      esiPct: 0.75,
      tdsFlat: 0,
      overtimeMultiplier: 1.5,
      holidayMultiplier: 2.0
    };
  });

  // 8. Project / Tasks
  const [projectRules, setProjectRules] = useState(() => {
    const savedData = localStorage.getItem('saas_project_rules');
    return savedData ? JSON.parse(savedData) : {
      stages: 'Backlog, Design, In Progress, QA, Completed',
      milestonesRequired: true,
      approvalRequired: true,
      priorityCritical: true,
      priorityHigh: true,
      priorityMedium: true,
      priorityLow: true,
      overdueTaskHours: 24,
      escalationLevel: 'Project Manager'
    };
  });

  // 9. Document Configs
  const [docRules, setDocRules] = useState(() => {
    const savedData = localStorage.getItem('saas_doc_rules');
    return savedData ? JSON.parse(savedData) : {
      pdfAllowed: true,
      docxAllowed: true,
      xlsxAllowed: true,
      pngAllowed: true,
      maxFileSize: 10,
      storageLimit: 50,
      retentionYears: 5,
      autoArchive: true
    };
  });

  // 10. SMTP Gateway Details
  const [smtpConfig, setSmtpConfig] = useState(() => {
    const savedData = localStorage.getItem('saas_smtp_config');
    return savedData ? JSON.parse(savedData) : {
      host: 'smtp.saasenterprise.com',
      port: '587',
      senderEmail: 'notifications@saasenterprise.com',
      authRequired: true,
      username: 'smtp_auth_user',
      password: '••••••••••••••••'
    };
  });

  // 11. SMS Gateway Settings
  const [smsConfig, setSmsConfig] = useState(() => {
    const savedData = localStorage.getItem('saas_sms_config');
    return savedData ? JSON.parse(savedData) : {
      provider: 'Twilio Gateway API',
      apiKey: 'SK-a9f8b7c6d5e4f3a2b1c0d9e8f7a6b5c4',
      senderId: 'SAASER',
      gatewayUrl: 'https://api.twilio.com/2010-04-01/Accounts/'
    };
  });

  // 12. Local drafts synced to AppContext
  const [localGeneral, setLocalGeneral] = useState(generalSettings);
  const [localNotif, setLocalNotif] = useState(notificationSettings);
  const [localSecurity, setLocalSecurity] = useState(securitySettings);

  const updateLocalGeneral = (key, val) => setLocalGeneral(p => ({ ...p, [key]: val }));
  const updateLocalNotif = (key, val) => setLocalNotif(p => ({ ...p, [key]: val }));
  const updateLocalSecurity = (key, val) => setLocalSecurity(p => ({ ...p, [key]: val }));

  // Synchronize localGeneral on generalSettings changes
  useEffect(() => {
    setLocalGeneral(generalSettings);
  }, [generalSettings]);

  const handleSave = () => {
    // 1. Save global contexts
    setGeneralSettings({
      ...generalSettings,
      companyName: companyProfile.companyName,
      ...localGeneral
    });
    setNotificationSettings(localNotif);
    setSecuritySettings(localSecurity);

    // 2. Save local configurations to localStorage
    localStorage.setItem('saas_company_profile', JSON.stringify(companyProfile));
    localStorage.setItem('saas_branches_config', JSON.stringify(branches));
    localStorage.setItem('saas_depts_config', JSON.stringify(departments));
    localStorage.setItem('saas_emp_settings', JSON.stringify(empSettings));
    localStorage.setItem('saas_attendance_rules', JSON.stringify(attendanceRules));
    localStorage.setItem('saas_leave_rules', JSON.stringify(leaveRules));
    localStorage.setItem('saas_payroll_rules', JSON.stringify(payrollRules));
    localStorage.setItem('saas_project_rules', JSON.stringify(projectRules));
    localStorage.setItem('saas_doc_rules', JSON.stringify(docRules));
    localStorage.setItem('saas_smtp_config', JSON.stringify(smtpConfig));
    localStorage.setItem('saas_sms_config', JSON.stringify(smsConfig));

    setSaved(true);
    addToast('success', 'All system configurations persisted successfully!');
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to restore default system configuration? All custom changes will be overwritten.')) {
      localStorage.removeItem('saas_company_profile');
      localStorage.removeItem('saas_branches_config');
      localStorage.removeItem('saas_depts_config');
      localStorage.removeItem('saas_emp_settings');
      localStorage.removeItem('saas_attendance_rules');
      localStorage.removeItem('saas_leave_rules');
      localStorage.removeItem('saas_payroll_rules');
      localStorage.removeItem('saas_project_rules');
      localStorage.removeItem('saas_doc_rules');
      localStorage.removeItem('saas_smtp_config');
      localStorage.removeItem('saas_sms_config');

      // Reset local react hooks
      setCompanyProfile({
        companyName: 'Office Management Pvt. Ltd.',
        regNumber: 'U72200DL2026PTC394850',
        gstNumber: '07AAAAA1111A1Z1',
        panNumber: 'AAAAA1111A',
        cinNumber: 'L72200DL2026PLC394850',
        websiteUrl: 'https://office-management.com',
        officialEmail: 'admin@saas.com',
        officialPhone: '+91 11 4050 6070',
        address: 'Plot No. 12, Sector 18, Udyog Vihar',
        city: 'Gurugram',
        state: 'Haryana',
        country: 'India',
        postalCode: '122008'
      });
      setBranches([
        { code: 'BR-DEL', name: 'Delhi Head Office', manager: '', status: 'Active' },
        { code: 'BR-MUM', name: 'Mumbai Branch', manager: '', status: 'Active' },
        { code: 'BR-BLR', name: 'Bangalore Tech Center', manager: '', status: 'Active' },
        { code: 'BR-JPR', name: 'Jaipur Operations', manager: '', status: 'Active' }
      ]);
      setDepartments([
        { id: '1', name: 'Engineering', head: '', capacity: 150 },
        { id: '2', name: 'Human Resources', head: '', capacity: 30 },
        { id: '3', name: 'Sales & Marketing', head: '', capacity: 80 },
        { id: '4', name: 'Operations', head: '', capacity: 120 },
        { id: '5', name: 'Finance', head: '', capacity: 25 }
      ]);
      
      const defaultGeneral = {
        companyName: 'Office Management Pvt. Ltd.',
        timezone: 'IST (UTC+5:30)',
        language: 'English (IN)',
        dateFormat: 'DD-MM-YYYY',
        currency: 'INR (₹)',
        fiscalYear: 'January'
      };
      const defaultNotif = {
        emailNotifs: true,
        pushNotifs: true,
        leaveAlerts: true,
        payrollAlerts: true,
        securityAlerts: true,
        weeklyDigest: false
      };
      const defaultSecurity = {
        twoFactor: false,
        sessionTimeout: '30 minutes',
        loginAlerts: true,
        ipWhitelist: ''
      };

      setLocalGeneral(defaultGeneral);
      setLocalNotif(defaultNotif);
      setLocalSecurity(defaultSecurity);

      setGeneralSettings(defaultGeneral);
      setNotificationSettings(defaultNotif);
      setSecuritySettings(defaultSecurity);

      setThemeMode('dark');
      setAccentColor('#d946ef');
      setFontSize('medium');
      setSidebarDense(false);

      addToast('info', 'System settings reverted to standard default state.');
    }
  };

  // Quick actions simulations
  const handleTestNotifications = () => {
    addToast('info', 'Sending diagnostic test notifications to all active channels...');
    setTimeout(() => {
      addToast('success', '📧 Diagnostic Email sent successfully to admin@saas.com.');
    }, 600);
    setTimeout(() => {
      addToast('success', '💬 Test SMS payload delivered through Twilio Gateway.');
    }, 1200);
  };

  const handleCreateBackup = () => {
    addToast('info', 'Executing full database cluster dump...');
    setTimeout(() => {
      addToast('success', '📦 Backup archive ERP_DUMP_20260605.tar.gz created (458.2 MB).');
    }, 1500);
  };

  const handleRestoreBackup = () => {
    if (window.confirm('WARNING: Restoring database will overwrite all active transactions. Continue?')) {
      addToast('info', 'Initializing database transaction rollback sequence...');
      setTimeout(() => {
        addToast('success', '✅ System schema restored successfully (1,452 tables synchronized).');
      }, 2000);
    }
  };

  const handleExportConfig = () => {
    const configExport = {
      version: '1.0.0-enterprise',
      exportedAt: new Date().toISOString(),
      companyProfile,
      branches,
      departments,
      empSettings,
      attendanceRules,
      leaveRules,
      payrollRules,
      projectRules,
      docRules,
      smtpConfig,
      smsConfig,
      generalSettings,
      notificationSettings,
      securitySettings
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(configExport, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `erp_config_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addToast('success', 'System JSON Configuration schema exported successfully!');
  };

  // Access check
  if (currentUserRole !== 'super_admin') {
    return (
      <div className="settings-page">
        <div className="settings-header">
          <h2>Master Control Panel</h2>
          <p>System settings administrative config dashboard.</p>
        </div>
        <div className="card settings-access-denied animate-fade-in">
          <div className="denied-icon-wrap">
            <Lock size={64} className="text-danger" />
          </div>
          <h3>Super Admin Access Required</h3>
          <p>
            You are logged in as a <strong>{currentUserRole?.toUpperCase()?.replace('_', ' ') || 'Guest'}</strong>. 
            Only users with the role of <strong>Super Admin</strong> are authorized to view and modify system-wide configuration metrics.
          </p>
          <div className="denied-actions">
            <Button variant="primary" onClick={() => setCurrentUserRole('super_admin')}>
              <Sparkles size={16} /> Switch to Super Admin
            </Button>
            <Button variant="ghost" onClick={() => window.history.back()}>
              Return Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Branch managers helper add
  const addBranchRow = (e) => {
    e.preventDefault();
    if (!newBranch.code || !newBranch.name || !newBranch.manager) {
      addToast('error', 'Please fill all branch details.');
      return;
    }
    setBranches(prev => [...prev, newBranch]);
    setNewBranch({ code: '', name: '', manager: '', status: 'Active' });
    addToast('success', `Branch ${newBranch.name} added. Click Save to persist.`);
  };

  const removeBranchRow = (code) => {
    setBranches(prev => prev.filter(b => b.code !== code));
    addToast('info', 'Branch queued for removal. Click Save to persist.');
  };

  // Department setup helper
  const addDeptRow = (e) => {
    e.preventDefault();
    if (!newDept.name || !newDept.head) {
      addToast('error', 'Please fill department name and assigned Head.');
      return;
    }
    const id = (departments.length + 1).toString();
    setDepartments(prev => [...prev, { ...newDept, id }]);
    setNewDept({ name: '', head: '', capacity: 50 });
    addToast('success', `Department ${newDept.name} added. Click Save to persist.`);
  };

  const removeDeptRow = (id) => {
    setDepartments(prev => prev.filter(d => d.id !== id));
    addToast('info', 'Department queued for removal. Click Save to persist.');
  };

  // switch-case for rendering the tabs
  const renderSection = () => {
    switch (activeSection) {
      case 'company':
        return (
          <div className="settings-section-content">
            <h3 className="settings-section-title">Company Profile Settings</h3>
            <p className="settings-section-desc">Manage basic company identification records, taxation codes, and registry information.</p>

            <div className="settings-group">
              <h4 className="settings-group-title">Company Information</h4>
              <div className="settings-fields-grid">
                <SettingsInput
                  label="Company Name"
                  value={companyProfile.companyName}
                  onChange={v => setCompanyProfile(p => ({ ...p, companyName: v }))}
                  placeholder="Office Management Pvt. Ltd."
                />
                <SettingsInput
                  label="Company Website URL"
                  value={companyProfile.websiteUrl}
                  onChange={v => setCompanyProfile(p => ({ ...p, websiteUrl: v }))}
                  placeholder="https://office-management.com"
                />
                <SettingsInput
                  label="Official Contact Email"
                  value={companyProfile.officialEmail}
                  onChange={v => setCompanyProfile(p => ({ ...p, officialEmail: v }))}
                  placeholder="info@office-management.com"
                />
                <SettingsInput
                  label="Official Contact Number"
                  value={companyProfile.officialPhone}
                  onChange={v => setCompanyProfile(p => ({ ...p, officialPhone: v }))}
                  placeholder="+91 11 4050 6070"
                />
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">Taxation & Corporate Numbers</h4>
              <div className="settings-fields-grid">
                <SettingsInput
                  label="Corporate Registration Number"
                  value={companyProfile.regNumber}
                  onChange={v => setCompanyProfile(p => ({ ...p, regNumber: v }))}
                  placeholder="U72200DL2026PTC394850"
                />
                <SettingsInput
                  label="GSTIN Number"
                  value={companyProfile.gstNumber}
                  onChange={v => setCompanyProfile(p => ({ ...p, gstNumber: v }))}
                  placeholder="07AAAAA1111A1Z1"
                />
                <SettingsInput
                  label="PAN Number"
                  value={companyProfile.panNumber}
                  onChange={v => setCompanyProfile(p => ({ ...p, panNumber: v }))}
                  placeholder="AAAAA1111A"
                />
                <SettingsInput
                  label="CIN Number"
                  value={companyProfile.cinNumber}
                  onChange={v => setCompanyProfile(p => ({ ...p, cinNumber: v }))}
                  placeholder="L72200DL2026PLC394850"
                />
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">Head Office Location Details</h4>
              <div className="settings-fields-grid">
                <div className="settings-field full-row">
                  <label className="settings-field-label">Address</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={companyProfile.address}
                    onChange={e => setCompanyProfile(p => ({ ...p, address: e.target.value }))}
                    placeholder="Plot No. 12, Sector 18, Udyog Vihar"
                  />
                </div>
                <SettingsSelect
                  label="Country"
                  value={companyProfile.country}
                  onChange={handleCountryChange}
                  options={countries}
                />
                <SettingsSelect
                  label="State / Province"
                  value={companyProfile.state}
                  onChange={handleStateChange}
                  options={statesByCountry[companyProfile.country] || []}
                />
                <SettingsSelect
                  label="City"
                  value={companyProfile.city}
                  onChange={v => setCompanyProfile(p => ({ ...p, city: v }))}
                  options={citiesByState[companyProfile.state] || []}
                />
                <SettingsInput
                  label="Postal Code / PIN"
                  value={companyProfile.postalCode}
                  onChange={v => setCompanyProfile(p => ({ ...p, postalCode: v }))}
                  placeholder="122008"
                />
              </div>
            </div>
          </div>
        );

      case 'structure':
        return (
          <div className="settings-section-content">
            <h3 className="settings-section-title">Organization Structure & Branches</h3>
            <p className="settings-section-desc">Manage regional branches and organizational department setups.</p>

            <div className="settings-group">
              <h4 className="settings-group-title">Branch Setup Configurations</h4>
              <div className="table-responsive">
                <table className="settings-data-table">
                  <thead>
                    <tr>
                      <th>Branch Code</th>
                      <th>Branch Name</th>
                      <th>Branch Manager</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branches.map(b => (
                      <tr key={b.code}>
                        <td><span className="font-mono text-primary">{b.code}</span></td>
                        <td>{b.name}</td>
                        <td>{b.manager}</td>
                        <td><span className="badge badge-success">{b.status}</span></td>
                        <td>
                          <button className="settings-delete-row-btn" onClick={() => removeBranchRow(b.code)}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add branch */}
              <form onSubmit={addBranchRow} className="settings-inline-form">
                <input
                  type="text"
                  placeholder="Code (e.g. BR-HYD)"
                  value={newBranch.code}
                  onChange={e => setNewBranch(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                  className="settings-input"
                />
                <input
                  type="text"
                  placeholder="Branch Location Name"
                  value={newBranch.name}
                  onChange={e => setNewBranch(p => ({ ...p, name: e.target.value }))}
                  className="settings-input"
                />
                <select
                  value={newBranch.manager}
                  onChange={e => setNewBranch(p => ({ ...p, manager: e.target.value }))}
                  className="settings-input"
                >
                  <option value="">Select Branch Manager</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.name}>
                      {emp.name} ({emp.designation || emp.role})
                    </option>
                  ))}
                </select>
                <button type="submit" className="settings-inline-add-btn">
                  <Plus size={16} /> Add Branch
                </button>
              </form>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">Departments Setup</h4>
              <div className="table-responsive">
                <table className="settings-data-table">
                  <thead>
                    <tr>
                      <th>Dept ID</th>
                      <th>Department Name</th>
                      <th>Department Head (HOD)</th>
                      <th>Max Seat Capacity</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map(d => (
                      <tr key={d.id}>
                        <td><span className="font-mono text-muted">#{d.id}</span></td>
                        <td><strong>{d.name}</strong></td>
                        <td>{d.head}</td>
                        <td>{d.capacity} active seats</td>
                        <td>
                          <button className="settings-delete-row-btn" onClick={() => removeDeptRow(d.id)}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add dept */}
              <form onSubmit={addDeptRow} className="settings-inline-form">
                <input
                  type="text"
                  placeholder="Department Name"
                  value={newDept.name}
                  onChange={e => setNewDept(p => ({ ...p, name: e.target.value }))}
                  className="settings-input"
                />
                <select
                  value={newDept.head}
                  onChange={e => setNewDept(p => ({ ...p, head: e.target.value }))}
                  className="settings-input"
                >
                  <option value="">Select Department Head (HOD)</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.name}>
                      {emp.name} ({emp.designation || emp.role})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Capacity"
                  value={newDept.capacity || ''}
                  onChange={e => setNewDept(p => ({ ...p, capacity: parseInt(e.target.value) || 0 }))}
                  className="settings-input"
                />
                <button type="submit" className="settings-inline-add-btn">
                  <Plus size={16} /> Add Dept
                </button>
              </form>
            </div>
          </div>
        );

      case 'employee':
        return (
          <div className="settings-section-content">
            <h3 className="settings-section-title">Employee Settings</h3>
            <p className="settings-section-desc">Configure system-wide employee status options, ID generation schemes, and probation rules.</p>

            <div className="settings-group">
              <h4 className="settings-group-title">Employee ID Generation Settings</h4>
              <ToggleSwitch
                checked={empSettings.autoIdGen}
                onChange={v => setEmpSettings(p => ({ ...p, autoIdGen: v }))}
                label="Automatic Employee ID Generation"
                desc="Generate new employee code numbers dynamically on profile registration"
              />
              {empSettings.autoIdGen && (
                <div className="settings-fields-grid">
                  <SettingsInput
                    label="Code Prefix Prefix"
                    value={empSettings.idPrefix}
                    onChange={v => setEmpSettings(p => ({ ...p, idPrefix: v }))}
                    placeholder="EMP-"
                  />
                  <SettingsInput
                    label="Code Suffix Pattern"
                    value={empSettings.idSuffix}
                    onChange={v => setEmpSettings(p => ({ ...p, idSuffix: v }))}
                    placeholder="-2026"
                  />
                  <SettingsInput
                    label="Starting Sequence"
                    value={empSettings.startingSeq}
                    onChange={v => setEmpSettings(p => ({ ...p, startingSeq: v }))}
                    placeholder="001"
                  />
                  <div className="settings-field">
                    <label className="settings-field-label">ID Generation Logic</label>
                    <select
                      className="settings-input"
                      value={empSettings.idType}
                      onChange={e => setEmpSettings(p => ({ ...p, idType: e.target.value }))}
                    >
                      <option value="Sequential Global">Sequential Global</option>
                      <option value="Branch-Based">Branch-Based (e.g. DEL-001)</option>
                      <option value="Department-Based">Department-Based (e.g. ENG-001)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">Active Employee Status Options</h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '-4px 0 8px' }}>
                Toggle which status values are available in the employee profiles.
              </p>
              <ToggleSwitch
                checked={empSettings.activeStatus}
                onChange={v => setEmpSettings(p => ({ ...p, activeStatus: v }))}
                label="Active Status"
                desc="Employee is working and actively executing daily transactions"
              />
              <ToggleSwitch
                checked={empSettings.probationStatus}
                onChange={v => setEmpSettings(p => ({ ...p, probationStatus: v }))}
                label="Probation Status"
                desc="Newly recruited employee undergoing evaluation"
              />
              <ToggleSwitch
                checked={empSettings.confirmedStatus}
                onChange={v => setEmpSettings(p => ({ ...p, confirmedStatus: v }))}
                label="Confirmed Status"
                desc="Regular full-time employee with completed probation"
              />
              <ToggleSwitch
                checked={empSettings.noticeStatus}
                onChange={v => setEmpSettings(p => ({ ...p, noticeStatus: v }))}
                label="Notice Period Status"
                desc="Employee in transition / serving resignation period"
              />
              <ToggleSwitch
                checked={empSettings.resignedStatus}
                onChange={v => setEmpSettings(p => ({ ...p, resignedStatus: v }))}
                label="Resigned"
                desc="Inactive employee with voluntary resignation"
              />
              <ToggleSwitch
                checked={empSettings.terminatedStatus}
                onChange={v => setEmpSettings(p => ({ ...p, terminatedStatus: v }))}
                label="Terminated"
                desc="Inactive employee with system-enforced termination"
              />
            </div>
          </div>
        );

      case 'attendance':
        return (
          <div className="settings-section-content">
            <h3 className="settings-section-title">Attendance Settings</h3>
            <p className="settings-section-desc">Define working hour metrics, shifts, grace limits, late checkins, and automated punches.</p>

            <div className="settings-group">
              <h4 className="settings-group-title">Working Hours Configuration</h4>
              <div className="settings-fields-grid">
                <SettingsInput
                  label="Daily Working Hours"
                  type="number"
                  value={attendanceRules.dailyHours}
                  onChange={v => setAttendanceRules(p => ({ ...p, dailyHours: parseFloat(v) || 0 }))}
                />
                <SettingsInput
                  label="Weekly Working Hours"
                  type="number"
                  value={attendanceRules.weeklyHours}
                  onChange={v => setAttendanceRules(p => ({ ...p, weeklyHours: parseFloat(v) || 0 }))}
                />
                <div className="settings-field">
                  <label className="settings-field-label">Shift Rules</label>
                  <select
                    className="settings-input"
                    value={attendanceRules.shiftRules}
                    onChange={e => setAttendanceRules(p => ({ ...p, shiftRules: e.target.value }))}
                  >
                    <option value="Fixed Shift Rules">Fixed Shift Rules</option>
                    <option value="Flexible Shift Rules">Flexible Shift Rules</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">Punch In / Punch Out Constraints</h4>
              <div className="settings-fields-grid">
                <SettingsInput
                  label="Office Start Time"
                  type="time"
                  value={attendanceRules.startTime}
                  onChange={v => setAttendanceRules(p => ({ ...p, startTime: v }))}
                />
                <SettingsInput
                  label="Office End Time"
                  type="time"
                  value={attendanceRules.endTime}
                  onChange={v => setAttendanceRules(p => ({ ...p, endTime: v }))}
                />
                <SettingsInput
                  label="Grace Period (Minutes)"
                  type="number"
                  value={attendanceRules.gracePeriod}
                  onChange={v => setAttendanceRules(p => ({ ...p, gracePeriod: parseInt(v) || 0 }))}
                />
                <SettingsInput
                  label="Late Mark Rules Threshold (Minutes)"
                  type="number"
                  value={attendanceRules.lateMarkLimit}
                  onChange={v => setAttendanceRules(p => ({ ...p, lateMarkLimit: parseInt(v) || 0 }))}
                />
                <SettingsInput
                  label="Half-Day Rules Threshold (Minutes)"
                  type="number"
                  value={attendanceRules.halfDayLimit}
                  onChange={v => setAttendanceRules(p => ({ ...p, halfDayLimit: parseInt(v) || 0 }))}
                />
                <SettingsInput
                  label="Overtime Hourly Multiplier Rate"
                  type="number"
                  value={attendanceRules.overtimeRate}
                  onChange={v => setAttendanceRules(p => ({ ...p, overtimeRate: parseFloat(v) || 1.0 }))}
                />
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">Attendance Automation Policies</h4>
              <ToggleSwitch
                checked={attendanceRules.autoPunchOut}
                onChange={v => setAttendanceRules(p => ({ ...p, autoPunchOut: v }))}
                label="Auto Punch-Out"
                desc="Automatically punch out employees who forget to clock out"
              />
              {attendanceRules.autoPunchOut && (
                <SettingsInput
                  label="Auto Punch-Out Cutoff Time"
                  type="time"
                  value={attendanceRules.punchOutTime}
                  onChange={v => setAttendanceRules(p => ({ ...p, punchOutTime: v }))}
                />
              )}
              <ToggleSwitch
                checked={attendanceRules.attendanceReminders}
                onChange={v => setAttendanceRules(p => ({ ...p, attendanceReminders: v }))}
                label="Attendance Reminder Prompts"
                desc="Send push notifications to punch-in on workday start"
              />
              <ToggleSwitch
                checked={attendanceRules.missingAlerts}
                onChange={v => setAttendanceRules(p => ({ ...p, missingAlerts: v }))}
                label="Missing Attendance Alerts"
                desc="Trigger notification to HOD on employee absent status"
              />
            </div>
          </div>
        );

      case 'leave':
        return (
          <div className="settings-section-content">
            <h3 className="settings-section-title">Leave Policies & Quotas</h3>
            <p className="settings-section-desc">Manage leave rules, carry forwards, encashment, and annual limits for all leave types.</p>

            <div className="settings-group">
              <h4 className="settings-group-title">Annual Leave Balances (Days)</h4>
              <div className="settings-fields-grid">
                <SettingsInput
                  label="Casual Leave (CL) Balance"
                  type="number"
                  value={leaveRules.clBalance}
                  onChange={v => setLeaveRules(p => ({ ...p, clBalance: parseInt(v) || 0 }))}
                />
                <SettingsInput
                  label="Sick Leave (SL) Balance"
                  type="number"
                  value={leaveRules.slBalance}
                  onChange={v => setLeaveRules(p => ({ ...p, slBalance: parseInt(v) || 0 }))}
                />
                <SettingsInput
                  label="Earned Leave (EL) Balance"
                  type="number"
                  value={leaveRules.elBalance}
                  onChange={v => setLeaveRules(p => ({ ...p, elBalance: parseInt(v) || 0 }))}
                />
                <SettingsInput
                  label="Maternity Leave Balance"
                  type="number"
                  value={leaveRules.maternityBalance}
                  onChange={v => setLeaveRules(p => ({ ...p, maternityBalance: parseInt(v) || 0 }))}
                />
                <SettingsInput
                  label="Paternity Leave Balance"
                  type="number"
                  value={leaveRules.paternityBalance}
                  onChange={v => setLeaveRules(p => ({ ...p, paternityBalance: parseInt(v) || 0 }))}
                />
                <SettingsInput
                  label="WFH Allowance (Monthly Limit)"
                  type="number"
                  value={leaveRules.wfhBalance}
                  onChange={v => setLeaveRules(p => ({ ...p, wfhBalance: parseInt(v) || 0 }))}
                />
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">Carry Forward & Processing Rules</h4>
              <SettingsInput
                label="Maximum Carry Forward Limit (Days per year)"
                type="number"
                value={leaveRules.carryForwardLimit}
                onChange={v => setLeaveRules(p => ({ ...p, carryForwardLimit: parseInt(v) || 0 }))}
              />
              <ToggleSwitch
                checked={leaveRules.encashmentAllowed}
                onChange={v => setLeaveRules(p => ({ ...p, encashmentAllowed: v }))}
                label="Leave Encashment Facility"
                desc="Allow employees to cash out unused accrued Earned Leaves"
              />
              <ToggleSwitch
                checked={leaveRules.holidayAdjustment}
                onChange={v => setLeaveRules(p => ({ ...p, holidayAdjustment: v }))}
                label="Holiday Adjustments"
                desc="Exclude official national holidays from applied leave date range calculations"
              />
            </div>
          </div>
        );

      case 'payroll':
        return (
          <div className="settings-section-content">
            <h3 className="settings-section-title">Payroll Configuration</h3>
            <p className="settings-section-desc">Configure default payroll cycles, salary components split percentages, and overtime rates.</p>

            <div className="settings-group">
              <h4 className="settings-group-title">Payroll Cycle Configurations</h4>
              <div className="settings-fields-grid">
                <div className="settings-field">
                  <label className="settings-field-label">Salary Cycle Type</label>
                  <select
                    className="settings-input"
                    value={payrollRules.cycle}
                    onChange={e => setPayrollRules(p => ({ ...p, cycle: e.target.value }))}
                  >
                    <option value="Monthly Payroll">Monthly Payroll Cycle</option>
                    <option value="Weekly Payroll">Weekly Payroll Cycle</option>
                    <option value="Custom Payroll Cycle">Custom Payroll Cycle</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">Salary Components Configuration</h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '-4px 0 8px' }}>
                Determine earnings and deductions formulas (Percentages are relative to gross salary).
              </p>
              <div className="settings-fields-grid">
                <SettingsInput
                  label="Basic Salary Percentage (%)"
                  type="number"
                  value={payrollRules.basicSalaryPct}
                  onChange={v => setPayrollRules(p => ({ ...p, basicSalaryPct: parseInt(v) || 0 }))}
                />
                <SettingsInput
                  label="HRA Percentage (%)"
                  type="number"
                  value={payrollRules.hraPct}
                  onChange={v => setPayrollRules(p => ({ ...p, hraPct: parseInt(v) || 0 }))}
                />
                <SettingsInput
                  label="Conveyance Allowance Flat Amount (INR)"
                  type="number"
                  value={payrollRules.conveyanceFlat}
                  onChange={v => setPayrollRules(p => ({ ...p, conveyanceFlat: parseInt(v) || 0 }))}
                />
                <SettingsInput
                  label="Medical Allowance Flat Amount (INR)"
                  type="number"
                  value={payrollRules.medicalFlat}
                  onChange={v => setPayrollRules(p => ({ ...p, medicalFlat: parseInt(v) || 0 }))}
                />
                <SettingsInput
                  label="Provident Fund (PF) Employee contribution (%)"
                  type="number"
                  value={payrollRules.pfPct}
                  onChange={v => setPayrollRules(p => ({ ...p, pfPct: parseFloat(v) || 0 }))}
                />
                <SettingsInput
                  label="ESI Contribution (%)"
                  type="number"
                  value={payrollRules.esiPct}
                  onChange={v => setPayrollRules(p => ({ ...p, esiPct: parseFloat(v) || 0 }))}
                />
                <SettingsInput
                  label="Professional Tax flat deduction"
                  type="number"
                  value={200}
                  disabled={true}
                />
                <SettingsInput
                  label="Standard TDS flat deduction threshold"
                  type="number"
                  value={payrollRules.tdsFlat}
                  onChange={v => setPayrollRules(p => ({ ...p, tdsFlat: parseInt(v) || 0 }))}
                />
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">Overtime Rules & Multipliers</h4>
              <div className="settings-fields-grid">
                <SettingsInput
                  label="Regular Overtime Multiplier"
                  type="number"
                  value={payrollRules.overtimeMultiplier}
                  onChange={v => setPayrollRules(p => ({ ...p, overtimeMultiplier: parseFloat(v) || 1.0 }))}
                />
                <SettingsInput
                  label="Holiday Overtime Multiplier"
                  type="number"
                  value={payrollRules.holidayMultiplier}
                  onChange={v => setPayrollRules(p => ({ ...p, holidayMultiplier: parseFloat(v) || 1.0 }))}
                />
              </div>
            </div>
          </div>
        );

      case 'project':
        return (
          <div className="settings-section-content">
            <h3 className="settings-section-title">Project Settings</h3>
            <p className="settings-section-desc">Manage allowed project category types, workflows, and task tracking criteria.</p>

            <div className="settings-group">
              <h4 className="settings-group-title">Project Categories</h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Configure active categories for project categorization.</p>
              <div className="settings-fields-grid">
                <div className="settings-field"><ToggleSwitch checked={true} onChange={() => {}} label="Development Projects" /></div>
                <div className="settings-field"><ToggleSwitch checked={true} onChange={() => {}} label="Design Projects" /></div>
                <div className="settings-field"><ToggleSwitch checked={true} onChange={() => {}} label="Marketing Campaigns" /></div>
                <div className="settings-field"><ToggleSwitch checked={true} onChange={() => {}} label="Sales & Internal Projects" /></div>
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">Project Workflow Configuration</h4>
              <SettingsInput
                label="Project Pipeline Stages (Comma separated)"
                value={projectRules.stages}
                onChange={v => setProjectRules(p => ({ ...p, stages: v }))}
              />
              <ToggleSwitch
                checked={projectRules.milestonesRequired}
                onChange={v => setProjectRules(p => ({ ...p, milestonesRequired: v }))}
                label="Force Milestone Creation"
                desc="Require project managers to link tasks to milestones"
              />
              <ToggleSwitch
                checked={projectRules.approvalRequired}
                onChange={v => setProjectRules(p => ({ ...p, approvalRequired: v }))}
                label="Project Approval Workflow"
                desc="Require Department Head approval before marking project active"
              />
            </div>
          </div>
        );

      case 'task':
        return (
          <div className="settings-section-content">
            <h3 className="settings-section-title">Task Management Settings</h3>
            <p className="settings-section-desc">Define rules for task priorities, thresholds, and overdue alert parameters.</p>

            <div className="settings-group">
              <h4 className="settings-group-title">Task Priority Levels</h4>
              <ToggleSwitch
                checked={projectRules.priorityCritical}
                onChange={v => setProjectRules(p => ({ ...p, priorityCritical: v }))}
                label="Critical Priority"
                desc="Urgent tasks needing prompt attention within 4 hours"
              />
              <ToggleSwitch
                checked={projectRules.priorityHigh}
                onChange={v => setProjectRules(p => ({ ...p, priorityHigh: v }))}
                label="High Priority"
                desc="Tasks needing completion within 24 hours"
              />
              <ToggleSwitch
                checked={projectRules.priorityMedium}
                onChange={v => setProjectRules(p => ({ ...p, priorityMedium: v }))}
                label="Medium Priority"
                desc="Standard priority task items"
              />
              <ToggleSwitch
                checked={projectRules.priorityLow}
                onChange={v => setEmpSettings(p => ({ ...p, priorityLow: v }))}
                label="Low Priority"
                desc="Backlog and minor items"
              />
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">Escalation and Overdue Alert Parameters</h4>
              <div className="settings-fields-grid">
                <SettingsInput
                  label="Overdue Task Alert Time Limit (Hours)"
                  type="number"
                  value={projectRules.overdueTaskHours}
                  onChange={v => setProjectRules(p => ({ ...p, overdueTaskHours: parseInt(v) || 0 }))}
                />
                <div className="settings-field">
                  <label className="settings-field-label">Escalation Trigger Authority Level</label>
                  <select
                    className="settings-input"
                    value={projectRules.escalationLevel}
                    onChange={e => setProjectRules(p => ({ ...p, escalationLevel: e.target.value }))}
                  >
                    <option value="Team Leader">Team Leader</option>
                    <option value="Project Manager">Project Manager</option>
                    <option value="Department Head">Department Head</option>
                    <option value="Super Admin">Super Admin</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

      case 'workflow':
        return (
          <div className="settings-section-content">
            <h3 className="settings-section-title">Workflow & Approval Matrices</h3>
            <p className="settings-section-desc">Manage system-wide authorization paths and hierarchy flows for ERP requests.</p>

            <div className="settings-group">
              <h4 className="settings-group-title">Attendance Approval Flow Path</h4>
              <div className="approval-path-visual">
                <div className="path-node current">Employee</div>
                <div className="path-arrow">➔</div>
                <div className="path-node">Team Leader</div>
                <div className="path-arrow">➔</div>
                <div className="path-node">Project Manager</div>
                <div className="path-arrow">➔</div>
                <div className="path-node admin">Super Admin</div>
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">Leave Request Approval Path</h4>
              <div className="approval-path-visual">
                <div className="path-node current">Employee</div>
                <div className="path-arrow">➔</div>
                <div className="path-node">Team Leader</div>
                <div className="path-arrow">➔</div>
                <div className="path-node">Project Manager</div>
                <div className="path-arrow">➔</div>
                <div className="path-node admin">HR / Super Admin</div>
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">Payroll Approval Path</h4>
              <div className="approval-path-visual">
                <div className="path-node current">HR Executive</div>
                <div className="path-arrow">➔</div>
                <div className="path-node">Finance Manager</div>
                <div className="path-arrow">➔</div>
                <div className="path-node admin">Super Admin Approval</div>
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">Project Initiation Approval Path</h4>
              <div className="approval-path-visual">
                <div className="path-node current">Project Manager</div>
                <div className="path-arrow">➔</div>
                <div className="path-node">Department Head</div>
                <div className="path-arrow">➔</div>
                <div className="path-node admin">Super Admin</div>
              </div>
            </div>
          </div>
        );

      case 'roles':
        return (
          <div className="settings-section-content">
            <h3 className="settings-section-title">Roles & Access Configurations</h3>
            <p className="settings-section-desc">Administer role access hierarchies, templates, and dashboard view authority tables.</p>

            <div className="settings-group">
              <h4 className="settings-group-title">Access Control Matrix Templates</h4>
              <div className="table-responsive">
                <table className="settings-data-table">
                  <thead>
                    <tr>
                      <th>Module Path</th>
                      <th>Super Admin</th>
                      <th>Branch Admin</th>
                      <th>Project Mgr</th>
                      <th>Team Leader</th>
                      <th>Employee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { module: 'System Settings & Logs', sa: 'FULL', ba: 'NONE', pm: 'NONE', tl: 'NONE', emp: 'NONE' },
                      { module: 'Employee Profiles', sa: 'FULL', ba: 'VIEW/EDIT', pm: 'VIEW', tl: 'VIEW', emp: 'VIEW' },
                      { module: 'Payroll Management', sa: 'FULL', ba: 'VIEW', pm: 'NONE', tl: 'NONE', emp: 'VIEW_OWN' },
                      { module: 'Attendance / Clock In', sa: 'FULL', ba: 'FULL', pm: 'VIEW', tl: 'VIEW', emp: 'CLOCK' },
                      { module: 'Leave Approvals', sa: 'FULL', ba: 'FULL', pm: 'EDIT_TEAM', tl: 'EDIT_TEAM', emp: 'APPLY_OWN' },
                      { module: 'Projects & Tasks', sa: 'FULL', ba: 'FULL', pm: 'FULL', tl: 'EDIT_TEAM', emp: 'VIEW/UPDATE' }
                    ].map(row => (
                      <tr key={row.module}>
                        <td><strong>{row.module}</strong></td>
                        <td><span className="badge badge-success">{row.sa}</span></td>
                        <td><span className={`badge ${row.ba === 'NONE' ? 'badge-danger' : 'badge-primary'}`}>{row.ba}</span></td>
                        <td><span className={`badge ${row.pm === 'NONE' ? 'badge-danger' : 'badge-primary'}`}>{row.pm}</span></td>
                        <td><span className={`badge ${row.tl === 'NONE' ? 'badge-danger' : 'badge-primary'}`}>{row.tl}</span></td>
                        <td><span className={`badge ${row.emp === 'NONE' ? 'badge-danger' : 'badge-primary'}`}>{row.emp}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="settings-section-content">
            <h3 className="settings-section-title">Security & IP Restrictions</h3>
            <p className="settings-section-desc">Manage MFA policy controls, IP whitelists, and approved client devices registry.</p>

            <div className="settings-group">
              <h4 className="settings-group-title">Authentication & Password Policies</h4>
              <ToggleSwitch
                checked={localSecurity.twoFactor}
                onChange={v => updateLocalSecurity('twoFactor', v)}
                label="Multi-Factor Authentication (MFA)"
                desc="Force OTP/Authenticator login verification for all users"
              />
              <ToggleSwitch
                checked={localSecurity.loginAlerts}
                onChange={v => updateLocalSecurity('loginAlerts', v)}
                label="Suspicious Login Alerts"
                desc="Send alert email on new device login or failed attempts"
              />
              <div className="settings-fields-grid">
                <div className="settings-field">
                  <label className="settings-field-label">Session Timeout Limit</label>
                  <select
                    className="settings-input"
                    value={localSecurity.sessionTimeout}
                    onChange={e => updateLocalSecurity('sessionTimeout', e.target.value)}
                  >
                    <option value="15 minutes">15 Minutes</option>
                    <option value="30 minutes">30 Minutes</option>
                    <option value="1 hour">1 Hour</option>
                    <option value="8 hours">8 Hours</option>
                    <option value="Never">Never (Disable Timeout)</option>
                  </select>
                </div>
                <SettingsInput
                  label="Password Minimum Length"
                  type="number"
                  value={8}
                  disabled={true}
                />
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">Access Controls & IP Restrictions</h4>
              <div className="settings-fields-grid">
                <div className="settings-field full-row">
                  <SettingsInput
                    label="Allowed IP Addresses (Comma-separated Whitelist)"
                    value={localSecurity.ipWhitelist}
                    onChange={v => updateLocalSecurity('ipWhitelist', v)}
                    placeholder="192.168.1.1, 203.0.113.50/24"
                  />
                </div>
                <div className="settings-field">
                  <label className="settings-field-label">Login Timing Policy</label>
                  <select className="settings-input" defaultValue="Office Hours Access Only">
                    <option value="Anytime">Anytime (No Restrictions)</option>
                    <option value="Office Hours Access Only">Office Hours & Workdays Only</option>
                    <option value="Weekend Restrictions">Block Weekend Logins</option>
                  </select>
                </div>
                <div className="settings-field">
                  <label className="settings-field-label">Device Restriction Policy</label>
                  <select className="settings-input" defaultValue="Approved Devices Only">
                    <option value="All">Allow All Registered Devices</option>
                    <option value="Approved Devices Only">Approved Devices & Mac Addresses Only</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

      case 'compliance':
        return (
          <div className="settings-section-content">
            <h3 className="settings-section-title">Audit & GDPR Compliance</h3>
            <p className="settings-section-desc">Manage system data logs retention timelines and GDPR privacy declarations.</p>

            <div className="settings-group">
              <h4 className="settings-group-title">Compliance Configuration</h4>
              <div className="settings-fields-grid">
                <div className="settings-field">
                  <label className="settings-field-label">Audit Log Retention Period</label>
                  <select className="settings-input" defaultValue="1 year">
                    <option value="90 days">90 Days</option>
                    <option value="180 days">180 Days</option>
                    <option value="1 year">1 Year</option>
                    <option value="5 years">5 Years</option>
                    <option value="Indefinite">Indefinite (No Auto-delete)</option>
                  </select>
                </div>
                <div className="settings-field">
                  <label className="settings-field-label">GDPR Data Portability</label>
                  <button className="settings-sub-btn" onClick={() => addToast('info', 'Executing compliance export schemas...')}>
                    Generate GDPR Data Export Schema
                  </button>
                </div>
              </div>
              <ToggleSwitch
                checked={true}
                onChange={() => {}}
                label="Employee Data Anonymization"
                desc="Anonymize personal identifier files for resigned or terminated workers automatically"
              />
              <ToggleSwitch
                checked={true}
                onChange={() => {}}
                label="ISO 27001 Log Compliance"
                desc="Generate compliance tracking logs formatted to ISO specifications"
              />
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="settings-section-content">
            <h3 className="settings-section-title">Branding & Theme Customization</h3>
            <p className="settings-section-desc">Change the UI themes, custom brand logos, and application layout parameters.</p>

            <div className="settings-group">
              <h4 className="settings-group-title">Color Theme Mode Selection</h4>
              <div className="theme-picker">
                {[
                  { id: 'dark', label: 'Dark Mode', icon: Moon },
                  { id: 'light', label: 'Light Mode', icon: Sun },
                  { id: 'auto', label: 'Auto (System)', icon: Zap }
                ].map(t => {
                  const Icon = t.icon;
                  const isActive = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      className={`theme-btn ${isActive ? 'active' : ''}`}
                      onClick={() => setThemeMode(t.id)}
                    >
                      <Icon size={20} />
                      <span>{t.label}</span>
                      {isActive && <span className="theme-active-dot" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">Primary UI Accent Color</h4>
              <div className="accent-picker">
                {[
                  '#d946ef', // default pink
                  '#3b82f6', // blue
                  '#8b5cf6', // purple
                  '#10b981', // green
                  '#f59e0b', // orange
                  '#ef4444', // red
                  '#06b6d4'  // cyan
                ].map(color => (
                  <button
                    key={color}
                    className={`accent-btn ${accentColor === color ? 'accent-active' : ''}`}
                    style={{ background: color }}
                    onClick={() => setAccentColor(color)}
                    title={color}
                  />
                ))}
                <input
                  type="color"
                  className="accent-custom-input"
                  value={accentColor}
                  onChange={e => setAccentColor(e.target.value)}
                  title="Choose custom color"
                />
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">Text Scaling</h4>
              <div className="font-size-picker">
                {[
                  { id: 'small', label: 'Small Size', sample: 'Aa' },
                  { id: 'medium', label: 'Medium Standard', sample: 'Aa' },
                  { id: 'large', label: 'Large Layout', sample: 'Aa' }
                ].map(f => (
                  <button
                    key={f.id}
                    className={`font-size-btn ${fontSize === f.id ? 'active' : ''}`}
                    onClick={() => setFontSize(f.id)}
                  >
                    <span className={`font-sample font-sample-${f.id}`}>{f.sample}</span>
                    <span>{f.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">Branding & Logo Upload Simulation</h4>
              <div className="settings-fields-grid">
                <div className="settings-field">
                  <label className="settings-field-label">Company Logo Image</label>
                  <div className="branding-logo-preview-box">
                    <Sparkles size={24} className="text-primary" />
                    <span>Logo Preview Banner</span>
                  </div>
                  <button className="settings-sub-btn" onClick={() => addToast('info', 'Simulating image upload... select logo file.')}>
                    Upload New Logo
                  </button>
                </div>
                <div className="settings-field">
                  <label className="settings-field-label">Favicon Icon (.ico)</label>
                  <div className="branding-logo-preview-box miniature">
                    <Sparkles size={14} className="text-primary" />
                  </div>
                  <button className="settings-sub-btn" onClick={() => addToast('info', 'Simulating icon upload... select favicon file.')}>
                    Upload Favicon
                  </button>
                </div>
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">Navigation Panel Layout</h4>
              <ToggleSwitch
                checked={sidebarDense}
                onChange={setSidebarDense}
                label="Compact Navigation Panel"
                desc="Collapse panel default width on desktop view for wider content space"
              />
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="settings-section-content">
            <h3 className="settings-section-title">Notification Channels & Settings</h3>
            <p className="settings-section-desc">Manage system triggers, channels, and push preferences.</p>

            <div className="settings-group">
              <h4 className="settings-group-title">Active Communication Channels</h4>
              <ToggleSwitch
                checked={localNotif.emailNotifs}
                onChange={v => updateLocalNotif('emailNotifs', v)}
                label="Email Notifications"
                desc="Receive ERP notification digests in inbox"
              />
              <ToggleSwitch
                checked={localNotif.pushNotifs}
                onChange={v => updateLocalNotif('pushNotifs', v)}
                label="In-App Push Notifications"
                desc="Desktop dynamic alerts inside the system frame"
              />
              <ToggleSwitch
                checked={true}
                onChange={() => {}}
                label="SMS Gateway Alerts"
                desc="Deliver important status changes directly to employee mobile devices"
              />
              <ToggleSwitch
                checked={localNotif.weeklyDigest}
                onChange={v => updateLocalNotif('weeklyDigest', v)}
                label="Weekly Digest"
                desc="Compile summaries in a digest email sent every Friday afternoon"
              />
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">Automated Event Alert Triggers</h4>
              <ToggleSwitch
                checked={localNotif.leaveAlerts}
                onChange={v => updateLocalNotif('leaveAlerts', v)}
                label="Leave Alerts"
                desc="Notify HODs on leave application submission"
              />
              <ToggleSwitch
                checked={localNotif.payrollAlerts}
                onChange={v => updateLocalNotif('payrollAlerts', v)}
                label="Payroll Alerts"
                desc="Notify employees when monthly payslip is compiled"
              />
              <ToggleSwitch
                checked={localNotif.securityAlerts}
                onChange={v => updateLocalNotif('securityAlerts', v)}
                label="Security & Breach Alerts"
                desc="Alert superadmin immediately on system security triggers"
              />
              <ToggleSwitch
                checked={true}
                onChange={() => {}}
                label="Project Milestones Alerts"
                desc="Notify managers when milestone deadlines are near"
              />
            </div>
          </div>
        );

      case 'announcements':
        return (
          <div className="settings-section-content">
            <h3 className="settings-section-title">Announcement Settings</h3>
            <p className="settings-section-desc">Manage scope boundaries and channels for company announcements.</p>

            <div className="settings-group">
              <h4 className="settings-group-title">Announcement Scope Channels</h4>
              <ToggleSwitch checked={true} onChange={() => {}} label="Company-Wide Broadcasts" />
              <ToggleSwitch checked={true} onChange={() => {}} label="Department-Specific Scope Announcements" />
              <ToggleSwitch checked={true} onChange={() => {}} label="Branch-Specific Scope Announcements" />
              <ToggleSwitch checked={true} onChange={() => {}} label="Emergency Alerts Enforced Pushes" />
            </div>
          </div>
        );

      case 'documents':
        return (
          <div className="settings-section-content">
            <h3 className="settings-section-title">Document Management Configurations</h3>
            <p className="settings-section-desc">Set limits, allowed extensions, and file archival criteria.</p>

            <div className="settings-group">
              <h4 className="settings-group-title">Allowed Extension Formats</h4>
              <div className="settings-fields-grid">
                <div className="settings-field"><ToggleSwitch checked={docRules.pdfAllowed} onChange={v => setDocRules(p => ({ ...p, pdfAllowed: v }))} label="PDF (.pdf)" /></div>
                <div className="settings-field"><ToggleSwitch checked={docRules.docxAllowed} onChange={v => setDocRules(p => ({ ...p, docxAllowed: v }))} label="Word Documents (.docx)" /></div>
                <div className="settings-field"><ToggleSwitch checked={docRules.xlsxAllowed} onChange={v => setDocRules(p => ({ ...p, xlsxAllowed: v }))} label="Excel Sheets (.xlsx)" /></div>
                <div className="settings-field"><ToggleSwitch checked={docRules.pngAllowed} onChange={v => setDocRules(p => ({ ...p, pngAllowed: v }))} label="Images (.png, .jpg)" /></div>
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">Upload and Size Rules</h4>
              <div className="settings-fields-grid">
                <SettingsInput
                  label="Maximum File Size Limit (MB)"
                  type="number"
                  value={docRules.maxFileSize}
                  onChange={v => setDocRules(p => ({ ...p, maxFileSize: parseInt(v) || 0 }))}
                />
                <SettingsInput
                  label="Total Storage Allocation Limit (GB)"
                  type="number"
                  value={docRules.storageLimit}
                  onChange={v => setDocRules(p => ({ ...p, storageLimit: parseInt(v) || 0 }))}
                />
                <SettingsInput
                  label="Logs Retention Timeline (Years)"
                  type="number"
                  value={docRules.retentionYears}
                  onChange={v => setDocRules(p => ({ ...p, retentionYears: parseInt(v) || 0 }))}
                />
              </div>
              <ToggleSwitch
                checked={docRules.autoArchive}
                onChange={v => setDocRules(p => ({ ...p, autoArchive: v }))}
                label="Auto Archive Inactive Documents"
                desc="Archive documents untouched for over 1 year automatically"
              />
            </div>
          </div>
        );

      case 'email':
        return (
          <div className="settings-section-content">
            <h3 className="settings-section-title">Email & SMTP Gateway</h3>
            <p className="settings-section-desc">Manage authentication schemas and SMTP host parameters for automated emails.</p>

            <div className="settings-group">
              <h4 className="settings-group-title">SMTP Server Configurations</h4>
              <div className="settings-fields-grid">
                <SettingsInput
                  label="SMTP Host Name"
                  value={smtpConfig.host}
                  onChange={v => setSmtpConfig(p => ({ ...p, host: v }))}
                  placeholder="smtp.mailgun.org"
                />
                <SettingsInput
                  label="SMTP Port Number"
                  value={smtpConfig.port}
                  onChange={v => setSmtpConfig(p => ({ ...p, port: v }))}
                  placeholder="587"
                />
                <div className="settings-field full-row">
                  <SettingsInput
                    label="Sender Display Email"
                    value={smtpConfig.senderEmail}
                    onChange={v => setSmtpConfig(p => ({ ...p, senderEmail: v }))}
                    placeholder="no-reply@company.com"
                  />
                </div>
              </div>
              <ToggleSwitch
                checked={smtpConfig.authRequired}
                onChange={v => setSmtpConfig(p => ({ ...p, authRequired: v }))}
                label="Authentication Required"
                desc="Provide SMTP credentials to authenticate email handshake"
              />
              {smtpConfig.authRequired && (
                <div className="settings-fields-grid">
                  <SettingsInput
                    label="SMTP Auth Username"
                    value={smtpConfig.username}
                    onChange={v => setSmtpConfig(p => ({ ...p, username: v }))}
                  />
                  <SettingsInput
                    label="SMTP Auth Password"
                    type="password"
                    value={smtpConfig.password}
                    onChange={v => setSmtpConfig(p => ({ ...p, password: v }))}
                  />
                </div>
              )}
            </div>
          </div>
        );

      case 'sms':
        return (
          <div className="settings-section-content">
            <h3 className="settings-section-title">SMS Gateway API</h3>
            <p className="settings-section-desc">Set credentials for SMS gateway providers to dispatch OTP codes and SMS notifications.</p>

            <div className="settings-group">
              <h4 className="settings-group-title">SMS Provider Configurations</h4>
              <div className="settings-fields-grid">
                <div className="settings-field">
                  <label className="settings-field-label">Active Provider</label>
                  <select
                    className="settings-input"
                    value={smsConfig.provider}
                    onChange={e => setSmsConfig(p => ({ ...p, provider: e.target.value }))}
                  >
                    <option value="Twilio Gateway API">Twilio Gateway API</option>
                    <option value="Nexmo SMS Gateway">Nexmo SMS Gateway</option>
                    <option value="AWS SNS Service">AWS SNS Service</option>
                  </select>
                </div>
                <SettingsInput
                  label="SMS Sender ID"
                  value={smsConfig.senderId}
                  onChange={v => setSmsConfig(p => ({ ...p, senderId: v }))}
                  placeholder="SAASER"
                />
                <div className="settings-field full-row">
                  <SettingsInput
                    label="API Access Key / Auth Token"
                    value={smsConfig.apiKey}
                    onChange={v => setSmsConfig(p => ({ ...p, apiKey: v }))}
                    type="password"
                  />
                </div>
                <div className="settings-field full-row">
                  <SettingsInput
                    label="Endpoint Gateway URL"
                    value={smsConfig.gatewayUrl}
                    onChange={v => setSmsConfig(p => ({ ...p, gatewayUrl: v }))}
                    placeholder="https://api.twilio.com/..."
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'integrations':
        return (
          <div className="settings-section-content">
            <h3 className="settings-section-title">Third-Party App Integrations</h3>
            <p className="settings-section-desc">Connect and authenticate third-party channels for chats, documents, and biometric entries.</p>

            <div className="settings-group">
              <h4 className="settings-group-title">Slack & Microsoft Teams Notifications</h4>
              <div className="integration-row">
                <div className="integration-details">
                  <span className="integration-name">Slack Channel Integration</span>
                  <span className="integration-desc">Post leave alerts and notifications in Slack channels</span>
                </div>
                <button className="settings-sub-btn connected" onClick={() => addToast('info', 'Slack configuration updated')}>
                  Configure Connected Channel
                </button>
              </div>
              <div className="integration-row">
                <div className="integration-details">
                  <span className="integration-name">Microsoft Teams Connector</span>
                  <span className="integration-desc">Sync team milestones with Teams calendars</span>
                </div>
                <button className="settings-sub-btn" onClick={() => addToast('info', 'Teams authorization window opened...')}>
                  Authorize Connector
                </button>
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">Cloud File Storage Providers</h4>
              <div className="integration-row">
                <div className="integration-details">
                  <span className="integration-name">Google Drive Storage</span>
                  <span className="integration-desc">Archive employees files and payslips in Drive folders</span>
                </div>
                <button className="settings-sub-btn connected" onClick={() => addToast('info', 'Google Drive synced')}>
                  Config Folder Sync
                </button>
              </div>
              <div className="integration-row">
                <div className="integration-details">
                  <span className="integration-name">Dropbox Business</span>
                  <span className="integration-desc">Backup archive folder to Dropbox</span>
                </div>
                <button className="settings-sub-btn" onClick={() => addToast('info', 'Dropbox sync initiated')}>
                  Link Account
                </button>
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">Biometric Attendance Integration</h4>
              <div className="integration-row">
                <div className="integration-details">
                  <span className="integration-name">Fingerprint & Biometric Hardware Gateways</span>
                  <span className="integration-desc">Synchronize logs directly from biometric swipe machines</span>
                </div>
                <button className="settings-sub-btn" onClick={() => addToast('info', 'Biometric sync configurations')}>
                  Configure IP Handshake
                </button>
              </div>
            </div>
          </div>
        );

      case 'backup':
        return (
          <div className="settings-section-content">
            <h3 className="settings-section-title">Backup & Recovery Configurations</h3>
            <p className="settings-section-desc">Schedule automatic backups and configure secure cloud backup targets.</p>

            <div className="settings-group">
              <h4 className="settings-group-title">Automated Backup Schedules</h4>
              <div className="settings-fields-grid">
                <div className="settings-field">
                  <label className="settings-field-label">Backup Frequency</label>
                  <select className="settings-input" defaultValue="Daily Backup">
                    <option value="Daily Backup">Daily Backup (At 02:00 AM)</option>
                    <option value="Weekly Backup">Weekly Backup (Sundays)</option>
                    <option value="Monthly Backup">Monthly Backup (1st of month)</option>
                  </select>
                </div>
                <div className="settings-field">
                  <label className="settings-field-label">Backup Location Target</label>
                  <select className="settings-input" defaultValue="Cloud Storage">
                    <option value="Cloud Storage">Cloud Storage (AWS S3)</option>
                    <option value="Local Server">Local Server Storage</option>
                    <option value="External Storage">External Storage (Google Drive)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">System Restore & Recovery</h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '-4px 0 8px' }}>
                Selectively restore parts of the system from the latest backup logs.
              </p>
              <div className="restore-actions-grid">
                <button className="restore-btn" onClick={handleRestoreBackup}>
                  <Database size={16} />
                  <span>Restore DB Only</span>
                </button>
                <button className="restore-btn" onClick={handleRestoreBackup}>
                  <FileText size={16} />
                  <span>Restore Files Only</span>
                </button>
                <button className="restore-btn danger" onClick={handleRestoreBackup}>
                  <RefreshCw size={16} />
                  <span>Full System Restore</span>
                </button>
              </div>
            </div>
          </div>
        );

      case 'reports':
        return (
          <div className="settings-section-content">
            <h3 className="settings-section-title">Configuration Exports & Reports</h3>
            <p className="settings-section-desc">Export snapshot logs of the current ERP configuration setup schemas.</p>

            <div className="settings-group">
              <h4 className="settings-group-title">Generate Configuration Reports</h4>
              <div className="exports-action-grid">
                <button className="export-action-row" onClick={handleExportConfig}>
                  <div className="export-info">
                    <span className="export-title">Full JSON Schema Export</span>
                    <span className="export-desc">Download entire ERP setting parameters in a single JSON block</span>
                  </div>
                  <Download size={18} className="text-primary" />
                </button>
                <button className="export-action-row" onClick={() => addToast('success', 'PDF Security Report generated.')}>
                  <div className="export-info">
                    <span className="export-title">Security Settings Audit Report</span>
                    <span className="export-desc">Download PDF of authentication rules, active whitelists, and session times</span>
                  </div>
                  <Download size={18} className="text-primary" />
                </button>
                <button className="export-action-row" onClick={() => addToast('success', 'Excel Backup Log exported.')}>
                  <div className="export-info">
                    <span className="export-title">Database Backup History Log</span>
                    <span className="export-desc">Download CSV of backup timestamps, archives sizes, and status logs</span>
                  </div>
                  <Download size={18} className="text-primary" />
                </button>
              </div>
            </div>
          </div>
        );

      case 'activity':
        return (
          <div className="settings-section-content">
            <h3 className="settings-section-title">Recent System Activities</h3>
            <p className="settings-section-desc">Audit trail logs of latest configuration updates and server actions.</p>

            <div className="settings-group">
              <h4 className="settings-group-title">Configuration Audit Logs</h4>
              <div className="table-responsive">
                <table className="settings-data-table font-small">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Operator</th>
                      <th>Activity Event</th>
                      <th>Severity</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { time: 'Today, 10:30 AM', user: 'Balram Suman', action: 'Modified Overtime Multiplier to 1.5x', scope: 'Payroll Settings', status: 'Success' },
                      { time: 'Today, 09:15 AM', user: 'Balram Suman', action: 'Authorized Twilio SMS Gateway URL', scope: 'SMS Config', status: 'Success' },
                      { time: 'Yesterday, 04:22 PM', user: 'Neha Verma', action: 'Updated Leaves Quota Balances', scope: 'Leave Policies', status: 'Success' },
                      { time: 'Yesterday, 02:00 AM', user: 'SYSTEM Scheduler', action: 'Database Auto-Backup completed', scope: 'System Backup', status: 'Success' },
                      { time: '03-Jun-2026, 11:00 AM', user: 'Balram Suman', action: 'Added New Branch (Jaipur Operations)', scope: 'Branch Config', status: 'Success' }
                    ].map((row, idx) => (
                      <tr key={idx}>
                        <td><span className="text-muted font-mono">{row.time}</span></td>
                        <td><strong>{row.user}</strong></td>
                        <td>{row.action}</td>
                        <td><span className="badge badge-info">{row.scope}</span></td>
                        <td><span className="badge badge-success">{row.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'admin':
        return (
          <div className="settings-section-content">
            <h3 className="settings-section-title">Super Admin Exclusive Controls</h3>
            <p className="settings-section-desc">Manage system health, active modules switches, and backup restore frameworks.</p>

            <div className="settings-group">
              <h4 className="settings-group-title">Master Control Center Authorization</h4>
              <div className="superadmin-checklist">
                <div className="checklist-item"><CheckCircle2 size={16} className="text-success" /> <span>Configure Entire ERP System Structure</span></div>
                <div className="checklist-item"><CheckCircle2 size={16} className="text-success" /> <span>Manage Company Regional Branches & HODs</span></div>
                <div className="checklist-item"><CheckCircle2 size={16} className="text-success" /> <span>Configure Custom Attendance & Shift Rules</span></div>
                <div className="checklist-item"><CheckCircle2 size={16} className="text-success" /> <span>Configure Salaries Components & Tax Equations</span></div>
                <div className="checklist-item"><CheckCircle2 size={16} className="text-success" /> <span>Control IP whitelists and Devices restrictions</span></div>
                <div className="checklist-item"><CheckCircle2 size={16} className="text-success" /> <span>Control backup triggers & recovery states</span></div>
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">System Infrastructure Status</h4>
              <div className="settings-fields-grid">
                <div className="sys-metric-card">
                  <Cpu size={24} className="text-primary" />
                  <div className="metric-info">
                    <span className="m-label">Server CPU Load</span>
                    <span className="m-val">12.4% (Healthy)</span>
                  </div>
                </div>
                <div className="sys-metric-card">
                  <Server size={24} className="text-primary" />
                  <div className="metric-info">
                    <span className="m-label">Database RAM Usage</span>
                    <span className="m-val">2.8 GB / 16 GB</span>
                  </div>
                </div>
                <div className="sys-metric-card">
                  <HardDrive size={24} className="text-primary" />
                  <div className="metric-info">
                    <span className="m-label">Cloud Storage Space</span>
                    <span className="m-val">24.5 GB / 50 GB</span>
                  </div>
                </div>
                <div className="sys-metric-card">
                  <ShieldCheck size={24} className="text-success" />
                  <div className="metric-info">
                    <span className="m-label">System Health</span>
                    <span className="m-val">All Services Green</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="settings-page">
      {/* Page header title & quick actions */}
      <div className="settings-header-container">
        <div className="settings-header">
          <h2>System Settings & Configuration</h2>
          <p>Master Control Center for SaaS Employee Management ERP System</p>
        </div>
        
        {/* Quick action buttons row */}
        <div className="settings-quick-actions-bar">
          <button className="qa-btn" onClick={handleTestNotifications} title="Test diagnostic notifications">
            <Bell size={14} /> Test Notifs
          </button>
          <button className="qa-btn" onClick={handleCreateBackup} title="Run instant DB backup">
            <Cloud size={14} /> Create Backup
          </button>
          <button className="qa-btn" onClick={handleExportConfig} title="Export JSON parameters">
            <Upload size={14} /> Export Schema
          </button>
        </div>
      </div>

      {/* Top Summary stats cards */}
      <div className="settings-stats-grid">
        <div className="sett-stat-card">
          <div className="sett-stat-top">
            <span className="sett-stat-label">Company Branches</span>
            <Building2 size={16} className="sett-stat-icon" />
          </div>
          <span className="sett-stat-val">12 Active</span>
          <span className="sett-stat-sub">Across 4 regions</span>
        </div>
        <div className="sett-stat-card">
          <div className="sett-stat-top">
            <span className="sett-stat-label">Active Departments</span>
            <GitMerge size={16} className="sett-stat-icon" />
          </div>
          <span className="sett-stat-val">24 Depts</span>
          <span className="sett-stat-sub">5 core categories</span>
        </div>
        <div className="sett-stat-card">
          <div className="sett-stat-top">
            <span className="sett-stat-label">Active Users</span>
            <Users size={16} className="sett-stat-icon" />
          </div>
          <span className="sett-stat-val">1,250 Users</span>
          <span className="sett-stat-sub">Online: 412 active</span>
        </div>
        <div className="sett-stat-card">
          <div className="sett-stat-top">
            <span className="sett-stat-label">System Modules</span>
            <Layout size={16} className="sett-stat-icon" />
          </div>
          <span className="sett-stat-val">32 Active</span>
          <span className="sett-stat-sub">100% operational</span>
        </div>
        <div className="sett-stat-card">
          <div className="sett-stat-top">
            <span className="sett-stat-label">Security Status</span>
            <Shield size={16} className="sett-stat-icon text-success" />
          </div>
          <span className="sett-stat-val text-success">Protected</span>
          <span className="sett-stat-sub">2FA active</span>
        </div>
        <div className="sett-stat-card">
          <div className="sett-stat-top">
            <span className="sett-stat-label">Last System Update</span>
            <Clock size={16} className="sett-stat-icon" />
          </div>
          <span className="sett-stat-val">Today</span>
          <span className="sett-stat-sub">At 10:30 AM</span>
        </div>
      </div>

      {/* Main settings layout */}
      <div className="settings-layout">
        {/* Settings Sidebar Nav */}
        <div className="card settings-nav">
          {sidebarGroups.map(group => (
            <div key={group.title} className="settings-nav-group">
              <span className="settings-nav-group-title">{group.title}</span>
              <div className="settings-nav-group-items">
                {group.items.map(sec => {
                  const Icon = sec.icon;
                  const isActive = activeSection === sec.id;
                  return (
                    <button
                      key={sec.id}
                      className={`settings-nav-item ${isActive ? 'active' : ''}`}
                      onClick={() => setActiveSection(sec.id)}
                    >
                      <Icon size={15} />
                      <span>{sec.label}</span>
                      <ChevronRight size={13} className="settings-nav-arrow" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Settings Content */}
        <div className="card settings-content-panel">
          {renderSection()}

          <div className="settings-footer-actions">
            <Button variant="ghost" icon={RefreshCw} onClick={handleReset}>
              Reset Defaults
            </Button>
            <Button variant="primary" icon={saved ? Check : Save} onClick={handleSave}>
              {saved ? 'Saved!' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>

      {/* Settings Summary Footer details */}
      <div className="settings-footer-summary">
        <span>ERP Version: <strong>1.0 Enterprise</strong></span>
        <span className="summary-dot">•</span>
        <span>Active Modules: <strong>32</strong></span>
        <span className="summary-dot">•</span>
        <span>Last Backup: <strong>Today, 02:00 AM</strong></span>
        <span className="summary-dot">•</span>
        <span>System Status: <strong className="text-success">Operational ✅</strong></span>
      </div>
    </div>
  );
};

export default SystemSettings;
