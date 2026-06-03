import { useState, useMemo, useEffect } from 'react';
import './Branches.css';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Avatar from '../components/common/Avatar';
import Skeleton from '../components/common/Skeleton';
import {
  Network, Plus, Users, MapPin, Globe, TrendingUp, Search,
  Edit2, Trash2, Clock, BarChart3, Building2, Calendar,
  Phone, Mail, AlertCircle, CheckCircle,
  Activity, X, ChevronRight, ChevronDown,
  Download, Filter, Eye, Briefcase, Award, Target
} from 'lucide-react';

// Extended mock data with all required fields for complete management
const mockBranches = [
  {
    id: 'BR-001',
    name: 'Jaipur HQ',
    code: 'JPR-HQ',
    country: 'India',
    flag: '🇮🇳',
    manager: 'Aarav Sharma',
    managerId: 'EMP-2026-001',
    managerEmail: 'aarav.sharma@company.com',
    managerPhone: '+91 98765 43210',
    employeeCount: 320,
    departments: ['Operations', 'Sales', 'Marketing', 'IT', 'HR', 'Finance', 'Legal', 'R&D'],
    status: 'Active',
    statusType: 'active',
    timezone: 'IST (UTC+5:30)',
    established: '2022-01-15',
    revenue: 2400000,
    growth: '+24.5%',
    growthPositive: true,
    color: '#3b82f6',
    address: 'Malviya Nagar, Jaipur, Rajasthan 302017',
    city: 'Jaipur',
    state: 'Rajasthan',
    zipCode: '302017',
    phone: '+91 141 123 4567',
    email: 'jaipur.hq@company.com',
    attendance: 96,
    productivity: 94,
    projects: { active: 12, completed: 34, delayed: 2, pending: 3 },
    departmentHeads: 8,
    teamLeaders: 12,
    projectManagers: 6,
    employeesOnLeave: 16,
    documents: ['License.pdf', 'Registration.pdf', 'Agreement.pdf']
  },
  {
    id: 'BR-002',
    name: 'Delhi Branch',
    code: 'DEL-BR',
    country: 'India',
    flag: '🇮🇳',
    manager: 'Vikram Singh',
    managerId: 'EMP-2026-002',
    managerEmail: 'vikram.singh@company.com',
    managerPhone: '+91 98110 22334',
    employeeCount: 220,
    departments: ['Engineering', 'Human Resources', 'Sales', 'Support'],
    status: 'Active',
    statusType: 'active',
    timezone: 'IST (UTC+5:30)',
    established: '2022-06-10',
    revenue: 1850000,
    growth: '+14.2%',
    growthPositive: true,
    color: '#8b5cf6',
    address: 'Connaught Place, New Delhi - 110001',
    city: 'Delhi',
    state: 'Delhi',
    zipCode: '110001',
    phone: '+91 11 2345 6789',
    email: 'delhi.branch@company.com',
    attendance: 95,
    productivity: 92,
    projects: { active: 9, completed: 22, delayed: 1, pending: 2 },
    departmentHeads: 4,
    teamLeaders: 8,
    projectManagers: 4,
    employeesOnLeave: 11,
    documents: ['License.pdf', 'Agreement.pdf']
  },
  {
    id: 'BR-003',
    name: 'Mumbai Branch',
    code: 'MUM-BR',
    country: 'India',
    flag: '🇮🇳',
    manager: 'Priya Patel',
    managerId: 'EMP-2026-003',
    managerEmail: 'priya.patel@company.com',
    managerPhone: '+91 98222 33445',
    employeeCount: 180,
    departments: ['Marketing', 'Sales', 'Operations', 'Finance'],
    status: 'Active',
    statusType: 'active',
    timezone: 'IST (UTC+5:30)',
    established: '2023-11-01',
    revenue: 920000,
    growth: '+8.6%',
    growthPositive: true,
    color: '#ef4444',
    address: 'Bandra Kurla Complex, Mumbai - 400051',
    city: 'Mumbai',
    state: 'Maharashtra',
    zipCode: '400051',
    phone: '+91 22 3456 7890',
    email: 'mumbai.branch@company.com',
    attendance: 93,
    productivity: 91,
    projects: { active: 8, completed: 15, delayed: 1, pending: 2 },
    departmentHeads: 4,
    teamLeaders: 7,
    projectManagers: 3,
    employeesOnLeave: 9,
    documents: ['License.pdf']
  },
  {
    id: 'BR-004',
    name: 'Ahmedabad Agency',
    code: 'AMD-AG',
    country: 'India',
    flag: '🇮🇳',
    manager: 'Poojan Patel',
    managerId: 'EMP-2026-008',
    managerEmail: 'poojan.patel@company.com',
    managerPhone: '+91 98765 11223',
    employeeCount: 140,
    departments: ['Sales', 'Support', 'Operations'],
    status: 'Active',
    statusType: 'active',
    timezone: 'IST (UTC+5:30)',
    established: '2023-05-20',
    revenue: 680000,
    growth: '+18.3%',
    growthPositive: true,
    color: '#10b981',
    address: 'Satellite Road, Ahmedabad - 380015',
    city: 'Ahmedabad',
    state: 'Gujarat',
    zipCode: '380015',
    phone: '+91 79 4567 8901',
    email: 'ahmedabad@company.com',
    attendance: 92,
    productivity: 89,
    projects: { active: 6, completed: 12, delayed: 0, pending: 1 },
    departmentHeads: 3,
    teamLeaders: 5,
    projectManagers: 2,
    employeesOnLeave: 7,
    documents: ['License.pdf', 'Registration.pdf']
  },
  {
    id: 'BR-005',
    name: 'Bangalore Tech Hub',
    code: 'BLR-TECH',
    country: 'India',
    flag: '🇮🇳',
    manager: 'Kavya Iyer',
    managerId: 'EMP-2026-010',
    managerEmail: 'kavya.iyer@company.com',
    managerPhone: '+91 98456 78901',
    employeeCount: 195,
    departments: ['Engineering', 'Product', 'QA', 'DevOps'],
    status: 'Under Expansion',
    statusType: 'expansion',
    timezone: 'IST (UTC+5:30)',
    established: '2024-02-15',
    revenue: 1250000,
    growth: '+31.4%',
    growthPositive: true,
    color: '#f59e0b',
    address: 'Electronic City, Bangalore - 560100',
    city: 'Bangalore',
    state: 'Karnataka',
    zipCode: '560100',
    phone: '+91 80 5678 9012',
    email: 'bangalore@company.com',
    attendance: 94,
    productivity: 93,
    projects: { active: 11, completed: 8, delayed: 1, pending: 4 },
    departmentHeads: 4,
    teamLeaders: 9,
    projectManagers: 5,
    employeesOnLeave: 10,
    documents: ['License.pdf', 'Agreement.pdf', 'Compliance.pdf']
  },
  {
    id: 'BR-006',
    name: 'Chennai Franchise',
    code: 'CHN-FR',
    country: 'India',
    flag: '🇮🇳',
    manager: 'Not Assigned',
    managerId: null,
    managerEmail: null,
    managerPhone: null,
    employeeCount: 78,
    departments: ['Sales', 'Customer Service'],
    status: 'Inactive',
    statusType: 'inactive',
    timezone: 'IST (UTC+5:30)',
    established: '2024-08-10',
    revenue: 320000,
    growth: '-5.2%',
    growthPositive: false,
    color: '#6b7280',
    address: 'T Nagar, Chennai - 600017',
    city: 'Chennai',
    state: 'Tamil Nadu',
    zipCode: '600017',
    phone: '+91 44 6789 0123',
    email: 'chennai@company.com',
    attendance: 85,
    productivity: 72,
    projects: { active: 2, completed: 4, delayed: 2, pending: 1 },
    departmentHeads: 2,
    teamLeaders: 3,
    projectManagers: 1,
    employeesOnLeave: 12,
    documents: ['License.pdf']
  },
  {
    id: 'BR-007',
    name: 'Kolkata New Branch',
    code: 'KOL-NEW',
    country: 'India',
    flag: '🇮🇳',
    manager: 'Sanjay Das',
    managerId: 'EMP-2026-015',
    managerEmail: 'sanjay.das@company.com',
    managerPhone: '+91 98345 67890',
    employeeCount: 102,
    departments: ['Sales', 'Marketing', 'Operations'],
    status: 'New Branch',
    statusType: 'new',
    timezone: 'IST (UTC+5:30)',
    established: '2025-01-10',
    revenue: 450000,
    growth: '+45.2%',
    growthPositive: true,
    color: '#ec489a',
    address: 'Salt Lake City, Kolkata - 700091',
    city: 'Kolkata',
    state: 'West Bengal',
    zipCode: '700091',
    phone: '+91 33 7890 1234',
    email: 'kolkata@company.com',
    attendance: 90,
    productivity: 88,
    projects: { active: 5, completed: 2, delayed: 0, pending: 3 },
    departmentHeads: 3,
    teamLeaders: 4,
    projectManagers: 2,
    employeesOnLeave: 5,
    documents: ['License.pdf', 'Registration.pdf', 'Agreement.pdf']
  }
];

// Branch Ranking Table Data
const branchRanking = [
  { rank: 1, name: 'Jaipur HQ', employees: 320, attendance: 96, productivity: 94 },
  { rank: 2, name: 'Delhi Branch', employees: 220, attendance: 95, productivity: 92 },
  { rank: 3, name: 'Bangalore Tech Hub', employees: 195, attendance: 94, productivity: 93 },
  { rank: 4, name: 'Mumbai Branch', employees: 180, attendance: 93, productivity: 91 },
  { rank: 5, name: 'Ahmedabad Agency', employees: 140, attendance: 92, productivity: 89 },
];

const Branches = () => {
  const isLoading = usePageLoading(500);
  const { addToast, showConfirm } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [performanceFilter, setPerformanceFilter] = useState('all');
  const [selectedBranchId, setSelectedBranchId] = useState('BR-001');
  const [showHierarchy, setShowHierarchy] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState(['root']);

  const [branches, setBranches] = useState(mockBranches);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showWfhModal, setShowWfhModal] = useState(false);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [newDocName, setNewDocName] = useState('');

  // Form states
  const [newBranch, setNewBranch] = useState({
    name: '', code: '', country: 'India', flag: '🇮🇳',
    manager: '', managerEmail: '', managerPhone: '',
    address: '', city: '', state: '', zipCode: '', phone: '', email: '',
    status: 'Active', statusType: 'active', established: new Date().toISOString().split('T')[0],
    revenue: 500000, departments: ['Sales', 'Marketing'],
    attendance: 95, productivity: 90,
    employeeCount: 50,
  });

  const [transfer, setTransfer] = useState({
    employeeName: '',
    fromBranchId: 'BR-001',
    toBranchId: 'BR-002',
    department: 'Sales'
  });

  const [managerUpdate, setManagerUpdate] = useState({
    branchId: 'BR-001',
    name: '',
    email: '',
    phone: ''
  });

  // WFH requests list
  const [wfhRequests, setWfhRequests] = useState([
    { id: 'WFH-001', employeeName: 'Amit Sharma', branchId: 'BR-001', branchName: 'Jaipur HQ', department: 'Engineering', date: '2026-06-02', reason: 'Medical appointment', status: 'Pending' },
    { id: 'WFH-002', employeeName: 'Neha Verma', branchId: 'BR-002', branchName: 'Delhi Branch', department: 'Sales', date: '2026-06-03', reason: 'Commute issue', status: 'Pending' },
    { id: 'WFH-003', employeeName: 'Rohan Gupta', branchId: 'BR-005', branchName: 'Bangalore Tech Hub', department: 'Product', date: '2026-06-04', reason: 'Home renovation', status: 'Pending' }
  ]);

  // Activity Timeline
  const [activities, setActivities] = useState([
    { id: 1, text: 'Kolkata New Branch registered in database', time: '10 mins ago', type: 'info' },
    { id: 2, text: 'Sanjay Das assigned as Kolkata Branch Manager', time: '1 hour ago', type: 'success' },
    { id: 3, text: 'Jaipur HQ Attendance policy updated to Standard 9-6', time: 'Yesterday', type: 'warning' },
    { id: 4, text: '12 Employees transferred from Chennai to Bangalore', time: '2 days ago', type: 'info' },
    { id: 5, text: 'Marketing Department added to Mumbai Branch', time: '3 days ago', type: 'success' }
  ]);

  // Dropdown options and custom additions
  const [availableManagers, setAvailableManagers] = useState([
    { name: 'Aarav Sharma', email: 'aarav.sharma@company.com', phone: '+91 98765 43210' },
    { name: 'Vikram Singh', email: 'vikram.singh@company.com', phone: '+91 98110 22334' },
    { name: 'Priya Patel', email: 'priya.patel@company.com', phone: '+91 98222 33445' },
    { name: 'Poojan Patel', email: 'poojan.patel@company.com', phone: '+91 98765 11223' },
    { name: 'Kavya Iyer', email: 'kavya.iyer@company.com', phone: '+91 98456 78901' },
    { name: 'Sanjay Das', email: 'sanjay.das@company.com', phone: '+91 98345 67890' }
  ]);

  const [availableDepts, setAvailableDepts] = useState([
    'Operations', 'Sales', 'Marketing', 'IT', 'HR', 'Finance', 'Legal', 'R&D', 'Engineering', 'Support', 'Product', 'QA', 'DevOps', 'Customer Service'
  ]);

  const [newManagerDetails, setNewManagerDetails] = useState({ name: '', email: '', phone: '' });
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);
  const [newDeptInput, setNewDeptInput] = useState('');

  const handleAddNewManagerAddBranch = () => {
    if (!newManagerDetails.name.trim()) {
      addToast('warning', 'Please enter a manager name');
      return;
    }
    const exists = availableManagers.some(m => m.name.toLowerCase() === newManagerDetails.name.trim().toLowerCase());
    if (exists) {
      addToast('warning', 'Manager with this name already exists');
      return;
    }
    const newMgr = {
      name: newManagerDetails.name.trim(),
      email: newManagerDetails.email.trim(),
      phone: newManagerDetails.phone.trim()
    };
    setAvailableManagers(prev => [...prev, newMgr]);
    setNewBranch(prev => ({
      ...prev,
      manager: newMgr.name,
      managerEmail: newMgr.email,
      managerPhone: newMgr.phone
    }));
    setNewManagerDetails({ name: '', email: '', phone: '' });
    addToast('success', `Manager "${newMgr.name}" added and selected!`);
  };

  const handleAddNewManagerChangeManager = () => {
    if (!newManagerDetails.name.trim()) {
      addToast('warning', 'Please enter a manager name');
      return;
    }
    const exists = availableManagers.some(m => m.name.toLowerCase() === newManagerDetails.name.trim().toLowerCase());
    if (exists) {
      addToast('warning', 'Manager with this name already exists');
      return;
    }
    const newMgr = {
      name: newManagerDetails.name.trim(),
      email: newManagerDetails.email.trim(),
      phone: newManagerDetails.phone.trim()
    };
    setAvailableManagers(prev => [...prev, newMgr]);
    setManagerUpdate(prev => ({
      ...prev,
      name: newMgr.name,
      email: newMgr.email,
      phone: newMgr.phone
    }));
    setNewManagerDetails({ name: '', email: '', phone: '' });
    addToast('success', `Manager "${newMgr.name}" added and selected!`);
  };

  // Close department dropdown on click outside
  useEffect(() => {
    const handleClose = (e) => {
      if (!e.target.closest('.custom-multiselect-trigger') && !e.target.closest('.custom-multiselect-dropdown')) {
        setShowDeptDropdown(false);
      }
    };
    document.addEventListener('click', handleClose);
    return () => document.removeEventListener('click', handleClose);
  }, [showDeptDropdown]);

  const handleAddBranchSubmit = (e) => {
    e.preventDefault();
    
    let managerName = newBranch.manager;
    let managerEmail = newBranch.managerEmail;
    let managerPhone = newBranch.managerPhone;
    
    // Automatically save manager if "ADD_NEW" is selected and details are filled in
    if (newBranch.manager === 'ADD_NEW') {
      if (!newManagerDetails.name.trim()) {
        addToast('warning', 'Please enter a manager name or select an existing one');
        return;
      }
      const exists = availableManagers.some(m => m.name.toLowerCase() === newManagerDetails.name.trim().toLowerCase());
      let newMgr;
      if (exists) {
        newMgr = availableManagers.find(m => m.name.toLowerCase() === newManagerDetails.name.trim().toLowerCase());
      } else {
        newMgr = {
          name: newManagerDetails.name.trim(),
          email: newManagerDetails.email.trim(),
          phone: newManagerDetails.phone.trim()
        };
        setAvailableManagers(prev => [...prev, newMgr]);
      }
      managerName = newMgr.name;
      managerEmail = newMgr.email;
      managerPhone = newMgr.phone;
      setNewManagerDetails({ name: '', email: '', phone: '' });
    }

    if (!newBranch.name || !newBranch.code || !managerName) {
      addToast('warning', 'Please fill in Name, Code, and select a valid Manager');
      return;
    }

    let finalDepts = [...newBranch.departments];
    if (newDeptInput.trim()) {
      const deptName = newDeptInput.trim();
      if (!availableDepts.includes(deptName)) {
        setAvailableDepts(prev => [...prev, deptName]);
      }
      if (!finalDepts.includes(deptName)) {
        finalDepts.push(deptName);
      }
      setNewDeptInput('');
    }

    const newId = `BR-00${branches.length + 1}`;
    const formattedBranch = {
      ...newBranch,
      id: newId,
      manager: managerName,
      managerEmail: managerEmail,
      managerPhone: managerPhone,
      departments: finalDepts,
      projects: { active: 3, completed: 5, delayed: 0, pending: 1 },
      employeesOnLeave: 2,
      teamLeaders: 3,
      projectManagers: 1,
      documents: ['License.pdf'],
      color: ['#3b82f6', '#8b5cf6', '#ef4444', '#10b981', '#f59e0b', '#ec489a'][branches.length % 6]
    };
    setBranches(prev => [...prev, formattedBranch]);
    setActivities(prev => [
      { id: Date.now(), text: `New Branch Created: ${newBranch.name} (${newBranch.code})`, time: 'Just now', type: 'success' },
      ...prev
    ]);
    addToast('success', `Branch "${newBranch.name}" added successfully!`);
    setShowAddModal(false);
  };

  const handleTransferSubmit = (e) => {
    e.preventDefault();
    if (!transfer.employeeName) {
      addToast('warning', 'Please enter employee name');
      return;
    }
    const fromBranch = branches.find(b => b.id === transfer.fromBranchId);
    const toBranch = branches.find(b => b.id === transfer.toBranchId);

    if (transfer.fromBranchId === transfer.toBranchId) {
      addToast('warning', 'Source and destination branches must be different');
      return;
    }

    setBranches(prev => prev.map(b => {
      if (b.id === transfer.fromBranchId) {
        return { ...b, employeeCount: Math.max(0, b.employeeCount - 1) };
      }
      if (b.id === transfer.toBranchId) {
        return { ...b, employeeCount: b.employeeCount + 1 };
      }
      return b;
    }));

    setActivities(prev => [
      { id: Date.now(), text: `${transfer.employeeName} transferred from ${fromBranch.name} to ${toBranch.name}`, time: 'Just now', type: 'info' },
      ...prev
    ]);

    addToast('success', `${transfer.employeeName} transferred to ${toBranch.name}!`);
    setShowTransferModal(false);
  };

  const handleManagerSubmit = (e) => {
    e.preventDefault();
    
    let managerName = managerUpdate.name;
    let managerEmail = managerUpdate.email;
    let managerPhone = managerUpdate.phone;
    
    // Automatically save manager if "ADD_NEW" is selected and details are filled in
    if (managerUpdate.name === 'ADD_NEW') {
      if (!newManagerDetails.name.trim()) {
        addToast('warning', 'Please enter a manager name or select an existing one');
        return;
      }
      const exists = availableManagers.some(m => m.name.toLowerCase() === newManagerDetails.name.trim().toLowerCase());
      let newMgr;
      if (exists) {
        newMgr = availableManagers.find(m => m.name.toLowerCase() === newManagerDetails.name.trim().toLowerCase());
      } else {
        newMgr = {
          name: newManagerDetails.name.trim(),
          email: newManagerDetails.email.trim(),
          phone: newManagerDetails.phone.trim()
        };
        setAvailableManagers(prev => [...prev, newMgr]);
      }
      managerName = newMgr.name;
      managerEmail = newMgr.email;
      managerPhone = newMgr.phone;
      setNewManagerDetails({ name: '', email: '', phone: '' });
    }

    if (!managerName) {
      addToast('warning', 'Please enter manager name');
      return;
    }

    setBranches(prev => prev.map(b => {
      if (b.id === managerUpdate.branchId) {
        return {
          ...b,
          manager: managerName,
          managerEmail: managerEmail || b.managerEmail,
          managerPhone: managerPhone || b.managerPhone
        };
      }
      return b;
    }));

    const targetBranch = branches.find(b => b.id === managerUpdate.branchId);
    setActivities(prev => [
      { id: Date.now(), text: `Manager updated for ${targetBranch.name}: ${managerName}`, time: 'Just now', type: 'success' },
      ...prev
    ]);

    addToast('success', `Manager updated for ${targetBranch.name}!`);
    setShowManagerModal(false);
  };

  const handleWfhApproval = (reqId, isApproved) => {
    setWfhRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: isApproved ? 'Approved' : 'Rejected' } : r));
    const req = wfhRequests.find(r => r.id === reqId);
    
    if (isApproved) {
      setBranches(prev => prev.map(b => b.id === req.branchId ? { ...b, employeesOnLeave: b.employeesOnLeave + 1 } : b));
    }

    setActivities(prev => [
      { id: Date.now(), text: `WFH Request for ${req.employeeName} (${req.branchName}) was ${isApproved ? 'Approved' : 'Rejected'}`, time: 'Just now', type: isApproved ? 'success' : 'danger' },
      ...prev
    ]);

    addToast(isApproved ? 'success' : 'warning', `WFH request for ${req.employeeName} ${isApproved ? 'Approved' : 'Rejected'}.`);
  };

  const handleUploadDocument = (e) => {
    e.preventDefault();
    if (!newDocName.trim()) {
      addToast('warning', 'Please enter document name');
      return;
    }
    const docFile = newDocName.endsWith('.pdf') ? newDocName : `${newDocName}.pdf`;
    setBranches(prev => prev.map(b => b.id === selectedBranchId ? { ...b, documents: [...(b.documents || []), docFile] } : b));
    addToast('success', `Uploaded "${docFile}" to branch vault.`);
    setNewDocName('');
  };

  const handleDeleteDocument = (docFile) => {
    showConfirm('Delete Document', `Are you sure you want to delete "${docFile}"?`, () => {
      setBranches(prev => prev.map(b => b.id === selectedBranchId ? { ...b, documents: (b.documents || []).filter(d => d !== docFile) } : b));
      addToast('warning', `Deleted "${docFile}" from vault.`);
    }, 'danger');
  };

  const filteredBranches = useMemo(() => {
    return branches.filter(b => {
      const matchesSearch = b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.country.toLowerCase().includes(search.toLowerCase()) ||
        b.manager.toLowerCase().includes(search.toLowerCase()) ||
        b.city.toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || b.statusType === statusFilter;
      const matchesType = typeFilter === 'all' || 
        (typeFilter === 'Head Office' && b.name.includes('HQ')) ||
        (typeFilter === 'Branch Office' && b.name.includes('Branch')) ||
        (typeFilter === 'Agency' && b.name.includes('Agency')) ||
        (typeFilter === 'Franchise' && b.name.includes('Franchise'));
      
      let matchesPerformance = true;
      if (performanceFilter === 'High Performance') matchesPerformance = b.productivity >= 90;
      else if (performanceFilter === 'Average Performance') matchesPerformance = b.productivity >= 75 && b.productivity < 90;
      else if (performanceFilter === 'Low Performance') matchesPerformance = b.productivity < 75;
      
      return matchesSearch && matchesStatus && matchesType && matchesPerformance;
    });
  }, [branches, search, statusFilter, typeFilter, performanceFilter]);

  const selectedBranch = branches.find(b => b.id === selectedBranchId);
  
  const totalBranches = branches.length;
  const activeBranches = branches.filter(b => b.statusType === 'active').length;
  const totalEmployees = branches.reduce((acc, b) => acc + b.employeeCount, 0);
  const totalDepartments = branches.reduce((acc, b) => acc + b.departments.length, 0);
  const totalActiveProjects = branches.reduce((acc, b) => acc + b.projects.active, 0);
  const avgProductivity = (branches.reduce((acc, b) => acc + b.productivity, 0) / branches.length).toFixed(1);
  const totalRevenue = branches.reduce((acc, b) => acc + b.revenue, 0);

  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => 
      prev.includes(nodeId) ? prev.filter(id => id !== nodeId) : [...prev, nodeId]
    );
  };

  const getStatusBadgeVariant = (statusType) => {
    switch(statusType) {
      case 'active': return 'success';
      case 'expansion': return 'warning';
      case 'new': return 'info';
      case 'inactive': return 'danger';
      default: return 'neutral';
    }
  };

  const getStatusIcon = (statusType) => {
    switch(statusType) {
      case 'active': return <CheckCircle size={12} />;
      case 'expansion': return <Activity size={12} />;
      case 'new': return <Target size={12} />;
      default: return <AlertCircle size={12} />;
    }
  };

  const handleExportCSV = () => {
    addToast('info', 'Compiling report...');
    setTimeout(() => {
      const headers = ['ID','Code','Name','Manager','Country','City','Status','Employees','Attendance','Productivity','Revenue'];
      const rows = branches.map(b => [
        b.id, b.code, b.name, b.manager, b.country, b.city, b.status, b.employeeCount, b.attendance, b.productivity, b.revenue
      ]);
      const csv = [headers, ...rows].map(r => r.map(c => `"${c || ''}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'branches_summary_report.csv'; a.click();
      URL.revokeObjectURL(url);
      addToast('success', 'Branches CSV Download Ready!');
    }, 800);
  };

  if (isLoading) {
    return (
      <div className="branches-page">
        <div className="branches-summary">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card" style={{ height: 100 }}>
              <Skeleton variant="rect" height="100%" width="100%" />
            </div>
          ))}
        </div>
        <div className="card" style={{ height: 60 }}><Skeleton variant="rect" height="100%" width="100%" /></div>
        <div className="branches-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card" style={{ height: 320 }}>
              <Skeleton variant="rect" height="100%" width="100%" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="branches-page">
      {/* Page Header */}
      <div className="branches-header">
        <div>
          <h1 className="branches-title">Agency / Branch Management</h1>
          <p className="branches-subtitle">Manage, monitor, and control all company branches, agencies, offices, franchise locations, branch employees, department structures, attendance, projects, and operational performance from one centralized enterprise management system.</p>
        </div>
        <div className="branches-header-actions">
          <Button variant="outline" icon={Download} onClick={handleExportCSV}>
            Export Reports
          </Button>
          <Button variant="primary" icon={Plus} onClick={() => {
            setNewBranch({
              name: '', code: '', country: 'India', flag: '🇮🇳',
              manager: '', managerEmail: '', managerPhone: '',
              address: '', city: '', state: '', zipCode: '', phone: '', email: '',
              status: 'Active', statusType: 'active', established: new Date().toISOString().split('T')[0],
              revenue: 500000, departments: ['Sales', 'Marketing'],
              attendance: 95, productivity: 90,
              employeeCount: 50,
            });
            setShowAddModal(true);
          }}>
            Add New Branch
          </Button>
        </div>
      </div>

      {/* Top Summary Cards */}
      <div className="branches-summary">
        {[
          { label: 'Total Branches', value: totalBranches, sub: `${activeBranches} Active`, icon: Network, color: '#3b82f6' },
          { label: 'Total Employees', value: totalEmployees, sub: 'Across all branches', icon: Users, color: '#10b981' },
          { label: 'Active Departments', value: totalDepartments, sub: 'Across all branches', icon: Building2, color: '#8b5cf6' },
          { label: 'Active Projects', value: totalActiveProjects, sub: '+56 Completed', icon: Briefcase, color: '#f59e0b' },
          { label: 'Productivity Rate', value: `${avgProductivity}%`, sub: 'Overall performance', icon: Award, color: '#ef4444' },
          { label: 'Total Revenue', value: `$${(totalRevenue / 1000000).toFixed(1)}M`, sub: 'YTD Growth +18%', icon: TrendingUp, color: '#06b6d4' }
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="branches-sum-card card">
              <div className="branches-sum-icon" style={{ background: `${s.color}20`, color: s.color }}>
                <Icon size={20} />
              </div>
              <div>
                <p className="branches-sum-val">{s.value}</p>
                <p className="branches-sum-label">{s.label}</p>
                <p className="branches-sum-sub">{s.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters & Search Bar */}
      <div className="card branches-filters">
        <div className="dept-search-wrap">
          <Search size={16} className="dept-search-icon" />
          <input
            className="dept-search-input"
            placeholder="Search by Branch Name, Code, Manager, City, State..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="branches-filter-group">
          <div className="filter-header-item"><Filter size={13} style={{ marginRight: '6px', color: 'var(--text-muted)' }} /> Filters:</div>
          <select className="branch-filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">🟢 Active</option>
            <option value="expansion">🟡 Under Expansion</option>
            <option value="new">🔵 New Branch</option>
            <option value="inactive">🔴 Inactive</option>
          </select>
          <select className="branch-filter-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="all">All Types</option>
            <option value="Head Office">🏢 Head Office</option>
            <option value="Branch Office">📍 Branch Office</option>
            <option value="Agency">🤝 Agency</option>
            <option value="Franchise">⭐ Franchise</option>
          </select>
          <select className="branch-filter-select" value={performanceFilter} onChange={e => setPerformanceFilter(e.target.value)}>
            <option value="all">All Performance</option>
            <option value="High Performance">🔥 High Performance (90%+)</option>
            <option value="Average Performance">📊 Average (75-89%)</option>
            <option value="Low Performance">⚠️ Low Performance (&lt;75%)</option>
          </select>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="branches-layout-two">
        {/* Left Column - Branch Cards */}
        <div className="branches-grid">
          {filteredBranches.length === 0 ? (
            <div className="card empty-grid-card" style={{ gridColumn: 'span 2', padding: 'var(--space-6)', textAlign: 'center' }}>
              <Building2 size={40} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
              <h3>No Branches Found</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Try clearing filters or search for another term.</p>
            </div>
          ) : (
            filteredBranches.map(branch => (
              <div
                key={branch.id}
                className={`card branch-card ${selectedBranchId === branch.id ? 'branch-card-selected' : ''}`}
                style={{ borderLeft: `4px solid ${branch.color}` }}
                onClick={() => setSelectedBranchId(branch.id)}
              >
                <div className="branch-card-top">
                  <div className="branch-flag-name">
                    <span className="branch-flag">{branch.flag}</span>
                    <div>
                      <h3 className="branch-card-title">{branch.name}</h3>
                      <p className="branch-country"><Globe size={11} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> {branch.country} • {branch.city}</p>
                    </div>
                  </div>
                  <div className="branch-status-actions">
                    <Badge variant={getStatusBadgeVariant(branch.statusType)}>
                      {getStatusIcon(branch.statusType)} {branch.status}
                    </Badge>
                    <button
                      className="icon-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setManagerUpdate({
                          branchId: branch.id,
                          name: branch.manager,
                          email: branch.managerEmail || '',
                          phone: branch.managerPhone || ''
                        });
                        setShowManagerModal(true);
                      }}
                      title="Quick Assign Manager"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      className="icon-action-btn icon-action-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        showConfirm('Delete Branch', `Are you sure you want to delete ${branch.name}? All data will be archived.`, () => {
                          setBranches(prev => prev.filter(b => b.id !== branch.id));
                          setActivities(prev => [
                            { id: Date.now(), text: `Branch Deleted: ${branch.name}`, time: 'Just now', type: 'danger' },
                            ...prev
                          ]);
                          addToast('warning', `${branch.name} removed successfully.`);
                        }, 'danger');
                      }}
                      title="Delete Branch"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="branch-address">
                  <MapPin size={12} />
                  <span>{branch.address}</span>
                </div>

                <div className="branch-info-grid">
                  <div className="branch-info-cell">
                    <span className="branch-info-label"><Users size={11} /> Employees</span>
                    <span className="branch-info-val">{branch.employeeCount}</span>
                  </div>
                  <div className="branch-info-cell">
                    <span className="branch-info-label"><Activity size={11} /> Attendance</span>
                    <span className="branch-info-val">{branch.attendance}%</span>
                  </div>
                  <div className="branch-info-cell">
                    <span className="branch-info-label"><TrendingUp size={11} /> Productivity</span>
                    <span className="branch-info-val">{branch.productivity}%</span>
                  </div>
                  <div className="branch-info-cell">
                    <span className="branch-info-label"><Briefcase size={11} /> Projects</span>
                    <span className="branch-info-val">{branch.projects.active}</span>
                  </div>
                </div>

                <div className="branch-departments">
                  <span className="branch-info-label">Departments</span>
                  <div className="branch-dept-badges">
                    {branch.departments.slice(0, 3).map(d => <Badge key={d} variant="neutral" size="sm">{d}</Badge>)}
                    {branch.departments.length > 3 && <Badge variant="neutral" size="sm">+{branch.departments.length - 3}</Badge>}
                  </div>
                </div>

                <div className="branch-footer">
                  <div className="dept-head-mini">
                    <Avatar name={branch.manager} size="xs" />
                    <span>{branch.manager}</span>
                  </div>
                  <span className="branch-since"><Calendar size={10} /> {branch.established}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Column - Detailed View, Hierarchy, Analytics */}
        <div className="branches-right-panel">
          {/* Quick Actions Panel */}
          <div className="card quick-actions-card">
            <h3 className="panel-title"><Activity size={16} /> Quick Operations Bar</h3>
            <div className="quick-actions-grid">
              <button className="quick-action-btn-item" onClick={() => {
                setNewBranch({
                  name: '', code: '', country: 'India', flag: '🇮🇳',
                  manager: '', managerEmail: '', managerPhone: '',
                  address: '', city: '', state: '', zipCode: '', phone: '', email: '',
                  status: 'Active', statusType: 'active', established: new Date().toISOString().split('T')[0],
                  revenue: 500000, departments: ['Sales', 'Marketing'],
                  attendance: 95, productivity: 90,
                  employeeCount: 50,
                });
                setShowAddModal(true);
              }}>
                <Plus size={14} /> Add Branch
              </button>
              <button className="quick-action-btn-item" onClick={() => {
                setTransfer({
                  employeeName: '',
                  fromBranchId: selectedBranchId || 'BR-001',
                  toBranchId: 'BR-002',
                  department: 'Sales'
                });
                setShowTransferModal(true);
              }}>
                <Users size={14} /> Transfer Staff
              </button>
              <button className="quick-action-btn-item" onClick={() => {
                if (selectedBranch) {
                  setManagerUpdate({
                    branchId: selectedBranch.id,
                    name: selectedBranch.manager,
                    email: selectedBranch.managerEmail || '',
                    phone: selectedBranch.managerPhone || ''
                  });
                  setShowManagerModal(true);
                } else {
                  addToast('warning', 'Please select a branch first');
                }
              }}>
                <Edit2 size={14} /> Assign Manager
              </button>
              <button className="quick-action-btn-item" onClick={() => setShowWfhModal(true)}>
                <Clock size={14} /> WFH Approvals <span className="wfh-badge">{wfhRequests.filter(r => r.status === 'Pending').length}</span>
              </button>
              <button className="quick-action-btn-item" onClick={handleExportCSV}>
                <Download size={14} /> Export CSV Data
              </button>
            </div>
          </div>

          {/* Branch Detail View - Selected Branch */}
          {selectedBranch ? (
            <div className="card branch-detail-card">
              <div className="detail-card-header">
                <h3 className="panel-title"><Eye size={16} /> Selected Branch Details</h3>
                <span className="detail-branch-code">{selectedBranch.code}</span>
              </div>

              <div className="detail-tabs">
                <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
                  <Building2 size={13} /> Information
                </button>
                <button className={`tab-btn ${activeTab === 'allocation' ? 'active' : ''}`} onClick={() => setActiveTab('allocation')}>
                  <Users size={13} /> Allocation
                </button>
                <button className={`tab-btn ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => setActiveTab('documents')}>
                  <Calendar size={13} /> Doc Vault
                </button>
                <button className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
                  <TrendingUp size={13} /> Analytics
                </button>
              </div>
              
              <div className="branch-detail-sections">
                {activeTab === 'overview' && (
                  <div className="detail-section animate-fade-in">
                    <h4><Building2 size={14} /> General Branch Information</h4>
                    <div className="detail-grid">
                      <div><label>Branch Name:</label><span>{selectedBranch.name}</span></div>
                      <div><label>Country:</label><span>{selectedBranch.flag} {selectedBranch.country}</span></div>
                      <div><label>City & State:</label><span>{selectedBranch.city}, {selectedBranch.state}</span></div>
                      <div><label>ZIP Code:</label><span>{selectedBranch.zipCode}</span></div>
                      <div><label>Established:</label><span>{selectedBranch.established}</span></div>
                      <div><label>Timezone:</label><span>{selectedBranch.timezone}</span></div>
                      <div style={{ gridColumn: 'span 2' }}><label>Address:</label><span>{selectedBranch.address}</span></div>
                    </div>

                    <h4 style={{ marginTop: '16px' }}><Users size={14} /> Manager Contact Card</h4>
                    <div className="manager-contact-card">
                      <Avatar name={selectedBranch.manager} size="md" />
                      <div className="manager-contact-info">
                        <strong>{selectedBranch.manager}</strong>
                        <span><Mail size={11} /> {selectedBranch.managerEmail || 'no-email@company.com'}</span>
                        <span><Phone size={11} /> {selectedBranch.managerPhone || 'No phone record'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'allocation' && (
                  <div className="detail-section animate-fade-in">
                    <h4><Users size={14} /> Staff Allocation Overview</h4>
                    <div className="stats-mini-grid">
                      <div className="stat-mini"><span>Employees</span><strong>{selectedBranch.employeeCount}</strong></div>
                      <div className="stat-mini"><span>On Leave</span><strong>{selectedBranch.employeesOnLeave}</strong></div>
                      <div className="stat-mini"><span>Team Leaders</span><strong>{selectedBranch.teamLeaders}</strong></div>
                      <div className="stat-mini"><span>Project Mgrs</span><strong>{selectedBranch.projectManagers}</strong></div>
                    </div>

                    <h4 style={{ marginTop: '16px' }}>Departments Distribution</h4>
                    <div className="detail-dept-badges">
                      {selectedBranch.departments.map(d => (
                        <Badge key={d} variant="neutral">{d}</Badge>
                      ))}
                    </div>

                    <div className="allocation-action-box" style={{ marginTop: '20px' }}>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Need to transfer employees or update management assignments for this branch?</p>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button size="sm" variant="outline" onClick={() => {
                          setTransfer({
                            employeeName: '',
                            fromBranchId: selectedBranch.id,
                            toBranchId: 'BR-002',
                            department: 'Sales'
                          });
                          setShowTransferModal(true);
                        }}>Transfer Staff</Button>
                        <Button size="sm" variant="outline" onClick={() => {
                          setManagerUpdate({
                            branchId: selectedBranch.id,
                            name: selectedBranch.manager,
                            email: selectedBranch.managerEmail || '',
                            phone: selectedBranch.managerPhone || ''
                          });
                          setShowManagerModal(true);
                        }}>Reassign Manager</Button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'documents' && (
                  <div className="detail-section animate-fade-in">
                    <h4><Calendar size={14} /> Branch Document Vault</h4>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '12px' }}>Browse compliance certificates, rental agreements, and operational policies for this location.</p>
                    
                    <div className="doc-vault-list">
                      {(selectedBranch.documents || []).length === 0 ? (
                        <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No documents uploaded.</div>
                      ) : (
                        (selectedBranch.documents || []).map(doc => (
                          <div key={doc} className="doc-vault-row">
                            <span style={{ fontSize: '1.1rem' }}>📄</span>
                            <span className="doc-name-text">{doc}</span>
                            <div className="doc-vault-actions">
                              <a href="#" className="doc-vault-download" onClick={(e) => { e.preventDefault(); addToast('success', `Downloading ${doc}...`); }} title="Download Document">
                                <Download size={12} />
                              </a>
                              <button className="doc-vault-delete" onClick={() => handleDeleteDocument(doc)} title="Delete Document" type="button">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <form className="doc-upload-form" onSubmit={handleUploadDocument} style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="New document name (e.g. Policy)..."
                        value={newDocName}
                        onChange={e => setNewDocName(e.target.value)}
                        className="doc-upload-input"
                      />
                      <Button size="sm" variant="outline" icon={Plus}>Upload</Button>
                    </form>
                  </div>
                )}

                {activeTab === 'analytics' && (
                  <div className="detail-section animate-fade-in">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <h4><Award size={14} /> Productivity Score</h4>
                        <div className="productivity-gauge-box">
                          <div className="score-circle-container">
                            <div className="score-circle" style={{ background: `conic-gradient(${selectedBranch.color} 0deg ${selectedBranch.productivity * 3.6}deg, rgba(255,255,255,0.05) ${selectedBranch.productivity * 3.6}deg 360deg)` }}>
                              <span className="score-number">{selectedBranch.productivity}%</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
                            <span>Efficiency Target: <strong>90%</strong></span>
                            <span>Success Ratio: <strong>92%</strong></span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4><Clock size={14} /> Attendance Records</h4>
                        <div className="attendance-gauge-box">
                          <div className="progress-label"><span>Present Rate</span><strong>{selectedBranch.attendance}%</strong></div>
                          <div className="progress-bar" style={{ height: '6px' }}><div className="progress-fill" style={{ width: `${selectedBranch.attendance}%`, background: selectedBranch.attendance >= 94 ? '#10b981' : '#f59e0b' }}></div></div>
                          <div className="attendance-mini-stats" style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem', marginTop: '10px' }}>
                            <span>✅ Present: <strong>{Math.round(selectedBranch.employeeCount * selectedBranch.attendance / 100)}</strong> staff</span>
                            <span>❌ Absent: <strong>{Math.round(selectedBranch.employeeCount * (100 - selectedBranch.attendance) / 100)}</strong> staff</span>
                            <span>🌴 On Leave: <strong>{selectedBranch.employeesOnLeave}</strong> staff</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <h4 style={{ marginTop: '16px' }}><Briefcase size={14} /> Active Projects Pipeline</h4>
                    <div className="project-detail-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '8px' }}>
                      <div className="project-stat-cell"><span>Active</span><strong>{selectedBranch.projects.active}</strong></div>
                      <div className="project-stat-cell" style={{ borderLeft: '1px solid var(--border-color)' }}><span>Done</span><strong>{selectedBranch.projects.completed}</strong></div>
                      <div className="project-stat-cell" style={{ borderLeft: '1px solid var(--border-color)' }}><span>Delayed</span><strong>{selectedBranch.projects.delayed}</strong></div>
                      <div className="project-stat-cell" style={{ borderLeft: '1px solid var(--border-color)' }}><span>Pending</span><strong>{selectedBranch.projects.pending}</strong></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card select-branch-prompt">
              <Building2 size={24} />
              <p>Select a branch card from the list to view complete operational details, documents, and staffing metrics.</p>
            </div>
          )}

          {/* Branch Performance Analytics - Rankings Table */}
          <div className="card rankings-card">
            <h3 className="panel-title"><BarChart3 size={16} /> Branch Ranking Leaderboard</h3>
            <div className="ranking-table-container">
              <table className="ranking-table">
                <thead>
                  <tr><th>Rank</th><th>Branch Name</th><th>Headcount</th><th>Attendance</th><th>Productivity</th></tr>
                </thead>
                <tbody>
                  {branchRanking.map(b => (
                    <tr key={b.rank} className={selectedBranch?.name === b.name ? 'ranking-row-active' : ''}>
                      <td className="ranking-rank">
                        {b.rank === 1 ? '🥇' : b.rank === 2 ? '🥈' : b.rank === 3 ? '🥉' : `#${b.rank}`}
                      </td>
                      <td className="ranking-name">{b.name}</td>
                      <td>{b.employees}</td>
                      <td>{b.attendance}%</td>
                      <td>
                        <span className="ranking-perf-badge" style={{ color: b.productivity >= 92 ? 'var(--color-success)' : 'var(--color-primary)' }}>
                          {b.productivity}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Branch Hierarchy Structure */}
          <div className="card hierarchy-card">
            <div className="panel-header-clickable" onClick={() => setShowHierarchy(!showHierarchy)}>
              <h3 className="panel-title"><Network size={16} /> Branch Hierarchy Structure</h3>
              {showHierarchy ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </div>
            {showHierarchy && (
              <div className="hierarchy-tree animate-fade-in">
                <div className="tree-node-root">
                  <div className="tree-node-item" onClick={() => toggleNode('root')}>
                    <span className="tree-toggle">{expandedNodes.includes('root') ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
                    <Building2 size={14} style={{ color: '#06b6d4' }} /> Corporate Headquarters
                  </div>
                  {expandedNodes.includes('root') && (
                    <div className="tree-children">
                      {branches.map(branch => (
                        <div key={branch.id} className="tree-node">
                          <div className="tree-node-item" onClick={() => toggleNode(branch.id)}>
                            <span className="tree-toggle">{expandedNodes.includes(branch.id) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
                            <span className="branch-dot" style={{ background: branch.color }}></span>
                            <strong>{branch.name}</strong>
                          </div>
                          {expandedNodes.includes(branch.id) && (
                            <div className="tree-children">
                              {branch.departments.map(dept => (
                                <div key={dept} className="tree-node">
                                  <div className="tree-node-item">
                                    <span className="tree-toggle-placeholder"></span>
                                    📁 {dept}
                                  </div>
                                  <div className="tree-children tree-node-sub">
                                    <div className="tree-node-item"><span className="tree-toggle-placeholder"></span>👥 Team Leaders: {branch.teamLeaders || Math.floor(branch.employeeCount / 30)}</div>
                                    <div className="tree-node-item"><span className="tree-toggle-placeholder"></span>👨‍💼 Project Managers: {branch.projectManagers || Math.floor(branch.employeeCount / 40)}</div>
                                    <div className="tree-node-item"><span className="tree-toggle-placeholder"></span>👨‍💻 Employees: {branch.employeeCount}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Reports & Exports Panel */}
          <div className="card reports-exports-card">
            <h3 className="panel-title"><Download size={16} /> Reports & Document Exports</h3>
            <div className="reports-grid-list">
              <div className="report-export-row">
                <div>
                  <strong>Branch Summary Report</strong>
                  <span>Consolidated stats of all operations</span>
                </div>
                <button className="btn-report-download" onClick={() => addToast('success', 'Downloading Branch Summary report (PDF)...')} title="Download PDF">
                  PDF
                </button>
              </div>
              <div className="report-export-row">
                <div>
                  <strong>Attendance & Absences Logs</strong>
                  <span>Staff check-in logs & WFH audit</span>
                </div>
                <button className="btn-report-download" onClick={() => addToast('success', 'Downloading Attendance sheets (Excel)...')} title="Download Excel">
                  XLSX
                </button>
              </div>
              <div className="report-export-row">
                <div>
                  <strong>Productivity Audit Report</strong>
                  <span>Task completion & project pipelines</span>
                </div>
                <button className="btn-report-download" onClick={handleExportCSV} title="Download CSV">
                  CSV
                </button>
              </div>
            </div>
          </div>

          {/* Recent Branch Activities Timeline */}
          <div className="card activities-card">
            <h3 className="panel-title"><Activity size={16} /> Recent Branch Activities</h3>
            <div className="activities-timeline">
              {activities.map(act => (
                <div key={act.id} className="activity-timeline-item">
                  <div className={`activity-pin pin-${act.type}`}></div>
                  <div className="activity-timeline-content">
                    <p>{act.text}</p>
                    <span>{act.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alerts & Notifications */}
          <div className="card alerts-card">
            <h3 className="panel-title"><AlertCircle size={16} /> Notifications & Alerts</h3>
            <div className="alerts-list">
              <div className="alert-item warning"><AlertCircle size={14} /> Branch Manager Not Assigned: Chennai Franchise</div>
              <div className="alert-item danger"><AlertCircle size={14} /> Low Productivity Branch: Chennai (72%)</div>
              <div className="alert-item warning"><AlertCircle size={14} /> Staffing Shortage: Kolkata Branch</div>
              <div className="alert-item warning"><AlertCircle size={14} /> Attendance Below Target: Chennai (85%)</div>
              <div className="alert-item info"><AlertCircle size={14} /> Compliance Document Expiry: Jaipur HQ License</div>
              <div className="alert-item success"><CheckCircle size={14} /> New Branch Created: Kolkata</div>
              <div className="alert-item success"><CheckCircle size={14} /> Manager Assigned: Sanjay Das → Kolkata</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Status */}
      <div className="branches-footer">
        <div className="footer-item"><Network size={14} /> Total Branches: {totalBranches}</div>
        <div className="footer-item"><Users size={14} /> Total Employees: {totalEmployees}</div>
        <div className="footer-item"><Clock size={14} /> Last Updated: Just Now</div>
        <div className="footer-item"><CheckCircle size={14} /> Branch Management System Active</div>
      </div>

      {/* Modals & Overlays */}
      
      {/* Add Branch Modal */}
      {showAddModal && (
        <div className="modal-overlay animate-fade-in">
          <div className="modal-box card animate-scale-up" style={{ maxWidth: '600px', width: '90%' }}>
            <div className="modal-header">
              <h3><Plus size={16} /> Add New Office / Branch</h3>
              <button className="modal-close-btn" onClick={() => setShowAddModal(false)} type="button"><X size={16} /></button>
            </div>
            <form onSubmit={handleAddBranchSubmit}>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '4px' }}>
                <div className="form-group-row">
                  <div className="form-group">
                    <label>Branch Name *</label>
                    <input type="text" required value={newBranch.name} onChange={e => setNewBranch({...newBranch, name: e.target.value})} placeholder="e.g. Hyderabad Branch" />
                  </div>
                  <div className="form-group">
                    <label>Branch Code *</label>
                    <input type="text" required value={newBranch.code} onChange={e => setNewBranch({...newBranch, code: e.target.value})} placeholder="e.g. HYD-BR" />
                  </div>
                </div>

                <div className="form-group-row">
                  <div className="form-group">
                    <label>Country *</label>
                    <input type="text" required value={newBranch.country} onChange={e => setNewBranch({...newBranch, country: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Established Date</label>
                    <input type="date" value={newBranch.established} onChange={e => setNewBranch({...newBranch, established: e.target.value})} />
                  </div>
                </div>

                <div className="form-group-row">
                  <div className="form-group">
                    <label>City *</label>
                    <input type="text" required value={newBranch.city} onChange={e => setNewBranch({...newBranch, city: e.target.value})} placeholder="e.g. Hyderabad" />
                  </div>
                  <div className="form-group">
                    <label>State *</label>
                    <input type="text" required value={newBranch.state} onChange={e => setNewBranch({...newBranch, state: e.target.value})} placeholder="e.g. Telangana" />
                  </div>
                </div>

                <div className="form-group">
                  <label>Full Physical Address *</label>
                  <input type="text" required value={newBranch.address} onChange={e => setNewBranch({...newBranch, address: e.target.value})} placeholder="Full location coordinates..." />
                </div>

                <div className="form-group-row">
                  <div className="form-group">
                    <label>Manager Name *</label>
                    <select
                      value={newBranch.manager}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === 'ADD_NEW') {
                          setNewBranch(prev => ({ ...prev, manager: 'ADD_NEW', managerEmail: '', managerPhone: '' }));
                        } else {
                          const m = availableManagers.find(x => x.name === val);
                          setNewBranch(prev => ({
                            ...prev,
                            manager: val,
                            managerEmail: m ? m.email : '',
                            managerPhone: m ? m.phone : ''
                          }));
                        }
                      }}
                      required
                    >
                      <option value="">Select Manager</option>
                      {availableManagers.map(m => (
                        <option key={m.name} value={m.name}>{m.name}</option>
                      ))}
                      <option value="ADD_NEW" style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>+ Add New Manager...</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Manager Email</label>
                    <input type="email" value={newBranch.managerEmail || ''} readOnly placeholder="Auto-populated" />
                  </div>
                </div>

                {newBranch.manager === 'ADD_NEW' && (
                  <div className="inline-add-card animate-fade-in" style={{ gridColumn: 'span 2', padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '0.78rem', color: 'var(--text-primary)', margin: '0 0 10px 0' }}>Add New Manager Details</h4>
                    <div className="form-group-row">
                      <div className="form-group">
                        <label>New Manager Name *</label>
                        <input
                          type="text"
                          value={newManagerDetails.name}
                          onChange={e => setNewManagerDetails(p => ({ ...p, name: e.target.value }))}
                          placeholder="Name"
                        />
                      </div>
                      <div className="form-group">
                        <label>Email ID</label>
                        <input
                          type="email"
                          value={newManagerDetails.email}
                          onChange={e => setNewManagerDetails(p => ({ ...p, email: e.target.value }))}
                          placeholder="manager@company.com"
                        />
                      </div>
                    </div>
                    <div className="form-group-row" style={{ marginTop: '8px' }}>
                      <div className="form-group">
                        <label>Mobile Number</label>
                        <input
                          type="text"
                          value={newManagerDetails.phone}
                          onChange={e => setNewManagerDetails(p => ({ ...p, phone: e.target.value }))}
                          placeholder="+91 98765..."
                        />
                      </div>
                      <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', gap: '8px' }}>
                        <Button type="button" variant="outline" size="sm" onClick={() => setNewBranch(p => ({ ...p, manager: '' }))}>Cancel</Button>
                        <Button type="button" variant="primary" size="sm" onClick={handleAddNewManagerAddBranch}>Save & Select</Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="form-group-row">
                  <div className="form-group">
                    <label>Status Type</label>
                    <select value={newBranch.statusType} onChange={e => {
                      const val = e.target.value;
                      const labelMap = { active: 'Active', expansion: 'Under Expansion', new: 'New Branch', inactive: 'Inactive' };
                      setNewBranch({...newBranch, statusType: val, status: labelMap[val] || 'Active'});
                    }}>
                      <option value="active">Active</option>
                      <option value="expansion">Under Expansion</option>
                      <option value="new">New Branch</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Timezone</label>
                    <input type="text" value={newBranch.timezone} onChange={e => setNewBranch({...newBranch, timezone: e.target.value})} />
                  </div>
                </div>

                <div className="form-group" style={{ position: 'relative' }}>
                  <label>Select Departments *</label>
                  <div 
                    className="custom-multiselect-trigger" 
                    onClick={() => setShowDeptDropdown(p => !p)}
                  >
                    {newBranch.departments.length === 0 ? (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Select departments...</span>
                    ) : (
                      newBranch.departments.map(d => (
                        <span 
                          key={d} 
                          className="dept-tag"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNewBranch(prev => ({
                              ...prev,
                              departments: prev.departments.filter(x => x !== d)
                            }));
                          }}
                        >
                          {d} <span className="dept-tag-close">×</span>
                        </span>
                      ))
                    )}
                  </div>

                  {showDeptDropdown && (
                    <div className="custom-multiselect-dropdown card animate-fade-in">
                      <div className="multiselect-options-list">
                        {availableDepts.map(d => {
                          const isChecked = newBranch.departments.includes(d);
                          return (
                            <label key={d} className="multiselect-option-label">
                              <input 
                                type="checkbox" 
                                checked={isChecked} 
                                onChange={() => {
                                  setNewBranch(prev => {
                                    const nextDepts = isChecked 
                                      ? prev.departments.filter(x => x !== d)
                                      : [...prev.departments, d];
                                    return { ...prev, departments: nextDepts };
                                  });
                                }}
                                className="multiselect-checkbox"
                              />
                              {d}
                            </label>
                          );
                        })}
                      </div>

                      <div className="multiselect-add-row" onClick={e => e.stopPropagation()}>
                        <input
                          type="text"
                          placeholder="Add new department..."
                          value={newDeptInput}
                          onChange={e => setNewDeptInput(e.target.value)}
                          className="multiselect-add-input"
                        />
                        <button
                          type="button"
                          className="multiselect-add-btn"
                          onClick={() => {
                            if (!newDeptInput.trim()) return;
                            const exists = availableDepts.includes(newDeptInput.trim());
                            if (!exists) {
                              setAvailableDepts(prev => [...prev, newDeptInput.trim()]);
                            }
                            if (!newBranch.departments.includes(newDeptInput.trim())) {
                              setNewBranch(prev => ({
                                ...prev,
                                departments: [...prev.departments, newDeptInput.trim()]
                              }));
                            }
                            setNewDeptInput('');
                            addToast('success', `Department "${newDeptInput.trim()}" added & selected!`);
                          }}
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group-row">
                  <div className="form-group">
                    <label>Headcount (initial)</label>
                    <input type="number" value={newBranch.employeeCount} onChange={e => setNewBranch({...newBranch, employeeCount: parseInt(e.target.value) || 0})} />
                  </div>
                  <div className="form-group">
                    <label>YTD Revenue (in USD)</label>
                    <input type="number" value={newBranch.revenue} onChange={e => setNewBranch({...newBranch, revenue: parseInt(e.target.value) || 0})} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button variant="primary" size="sm" type="submit">Submit Branch</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Employee Modal */}
      {showTransferModal && (
        <div className="modal-overlay animate-fade-in">
          <div className="modal-box card animate-scale-up" style={{ maxWidth: '480px', width: '90%' }}>
            <div className="modal-header">
              <h3><Users size={16} /> Employee Allocation Transfer</h3>
              <button className="modal-close-btn" onClick={() => setShowTransferModal(false)} type="button"><X size={16} /></button>
            </div>
            <form onSubmit={handleTransferSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Employee Name *</label>
                  <input type="text" required value={transfer.employeeName} onChange={e => setTransfer({...transfer, employeeName: e.target.value})} placeholder="e.g. Ramesh Chandra" />
                </div>

                <div className="form-group">
                  <label>From Branch *</label>
                  <select value={transfer.fromBranchId} onChange={e => setTransfer({...transfer, fromBranchId: e.target.value})}>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.employeeCount} staff)</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>To Target Branch *</label>
                  <select value={transfer.toBranchId} onChange={e => setTransfer({...transfer, toBranchId: e.target.value})}>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.employeeCount} staff)</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Target Department</label>
                  <input type="text" value={transfer.department} onChange={e => setTransfer({...transfer, department: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowTransferModal(false)}>Cancel</Button>
                <Button variant="primary" size="sm" type="submit">Execute Transfer</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Manager Modal */}
      {showManagerModal && (
        <div className="modal-overlay animate-fade-in">
          <div className="modal-box card animate-scale-up" style={{ maxWidth: '480px', width: '90%' }}>
            <div className="modal-header">
              <h3><Edit2 size={16} /> Quick Assign Branch Manager</h3>
              <button className="modal-close-btn" onClick={() => setShowManagerModal(false)} type="button"><X size={16} /></button>
            </div>
            <form onSubmit={handleManagerSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Selected Branch</label>
                  <select disabled value={managerUpdate.branchId}>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Manager Name *</label>
                  <select
                    value={managerUpdate.name}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === 'ADD_NEW') {
                        setManagerUpdate(prev => ({ ...prev, name: 'ADD_NEW', email: '', phone: '' }));
                      } else {
                        const m = availableManagers.find(x => x.name === val);
                        setManagerUpdate(prev => ({
                          ...prev,
                          name: val,
                          email: m ? m.email : '',
                          phone: m ? m.phone : ''
                        }));
                      }
                    }}
                    required
                  >
                    <option value="">Select Manager</option>
                    {availableManagers.map(m => (
                      <option key={m.name} value={m.name}>{m.name}</option>
                    ))}
                    <option value="ADD_NEW" style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>+ Add New Manager...</option>
                  </select>
                </div>

                {managerUpdate.name === 'ADD_NEW' && (
                  <div className="inline-add-card animate-fade-in" style={{ padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '0.78rem', color: 'var(--text-primary)', margin: '0 0 10px 0' }}>Add New Manager Details</h4>
                    <div className="form-group-row">
                      <div className="form-group">
                        <label>New Manager Name *</label>
                        <input
                          type="text"
                          value={newManagerDetails.name}
                          onChange={e => setNewManagerDetails(p => ({ ...p, name: e.target.value }))}
                          placeholder="Name"
                        />
                      </div>
                      <div className="form-group">
                        <label>Email ID</label>
                        <input
                          type="email"
                          value={newManagerDetails.email}
                          onChange={e => setNewManagerDetails(p => ({ ...p, email: e.target.value }))}
                          placeholder="manager@company.com"
                        />
                      </div>
                    </div>
                    <div className="form-group-row" style={{ marginTop: '8px' }}>
                      <div className="form-group">
                        <label>Mobile Number</label>
                        <input
                          type="text"
                          value={newManagerDetails.phone}
                          onChange={e => setNewManagerDetails(p => ({ ...p, phone: e.target.value }))}
                          placeholder="+91 98765..."
                        />
                      </div>
                      <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', gap: '8px' }}>
                        <Button type="button" variant="outline" size="sm" onClick={() => setManagerUpdate(p => ({ ...p, name: '' }))}>Cancel</Button>
                        <Button type="button" variant="primary" size="sm" onClick={handleAddNewManagerChangeManager}>Save & Select</Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="form-group-row">
                  <div className="form-group">
                    <label>Email ID</label>
                    <input type="email" value={managerUpdate.email} readOnly placeholder="Auto-populated" />
                  </div>
                  <div className="form-group">
                    <label>Mobile Number</label>
                    <input type="text" value={managerUpdate.phone} readOnly placeholder="Auto-populated" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowManagerModal(false)}>Cancel</Button>
                <Button variant="primary" size="sm" type="submit">Assign Manager</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WFH Approvals Modal */}
      {showWfhModal && (
        <div className="modal-overlay animate-fade-in">
          <div className="modal-box card animate-scale-up" style={{ maxWidth: '600px', width: '90%' }}>
            <div className="modal-header">
              <h3><Clock size={16} /> Work From Home Approvals</h3>
              <button className="modal-close-btn" onClick={() => setShowWfhModal(false)} type="button"><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>Review pending remote/hybrid requests from different agency and branch hubs.</p>
              
              <div className="wfh-requests-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {wfhRequests.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No pending WFH requests.</div>
                ) : (
                  wfhRequests.map(req => (
                    <div key={req.id} className="wfh-req-row" style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{req.employeeName}</strong>
                          <Badge variant="neutral" size="sm">{req.department}</Badge>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          <span>📍 {req.branchName} • 📅 {req.date}</span>
                          <span style={{ display: 'block', fontStyle: 'italic', marginTop: '2px', color: 'var(--text-muted)' }}>"Reason: {req.reason}"</span>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        {req.status === 'Pending' ? (
                          <>
                            <button className="att-btn att-present" style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: 'var(--radius-sm)' }} onClick={() => handleWfhApproval(req.id, true)} type="button">
                              Approve
                            </button>
                            <button className="att-btn att-absent" style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: 'var(--radius-sm)' }} onClick={() => handleWfhApproval(req.id, false)} type="button">
                              Reject
                            </button>
                          </>
                        ) : (
                          <Badge variant={req.status === 'Approved' ? 'success' : 'danger'}>
                            {req.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="modal-footer">
              <Button variant="outline" size="sm" onClick={() => setShowWfhModal(false)}>Close View</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Branches;