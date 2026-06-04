import React, { useState, useMemo } from 'react';
import styles from '../../styles/projects.module.css';
import { useApp } from '../../context/AppContext';
import {
  TrendingUp, CheckCircle, Clock, AlertTriangle, Calendar,
  Plus, Users, CheckSquare, FileText, Download, BarChart2, Bell, X
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid
} from 'recharts';

import ProjectsTable from '../../components/projects/ProjectsTable';
import ProjectDetailPanel from '../../components/projects/ProjectDetailPanel';
import ProjectTimeline from '../../components/projects/ProjectTimeline';
import ProjectFilters from '../../components/projects/ProjectFilters';
import ActivityFeed from '../../components/projects/ActivityFeed';

// Initial Mock Projects Data (15 projects)
const initialProjects = [
  {
    id: 'PRJ-001',
    name: 'SaaS Platform v2.0',
    description: 'Full redesign and rebuild of the enterprise workforce management platform with new role-based architecture and modern UI.',
    department: 'IT',
    client: 'Stark Industries',
    manager: 'Elena Rostova',
    leader: 'Liam O\'Connor',
    members: ['Elena Rostova', 'Liam O\'Connor', 'David Kim', 'Aarav Sharma'],
    priority: 'High',
    startDate: '2026-01-15',
    deadline: '2026-07-30',
    progress: 75,
    status: 'In Progress',
    tasksTotal: 12,
    tasksDone: 9,
    budget: 150000,
    workflowStage: 'Development',
    pendingApprovals: 3,
    delayedActivities: 0,
    productivityScore: 88,
    workingHours: 320,
    milestonesCompleted: 4,
    milestonesTotal: 6,
    documents: [
      { name: 'Architecture_Spec.pdf', type: 'pdf', size: '2.4 MB', uploadedBy: 'Elena R.' },
      { name: 'UI_UX_Guidelines.pdf', type: 'pdf', size: '4.1 MB', uploadedBy: 'Liam O.' }
    ],
    tasks: [
      { id: 't-1.1', title: 'Design system tokens and guidelines', completed: true, dueDate: '2026-02-15', priority: 'High' },
      { id: 't-1.2', title: 'Implement RBAC authentication guards', completed: true, dueDate: '2026-04-10', priority: 'High' },
      { id: 't-1.3', title: 'Vite migration and package optimization', completed: true, dueDate: '2026-05-15', priority: 'Medium' },
      { id: 't-1.4', title: 'Build Project Dashboard page layout', completed: false, dueDate: '2026-06-10', priority: 'High', overdue: true }
    ]
  },
  {
    id: 'PRJ-002',
    name: 'Q2 Sales Campaign',
    description: 'Targeted outbound marketing campaign for enterprise clients. Includes email sequences, demo scheduling, and ROI tracking.',
    department: 'Sales',
    client: 'Acme Corp',
    manager: 'Marcus Vance',
    leader: 'Carlos Mendez',
    members: ['Marcus Vance', 'Carlos Mendez', 'Deepak Joshi'],
    priority: 'High',
    startDate: '2026-04-01',
    deadline: '2026-06-30',
    progress: 80,
    status: 'Active',
    tasksTotal: 10,
    tasksDone: 8,
    budget: 45000,
    workflowStage: 'Testing',
    pendingApprovals: 1,
    delayedActivities: 0,
    productivityScore: 92,
    workingHours: 180,
    milestonesCompleted: 3,
    milestonesTotal: 4,
    documents: [
      { name: 'Lead_List_Q2.xlsx', type: 'excel', size: '1.2 MB', uploadedBy: 'Carlos M.' }
    ],
    tasks: [
      { id: 't-2.1', title: 'Extract leads from Salesforce database', completed: true, dueDate: '2026-04-15', priority: 'Medium' },
      { id: 't-2.2', title: 'Draft email outreach sequences', completed: true, dueDate: '2026-05-01', priority: 'High' },
      { id: 't-2.3', title: 'Set up outreach automation platform', completed: false, dueDate: '2026-06-15', priority: 'Medium' }
    ]
  },
  {
    id: 'PRJ-003',
    name: 'Brand Identity Refresh',
    description: 'Redesign of all brand assets including logo, style guide, website hero section, and social media templates.',
    department: 'Marketing',
    client: 'Internal',
    manager: 'Aiko Tanaka',
    leader: 'Priya Sharma',
    members: ['Aiko Tanaka', 'Priya Sharma', 'Vijay Chauhan'],
    priority: 'Medium',
    startDate: '2026-05-10',
    deadline: '2026-08-15',
    progress: 25,
    status: 'Pending',
    tasksTotal: 8,
    tasksDone: 2,
    budget: 20000,
    workflowStage: 'Design',
    pendingApprovals: 2,
    delayedActivities: 1,
    productivityScore: 78,
    workingHours: 95,
    milestonesCompleted: 1,
    milestonesTotal: 5,
    documents: [
      { name: 'Logo_Drafts_v1.zip', type: 'zip', size: '15.4 MB', uploadedBy: 'Priya S.' }
    ],
    tasks: [
      { id: 't-3.1', title: 'Conduct competitor brand audits', completed: true, dueDate: '2026-05-20', priority: 'Low' },
      { id: 't-3.2', title: 'Present logo mood boards', completed: true, dueDate: '2026-06-01', priority: 'High' },
      { id: 't-3.3', title: 'Finalize brand color palette', completed: false, dueDate: '2026-06-25', priority: 'Medium' }
    ]
  },
  {
    id: 'PRJ-004',
    name: 'HR Policy Compliance Audit',
    description: 'Complete audit of HR policies, employment contracts, and GDPR data handling procedures across all branches.',
    department: 'HR',
    client: 'Internal',
    manager: 'Sophia Laurent',
    leader: 'Sarah Connor',
    members: ['Sophia Laurent', 'Sarah Connor', 'Neha Verma', 'Fatima Khan'],
    priority: 'Low',
    startDate: '2026-02-01',
    deadline: '2026-05-15',
    progress: 100,
    status: 'Completed',
    tasksTotal: 15,
    tasksDone: 15,
    budget: 15000,
    workflowStage: 'Deployment',
    pendingApprovals: 0,
    delayedActivities: 0,
    productivityScore: 95,
    workingHours: 110,
    milestonesCompleted: 3,
    milestonesTotal: 3,
    documents: [
      { name: 'Compliance_Audit_Final.pdf', type: 'pdf', size: '3.1 MB', uploadedBy: 'Sarah C.' }
    ],
    tasks: [
      { id: 't-4.1', title: 'Compile contracts from global branches', completed: true, dueDate: '2026-02-28', priority: 'Medium' },
      { id: 't-4.2', title: 'Analyze policies against GDPR guidelines', completed: true, dueDate: '2026-03-31', priority: 'High' },
      { id: 't-4.3', title: 'Draft compliance feedback report', completed: true, dueDate: '2026-05-10', priority: 'High' }
    ]
  },
  {
    id: 'PRJ-005',
    name: 'Legacy Migration Core',
    description: 'Migration of database and legacy core APIs to the cloud platform. Delayed due to data mapping complexity.',
    department: 'IT',
    client: 'Wayne Enterprises',
    manager: 'David Kim',
    leader: 'Amit Bose',
    members: ['David Kim', 'Amit Bose', 'Kavita Singh'],
    priority: 'High',
    startDate: '2026-02-01',
    deadline: '2026-05-30',
    progress: 45,
    status: 'Delayed',
    tasksTotal: 20,
    tasksDone: 9,
    budget: 220000,
    workflowStage: 'Development',
    pendingApprovals: 4,
    delayedActivities: 3,
    productivityScore: 65,
    workingHours: 410,
    milestonesCompleted: 2,
    milestonesTotal: 6,
    documents: [
      { name: 'Database_Migration_Map.xlsx', type: 'excel', size: '5.2 MB', uploadedBy: 'Amit B.' }
    ],
    tasks: [
      { id: 't-5.1', title: 'Create DB schema mappings', completed: true, dueDate: '2026-02-20', priority: 'High' },
      { id: 't-5.2', title: 'Test migration scripts on staging', completed: true, dueDate: '2026-04-15', priority: 'Critical' },
      { id: 't-5.3', title: 'Migrate user transaction archives', completed: false, dueDate: '2026-05-10', priority: 'High', overdue: true },
      { id: 't-5.4', title: 'Replicate active schemas to AWS RDS', completed: false, dueDate: '2026-05-25', priority: 'Critical', overdue: true }
    ]
  },
  {
    id: 'PRJ-006',
    name: 'Mobile App Checkout Optimization',
    description: 'Optimize the customer checkout flow in the iOS and Android applications to reduce cart abandonment.',
    department: 'IT',
    client: 'Stark Industries',
    manager: 'Elena Rostova',
    leader: 'Rahul Jain',
    members: ['Elena Rostova', 'Rahul Jain', 'Mei Lin'],
    priority: 'Urgent',
    startDate: '2026-05-01',
    deadline: '2026-06-25',
    progress: 60,
    status: 'In Progress',
    tasksTotal: 5,
    tasksDone: 3,
    budget: 85000,
    workflowStage: 'Development',
    pendingApprovals: 2,
    delayedActivities: 0,
    productivityScore: 89,
    milestonesCompleted: 2,
    milestonesTotal: 4,
    documents: [],
    tasks: [
      { id: 't-6.1', title: 'Audit cart drop points via Firebase', completed: true, dueDate: '2026-05-10', priority: 'High' },
      { id: 't-6.2', title: 'Design a single-page layout mockup', completed: true, dueDate: '2026-05-25', priority: 'High' },
      { id: 't-6.3', title: 'Integrate UPI and Apple Pay API', completed: false, dueDate: '2026-06-15', priority: 'High' }
    ]
  },
  {
    id: 'PRJ-007',
    name: 'Customer Onboarding Redesign',
    description: 'Rebuild the sales funnel interface to allow customers to onboard within 3 minutes.',
    department: 'Sales',
    client: 'Acme Corp',
    manager: 'Marcus Vance',
    leader: 'Carlos Mendez',
    members: ['Marcus Vance', 'Carlos Mendez', 'Deepak Joshi'],
    priority: 'High',
    startDate: '2026-04-10',
    deadline: '2026-07-15',
    progress: 50,
    status: 'In Progress',
    tasksTotal: 8,
    tasksDone: 4,
    budget: 60000,
    workflowStage: 'Design',
    pendingApprovals: 1,
    delayedActivities: 0,
    productivityScore: 82,
    milestonesCompleted: 2,
    milestonesTotal: 4,
    documents: [],
    tasks: [
      { id: 't-7.1', title: 'Survey current onboarding barriers', completed: true, dueDate: '2026-04-30', priority: 'Medium' },
      { id: 't-7.2', title: 'Build React prototype forms', completed: false, dueDate: '2026-06-20', priority: 'High' }
    ]
  },
  {
    id: 'PRJ-008',
    name: 'Social Media Ads Campaign',
    description: 'Paid campaigns across LinkedIn, Google, and Meta platforms targeting HR managers.',
    department: 'Marketing',
    client: 'Internal',
    manager: 'Priya Patel',
    leader: 'Pooja Yadav',
    members: ['Priya Patel', 'Pooja Yadav', 'Priya Sharma'],
    priority: 'Medium',
    startDate: '2026-06-01',
    deadline: '2026-08-30',
    progress: 10,
    status: 'Pending',
    tasksTotal: 10,
    tasksDone: 1,
    budget: 30000,
    workflowStage: 'Planning',
    pendingApprovals: 3,
    delayedActivities: 0,
    productivityScore: 75,
    milestonesCompleted: 0,
    milestonesTotal: 5,
    documents: [],
    tasks: [
      { id: 't-8.1', title: 'Prepare ad assets and creatives', completed: true, dueDate: '2026-06-05', priority: 'Medium' },
      { id: 't-8.2', title: 'Set up ad account budgets', completed: false, dueDate: '2026-06-18', priority: 'High' }
    ]
  },
  {
    id: 'PRJ-009',
    name: 'Recruitment Portal Development',
    description: 'A custom tool for the recruitment team to screen resumes using parsed criteria keywords.',
    department: 'HR',
    client: 'Internal',
    manager: 'Sophia Laurent',
    leader: 'Raj Mehta',
    members: ['Sophia Laurent', 'Raj Mehta', 'Fatima Khan'],
    priority: 'Medium',
    startDate: '2026-05-15',
    deadline: '2026-09-01',
    progress: 30,
    status: 'In Progress',
    tasksTotal: 12,
    tasksDone: 3,
    budget: 50000,
    workflowStage: 'Design',
    pendingApprovals: 0,
    delayedActivities: 0,
    productivityScore: 84,
    milestonesCompleted: 1,
    milestonesTotal: 5,
    documents: [],
    tasks: [
      { id: 't-9.1', title: 'Gather keyword screening rules', completed: true, dueDate: '2026-05-25', priority: 'High' },
      { id: 't-9.2', title: 'Implement resume parsing library', completed: false, dueDate: '2026-07-10', priority: 'High' }
    ]
  },
  {
    id: 'PRJ-010',
    name: 'Database Replication Setup',
    description: 'Configure multi-region database replicas for high availability and failover redundancy.',
    department: 'IT',
    client: 'Internal',
    manager: 'David Kim',
    leader: 'Amit Bose',
    members: ['David Kim', 'Amit Bose', 'Sunita Rao'],
    priority: 'Urgent',
    startDate: '2026-03-10',
    deadline: '2026-05-20',
    progress: 90,
    status: 'Delayed',
    tasksTotal: 10,
    tasksDone: 9,
    budget: 95000,
    workflowStage: 'Testing',
    pendingApprovals: 2,
    delayedActivities: 1,
    productivityScore: 78,
    milestonesCompleted: 4,
    milestonesTotal: 5,
    documents: [],
    tasks: [
      { id: 't-10.1', title: 'Establish region VPC tunnels', completed: true, dueDate: '2026-03-30', priority: 'High' },
      { id: 't-10.2', title: 'Test write-lag sync rates', completed: true, dueDate: '2026-05-01', priority: 'Critical' },
      { id: 't-10.3', title: 'Run automated failover simulation', completed: false, dueDate: '2026-05-18', priority: 'Critical', overdue: true }
    ]
  },
  {
    id: 'PRJ-011',
    name: 'Content Strategy Hub',
    description: 'Audit existing marketing content assets and consolidate them in a centralized library.',
    department: 'Marketing',
    client: 'Wayne Enterprises',
    manager: 'Priya Patel',
    leader: 'Pooja Yadav',
    members: ['Priya Patel', 'Pooja Yadav', 'Vijay Chauhan'],
    priority: 'Low',
    startDate: '2026-03-01',
    deadline: '2026-05-10',
    progress: 100,
    status: 'Completed',
    tasksTotal: 6,
    tasksDone: 6,
    budget: 18000,
    workflowStage: 'Deployment',
    pendingApprovals: 0,
    delayedActivities: 0,
    productivityScore: 94,
    milestonesCompleted: 3,
    milestonesTotal: 3,
    documents: [],
    tasks: [
      { id: 't-11.1', title: 'Perform blog posts compliance audit', completed: true, dueDate: '2026-03-25', priority: 'Low' },
      { id: 't-11.2', title: 'Build Notion asset dashboard', completed: true, dueDate: '2026-04-30', priority: 'Medium' }
    ]
  },
  {
    id: 'PRJ-012',
    name: 'Sales Enablement Toolkit',
    description: 'Prepare materials, case study sheets, and templates to assist account managers during pitches.',
    department: 'Sales',
    client: 'Internal',
    manager: 'Marcus Vance',
    leader: 'Rohit Sharma',
    members: ['Marcus Vance', 'Rohit Sharma', 'Sneha Reddy'],
    priority: 'Medium',
    startDate: '2026-05-01',
    deadline: '2026-08-01',
    progress: 40,
    status: 'On Hold',
    tasksTotal: 8,
    tasksDone: 3,
    budget: 25000,
    workflowStage: 'Design',
    pendingApprovals: 1,
    delayedActivities: 0,
    productivityScore: 80,
    milestonesCompleted: 1,
    milestonesTotal: 4,
    documents: [],
    tasks: [
      { id: 't-12.1', title: 'Draft 3 enterprise case studies', completed: true, dueDate: '2026-05-20', priority: 'High' },
      { id: 't-12.2', title: 'Build presentation Google Slides layout', completed: false, dueDate: '2026-07-15', priority: 'Medium' }
    ]
  },
  {
    id: 'PRJ-013',
    name: 'GDPR Compliance Review',
    description: 'Ensure data security compliance on all active platforms holding EU customer details.',
    department: 'HR',
    client: 'Internal',
    manager: 'Sophia Laurent',
    leader: 'Sarah Connor',
    members: ['Sophia Laurent', 'Sarah Connor', 'Neha Verma'],
    priority: 'High',
    startDate: '2026-01-10',
    deadline: '2026-04-15',
    progress: 100,
    status: 'Completed',
    tasksTotal: 8,
    tasksDone: 8,
    budget: 35000,
    workflowStage: 'Deployment',
    pendingApprovals: 0,
    delayedActivities: 0,
    productivityScore: 97,
    milestonesCompleted: 4,
    milestonesTotal: 4,
    documents: [],
    tasks: [
      { id: 't-13.1', title: 'Identify customer location database regions', completed: true, dueDate: '2026-01-30', priority: 'High' },
      { id: 't-13.2', title: 'Encrypt data fields in backup databases', completed: true, dueDate: '2026-03-15', priority: 'Critical' }
    ]
  },
  {
    id: 'PRJ-014',
    name: 'Cloud Migration Phase 3',
    description: 'Migrating the final components of frontend microservices to AWS Elastic Container Service.',
    department: 'IT',
    client: 'Wayne Enterprises',
    manager: 'David Kim',
    leader: 'Amit Bose',
    members: ['David Kim', 'Amit Bose', 'Aarav Sharma'],
    priority: 'High',
    startDate: '2026-04-15',
    deadline: '2026-08-30',
    progress: 55,
    status: 'In Progress',
    tasksTotal: 10,
    tasksDone: 5,
    budget: 160000,
    workflowStage: 'Development',
    pendingApprovals: 2,
    delayedActivities: 0,
    productivityScore: 90,
    milestonesCompleted: 2,
    milestonesTotal: 5,
    documents: [],
    tasks: [
      { id: 't-14.1', title: 'Dockerize frontend static assets', completed: true, dueDate: '2026-05-10', priority: 'Medium' },
      { id: 't-14.2', title: 'Write CloudFormation stacks templates', completed: false, dueDate: '2026-07-20', priority: 'High' }
    ]
  },
  {
    id: 'PRJ-015',
    name: 'Annual Performance Review Platform',
    description: 'Configure and release the internal review dashboard to score employee performance metrics.',
    department: 'HR',
    client: 'Internal',
    manager: 'Sophia Laurent',
    leader: 'Raj Mehta',
    members: ['Sophia Laurent', 'Raj Mehta', 'Fatima Khan'],
    priority: 'High',
    startDate: '2026-03-01',
    deadline: '2026-05-25',
    progress: 80,
    status: 'Delayed',
    tasksTotal: 10,
    tasksDone: 8,
    budget: 28000,
    workflowStage: 'Testing',
    pendingApprovals: 1,
    delayedActivities: 2,
    productivityScore: 72,
    milestonesCompleted: 3,
    milestonesTotal: 4,
    documents: [],
    tasks: [
      { id: 't-15.1', title: 'Formulate appraisal questions bank', completed: true, dueDate: '2026-03-20', priority: 'High' },
      { id: 't-15.2', title: 'Build peer feedback layout forms', completed: true, dueDate: '2026-04-20', priority: 'Medium' },
      { id: 't-15.3', title: 'Audit department weights factors settings', completed: false, dueDate: '2026-05-15', priority: 'High', overdue: true }
    ]
  }
];

const Projects = () => {
  const { addToast, employees } = useApp();

  // State Management
  const [projects, setProjects] = useState(initialProjects);
  const [filters, setFilters] = useState({
    search: '',
    status: 'All',
    priority: 'All',
    department: 'All',
    dateRange: 'All',
    customStart: '',
    customEnd: ''
  });
  
  const [selectedCardFilter, setSelectedCardFilter] = useState(null); // Stat card filtering override
  const [selectedProject, setSelectedProject] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Modal open states
  const [activeModal, setActiveModal] = useState(null); // 'create' | 'assign' | 'task' | 'document' | 'report'
  
  // Form States for Modals
  const [newProjectForm, setNewProjectForm] = useState({
    name: '', client: '', department: 'IT', manager: '', leader: '', startDate: '', deadline: '', budget: '', priority: 'Medium', description: ''
  });
  const [assignTeamForm, setAssignTeamForm] = useState({ projectId: '', memberName: '' });
  const [addTaskForm, setAddTaskForm] = useState({ projectId: '', title: '', dueDate: '', priority: 'Medium' });
  const [uploadDocForm, setUploadDocForm] = useState({ projectId: '', docName: '', docType: 'pdf' });
  const [reportForm, setReportForm] = useState({ reportType: 'progress', format: 'pdf' });

  // Filtering Calculation
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      // Card click override filters
      if (selectedCardFilter) {
        if (selectedCardFilter === 'Active' && p.status !== 'Active' && p.status !== 'In Progress') return false;
        if (selectedCardFilter === 'Completed' && p.status !== 'Completed') return false;
        if (selectedCardFilter === 'Pending' && p.status !== 'Pending') return false;
        if (selectedCardFilter === 'Delayed' && p.status !== 'Delayed') return false;
        if (selectedCardFilter === 'Upcoming') {
          // Deadline in next 30 days and not completed
          const deadline = new Date(p.deadline);
          const limitDate = new Date('2026-06-30'); // system date simulation (June 2026 + 30 days)
          const today = new Date('2026-06-01');
          if (p.status === 'Completed' || deadline < today || deadline > limitDate) return false;
        }
      }

      // Dropdown and Search Filters
      const matchesSearch =
        p.id.toLowerCase().includes(filters.search.toLowerCase()) ||
        p.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        p.manager.toLowerCase().includes(filters.search.toLowerCase()) ||
        p.leader.toLowerCase().includes(filters.search.toLowerCase());

      const matchesStatus = filters.status === 'All' || p.status === filters.status;
      const matchesPriority = filters.priority === 'All' || p.priority === filters.priority;
      const matchesDept = filters.department === 'All' || p.department.toLowerCase() === filters.department.toLowerCase();

      // Timeframe Filter
      let matchesTimeframe = true;
      if (filters.dateRange !== 'All') {
        const pDeadline = new Date(p.deadline);
        const sysToday = new Date('2026-06-01');

        if (filters.dateRange === 'Today') {
          const deadlineStr = p.deadline;
          matchesTimeframe = deadlineStr === '2026-06-01';
        } else if (filters.dateRange === 'Weekly') {
          const sysEndOfWeek = new Date('2026-06-07');
          matchesTimeframe = pDeadline >= sysToday && pDeadline <= sysEndOfWeek;
        } else if (filters.dateRange === 'Monthly') {
          const sysEndOfMonth = new Date('2026-06-30');
          matchesTimeframe = pDeadline >= sysToday && pDeadline <= sysEndOfMonth;
        } else if (filters.dateRange === 'Custom' && filters.customStart && filters.customEnd) {
          const start = new Date(filters.customStart);
          const end = new Date(filters.customEnd);
          matchesTimeframe = pDeadline >= start && pDeadline <= end;
        }
      }

      return matchesSearch && matchesStatus && matchesPriority && matchesDept && matchesTimeframe;
    });
  }, [projects, filters, selectedCardFilter]);

  // KPI Calculations
  const stats = useMemo(() => {
    const totalActive = projects.filter(p => p.status === 'Active' || p.status === 'In Progress').length;
    const completed = projects.filter(p => p.status === 'Completed').length;
    const pending = projects.filter(p => p.status === 'Pending').length;
    const delayed = projects.filter(p => p.status === 'Delayed').length;
    
    // Upcoming: deadlines between 2026-06-01 and 2026-06-30 and not completed
    const sysToday = new Date('2026-06-01');
    const limit = new Date('2026-06-30');
    const upcoming = projects.filter(p => {
      const deadline = new Date(p.deadline);
      return p.status !== 'Completed' && deadline >= sysToday && deadline <= limit;
    }).length;

    return { totalActive, completed, pending, delayed, upcoming };
  }, [projects]);

  // Recharts Chart Data Calculations
  // Chart 1: Project Progress Overview & Department Performance
  const chartProgressOverview = useMemo(() => {
    const counts = { 'In Progress': 0, Completed: 0, Pending: 0, Delayed: 0, 'On Hold': 0 };
    projects.forEach(p => {
      if (counts[p.status] !== undefined) counts[p.status]++;
      else counts[p.status] = 1;
    });

    const pieData = Object.keys(counts).map(key => ({
      name: key,
      value: counts[key]
    }));

    // Department average progress
    const depts = ['IT', 'HR', 'Marketing', 'Sales'];
    const deptPerformance = depts.map(d => {
      const deptProjs = projects.filter(p => p.department.toLowerCase() === d.toLowerCase());
      const avg = deptProjs.length > 0
        ? Math.round(deptProjs.reduce((acc, curr) => acc + curr.progress, 0) / deptProjs.length)
        : 0;
      return { department: d, progress: avg };
    });

    return { pieData, deptPerformance };
  }, [projects]);

  // Chart 2: Monthly Projects (Completed, Delayed, Performance Growth)
  const chartMonthlyAnalytics = [
    { name: 'Jan 26', completed: 2, delayed: 0, productivity: 78 },
    { name: 'Feb 26', completed: 3, delayed: 1, productivity: 80 },
    { name: 'Mar 26', completed: 1, delayed: 2, productivity: 82 },
    { name: 'Apr 26', completed: 4, delayed: 1, productivity: 85 },
    { name: 'May 26', completed: 3, delayed: 3, productivity: 87 },
    { name: 'Jun 26', completed: 5, delayed: 2, productivity: 91 }
  ];

  // Actions handler
  const handleView = (proj) => {
    setSelectedProject(proj);
    setIsDetailOpen(true);
  };

  const handleEdit = (proj) => {
    setNewProjectForm({
      name: proj.name,
      client: proj.client || 'Google',
      department: proj.department,
      manager: proj.manager,
      leader: proj.leader,
      startDate: proj.startDate,
      deadline: proj.deadline,
      budget: proj.budget || 0,
      priority: proj.priority,
      description: proj.description || ''
    });
    setSelectedProject(proj);
    setActiveModal('create'); // reuse create form for edit
  };

  const handleOpenAssignTeam = (proj) => {
    setAssignTeamForm({ projectId: proj.id, memberName: '' });
    setActiveModal('assign');
  };

  // Toggle tasks check
  const handleToggleTask = (projectId, taskId) => {
    setProjects(prev =>
      prev.map(p => {
        if (p.id !== projectId) return p;
        
        const updatedTasks = p.tasks.map(t =>
          t.id === taskId ? { ...t, completed: !t.completed } : t
        );
        const tasksDone = updatedTasks.filter(t => t.completed).length;
        const progress = Math.round((tasksDone / p.tasksTotal) * 100);
        
        const updated = {
          ...p,
          tasks: updatedTasks,
          tasksDone,
          progress,
          status: progress === 100 ? 'Completed' : p.status
        };

        // Update selectedProject in real-time if open
        if (selectedProject && selectedProject.id === projectId) {
          setSelectedProject(updated);
        }

        return updated;
      })
    );
    addToast('success', 'Task progress updated!');
  };

  // Create Project Form Submit
  const handleCreateProjectSubmit = (e) => {
    e.preventDefault();
    if (selectedProject) {
      // Edit mode
      setProjects(prev => prev.map(p => p.id === selectedProject.id ? { ...p, ...newProjectForm } : p));
      addToast('success', `Project ${selectedProject.id} updated successfully!`);
      setSelectedProject(null);
    } else {
      // Create mode
      const nextId = `PRJ-${String(projects.length + 1).padStart(3, '0')}`;
      const newProjObj = {
        id: nextId,
        name: newProjectForm.name,
        description: newProjectForm.description,
        department: newProjectForm.department,
        client: newProjectForm.client || 'Internal',
        manager: newProjectForm.manager || 'Aarav Sharma',
        leader: newProjectForm.leader || 'Vikram Singh',
        members: [newProjectForm.manager || 'Aarav Sharma', newProjectForm.leader || 'Vikram Singh'],
        priority: newProjectForm.priority,
        startDate: newProjectForm.startDate || '2026-06-01',
        deadline: newProjectForm.deadline || '2026-09-01',
        progress: 0,
        status: 'Pending',
        tasksTotal: 5,
        tasksDone: 0,
        budget: Number(newProjectForm.budget) || 50000,
        workflowStage: 'Planning',
        pendingApprovals: 1,
        delayedActivities: 0,
        productivityScore: 80,
        milestonesCompleted: 0,
        milestonesTotal: 5,
        documents: [],
        tasks: [
          { id: `t-${nextId}-1`, title: 'Kickoff meeting and alignment', completed: false, dueDate: newProjectForm.startDate, priority: 'Medium' }
        ]
      };
      setProjects(prev => [newProjObj, ...prev]);
      addToast('success', `New Project ${nextId} created successfully!`);
    }
    setActiveModal(null);
    setNewProjectForm({
      name: '', client: '', department: 'IT', manager: '', leader: '', startDate: '', deadline: '', budget: '', priority: 'Medium', description: ''
    });
  };

  // Assign Team Member Submit
  const handleAssignTeamSubmit = (e) => {
    e.preventDefault();
    const { projectId, memberName } = assignTeamForm;
    if (!projectId || !memberName.trim()) return;

    setProjects(prev =>
      prev.map(p => {
        if (p.id !== projectId) return p;
        if (p.members.includes(memberName)) return p;
        const updated = {
          ...p,
          members: [...p.members, memberName.trim()]
        };
        if (selectedProject && selectedProject.id === projectId) setSelectedProject(updated);
        return updated;
      })
    );
    addToast('success', `Assigned ${memberName} to Project ${projectId}`);
    setActiveModal(null);
  };

  // Add Task Submit
  const handleAddTaskSubmit = (e) => {
    e.preventDefault();
    const { projectId, title, dueDate, priority } = addTaskForm;
    if (!projectId || !title.trim()) return;

    setProjects(prev =>
      prev.map(p => {
        if (p.id !== projectId) return p;
        const nextTaskId = `t-${projectId}-${p.tasks.length + 1}`;
        const newTasks = [...p.tasks, { id: nextTaskId, title: title.trim(), completed: false, dueDate, priority }];
        const updated = {
          ...p,
          tasks: newTasks,
          tasksTotal: p.tasksTotal + 1,
          progress: Math.round((p.tasksDone / (p.tasksTotal + 1)) * 100)
        };
        if (selectedProject && selectedProject.id === projectId) setSelectedProject(updated);
        return updated;
      })
    );
    addToast('success', `Added new task to Project ${projectId}`);
    setActiveModal(null);
  };

  // Upload Document Submit
  const handleUploadDocSubmit = (e) => {
    e.preventDefault();
    const { projectId, docName, docType } = uploadDocForm;
    if (!projectId || !docName.trim()) return;

    setProjects(prev =>
      prev.map(p => {
        if (p.id !== projectId) return p;
        const newDocs = [...p.documents, { name: docName.trim(), type: docType, size: '0.8 MB', uploadedBy: 'Super Admin' }];
        const updated = {
          ...p,
          documents: newDocs
        };
        if (selectedProject && selectedProject.id === projectId) setSelectedProject(updated);
        return updated;
      })
    );
    addToast('success', `Uploaded document to Project ${projectId}`);
    setActiveModal(null);
  };

  // Generate Reports Submit
  const handleGenerateReportSubmit = (e) => {
    e.preventDefault();
    addToast('info', `Generating ${reportForm.reportType} report as ${reportForm.format.toUpperCase()}...`);
    
    // Simulate Download
    setTimeout(() => {
      const link = document.createElement('a');
      link.href = '#';
      link.setAttribute('download', `Project_${reportForm.reportType}_Report.${reportForm.format}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast('success', 'Report download started!');
    }, 1500);
    
    setActiveModal(null);
  };

  // CSV Data Exporter
  const handleExportCSV = () => {
    addToast('info', 'Preparing project data CSV...');
    const headers = ['Project ID', 'Project Name', 'Client', 'Department', 'Manager', 'Leader', 'Priority', 'Start Date', 'Deadline', 'Completion %', 'Status', 'Budget'];
    const csvRows = [headers.join(',')];

    filteredProjects.forEach(p => {
      const row = [
        p.id,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.client || 'Google'}"`,
        p.department,
        p.manager,
        p.leader,
        p.priority,
        p.startDate,
        p.deadline,
        `${p.progress}%`,
        p.status,
        p.budget
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'active_projects_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('success', 'CSV downloaded successfully!');
  };

  // Scroll to analytics section
  const handleViewAnalytics = () => {
    const chartsSec = document.getElementById('analyticsCharts');
    if (chartsSec) {
      chartsSec.scrollIntoView({ behavior: 'smooth' });
      addToast('info', 'Viewing performance analytics charts');
    }
  };

  // Stat card selection toggle
  const toggleCardFilter = (filterType) => {
    if (selectedCardFilter === filterType) {
      setSelectedCardFilter(null);
    } else {
      setSelectedCardFilter(filterType);
    }
  };

  // Color mapping constants for Recharts pie
  const COLORS = ['#10b981', '#3b82f6', '#94a3b8', '#ef4444', '#f59e0b'];

  return (
    <div className={styles.dashboard}>
      {/* Header and Alerts / Notifications */}
      <div className={styles.tableHeaderRow}>
        <div>
          <h1 style={{ margin: 0 }}>Active Projects Dashboard</h1>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>Track and manage all company projects, timelines, tasks, and budgets.</p>
        </div>

        {/* Header Alerts Dropdown Button */}
        <div style={{ position: 'relative', display: 'flex', gap: 10 }}>
          <div className={styles.syncStatus} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: 'var(--radius-lg)' }}>
            <span className={styles.syncDot} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>SYSTEM ACTIVE</span>
          </div>
        </div>
      </div>

      {/* Top Banner Alert Bar */}
      <div className={styles.alertsBanner} style={{ borderLeft: '4px solid var(--color-danger)', backgroundColor: 'var(--bg-card)' }}>
        <div className={styles.alertsHeader} style={{ color: 'var(--text-primary)' }}>
          <span className={styles.alertsTitle} style={{ color: 'var(--color-danger)' }}>
            <Bell size={16} /> Important Dashboard System Alerts
          </span>
        </div>
        <div className={styles.alertList} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-2)' }}>
          <div className={styles.alertItem}>
            <span className={styles.alertDot} />
            <span>Upcoming Deadlines: <strong>{stats.upcoming}</strong> projects need delivery this month.</span>
          </div>
          <div className={styles.alertItem}>
            <span className={styles.alertDot} />
            <span>Delayed Projects: <strong>{stats.delayed}</strong> databases and systems core lagging.</span>
          </div>
          <div className={styles.alertItem}>
            <span className={styles.alertDot} />
            <span>Approvals: <strong>8</strong> approvals pending from managers.</span>
          </div>
        </div>
      </div>

      {/* Section G - Quick Action Buttons Bar */}
      <div className={styles.quickActionsRow}>
        <button className={`${styles.pageBtn} ${styles.primaryAction}`} onClick={() => { setSelectedProject(null); setActiveModal('create'); }}>
          <Plus size={14} /> Create New Project
        </button>
        <button className={styles.pageBtn} onClick={() => setActiveModal('assign')}>
          <Users size={14} /> Assign Team
        </button>
        <button className={styles.pageBtn} onClick={() => setActiveModal('task')}>
          <CheckSquare size={14} /> Add Tasks
        </button>
        <button className={styles.pageBtn} onClick={() => setActiveModal('document')}>
          <FileText size={14} /> Upload Documents
        </button>
        <button className={styles.pageBtn} onClick={() => setActiveModal('report')}>
          <BarChart2 size={14} /> Generate Reports
        </button>
        <button className={styles.pageBtn} onClick={handleExportCSV}>
          <Download size={14} /> Export Data (CSV)
        </button>
        <button className={styles.pageBtn} onClick={handleViewAnalytics}>
          <TrendingUp size={14} /> View Analytics
        </button>
      </div>

      {/* Section A — Top Summary Cards */}
      <div className={styles.summaryGrid}>
        <div
          className={`${styles.summaryCard} ${selectedCardFilter === 'Active' ? styles.summaryCardActive : ''}`}
          onClick={() => toggleCardFilter('Active')}
        >
          <div className={styles.summaryHeader}>
            <span className={styles.summaryLabel}>Total Active Projects</span>
            <span className={styles.summaryIcon}><Clock size={16} /></span>
          </div>
          <span className={styles.summaryVal}>{stats.totalActive}</span>
        </div>

        <div
          className={`${styles.summaryCard} ${selectedCardFilter === 'Completed' ? styles.summaryCardActive : ''}`}
          onClick={() => toggleCardFilter('Completed')}
        >
          <div className={styles.summaryHeader}>
            <span className={styles.summaryLabel}>Completed Projects</span>
            <span className={styles.summaryIcon}><CheckCircle size={16} /></span>
          </div>
          <span className={styles.summaryVal}>{stats.completed}</span>
        </div>

        <div
          className={`${styles.summaryCard} ${selectedCardFilter === 'Pending' ? styles.summaryCardActive : ''}`}
          onClick={() => toggleCardFilter('Pending')}
        >
          <div className={styles.summaryHeader}>
            <span className={styles.summaryLabel}>Pending Projects</span>
            <span className={styles.summaryIcon}><Clock size={16} /></span>
          </div>
          <span className={styles.summaryVal}>{stats.pending}</span>
        </div>

        <div
          className={`${styles.summaryCard} ${styles.delayed} ${selectedCardFilter === 'Delayed' ? styles.summaryCardActive : ''}`}
          onClick={() => toggleCardFilter('Delayed')}
        >
          <div className={styles.summaryHeader}>
            <span className={styles.summaryLabel} style={{ color: 'var(--color-danger)' }}>Delayed Projects</span>
            <span className={styles.summaryIcon}><AlertTriangle size={16} style={{ color: 'var(--color-danger)' }} /></span>
          </div>
          <span className={styles.summaryVal} style={{ color: 'var(--color-danger)' }}>{stats.delayed}</span>
        </div>

        <div
          className={`${styles.summaryCard} ${selectedCardFilter === 'Upcoming' ? styles.summaryCardActive : ''}`}
          onClick={() => toggleCardFilter('Upcoming')}
        >
          <div className={styles.summaryHeader}>
            <span className={styles.summaryLabel}>Upcoming Deadlines</span>
            <span className={styles.summaryIcon}><Calendar size={16} /></span>
          </div>
          <span className={styles.summaryVal}>{stats.upcoming}</span>
        </div>
      </div>

      {/* Section B — Project Performance Analytics (Charts panels) */}
      <div id="analyticsCharts" className={styles.analyticsRow}>
        {/* Project Progress Overview */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3 className={styles.chartTitle}>Project Progress & Dept Performance</h3>
          </div>
          <div className={styles.chartBody}>
            <div className={styles.pieWrapper}>
              <div className={styles.pieContainer}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartProgressOverview.pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={60}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {chartProgressOverview.pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text */}
                <div style={{ position: 'absolute', textAlign: 'center' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 700, display: 'block', color: 'var(--text-primary)' }}>
                    {projects.length}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Projects
                  </span>
                </div>
              </div>

              {/* Department Bars */}
              <div className={styles.progressList}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Dept Performance</span>
                {chartProgressOverview.deptPerformance.map(dept => (
                  <div key={dept.department} className={styles.progressItem}>
                    <div className={styles.progressLabelRow}>
                      <span>{dept.department}</span>
                      <span>{dept.progress}% avg progress</span>
                    </div>
                    <div className={styles.progressBarBg}>
                      <div
                        className={styles.progressBarFill}
                        style={{ width: `${dept.progress}%`, backgroundColor: 'var(--color-primary)' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Project Analytics */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3 className={styles.chartTitle}>Monthly Deliveries & Productivity Trend</h3>
          </div>
          <div className={styles.chartBody}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartMonthlyAnalytics}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                <YAxis stroke="var(--text-muted)" fontSize={11} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="completed" name="Completed Proj" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="delayed" name="Delayed Proj" fill="var(--color-danger)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Section F — Search & Filters Bar */}
      <ProjectFilters filters={filters} onFilterChange={setFilters} />

      {/* Active filter chip if card filter is on */}
      {selectedCardFilter && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', border: '1px solid var(--border-color)', width: 'fit-content', padding: '6px 12px', borderRadius: 'var(--radius-md)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Filtering by KPI card: <strong>{selectedCardFilter}</strong></span>
          <button
            onClick={() => setSelectedCardFilter(null)}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-danger)', fontWeight: 'bold', fontSize: '1rem', display: 'flex', alignItems: 'center', marginLeft: 4 }}
          >
            ×
          </button>
        </div>
      )}

      {/* Main layout split (Table + Activities) */}
      <div className={styles.mainLayout}>
        <div className={styles.mainColumn}>
          {/* Section C — Active Projects Table */}
          <ProjectsTable
            projects={filteredProjects}
            onView={handleView}
            onEdit={handleEdit}
            onAssignTeam={handleOpenAssignTeam}
          />
        </div>

        {/* Sidebar panels */}
        <div className={styles.sideColumn}>
          {/* Section H — Recent Project Activities Panel */}
          <ActivityFeed />
        </div>
      </div>

      {/* Section E — Project Timeline / Calendar view */}
      <ProjectTimeline projects={projects} onSelectProject={handleView} />

      {/* Section D — Project Detail Slide-over Panel */}
      <ProjectDetailPanel
        project={selectedProject}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onToggleTask={handleToggleTask}
      />

      {/* Section K — Sticky Footer Status Bar */}
      <div className={styles.stickyFooter}>
        <div className={styles.footerLeft}>
          <span>Showing <strong>{filteredProjects.length}</strong> of <strong>{projects.length}</strong> Projects</span>
          <span>|</span>
          <span>Last Updated: 2 minutes ago</span>
        </div>
        <div className={styles.footerRight}>
          <div className={styles.syncStatus}>
            <span className={styles.syncDot} />
            <span>SYNCED TO CLOUD</span>
          </div>
          <span>|</span>
          <span>Backup Status: <strong>Successful</strong></span>
        </div>
      </div>

      {/* MODAL 1: CREATE & EDIT PROJECT */}
      {activeModal === 'create' && (
        <div className={styles.modalBackdrop} onClick={(e) => e.target.classList.contains(styles.modalBackdrop) && setActiveModal(null)}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{selectedProject ? 'Edit Project Details' : 'Create New Company Project'}</h3>
              <button className={styles.closeBtn} onClick={() => setActiveModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateProjectSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Project Name</label>
                  <input
                    type="text"
                    required
                    className={styles.textInput}
                    value={newProjectForm.name}
                    onChange={(e) => setNewProjectForm({ ...newProjectForm, name: e.target.value })}
                  />
                </div>
                <div className={styles.basicGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Client / Partner</label>
                    <input
                      type="text"
                      className={styles.textInput}
                      value={newProjectForm.client}
                      onChange={(e) => setNewProjectForm({ ...newProjectForm, client: e.target.value })}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Department</label>
                    <select
                      className={styles.filterSelect}
                      style={{ width: '100%' }}
                      value={newProjectForm.department}
                      onChange={(e) => setNewProjectForm({ ...newProjectForm, department: e.target.value })}
                    >
                      <option value="IT">IT (Engineering)</option>
                      <option value="HR">HR (Compliance)</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Sales">Sales</option>
                    </select>
                  </div>
                </div>
                <div className={styles.basicGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Project Manager</label>
                    <select
                      className={styles.filterSelect}
                      style={{ width: '100%' }}
                      value={newProjectForm.manager}
                      onChange={(e) => setNewProjectForm({ ...newProjectForm, manager: e.target.value })}
                    >
                      <option value="">Select a manager...</option>
                      {(employees || []).map(emp => (
                        <option key={emp.id} value={emp.name}>
                          {emp.name} — {emp.designation || emp.position || 'Staff'} ({emp.id})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Team Leader</label>
                    <select
                      className={styles.filterSelect}
                      style={{ width: '100%' }}
                      value={newProjectForm.leader}
                      onChange={(e) => setNewProjectForm({ ...newProjectForm, leader: e.target.value })}
                    >
                      <option value="">Select a team leader...</option>
                      {(employees || []).map(emp => (
                        <option key={emp.id} value={emp.name}>
                          {emp.name} — {emp.designation || emp.position || 'Staff'} ({emp.id})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className={styles.basicGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Start Date</label>
                    <input
                      type="date"
                      className={styles.textInput}
                      value={newProjectForm.startDate}
                      onChange={(e) => setNewProjectForm({ ...newProjectForm, startDate: e.target.value })}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Deadline</label>
                    <input
                      type="date"
                      className={styles.textInput}
                      value={newProjectForm.deadline}
                      onChange={(e) => setNewProjectForm({ ...newProjectForm, deadline: e.target.value })}
                    />
                  </div>
                </div>
                <div className={styles.basicGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Budget ($)</label>
                    <input
                      type="number"
                      className={styles.textInput}
                      value={newProjectForm.budget}
                      onChange={(e) => setNewProjectForm({ ...newProjectForm, budget: e.target.value })}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Priority Level</label>
                    <select
                      className={styles.filterSelect}
                      style={{ width: '100%' }}
                      value={newProjectForm.priority}
                      onChange={(e) => setNewProjectForm({ ...newProjectForm, priority: e.target.value })}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Project Description</label>
                  <textarea
                    className={styles.textArea}
                    value={newProjectForm.description}
                    onChange={(e) => setNewProjectForm({ ...newProjectForm, description: e.target.value })}
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.pageBtn} onClick={() => setActiveModal(null)}>Cancel</button>
                <button type="submit" className={`${styles.pageBtn} ${styles.primaryAction}`}>
                  {selectedProject ? 'Save Changes' : 'Initialize Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ASSIGN TEAM */}
      {activeModal === 'assign' && (
        <div className={styles.modalBackdrop} onClick={(e) => e.target.classList.contains(styles.modalBackdrop) && setActiveModal(null)}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Assign Team Member</h3>
              <button className={styles.closeBtn} onClick={() => setActiveModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAssignTeamSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Target Project</label>
                  <select
                    className={styles.filterSelect}
                    style={{ width: '100%' }}
                    value={assignTeamForm.projectId}
                    onChange={(e) => setAssignTeamForm({ ...assignTeamForm, projectId: e.target.value })}
                  >
                    <option value="">Select a project...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.id} - {p.name}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Select Employee</label>
                  <select
                    required
                    className={styles.filterSelect}
                    style={{ width: '100%' }}
                    value={assignTeamForm.memberName}
                    onChange={(e) => setAssignTeamForm({ ...assignTeamForm, memberName: e.target.value })}
                  >
                    <option value="">Select an employee...</option>
                    {(employees || []).map(emp => (
                      <option key={emp.id} value={emp.name}>
                        {emp.name} — {emp.designation || emp.position || 'Staff'} ({emp.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.pageBtn} onClick={() => setActiveModal(null)}>Cancel</button>
                <button type="submit" className={`${styles.pageBtn} ${styles.primaryAction}`} disabled={!assignTeamForm.projectId}>
                  Assign Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD TASK */}
      {activeModal === 'task' && (
        <div className={styles.modalBackdrop} onClick={(e) => e.target.classList.contains(styles.modalBackdrop) && setActiveModal(null)}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Add Project Work Task</h3>
              <button className={styles.closeBtn} onClick={() => setActiveModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddTaskSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Target Project</label>
                  <select
                    className={styles.filterSelect}
                    style={{ width: '100%' }}
                    value={addTaskForm.projectId}
                    onChange={(e) => setAddTaskForm({ ...addTaskForm, projectId: e.target.value })}
                  >
                    <option value="">Select a project...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.id} - {p.name}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Task Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Perform compliance checklist audit"
                    className={styles.textInput}
                    value={addTaskForm.title}
                    onChange={(e) => setAddTaskForm({ ...addTaskForm, title: e.target.value })}
                  />
                </div>
                <div className={styles.basicGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Task Due Date</label>
                    <input
                      type="date"
                      required
                      className={styles.textInput}
                      value={addTaskForm.dueDate}
                      onChange={(e) => setAddTaskForm({ ...addTaskForm, dueDate: e.target.value })}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Priority</label>
                    <select
                      className={styles.filterSelect}
                      style={{ width: '100%' }}
                      value={addTaskForm.priority}
                      onChange={(e) => setAddTaskForm({ ...addTaskForm, priority: e.target.value })}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.pageBtn} onClick={() => setActiveModal(null)}>Cancel</button>
                <button type="submit" className={`${styles.pageBtn} ${styles.primaryAction}`} disabled={!addTaskForm.projectId}>
                  Create Work Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: UPLOAD DOCUMENT */}
      {activeModal === 'document' && (
        <div className={styles.modalBackdrop} onClick={(e) => e.target.classList.contains(styles.modalBackdrop) && setActiveModal(null)}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Upload Project Documents</h3>
              <button className={styles.closeBtn} onClick={() => setActiveModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleUploadDocSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Target Project</label>
                  <select
                    className={styles.filterSelect}
                    style={{ width: '100%' }}
                    value={uploadDocForm.projectId}
                    onChange={(e) => setUploadDocForm({ ...uploadDocForm, projectId: e.target.value })}
                  >
                    <option value="">Select a project...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.id} - {p.name}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Document File Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Budget_Spreadsheet_Q2.xlsx"
                    className={styles.textInput}
                    value={uploadDocForm.docName}
                    onChange={(e) => setUploadDocForm({ ...uploadDocForm, docName: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>File Format Type</label>
                  <select
                    className={styles.filterSelect}
                    style={{ width: '100%' }}
                    value={uploadDocForm.docType}
                    onChange={(e) => setUploadDocForm({ ...uploadDocForm, docType: e.target.value })}
                  >
                    <option value="pdf">PDF Document (.pdf)</option>
                    <option value="excel">Excel Sheet (.xlsx)</option>
                    <option value="word">Word Document (.docx)</option>
                    <option value="zip">ZIP Archive (.zip)</option>
                  </select>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.pageBtn} onClick={() => setActiveModal(null)}>Cancel</button>
                <button type="submit" className={`${styles.pageBtn} ${styles.primaryAction}`} disabled={!uploadDocForm.projectId}>
                  Upload File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: GENERATE REPORTS (Section J) */}
      {activeModal === 'report' && (
        <div className={styles.modalBackdrop} onClick={(e) => e.target.classList.contains(styles.modalBackdrop) && setActiveModal(null)}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Compile Dashboard Analytics Reports</h3>
              <button className={styles.closeBtn} onClick={() => setActiveModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleGenerateReportSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Select Report Focus Area</label>
                  <select
                    className={styles.filterSelect}
                    style={{ width: '100%' }}
                    value={reportForm.reportType}
                    onChange={(e) => setReportForm({ ...reportForm, reportType: e.target.value })}
                  >
                    <option value="progress">Project Progress Report</option>
                    <option value="productivity">Team Productivity Report</option>
                    <option value="deadlines">Deadline Tracking Report</option>
                    <option value="resources">Resource Allocation Report</option>
                    <option value="performance">Department Project Performance</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Export File Format</label>
                  <select
                    className={styles.filterSelect}
                    style={{ width: '100%' }}
                    value={reportForm.format}
                    onChange={(e) => setReportForm({ ...reportForm, format: e.target.value })}
                  >
                    <option value="pdf">Adobe PDF Document (.pdf)</option>
                    <option value="excel">Microsoft Excel Sheet (.xlsx)</option>
                    <option value="csv">Standard CSV File (.csv)</option>
                  </select>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.pageBtn} onClick={() => setActiveModal(null)}>Cancel</button>
                <button type="submit" className={`${styles.pageBtn} ${styles.primaryAction}`}>
                  Compile & Export
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
