import React, { useState, useEffect, useMemo } from 'react';
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
      { id: 'appearance', label: 'Theme Customization', icon: Palette },
      { id: 'branding', label: 'Branding Settings', icon: Globe }
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
  'India': [
    // 28 States
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    // 8 Union Territories
    'Andaman & Nicobar Islands', 'Chandigarh', 'Dadra & Nagar Haveli and Daman & Diu',
    'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
  ],
  'United States': ['California', 'New York', 'Texas', 'Florida', 'Washington'],
  'United Kingdom': ['London', 'England', 'Scotland', 'Wales'],
  'Canada': ['Ontario', 'British Columbia', 'Quebec', 'Alberta'],
  'Australia': ['New South Wales', 'Victoria', 'Queensland', 'Western Australia'],
  'United Arab Emirates': ['Dubai', 'Abu Dhabi', 'Sharjah'],
  'Singapore': ['Central Region', 'East Region', 'North Region']
};

const citiesByState = {
  // Indian States
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Tirupati', 'Rajahmundry'],
  'Arunachal Pradesh': ['Itanagar', 'Naharlagun', 'Tawang', 'Ziro', 'Pasighat'],
  'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia'],
  'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga'],
  'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg', 'Rajnandgaon'],
  'Goa': ['Panaji', 'Vasco da Gama', 'Margao', 'Mapusa', 'Ponda'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar', 'Bhavnagar', 'Jamnagar'],
  'Haryana': ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Rohtak', 'Hisar', 'Karnal', 'Sonipat'],
  'Himachal Pradesh': ['Shimla', 'Manali', 'Dharamshala', 'Solan', 'Mandi', 'Kullu'],
  'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Hazaribagh', 'Deoghar'],
  'Karnataka': ['Bangalore', 'Mysore', 'Hubli', 'Mangalore', 'Belgaum', 'Davangere', 'Bellary', 'Shimoga'],
  'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Kannur', 'Alappuzha'],
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Rewa'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Aurangabad', 'Solapur', 'Kolhapur'],
  'Manipur': ['Imphal', 'Thoubal', 'Bishnupur', 'Churachandpur', 'Senapati'],
  'Meghalaya': ['Shillong', 'Tura', 'Jowai', 'Nongstoin', 'Williamnagar'],
  'Mizoram': ['Aizawl', 'Lunglei', 'Saiha', 'Champhai', 'Kolasib'],
  'Nagaland': ['Kohima', 'Dimapur', 'Mokokchung', 'Tuensang', 'Wokha'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri', 'Balasore'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Hoshiarpur'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Bikaner', 'Ajmer', 'Alwar', 'Bharatpur'],
  'Sikkim': ['Gangtok', 'Namchi', 'Mangan', 'Gyalshing', 'Rangpo'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Vellore', 'Erode'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam', 'Ramagundam'],
  'Tripura': ['Agartala', 'Dharmanagar', 'Udaipur', 'Kailashahar', 'Belonia'],
  'Uttar Pradesh': ['Noida', 'Ghaziabad', 'Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Meerut', 'Allahabad', 'Bareilly'],
  'Uttarakhand': ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rudrapur', 'Rishikesh', 'Mussoorie'],
  'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Bardhaman', 'Malda'],
  // Union Territories
  'Andaman & Nicobar Islands': ['Port Blair', 'Diglipur', 'Mayabunder', 'Campbell Bay'],
  'Chandigarh': ['Chandigarh'],
  'Dadra & Nagar Haveli and Daman & Diu': ['Daman', 'Diu', 'Silvassa'],
  'Delhi': ['New Delhi', 'Dwarka', 'Rohini', 'Saket', 'Noida Extension', 'Janakpuri', 'Lajpat Nagar'],
  'Jammu & Kashmir': ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Sopore', 'Udhampur'],
  'Ladakh': ['Leh', 'Kargil', 'Diskit', 'Padum'],
  'Lakshadweep': ['Kavaratti', 'Agatti', 'Amini', 'Andrott'],
  'Puducherry': ['Puducherry', 'Karaikal', 'Mahe', 'Yanam'],
  // US States
  'California': ['Los Angeles', 'San Francisco', 'San Diego', 'San Jose'],
  'New York': ['New York City', 'Buffalo', 'Rochester', 'Syracuse'],
  'Texas': ['Houston', 'Austin', 'Dallas', 'San Antonio'],
  'Florida': ['Miami', 'Orlando', 'Tampa', 'Jacksonville'],
  'Washington': ['Seattle', 'Spokane', 'Tacoma'],
  // UK
  'London': ['London', 'Croydon', 'Ealing'],
  'England': ['Birmingham', 'Manchester', 'Leeds'],
  // Canada
  'Ontario': ['Toronto', 'Ottawa', 'Mississauga'],
  'British Columbia': ['Vancouver', 'Victoria', 'Burnaby'],
  // Australia
  'New South Wales': ['Sydney', 'Newcastle', 'Wollongong'],
  'Victoria': ['Melbourne', 'Geelong', 'Ballarat'],
  // UAE
  'Dubai': ['Dubai City', 'Jebel Ali'],
  'Abu Dhabi': ['Abu Dhabi City', 'Al Ain'],
  // Singapore
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
    saveSystemSettings,
    token,
    // Real database branches & departments
    branches: dbBranches,
    departments: dbDepartments,
    addBranch,
    deleteBranch,
    addDepartment,
    deleteDepartment
  } = useApp();

  const [activeSection, setActiveSection] = useState('company');
  const [saved, setSaved] = useState(false);

  // ── Branding Settings State (Phase 4 / CompanyAdmin Customization) ─────
  const [brandingForm, setBrandingForm] = useState({
    name: '',
    subdomain: '',
    logoUrl: '',
    primaryColor: '#3b82f6',
    secondaryColor: '#1d4ed8'
  });
  const [brandingLogoPreview, setBrandingLogoPreview] = useState(null);
  const [isBrandingLoading, setIsBrandingLoading] = useState(false);

  // Filter sidebar groups based on user role:
  // - company_admin hides backup & admin, showing branding
  // - super_admin hides branding, showing backup & admin
  const filteredSidebarGroups = useMemo(() => {
    return sidebarGroups.map(group => {
      const items = group.items.filter(item => {
        if (currentUserRole === 'company_admin') {
          if (item.id === 'backup' || item.id === 'admin') return false;
          return true;
        } else {
          if (item.id === 'branding') return false;
          return true;
        }
      });
      return { ...group, items };
    }).filter(group => group.items.length > 0);
  }, [currentUserRole]);

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
      companyName: 'Gatecode OMS',
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

  // 2. Branch list — sourced from real database via AppContext
  const branches = dbBranches || [];
  const [newBranch, setNewBranch] = useState({ code: '', name: '', manager: '', status: 'Active' });

  // 3. Departments list — sourced from real database via AppContext
  const departments = dbDepartments || [];
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
      missingAlerts: true,
      lateTimeThreshold: '09:15',
      halfDayHoursThreshold: 8
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

  // ── Live header stats derived from real database data ──────────────────
  const headerStats = useMemo(() => {
    const branchList = dbBranches || [];
    const deptList   = dbDepartments || [];
    const empList    = employees || [];

    const activeBranches = branchList.filter(b => (b.status || 'Active') === 'Active').length;
    const totalBranches  = branchList.length;

    const totalDepts  = deptList.length;
    const activeDepts = deptList.filter(d => (d.status || 'Active') === 'Active').length || totalDepts;

    const totalUsers  = empList.length;
    const activeUsers = empList.filter(e => e.status === 'Active').length;

    // Count all nav items across all sidebar groups as the module count
    const totalModules = sidebarGroups.reduce((sum, g) => sum + g.items.length, 0);

    const is2FAEnabled = localSecurity?.twoFactor === true;

    const now = new Date();
    const updateDate = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const updateTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    return { activeBranches, totalBranches, totalDepts, activeDepts, totalUsers, activeUsers, totalModules, is2FAEnabled, updateDate, updateTime };
  }, [dbBranches, dbDepartments, employees, localSecurity]);

  // Synchronize localGeneral on generalSettings changes
  useEffect(() => {
    setLocalGeneral(generalSettings);
  }, [generalSettings]);

  // Load all settings from the database on mount
  useEffect(() => {
    if (!token) return;
    const loadFromDB = async () => {
      try {
        const response = await fetch((window.API_URL || 'http://localhost:5000') + '/api/v1/settings', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (result.status === 'success' && result.data) {
          const d = result.data;
          if (d.companyProfile) setCompanyProfile(d.companyProfile);
          if (d.empSettings) setEmpSettings(d.empSettings);
          if (d.attendanceRules) setAttendanceRules(d.attendanceRules);
          if (d.leaveRules) setLeaveRules(d.leaveRules);
          if (d.payrollRules) setPayrollRules(d.payrollRules);
          if (d.projectRules) setProjectRules(d.projectRules);
          if (d.docRules) setDocRules(d.docRules);
          if (d.smtpConfig) setSmtpConfig(d.smtpConfig);
          if (d.smsConfig) setSmsConfig(d.smsConfig);
          if (d.generalSettings) setLocalGeneral(d.generalSettings);
          if (d.notificationSettings) setLocalNotif(d.notificationSettings);
          if (d.securitySettings) setLocalSecurity(d.securitySettings);
        }
      } catch (err) {
        console.error('Failed to load system settings from database:', err);
      }
    };
    loadFromDB();
  }, [token]);

  // Load branding info when activeSection becomes 'branding'
  useEffect(() => {
    if (activeSection !== 'branding' || !currentUser?.companyId || !token) return;

    const fetchCompanyBranding = async () => {
      try {
        setIsBrandingLoading(true);
        const res = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/companies/${currentUser.companyId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await res.json();
        if (result.status === 'success' && result.data) {
          const company = result.data;
          setBrandingForm({
            name: company.name || '',
            subdomain: company.subdomain || '',
            logoUrl: company.settings?.logoUrl || '',
            primaryColor: company.settings?.primaryColor || '#3b82f6',
            secondaryColor: company.settings?.secondaryColor || '#1d4ed8'
          });
          setBrandingLogoPreview(company.settings?.logoUrl || null);
        }
      } catch (err) {
        console.error('Failed to fetch company branding:', err);
        addToast('danger', 'Failed to load company branding details.');
      } finally {
        setIsBrandingLoading(false);
      }
    };

    fetchCompanyBranding();
  }, [activeSection, currentUser, token]);

  const handleSaveBranding = async () => {
    if (!token || !currentUser?.companyId) return;
    try {
      setIsBrandingLoading(true);
      const payload = {
        name: brandingForm.name,
        settings: {
          logoUrl: brandingForm.logoUrl,
          primaryColor: brandingForm.primaryColor,
          secondaryColor: brandingForm.secondaryColor
        }
      };

      const res = await fetch(`${window.API_URL || "http://localhost:5000"}/api/v1/companies/${currentUser.companyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (!res.ok || result.status !== 'success') {
        throw new Error(result.message || 'Failed to update branding settings.');
      }

      // Automatically apply theme updates immediately to document custom properties and page title/favicon!
      if (brandingForm.primaryColor) {
        document.documentElement.style.setProperty('--color-primary', brandingForm.primaryColor);
        if (brandingForm.primaryColor.startsWith('#') && brandingForm.primaryColor.length === 7) {
          const r = parseInt(brandingForm.primaryColor.slice(1, 3), 16);
          const g = parseInt(brandingForm.primaryColor.slice(3, 5), 16);
          const b = parseInt(brandingForm.primaryColor.slice(5, 7), 16);
          document.documentElement.style.setProperty('--color-primary-light', `rgba(${r}, ${g}, ${b}, 0.15)`);
          document.documentElement.style.setProperty('--shadow-focus', `0 0 0 3px rgba(${r}, ${g}, ${b}, 0.3)`);
        }
      }
      if (brandingForm.secondaryColor) {
        document.documentElement.style.setProperty('--color-secondary', brandingForm.secondaryColor);
      }
      if (brandingForm.name) {
        document.title = brandingForm.name;
      }
      if (brandingForm.logoUrl) {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = brandingForm.logoUrl;
      }

      setSaved(true);
      addToast('success', '✅ Branding settings updated successfully!');
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
      addToast('danger', err.message || 'Failed to update branding settings.');
    } finally {
      setIsBrandingLoading(false);
    }
  };

  const handleSave = async () => {
    if (activeSection === 'branding') {
      await handleSaveBranding();
      return;
    }
    const mergedGeneral = { ...generalSettings, ...localGeneral, companyName: companyProfile.companyName };

    // 1. Save global React contexts
    setGeneralSettings(mergedGeneral);
    setNotificationSettings(localNotif);
    setSecuritySettings(localSecurity);

    // 2. Build full payload and persist to MongoDB database
    const payload = {
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
      generalSettings: mergedGeneral,
      notificationSettings: localNotif,
      securitySettings: localSecurity
    };

    const savedToDb = await saveSystemSettings(payload);

    // 3. Also cache to localStorage as offline fallback
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
    localStorage.setItem('saas_general_settings', JSON.stringify(mergedGeneral));
    localStorage.setItem('saas_notification_settings', JSON.stringify(localNotif));
    localStorage.setItem('saas_security_settings', JSON.stringify(localSecurity));

    setSaved(true);
    if (savedToDb) {
      addToast('success', '✅ All system configurations saved to the database successfully!');
    } else {
      addToast('warning', '⚠️ Saved locally — database sync failed. Check your connection.');
    }
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
        companyName: 'Gatecode OMS',
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
      
      const defaultGeneral = {
        companyName: 'Gatecode OMS',
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

      // Also reset in the database
      saveSystemSettings({
        companyProfile: {
          companyName: 'Gatecode OMS', regNumber: 'U72200DL2026PTC394850',
          gstNumber: '07AAAAA1111A1Z1', panNumber: 'AAAAA1111A', cinNumber: 'L72200DL2026PLC394850',
          websiteUrl: 'https://office-management.com', officialEmail: 'admin@saas.com',
          officialPhone: '+91 11 4050 6070', address: 'Plot No. 12, Sector 18, Udyog Vihar',
          city: 'Gurugram', state: 'Haryana', country: 'India', postalCode: '122008'
        },
        branches: [
          { code: 'BR-DEL', name: 'Delhi Head Office', manager: '', status: 'Active' },
          { code: 'BR-MUM', name: 'Mumbai Branch', manager: '', status: 'Active' },
          { code: 'BR-BLR', name: 'Bangalore Tech Center', manager: '', status: 'Active' },
          { code: 'BR-JPR', name: 'Jaipur Operations', manager: '', status: 'Active' }
        ],
        departments: [
          { id: '1', name: 'Engineering', head: '', capacity: 150 },
          { id: '2', name: 'Human Resources', head: '', capacity: 30 },
          { id: '3', name: 'Sales & Marketing', head: '', capacity: 80 },
          { id: '4', name: 'Operations', head: '', capacity: 120 },
          { id: '5', name: 'Finance', head: '', capacity: 25 }
        ],
        generalSettings: defaultGeneral,
        notificationSettings: defaultNotif,
        securitySettings: defaultSecurity
      });

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
  if (currentUserRole !== 'super_admin' && currentUserRole !== 'company_admin') {
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
          <h3>Admin Access Required</h3>
          <p>
            You are logged in as a <strong>{currentUserRole?.toUpperCase()?.replace('_', ' ') || 'Guest'}</strong>. 
            Only users with the role of <strong>Super Admin</strong> or <strong>Company Admin</strong> are authorized to view and modify system-wide configuration metrics.
          </p>
          <div className="denied-actions">
            <Button variant="primary" onClick={() => setCurrentUserRole('company_admin')}>
              <Sparkles size={16} /> Switch to Company Admin
            </Button>
            <Button variant="ghost" onClick={() => window.history.back()}>
              Return Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Branch handlers — wired to real database API
  const addBranchRow = async (e) => {
    e.preventDefault();
    if (!newBranch.code || !newBranch.name || !newBranch.manager) {
      addToast('error', 'Please fill all branch details.');
      return;
    }
    const result = await addBranch({
      id: newBranch.code,
      code: newBranch.code,
      name: newBranch.name,
      manager: newBranch.manager,
      status: newBranch.status || 'Active'
    });
    if (result) {
      setNewBranch({ code: '', name: '', manager: '', status: 'Active' });
    }
  };

  const removeBranchRow = async (branch) => {
    const idToDelete = branch._id || branch.id || branch.code;
    await deleteBranch(idToDelete);
  };

  // Department handlers — wired to real database API
  const addDeptRow = async (e) => {
    e.preventDefault();
    if (!newDept.name) {
      addToast('error', 'Please fill the department name.');
      return;
    }
    const result = await addDepartment({
      name: newDept.name,
      head: newDept.head || '',
      capacity: newDept.capacity || 50
    });
    if (result) {
      setNewDept({ name: '', head: '', capacity: 50 });
    }
  };

  const removeDeptRow = async (dept) => {
    const idToDelete = dept._id || dept.id;
    await deleteDepartment(idToDelete);
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
                  label="Official Contact Email"
                  value={companyProfile.officialEmail}
                  onChange={v => setCompanyProfile(p => ({ ...p, officialEmail: v }))}
                  placeholder="info@yourcompany.com"
                  disabled={true}
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
                    </tr>
                  </thead>
                  <tbody>
                    {branches.map(b => (
                      <tr key={b._id || b.id || b.code}>
                        <td><span className="font-mono text-primary">{b.id || b.code}</span></td>
                        <td>{b.name}</td>
                        <td>{b.manager || b.managerName || <span className="text-muted">—</span>}</td>
                        <td><span className="badge badge-success">{b.status || 'Active'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map(d => (
                      <tr key={d._id || d.id}>
                        <td><span className="font-mono text-muted">#{d.id || d._id?.slice(-4) || '—'}</span></td>
                        <td><strong>{d.name}</strong></td>
                        <td>{d.head || d.headName || <span className="text-muted">—</span>}</td>
                        <td>{d.capacity || d.maxCapacity || 0} active seats</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'employee':
        return (
          <div className="settings-section-content">
            <h3 className="settings-section-title">Employee Settings</h3>
            <p className="settings-section-desc">Configure system-wide employee status options, ID generation schemes, and probation rules.</p>

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
                  label="Late Arrival Time Threshold"
                  type="time"
                  value={attendanceRules.lateTimeThreshold || '09:15'}
                  onChange={v => setAttendanceRules(p => ({ ...p, lateTimeThreshold: v }))}
                />
                <SettingsInput
                  label="Half-Day Hours Threshold"
                  type="number"
                  value={attendanceRules.halfDayHoursThreshold !== undefined ? attendanceRules.halfDayHoursThreshold : 8}
                  onChange={v => setAttendanceRules(p => ({ ...p, halfDayHoursThreshold: parseFloat(v) || 0 }))}
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
                <div className="path-node">Manager</div>
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
                <div className="path-node">Manager</div>
                <div className="path-arrow">➔</div>
                <div className="path-node admin">HR / Super Admin</div>
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">Payroll Approval Path</h4>
              <div className="approval-path-visual">
                <div className="path-node current">HR Executive</div>
                <div className="path-arrow">➔</div>
                <div className="path-node">Manager</div>
                <div className="path-arrow">➔</div>
                <div className="path-node admin">Super Admin Approval</div>
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">Project Initiation Approval Path</h4>
              <div className="approval-path-visual">
                <div className="path-node current">Manager</div>
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

      case 'branding':
        return (
          <div className="settings-section-content">
            <h3 className="settings-section-title">Branding Settings</h3>
            <p className="settings-section-desc">Customize your organization's logo, primary/secondary colors, and company name settings.</p>

            {isBrandingLoading ? (
              <div className="flex justify-center items-center py-8" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
                <RefreshCw className="animate-spin text-primary" size={32} />
                <span className="ml-2" style={{ marginLeft: '12px', fontSize: '1rem', color: 'var(--text-muted)' }}>Loading branding parameters...</span>
              </div>
            ) : (
              <>
                <div className="settings-group">
                  <h4 className="settings-group-title">Organization Info</h4>
                  <div className="settings-fields-grid">
                    <SettingsInput
                      label="Company Name"
                      value={brandingForm.name}
                      onChange={v => setBrandingForm(p => ({ ...p, name: v }))}
                      placeholder="Acme Corporation"
                    />
                    <div className="settings-field">
                      <label className="settings-field-label">Target Subdomain (Read-only)</label>
                      <div className="input-group-subdomain" style={{ display: 'flex', alignItems: 'center' }}>
                        <input
                          type="text"
                          className="settings-input"
                          value={brandingForm.subdomain}
                          disabled={true}
                          style={{ cursor: 'not-allowed', background: 'rgba(255, 255, 255, 0.05)', flex: 1 }}
                        />
                        <span style={{ marginLeft: '8px', color: 'var(--text-muted)' }}>.saas.com</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="settings-group">
                  <h4 className="settings-group-title">Theme Colors</h4>
                  <div className="settings-fields-grid">
                    <div className="settings-field">
                      <label className="settings-field-label">Primary Theme Color</label>
                      <div className="color-picker-row" style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="color"
                          value={brandingForm.primaryColor}
                          onChange={e => setBrandingForm(p => ({ ...p, primaryColor: e.target.value }))}
                          style={{
                            width: '40px',
                            height: '40px',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            background: 'transparent'
                          }}
                        />
                        <input
                          type="text"
                          className="settings-input"
                          value={brandingForm.primaryColor}
                          onChange={e => setBrandingForm(p => ({ ...p, primaryColor: e.target.value }))}
                          placeholder="#3b82f6"
                          style={{ flex: 1 }}
                        />
                      </div>
                      <span className="setting-item-desc" style={{ marginTop: '4px', display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Controls main action highlights, active states, and primary buttons.
                      </span>
                    </div>

                    <div className="settings-field">
                      <label className="settings-field-label">Secondary Theme Color</label>
                      <div className="color-picker-row" style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="color"
                          value={brandingForm.secondaryColor}
                          onChange={e => setBrandingForm(p => ({ ...p, secondaryColor: e.target.value }))}
                          style={{
                            width: '40px',
                            height: '40px',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            background: 'transparent'
                          }}
                        />
                        <input
                          type="text"
                          className="settings-input"
                          value={brandingForm.secondaryColor}
                          onChange={e => setBrandingForm(p => ({ ...p, secondaryColor: e.target.value }))}
                          placeholder="#1d4ed8"
                          style={{ flex: 1 }}
                        />
                      </div>
                      <span className="setting-item-desc" style={{ marginTop: '4px', display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Controls background secondary gradients, hover highlights, and alternate highlights.
                      </span>
                    </div>
                  </div>
                </div>

                <div className="settings-group">
                  <h4 className="settings-group-title">Organization Logo</h4>
                  <div className="settings-field">
                    <label className="settings-field-label">Branding Logo Banner</label>
                    <div 
                      className="logo-upload-zone" 
                      style={{
                        border: '2px dashed rgba(255, 255, 255, 0.15)',
                        borderRadius: '8px',
                        padding: '20px',
                        textAlign: 'center',
                        background: 'rgba(255, 255, 255, 0.02)',
                        transition: 'border-color 0.2s',
                        cursor: 'pointer'
                      }}
                    >
                      {brandingLogoPreview ? (
                        <div className="logo-preview-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                          <img 
                            src={brandingLogoPreview} 
                            alt="Company Logo Preview" 
                            style={{ maxHeight: '80px', maxWidth: '200px', objectFit: 'contain', borderRadius: '4px' }} 
                          />
                          <button
                            type="button"
                            className="btn-remove-logo settings-sub-btn"
                            onClick={() => {
                              setBrandingLogoPreview(null);
                              setBrandingForm(prev => ({ ...prev, logoUrl: '' }));
                            }}
                            style={{ padding: '6px 12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            Remove Logo
                          </button>
                        </div>
                      ) : (
                        <label className="upload-placeholder" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <Upload size={32} className="text-muted mb-2" />
                          <span className="upload-title" style={{ fontWeight: '500', color: 'var(--text-primary)' }}>Choose logo file</span>
                          <span className="upload-desc" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>PNG, JPG up to 2MB</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (!file) return;
                              if (file.size > 2 * 1024 * 1024) {
                                addToast('danger', 'Logo image size cannot exceed 2MB.');
                                return;
                              }
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setBrandingLogoPreview(reader.result);
                                setBrandingForm(prev => ({ ...prev, logoUrl: reader.result }));
                              };
                              reader.readAsDataURL(file);
                            }}
                            style={{ display: 'none' }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
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

      {/* Top Summary stats cards — fetched from real database */}
      <div className="settings-stats-grid">
        <div className="sett-stat-card">
          <div className="sett-stat-top">
            <span className="sett-stat-label">Company Branches</span>
            <Building2 size={16} className="sett-stat-icon" />
          </div>
          <span className="sett-stat-val">{headerStats.activeBranches} Active</span>
          <span className="sett-stat-sub">Across {headerStats.totalBranches} branch{headerStats.totalBranches !== 1 ? 'es' : ''}</span>
        </div>
        <div className="sett-stat-card">
          <div className="sett-stat-top">
            <span className="sett-stat-label">Active Departments</span>
            <GitMerge size={16} className="sett-stat-icon" />
          </div>
          <span className="sett-stat-val">{headerStats.totalDepts} Dept{headerStats.totalDepts !== 1 ? 's' : ''}</span>
          <span className="sett-stat-sub">{headerStats.activeDepts} active department{headerStats.activeDepts !== 1 ? 's' : ''}</span>
        </div>
        <div className="sett-stat-card">
          <div className="sett-stat-top">
            <span className="sett-stat-label">Active Users</span>
            <Users size={16} className="sett-stat-icon" />
          </div>
          <span className="sett-stat-val">{headerStats.totalUsers.toLocaleString()} Users</span>
          <span className="sett-stat-sub">{headerStats.activeUsers.toLocaleString()} currently active</span>
        </div>
        <div className="sett-stat-card">
          <div className="sett-stat-top">
            <span className="sett-stat-label">System Modules</span>
            <Layout size={16} className="sett-stat-icon" />
          </div>
          <span className="sett-stat-val">{headerStats.totalModules} Active</span>
          <span className="sett-stat-sub">100% operational</span>
        </div>
        <div className="sett-stat-card">
          <div className="sett-stat-top">
            <span className="sett-stat-label">Security Status</span>
            <Shield size={16} className={`sett-stat-icon ${headerStats.is2FAEnabled ? 'text-success' : 'text-warning'}`} />
          </div>
          <span className={`sett-stat-val ${headerStats.is2FAEnabled ? 'text-success' : 'text-warning'}`}>
            {headerStats.is2FAEnabled ? 'Protected' : 'Standard'}
          </span>
          <span className="sett-stat-sub">{headerStats.is2FAEnabled ? '2FA active' : '2FA disabled'}</span>
        </div>
        <div className="sett-stat-card">
          <div className="sett-stat-top">
            <span className="sett-stat-label">Last System Update</span>
            <Clock size={16} className="sett-stat-icon" />
          </div>
          <span className="sett-stat-val">{headerStats.updateDate}</span>
          <span className="sett-stat-sub">At {headerStats.updateTime}</span>
        </div>
      </div>

      {/* Main settings layout */}
      <div className="settings-layout">
        {/* Settings Sidebar Nav */}
        <div className="card settings-nav">
          {filteredSidebarGroups.map(group => (
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
