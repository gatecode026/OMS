import React, { useState, useMemo, useReducer, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Managers.css';
import usePageLoading from '../hooks/usePageLoading';
import Avatar from '../components/common/Avatar';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import Skeleton from '../components/common/Skeleton';
import { useApp } from '../context/AppContext';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Users, Briefcase, TrendingUp, Activity, CheckCircle2, Star,
  Search, X, ChevronDown, ChevronUp, Eye, Pencil, Trash2, Plus,
  Download, FileText, Mail, Phone, Building2, MapPin, Calendar,
  Clock, AlertTriangle, XCircle, Bell, ArrowLeft, UserPlus,
  ChevronRight, Flag, Target, Award, Check, BarChart3, UserCog,
  Package, FolderOpen, Zap, Shield, LayoutGrid, List
} from 'lucide-react';

/* ── Shared recharts tooltip style ─────────────────────────────────── */
const TT = {
  contentStyle: {
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontSize: '0.78rem',
  },
  cursor: { fill: 'rgba(255,255,255,0.03)' }
};
const SEED_PROJECTS = [
  { id: 'PRJ-001', name: 'SaaS Platform v3.0',         pmId: 'PM-001', teamLeader: 'Rohan Verma',  startDate: '2026-01-10', endDate: '2026-07-30', progress: 72,  status: 'In Progress', clientName: 'Global Tech Corp', budget: 28 },
  { id: 'PRJ-002', name: 'Mobile App Redesign',         pmId: 'PM-001', teamLeader: 'Sneha Patel',  startDate: '2026-02-01', endDate: '2026-06-30', progress: 55,  status: 'In Progress', clientName: 'FitLife Inc',      budget: 18 },
  { id: 'PRJ-003', name: 'Q3 Marketing Campaign',       pmId: 'PM-002', teamLeader: 'Ankit Sharma', startDate: '2026-03-01', endDate: '2026-09-30', progress: 38,  status: 'In Progress', clientName: 'Red Bull India',  budget: 15 },
  { id: 'PRJ-004', name: 'CRM Integration Phase 2',     pmId: 'PM-002', teamLeader: 'Priya Nair',   startDate: '2025-10-01', endDate: '2026-02-28', progress: 100, status: 'Completed',   clientName: 'BMW Group',       budget: 22 },
  { id: 'PRJ-005', name: 'Sales Pipeline Automation',   pmId: 'PM-003', teamLeader: 'Vikram Desai', startDate: '2026-01-15', endDate: '2026-05-31', progress: 25,  status: 'Delayed',     clientName: 'Salesforce',      budget: 12 },
  { id: 'PRJ-006', name: 'HR Digitization',             pmId: 'PM-004', teamLeader: 'Meera Joshi',  startDate: '2026-04-01', endDate: '2026-10-31', progress: 20,  status: 'Planning',    clientName: 'People Solutions',budget: 9 },
  { id: 'PRJ-007', name: 'Cloud Infrastructure Mgr',    pmId: 'PM-005', teamLeader: 'Rohan Verma',  startDate: '2025-11-01', endDate: '2026-01-31', progress: 100, status: 'Completed',   clientName: 'AWS India',       budget: 8 },
  { id: 'PRJ-008', name: 'Employee Wellness Portal',    pmId: 'PM-006', teamLeader: 'Meera Joshi',  startDate: '2026-05-01', endDate: '2026-11-30', progress: 15,  status: 'In Progress', clientName: 'TCS Group',       budget: 10 },
];

const SEED_TEAM_LEADERS = [
  { id: 'TL-001', name: 'Rohan Verma',  department: 'IT',        teamName: 'Dev Team Alpha',    teamMembers: 18, activeProjects: 3, productivity: 94, attendance: 97 },
  { id: 'TL-002', name: 'Sneha Patel',  department: 'IT',        teamName: 'Dev Team Beta',     teamMembers: 15, activeProjects: 2, productivity: 91, attendance: 95 },
  { id: 'TL-003', name: 'Ankit Sharma', department: 'Marketing', teamName: 'Brand & Content',   teamMembers: 12, activeProjects: 2, productivity: 88, attendance: 93 },
  { id: 'TL-004', name: 'Priya Nair',   department: 'Marketing', teamName: 'Digital Campaigns', teamMembers: 10, activeProjects: 1, productivity: 92, attendance: 96 },
  { id: 'TL-005', name: 'Vikram Desai', department: 'Sales',     teamName: 'Sales Strike Team', teamMembers: 14, activeProjects: 2, productivity: 86, attendance: 91 },
  { id: 'TL-006', name: 'Meera Joshi',  department: 'HR',        teamName: 'People Ops',        teamMembers: 11, activeProjects: 2, productivity: 89, attendance: 94 },
];

const SEED_PMS = [
  { id:'PM-001', empId:'EMP-201', name:'Rahul Sharma',  email:'rahul.sharma@enterprise.com',  phone:'+91-9876543210', department:'IT',        branch:'Head Office',   designation:'Senior Manager',  joiningDate:'2019-03-15', status:'Active',    activeProjects:14, teamLeaders:2, teamMembers:320, successRate:97, productivity:96, clientSatisfaction:9.8, projectIds:['PRJ-001','PRJ-002'], teamLeaderIds:['TL-001','TL-002'], departments:['IT','Engineering','QA'] },
  { id:'PM-002', empId:'EMP-202', name:'Priya Verma',   email:'priya.verma@enterprise.com',   phone:'+91-9765432109', department:'Marketing', branch:'Branch Office', designation:'Manager',         joiningDate:'2020-07-01', status:'Active',    activeProjects:10, teamLeaders:2, teamMembers:180, successRate:95, productivity:94, clientSatisfaction:9.2, projectIds:['PRJ-003','PRJ-004'], teamLeaderIds:['TL-003','TL-004'], departments:['Marketing','Design'] },
  { id:'PM-003', empId:'EMP-203', name:'Amit Singh',    email:'amit.singh@enterprise.com',    phone:'+91-9654321098', department:'Sales',     branch:'Head Office',   designation:'Manager',         joiningDate:'2021-01-12', status:'Active',    activeProjects:8,  teamLeaders:1, teamMembers:150, successRate:93, productivity:91, clientSatisfaction:8.7, projectIds:['PRJ-005'],            teamLeaderIds:['TL-005'],            departments:['Sales','Operations'] },
  { id:'PM-004', empId:'EMP-204', name:'Neha Gupta',    email:'neha.gupta@enterprise.com',    phone:'+91-9543210987', department:'HR',        branch:'Head Office',   designation:'Junior Manager',  joiningDate:'2022-06-20', status:'Active',    activeProjects:6,  teamLeaders:1, teamMembers:120, successRate:91, productivity:90, clientSatisfaction:8.3, projectIds:['PRJ-006'],            teamLeaderIds:['TL-006'],            departments:['HR','Admin'] },
  { id:'PM-005', empId:'EMP-205', name:'Kiran Mehta',   email:'kiran.mehta@enterprise.com',   phone:'+91-9432109876', department:'IT',        branch:'Agency',        designation:'Senior Manager',  joiningDate:'2018-09-05', status:'On Leave',  activeProjects:4,  teamLeaders:1, teamMembers:80,  successRate:88, productivity:85, clientSatisfaction:7.8, projectIds:['PRJ-007'],            teamLeaderIds:['TL-001'],            departments:['IT','Infrastructure'] },
  { id:'PM-006', empId:'EMP-206', name:'Sunita Rao',    email:'sunita.rao@enterprise.com',    phone:'+91-9321098765', department:'HR',        branch:'Branch Office', designation:'Manager',         joiningDate:'2021-11-08', status:'Training',  activeProjects:5,  teamLeaders:1, teamMembers:100, successRate:89, productivity:87, clientSatisfaction:7.2, projectIds:['PRJ-008'],            teamLeaderIds:['TL-006'],            departments:['HR','Compliance'] },
];

const SEED_APPROVALS = [
  { id:'APR-001', type:'Task Completion Requests', pmId:'PM-001', description:'Mark SaaS Platform sprint 4 tasks as complete',            requester:'Rohan Verma',  submittedDate:'2026-06-03' },
  { id:'APR-002', type:'Team Resource Requests',   pmId:'PM-001', description:'Request 2 additional backend developers for PRJ-001',       requester:'Sneha Patel',  submittedDate:'2026-06-02' },
  { id:'APR-003', type:'Workflow Changes',         pmId:'PM-002', description:'Update campaign approval workflow to add QA gate',          requester:'Ankit Sharma', submittedDate:'2026-06-01' },
  { id:'APR-004', type:'Project Extensions',       pmId:'PM-003', description:'Extend Sales Pipeline Automation deadline by 30 days',     requester:'Vikram Desai', submittedDate:'2026-05-31' },
];

const SEED_NOTIFICATIONS = [
  { id:'NTF-001', color:'amber',  icon:'clock',     message:'SaaS Platform v3.0 deadline is 26 days away. Currently 72% complete.',         timestamp:'2 hours ago' },
  { id:'NTF-002', color:'red',    icon:'alert',     message:'Sales Pipeline Automation budget exceeded by 15% (₹1.38M vs ₹1.2M estimated).', timestamp:'5 hours ago' },
  { id:'NTF-003', color:'blue',   icon:'folder',    message:'New project "AI Analytics Module" has been assigned to Rahul Sharma.',           timestamp:'1 day ago'   },
  { id:'NTF-004', color:'purple', icon:'chart',     message:'Q2 Performance Review is due for all Managers by June 30.',             timestamp:'2 days ago'  },
  { id:'NTF-005', color:'green',  icon:'user_plus', message:'Team Leader Priya Nair has been added to the Marketing project team.',           timestamp:'3 days ago'  },
];

const SEED_ACTIVITIES = [
  { id:'ACT-001', action:'New Project Assigned to Rahul Sharma',          actor:'Super Admin',   timestamp:'10 min ago', iconType:'folder'    },
  { id:'ACT-002', action:'Budget Approved for SaaS Platform v3.0',        actor:'Finance Head',  timestamp:'1 hour ago', iconType:'check'     },
  { id:'ACT-003', action:'Dev Team Alpha Added to PRJ-001',               actor:'Rahul Sharma',  timestamp:'3 hours ago',iconType:'users'     },
  { id:'ACT-004', action:'Sprint 3 Milestone Completed Successfully',      actor:'Rohan Verma',   timestamp:'6 hours ago',iconType:'award'     },
  { id:'ACT-005', action:'Client Meeting Scheduled for CRM Review',        actor:'Priya Verma',   timestamp:'1 day ago',  iconType:'calendar'  },
  { id:'ACT-006', action:'Team Leader Meera Joshi Added to HR Digitization',actor:'Neha Gupta',  timestamp:'2 days ago', iconType:'user_plus' },
  { id:'ACT-007', action:'Performance Review Completed for Kiran Mehta',   actor:'Super Admin',   timestamp:'3 days ago', iconType:'chart'     },
  { id:'ACT-008', action:'Resource Request Approved for Marketing Team',   actor:'Admin',         timestamp:'4 days ago', iconType:'check'     },
];

/* ── Static chart data ──────────────────────────────────────────────── */
const DELIVERY_DATA   = [{name:'Rahul S.',delivery:97},{name:'Priya V.',delivery:95},{name:'Amit S.',delivery:91},{name:'Neha G.',delivery:89},{name:'Kiran M.',delivery:85},{name:'Sunita R.',delivery:87}];
const RADIAL_DATA     = [{name:'Dev Alpha',productivity:94,fill:'#8b5cf6'},{name:'Brand',productivity:88,fill:'#d946ef'},{name:'Sales',productivity:86,fill:'#3b82f6'},{name:'People',productivity:89,fill:'#10b981'}];
const RESOURCE_DATA   = [{name:'Fully Utilized',value:45,color:'#10b981'},{name:'Under-utilized',value:30,color:'#3b82f6'},{name:'Overloaded',value:25,color:'#ef4444'}];
const BUDGET_DATA     = [{project:'SaaS v3',estimated:28,actual:26.5},{project:'Marketing',estimated:15,actual:14.2},{project:'Sales Auto',estimated:12,actual:13.8},{project:'HR Digital',estimated:9,actual:8.7},{project:'Cloud',estimated:8,actual:7.9}];
const DEADLINE_DATA   = [{name:'On Time',value:65,color:'#10b981'},{name:'Delayed',value:20,color:'#ef4444'},{name:'At Risk',value:15,color:'#f59e0b'}];
const CSAT_DATA       = [{name:'Rahul S.',score:9.8},{name:'Priya V.',score:9.2},{name:'Amit S.',score:8.7},{name:'Neha G.',score:8.3},{name:'Sunita R.',score:7.2},{name:'Kiran M.',score:7.8}];
const MONTHS_DATA     = [{month:'Jan',delivery:88,productivity:85},{month:'Feb',delivery:90,productivity:87},{month:'Mar',delivery:91,productivity:89},{month:'Apr',delivery:93,productivity:90},{month:'May',delivery:95,productivity:92},{month:'Jun',delivery:97,productivity:94}];
const WEEKS_DATA      = Array.from({length:8},(_,i)=>({week:`W${i+1}`,completed:60+Math.floor(i*4+Math.random()*10),pending:25-Math.floor(i*2)}));
const TASK_PIE_DATA   = [{name:'Completed',value:98},{name:'Pending',value:18},{name:'Overdue',value:8}];
const TASK_PIE_COLORS = ['#10b981','#3b82f6','#ef4444'];

const SAMPLE_TASKS = [
  {id:'TSK-101',name:'API Gateway Setup',      project:'SaaS Platform v3.0', assignee:'Rohan Verma',  priority:'High',     due:'2026-06-10',status:'In Progress',progress:65},
  {id:'TSK-102',name:'UI Redesign Sprint 2',   project:'Mobile App Redesign', assignee:'Sneha Patel',  priority:'Medium',   due:'2026-06-15',status:'To Do',       progress:20},
  {id:'TSK-103',name:'Database Migration',     project:'SaaS Platform v3.0', assignee:'Rohan Verma',  priority:'Critical', due:'2026-06-05',status:'Overdue',     progress:45},
];


const getPerfBadge    = s => s>=90?'success':s>=70?'warning':'danger';
const getStatusBadge  = s => ({Active:'success','On Leave':'warning',Training:'info',Inactive:'danger',Suspended:'neutral'}[s]||'neutral');
const getProjBadge    = s => ({'In Progress':'info',Completed:'success',Delayed:'danger',Planning:'purple'}[s]||'neutral');
const getPriBadge     = p => ({Critical:'danger',High:'warning',Medium:'info',Low:'neutral'}[p]||'neutral');
const mkActivity      = (action,actor) => ({id:`ACT-${Math.random().toString(36).slice(2,9)}`,action,actor,timestamp:'Just now',iconType:'activity'});


const INIT = {
  pmList: SEED_PMS,
  projects: SEED_PROJECTS,
  teamLeaders: SEED_TEAM_LEADERS,
  selectedPM: null,
  view: 'list',
  filters: { search:'', status:'', department:'', performance:'', branch:'' },
  notifications: SEED_NOTIFICATIONS,
  activityFeed: SEED_ACTIVITIES,
  approvals: SEED_APPROVALS,
};

function reducer(state, action) {
  const trim20 = arr => arr.slice(0,20);
  switch(action.type) {
    case 'SELECT_PM':    return {...state, selectedPM:action.pm, view:'detail'};
    case 'GO_BACK':      return {...state, selectedPM:null, view:'list'};
    case 'ADD_PM':       return {...state, pmList:[action.pm,...state.pmList], activityFeed:trim20([mkActivity(`PM Added: ${action.pm.name}`,'Admin'),...state.activityFeed])};
    case 'UPDATE_PM':    return {...state, pmList:state.pmList.map(p=>p.id===action.pm.id?action.pm:p), selectedPM:state.selectedPM?.id===action.pm.id?action.pm:state.selectedPM, activityFeed:trim20([mkActivity(`PM Updated: ${action.pm.name}`,'Admin'),...state.activityFeed])};
    case 'DELETE_PM':    return {...state, pmList:state.pmList.filter(p=>p.id!==action.id), activityFeed:trim20([mkActivity('PM Removed','Admin'),...state.activityFeed])};
    case 'SET_FILTER':   return {...state, filters:{...state.filters,[action.key]:action.value}};
    case 'RESET_FILTERS':return {...state, filters:{search:'',status:'',department:'',performance:'',branch:''}};
    case 'DISMISS_NOTIF':return {...state, notifications:state.notifications.filter(n=>n.id!==action.id)};
    case 'APPROVE': {
      const approveNotif = {
        id: `NTF-APP-${Math.random().toString(36).slice(2, 9)}`,
        color: 'green',
        icon: 'user_plus',
        message: `Approved: ${action.item.description}`,
        timestamp: 'Just now'
      };
      return {
        ...state,
        approvals: state.approvals.filter(a => a.id !== action.id),
        notifications: [approveNotif, ...state.notifications],
        activityFeed: trim20([mkActivity(`Approved: ${action.item.description.slice(0,50)}`,action.item.requester),...state.activityFeed])
      };
    }
    case 'REJECT': {
      const rejectNotif = {
        id: `NTF-REJ-${Math.random().toString(36).slice(2, 9)}`,
        color: 'red',
        icon: 'alert',
        message: `Rejected: ${action.item.description} (Remarks: ${action.remarks})`,
        timestamp: 'Just now'
      };
      return {
        ...state,
        approvals: state.approvals.filter(a => a.id !== action.id),
        notifications: [rejectNotif, ...state.notifications],
        activityFeed: trim20([mkActivity(`Rejected: ${action.item.description.slice(0,50)} (Remarks: ${action.remarks})`,action.item.requester),...state.activityFeed])
      };
    }
    case 'ASSIGN_PROJECT': {
      const updatedProjects = state.projects.map(p => 
        p.name === action.projectName ? { ...p, pmId: action.pmId } : p
      );
      const targetProj = state.projects.find(p => p.name === action.projectName);
      const projId = targetProj ? targetProj.id : `PRJ-${Math.floor(100 + Math.random() * 900)}`;
      
      const updatedPmList = state.pmList.map(pm => {
        if (pm.id === action.pmId) {
          const projectIds = pm.projectIds || [];
          if (!projectIds.includes(projId)) {
            return {
              ...pm,
              projectIds: [...projectIds, projId],
              activeProjects: pm.activeProjects + 1
            };
          }
        }
        return pm;
      });

      const targetPM = state.pmList.find(p => p.id === action.pmId);
      return {
        ...state,
        projects: updatedProjects,
        pmList: updatedPmList,
        selectedPM: state.selectedPM?.id === action.pmId ? updatedPmList.find(p => p.id === action.pmId) : state.selectedPM,
        activityFeed: trim20([mkActivity(`Project "${action.projectName}" assigned to ${targetPM?.name || 'PM'}`,'Admin'), ...state.activityFeed])
      };
    }
    case 'ASSIGN_TEAM_LEADER': {
      const tl = state.teamLeaders.find(t => t.name === action.leaderName);
      if (!tl) return state;

      const updatedPmList = state.pmList.map(pm => {
        if (pm.id === action.pmId) {
          const teamLeaderIds = pm.teamLeaderIds || [];
          if (!teamLeaderIds.includes(tl.id)) {
            return {
              ...pm,
              teamLeaderIds: [...teamLeaderIds, tl.id],
              teamLeaders: pm.teamLeaders + 1
            };
          }
        }
        return pm;
      });

      const targetPM = state.pmList.find(p => p.id === action.pmId);
      return {
        ...state,
        pmList: updatedPmList,
        selectedPM: state.selectedPM?.id === action.pmId ? updatedPmList.find(p => p.id === action.pmId) : state.selectedPM,
        activityFeed: trim20([mkActivity(`Team Leader "${action.leaderName}" assigned to ${targetPM?.name || 'PM'}`,'Admin'), ...state.activityFeed])
      };
    }
    case 'ALLOCATE_RESOURCES': {
      const updatedPmList = state.pmList.map(pm => {
        if (pm.id === action.pmId) {
          return {
            ...pm,
            teamMembers: pm.teamMembers + action.headcount
          };
        }
        return pm;
      });

      const targetPM = state.pmList.find(p => p.id === action.pmId);
      return {
        ...state,
        pmList: updatedPmList,
        selectedPM: state.selectedPM?.id === action.pmId ? updatedPmList.find(p => p.id === action.pmId) : state.selectedPM,
        activityFeed: trim20([mkActivity(`Allocated ${action.headcount} resources to ${targetPM?.name || 'PM'}`,'Admin'), ...state.activityFeed])
      };
    }
    case 'REVIEW_LEADER': {
      const updatedLeaders = state.teamLeaders.map(tl => {
        if (tl.id === action.leaderId) {
          return {
            ...tl,
            productivity: action.productivity,
            attendance: action.attendance
          };
        }
        return tl;
      });
      return {
        ...state,
        teamLeaders: updatedLeaders,
        activityFeed: trim20([mkActivity(`Reviewed performance for Team Leader "${action.leaderName}"`,'Admin'), ...state.activityFeed])
      };
    }
    case 'TRANSFER_LEADER': {
      const updatedPmList = state.pmList.map(pm => {
        if (pm.id === action.currentPmId) {
          const newTLIds = (pm.teamLeaderIds || []).filter(id => id !== action.leaderId);
          return {
            ...pm,
            teamLeaderIds: newTLIds,
            teamLeaders: Math.max(0, newTLIds.length)
          };
        }
        if (pm.id === action.targetPmId) {
          const ids = pm.teamLeaderIds || [];
          if (!ids.includes(action.leaderId)) {
            const newTLIds = [...ids, action.leaderId];
            return {
              ...pm,
              teamLeaderIds: newTLIds,
              teamLeaders: newTLIds.length
            };
          }
        }
        return pm;
      });

      const leaderObj = state.teamLeaders.find(t => t.id === action.leaderId);
      const targetPM = state.pmList.find(p => p.id === action.targetPmId);

      return {
        ...state,
        pmList: updatedPmList,
        selectedPM: state.selectedPM?.id === action.currentPmId 
          ? updatedPmList.find(p => p.id === action.currentPmId) 
          : state.selectedPM,
        activityFeed: trim20([
          mkActivity(`Team Leader "${leaderObj?.name || 'Leader'}" transferred to PM "${targetPM?.name || 'PM'}"`, 'Admin'),
          ...state.activityFeed
        ])
      };
    }
    case 'ADD_ACTIVITY': return {...state, activityFeed:trim20([action.entry,...state.activityFeed])};
    default: return state;
  }
}

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */
const PER_PAGE = 10;

const Managers = () => {
  const navigate = useNavigate();
  const isLoading = usePageLoading(700);
  const { addToast, showConfirm, employees, tasks, addTask } = useApp();
  const directoryRef = useRef(null);
  const [activeDetailTab, setActiveDetailTab] = useState('overview');

  const [state, dispatch] = useReducer(reducer, INIT);
  const { pmList, projects, teamLeaders, selectedPM, view, filters, notifications, activityFeed, approvals } = state;

  const scrollToDirectory = () => {
    setTimeout(() => {
      directoryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  /* view mode and project detail modal states */
  const [viewMode,          setViewMode]          = useState('table');
  const [projectDetailOpen, setProjectDetailOpen] = useState(false);
  const [selectedProject,   setSelectedProject]   = useState(null);

  /* modal states */
  const [addEditOpen,     setAddEditOpen]     = useState(false);
  const [editingPM,       setEditingPM]       = useState(null);
  const [assignProjOpen,  setAssignProjOpen]  = useState(false);
  const [assignLeaderOpen,setAssignLeaderOpen]= useState(false);
  const [allocateOpen,    setAllocateOpen]    = useState(false);
  const [reportOpen,      setReportOpen]      = useState(false);
  const [exportOpen,      setExportOpen]      = useState(false);
  const [rejectingItem,   setRejectingItem]   = useState(null);
  const [rejectRemarks,   setRejectRemarks]   = useState('');
  const [expandedApp,     setExpandedApp]     = useState({});

  /* team leader action modal states */
  const [viewTeamOpen,      setViewTeamOpen]      = useState(false);
  const [selectedTL,         setSelectedTL]         = useState(null);
  const [assignWorkOpen,    setAssignWorkOpen]    = useState(false);
  const [reviewLeaderOpen,  setReviewLeaderOpen]  = useState(false);
  const [transferTeamOpen,  setTransferTeamOpen]  = useState(false);

  /* review performance state */
  const [revProductivity,   setRevProductivity]   = useState(90);
  const [revAttendance,     setRevAttendance]     = useState(95);
  const [revRating,         setRevRating]         = useState('Excellent');
  const [revComments,       setRevComments]       = useState('');

  /* transfer team state */
  const [transferTargetPM,  setTransferTargetPM]  = useState('');
  const [transferReason,    setTransferReason]    = useState('');

  /* assign work state */
  const [workTitle,         setWorkTitle]         = useState('');
  const [workDesc,          setWorkDesc]          = useState('');
  const [workPriority,      setWorkPriority]      = useState('Medium');
  const [workDueDate,       setWorkDueDate]       = useState('');
  const [workHours,         setWorkHours]         = useState('8');
  const [workProject,       setWorkProject]       = useState('');
  const [workAssignee,      setWorkAssignee]      = useState('');

  /* table */
  const [page,     setPage]     = useState(1);
  const [sortCol,  setSortCol]  = useState('name');
  const [sortDir,  setSortDir]  = useState('asc');
  const [cardFilter,setCardFilter] = useState('');
  const [healthFilter,setHealthFilter] = useState('');

  /* quick-action form */
  const [aPM,  setAPM]  = useState(''); const [aProj, setAProj] = useState('');
  const [alPM, setALPM] = useState(''); const [aLead, setALead] = useState('');
  const [rPM,  setRPM]  = useState('');

  /* report */
  const [rType, setRType] = useState('Manager Performance Report');
  const [rFmt,  setRFmt]  = useState('PDF');
  const [rLoading,setRLoading] = useState(false);

  /* form */
  const [form, setForm] = useState({ name:'',email:'',phone:'',department:'IT',branch:'Head Office',designation:'',joiningDate:'',status:'Active',successRate:90,productivity:90,clientSatisfaction:8.5 });
  const [formErr, setFormErr] = useState({});

  /* ── derived ──────────────────────────────────────────── */
  const summary = useMemo(()=>{
    const total=pmList.length, active=pmList.filter(p=>p.status==='Active').length;
    const totalProj=pmList.reduce((s,p)=>s+p.activeProjects,0);
    const activeProj=pmList.filter(p=>p.status==='Active').reduce((s,p)=>s+p.activeProjects,0);
    const members=pmList.reduce((s,p)=>s+p.teamMembers,0);
    const rate=total>0?Math.round(pmList.reduce((s,p)=>s+p.successRate,0)/total):0;
    return {total,active,totalProj,activeProj,members,rate};
  },[pmList]);

  const filtered = useMemo(()=>pmList.filter(pm=>{
    if(cardFilter==='active'&&pm.status!=='Active') return false;
    if(cardFilter==='has_active_projects'&&pm.activeProjects===0) return false;
    if(filters.status&&pm.status!==filters.status) return false;
    if(filters.department&&pm.department!==filters.department) return false;
    if(filters.branch&&pm.branch!==filters.branch) return false;
    if(filters.performance){
      if(filters.performance==='high'&&pm.productivity<90) return false;
      if(filters.performance==='average'&&(pm.productivity<70||pm.productivity>=90)) return false;
      if(filters.performance==='low'&&pm.productivity>=70) return false;
    }
    if(filters.search){
      const q=filters.search.toLowerCase();
      return pm.name.toLowerCase().includes(q)||pm.empId.toLowerCase().includes(q)||pm.department.toLowerCase().includes(q)||pm.branch.toLowerCase().includes(q);
    }
    return true;
  }),[pmList,filters,cardFilter]);

  const sorted = useMemo(()=>[...filtered].sort((a,b)=>{
    let av=a[sortCol],bv=b[sortCol];
    if(typeof av==='string'){av=av.toLowerCase();bv=bv.toLowerCase();}
    if(av<bv) return sortDir==='asc'?-1:1;
    if(av>bv) return sortDir==='asc'?1:-1;
    return 0;
  }),[filtered,sortCol,sortDir]);

  const totalPages = Math.max(1,Math.ceil(sorted.length/PER_PAGE));
  const paged      = sorted.slice((page-1)*PER_PAGE, page*PER_PAGE);
  const ranking    = useMemo(()=>[...pmList].sort((a,b)=>b.successRate-a.successRate),[pmList]);

  const pmProjects    = useMemo(()=>selectedPM?projects.filter(p=>p.pmId===selectedPM.id):[],[selectedPM,projects]);
  const pmTLs         = useMemo(()=>selectedPM?teamLeaders.filter(tl=>selectedPM.teamLeaderIds?.includes(tl.id)):[]  ,[selectedPM,teamLeaders]);
  const pmTasks = useMemo(() => {
    if (!selectedPM) return [];
    const matchedTasks = tasks.filter(t => 
      pmProjects.some(p => {
        const pName = p.name.split(' ')[0].toLowerCase();
        const tName = (t.project || t.projectName || '').toLowerCase();
        return tName.includes(pName);
      })
    );
    return matchedTasks.length > 0 ? matchedTasks : SAMPLE_TASKS.map(t => ({
      ...t,
      project: pmProjects[0]?.name || t.project
    }));
  }, [selectedPM, pmProjects, tasks]);

  const projectTasks = useMemo(() => {
    if (!selectedProject) return [];
    const pName = selectedProject.name.split(' ')[0].toLowerCase();
    const matched = tasks.filter(t => (t.project || t.projectName || '').toLowerCase().includes(pName));
    return matched.length > 0 ? matched : SAMPLE_TASKS.filter(t => t.project.toLowerCase().includes(pName)).map(t => ({ ...t, project: selectedProject.name }));
  }, [selectedProject, tasks]);

  const budgetSummary = useMemo(() => {
    if (!selectedPM) return { total: 0, utilized: 0, remaining: 0, percentage: 0 };
    const total = pmProjects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const utilized = pmProjects.reduce((sum, p) => sum + ((p.budget || 0) * (p.progress || 0)) / 100, 0);
    const remaining = total - utilized;
    const percentage = total > 0 ? Math.round((utilized / total) * 100) : 0;
    return { total, utilized, remaining, percentage };
  }, [pmProjects, selectedPM]);

  const teamMembersList = useMemo(() => {
    if (!selectedTL) return [];
    const deptEmployees = employees.filter(e => 
      e.department?.toLowerCase() === selectedTL.department?.toLowerCase() ||
      e.team?.toLowerCase() === selectedTL.teamName?.toLowerCase()
    );
    if (deptEmployees.length > 0) {
      return deptEmployees.slice(0, selectedTL.teamMembers || 5);
    }
    return [
      { id: 'EMP-T1', name: 'Rakesh Goel', designation: 'Software Engineer', status: 'Active', productivityScore: 92, attendanceStatus: 'Present', workEmail: 'rakesh.goel@saas.io' },
      { id: 'EMP-T2', name: 'Karan Malhotra', designation: 'QA Engineer', status: 'Active', productivityScore: 88, attendanceStatus: 'Present', workEmail: 'karan.malhotra@saas.io' },
      { id: 'EMP-T3', name: 'Shreya Sengupta', designation: 'Designer', status: 'Active', productivityScore: 90, attendanceStatus: 'Present', workEmail: 'shreya.sengupta@saas.io' },
    ];
  }, [selectedTL, employees]);

  const taskStats = useMemo(() => {
    const assigned = pmTasks.length;
    const completed = pmTasks.filter(t => t.status === 'Done' || t.status === 'done').length;
    const pending = pmTasks.filter(t => t.status !== 'Done' && t.status !== 'done').length;
    const todayStr = new Date().toISOString().split('T')[0];
    const overdue = pmTasks.filter(t => t.dueDate < todayStr && t.status !== 'Done' && t.status !== 'done').length;
    const efficiency = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
    return { assigned, completed, pending, overdue, efficiency };
  }, [pmTasks]);

  const taskPieData = useMemo(() => {
    return [
      { name: 'Completed', value: taskStats.completed },
      { name: 'Pending', value: Math.max(0, taskStats.pending - taskStats.overdue) },
      { name: 'Overdue', value: taskStats.overdue }
    ];
  }, [taskStats]);

  const pmApprovals   = useMemo(()=>selectedPM?approvals.filter(a=>a.pmId===selectedPM.id):approvals,[approvals,selectedPM]);
  const appByType     = useMemo(()=>['Task Completion Requests','Team Resource Requests','Workflow Changes','Project Extensions'].map(type=>({type,items:pmApprovals.filter(a=>a.type===type)})),[pmApprovals]);

  const hasFilters = Object.values(filters).some(Boolean)||cardFilter;
  const chips=[];
  if(filters.status)     chips.push({key:'status',     label:`Status: ${filters.status}`});
  if(filters.department) chips.push({key:'department', label:`Dept: ${filters.department}`});
  if(filters.branch)     chips.push({key:'branch',     label:`Branch: ${filters.branch}`});
  if(filters.performance)chips.push({key:'performance',label:`Perf: ${filters.performance}`});
  if(cardFilter==='active') chips.push({key:'_card', label:'Active PMs'});

  /* ── handlers ──────────────────────────────────────────── */
  const handleSort = col => { if(sortCol===col)setSortDir(d=>d==='asc'?'desc':'asc'); else{setSortCol(col);setSortDir('asc');} setPage(1); };
  const setFilter  = (k,v)=>{ dispatch({type:'SET_FILTER',key:k,value:v}); setPage(1); };
  const removeChip = k   =>{ if(k==='_card')setCardFilter(''); else setFilter(k,''); };

  const openAdd  = ()=>{ setEditingPM(null); setForm({name:'',email:'',phone:'',department:'IT',branch:'Head Office',designation:'',joiningDate:'',status:'Active',successRate:90,productivity:90,clientSatisfaction:8.5}); setFormErr({}); setAddEditOpen(true); };
  const openEdit = pm  =>{ setEditingPM(pm); setForm({name:pm.name,email:pm.email,phone:pm.phone,department:pm.department,branch:pm.branch,designation:pm.designation,joiningDate:pm.joiningDate,status:pm.status,successRate:pm.successRate,productivity:pm.productivity,clientSatisfaction:pm.clientSatisfaction}); setFormErr({}); setAddEditOpen(true); };

  const validateForm = ()=>{
    const e={};
    if(!form.name.trim())    e.name='Full name is required';
    if(!form.email.trim())   e.email='Email is required';
    else if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email='Invalid email format';
    if(!form.phone.trim())   e.phone='Contact number is required';
    if(!form.designation.trim()) e.designation='Designation is required';
    setFormErr(e); return Object.keys(e).length===0;
  };

  const savePM = ()=>{
    if(!validateForm()) return;
    if(editingPM){ dispatch({type:'UPDATE_PM',pm:{...editingPM,...form}}); addToast('success',`${form.name} updated.`); }
    else { dispatch({type:'ADD_PM',pm:{...form,id:`PM-${String(pmList.length+1).padStart(3,'0')}`,empId:`EMP-${210+pmList.length}`,activeProjects:0,teamLeaders:0,teamMembers:0,projectIds:[],teamLeaderIds:[],departments:[form.department]}}); addToast('success',`${form.name} added to panel.`); }
    setAddEditOpen(false);
  };

  const deletePM = pm => showConfirm(`Delete "${pm.name}"?`,'This will permanently remove this PM from the panel.',()=>{ dispatch({type:'DELETE_PM',id:pm.id}); addToast('warning',`${pm.name} removed.`); },'danger');
  const approve  = item=>{ dispatch({type:'APPROVE',id:item.id,item}); addToast('success','Request approved.'); };
  const rejectSubmit=()=>{ if(!rejectRemarks.trim()){addToast('danger','Enter rejection remarks.');return;} dispatch({type:'REJECT',id:rejectingItem.id,item:rejectingItem,remarks:rejectRemarks}); addToast('warning','Request rejected.'); setRejectingItem(null); setRejectRemarks(''); };

  const handleAssignWork = () => {
    if (!workTitle.trim() || !workAssignee || !workProject) {
      addToast('danger', 'Please enter a title, assignee, and project.');
      return;
    }
    const assigneeObj = teamMembersList.find(m => m.id === workAssignee);
    const taskData = {
      title: workTitle,
      description: workDesc,
      project: workProject,
      assigneeId: workAssignee,
      priority: workPriority,
      dueDate: workDueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      estimatedHours: Number(workHours) || 8,
    };
    addTask(taskData);
    
    dispatch({
      type: 'ADD_ACTIVITY',
      entry: mkActivity(`Task "${workTitle}" assigned to ${assigneeObj?.name || 'team member'}`, selectedPM?.name || 'PM')
    });

    addToast('success', `Task assigned to ${assigneeObj?.name || 'team member'}.`);
    setAssignWorkOpen(false);
    
    // Reset fields
    setWorkTitle('');
    setWorkDesc('');
    setWorkPriority('Medium');
    setWorkDueDate('');
    setWorkHours('8');
    setWorkProject('');
    setWorkAssignee('');
  };

  const handleReviewLeader = () => {
    if (!selectedTL) return;
    dispatch({
      type: 'REVIEW_LEADER',
      leaderId: selectedTL.id,
      leaderName: selectedTL.name,
      productivity: Number(revProductivity),
      attendance: Number(revAttendance)
    });
    addToast('success', `Performance review submitted for ${selectedTL.name}.`);
    setReviewLeaderOpen(false);
    setRevComments('');
  };

  const handleTransferLeader = () => {
    if (!selectedTL || !transferTargetPM) {
      addToast('danger', 'Please select a target Manager.');
      return;
    }
    dispatch({
      type: 'TRANSFER_LEADER',
      leaderId: selectedTL.id,
      currentPmId: selectedPM.id,
      targetPmId: transferTargetPM
    });
    addToast('success', `Team Leader ${selectedTL.name} transferred successfully.`);
    setTransferTeamOpen(false);
    setTransferTargetPM('');
    setTransferReason('');
  };

  const generateReport=()=>{ setRLoading(true); setTimeout(()=>{ setRLoading(false); setReportOpen(false); addToast('success',`${rType} generated in ${rFmt} format.`); },1200); };

  /* ── sort icon ──────────────────────────────────────────── */
  const SI = ({col})=>sortCol!==col?<span style={{opacity:.3}}>↕</span>:sortDir==='asc'?<ChevronUp size={12}/>:<ChevronDown size={12}/>;

  /* ── notification icon helper ────────────────────────────── */
  const NotifIcon = ({color})=>{
    const cfg={amber:{icon:<Clock size={15}/>,c:'var(--color-warning)',bg:'rgba(245,158,11,0.1)'},red:{icon:<AlertTriangle size={15}/>,c:'var(--color-danger)',bg:'rgba(239,68,68,0.1)'},blue:{icon:<FolderOpen size={15}/>,c:'var(--accent-blue-solid)',bg:'rgba(59,130,246,0.1)'},green:{icon:<UserPlus size={15}/>,c:'var(--color-success)',bg:'rgba(16,185,129,0.1)'},purple:{icon:<BarChart3 size={15}/>,c:'var(--color-purple)',bg:'rgba(139,92,246,0.1)'}};
    const s=cfg[color]||cfg.blue;
    return <div className="pm-alert-icon" style={{background:s.bg,color:s.c}}>{s.icon}</div>;
  };

  /* ── activity icon helper ───────────────────────────────── */
  const ActIcon = ({type,idx})=>{
    const base={folder:<FolderOpen size={14}/>,check:<Check size={14}/>,users:<Users size={14}/>,award:<Award size={14}/>,calendar:<Calendar size={14}/>,user_plus:<UserPlus size={14}/>,chart:<BarChart3 size={14}/>,activity:<Activity size={14}/>};
    const icon=base[type]||base.activity;
    return <div className="pm-activity-icon" style={{background:idx===0?'rgba(217,70,239,0.1)':'var(--bg-elevated)',color:idx===0?'var(--color-primary)':'var(--text-muted)'}}>{icon}</div>;
  };

  /* ── loading skeleton ───────────────────────────────────── */
  if(isLoading) return (
    <div className="pm-page">
      <div className="pm-summary-grid">{Array.from({length:6}).map((_,i)=><div key={i} className="pm-stat-card" style={{height:110}}><Skeleton variant="rect" height="100%"/></div>)}</div>
      <div style={{height:300}} className="pm-stat-card"><Skeleton variant="rect" height="100%"/></div>
      <div style={{height:400}} className="pm-stat-card"><Skeleton variant="rect" height="100%"/></div>
    </div>
  );

  /* ══════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════ */
  return (
    <div className="pm-page animate-fade-in">

      {view==='list' ? (
        <>
          {/* ── HEADER ── */}
          <div className="pm-page-header">
            <div className="pm-header-left">
              <h2>Manager Panel</h2>
              <p className="pm-header-subtitle">Manage, monitor, and evaluate all Managers across the organization. Track project performance, team allocation, resource management, deadlines, budgets, task completion, and overall project delivery from a centralized enterprise management dashboard.</p>
            </div>
            <div className="pm-header-actions">
              <div className="pm-view-toggle">
                <button 
                  className={`pm-toggle-btn ${viewMode === 'table' ? 'active' : ''}`} 
                  onClick={() => setViewMode('table')}
                  title="Table View"
                >
                  <List size={16} />
                </button>
                <button 
                  className={`pm-toggle-btn ${viewMode === 'card' ? 'active' : ''}`} 
                  onClick={() => setViewMode('card')}
                  title="Card View"
                >
                  <LayoutGrid size={16} />
                </button>
              </div>
              <Button variant="ghost" size="sm" icon={Download} onClick={()=>setExportOpen(true)}>Export Data</Button>
              <Button variant="ghost" size="sm" icon={FileText} onClick={()=>setReportOpen(true)}>Reports</Button>
              <Button variant="primary" size="sm" icon={Plus} onClick={openAdd}>Assign Manager</Button>
            </div>
          </div>

          {/* ── QUICK ACTIONS ── */}
          <div style={{display:'flex',gap:'var(--space-2)',flexWrap:'wrap'}}>
            <Button variant="secondary" size="sm" icon={Briefcase}  onClick={()=>setAssignProjOpen(true)}>Assign Project</Button>
            <Button variant="secondary" size="sm" icon={UserPlus}   onClick={()=>setAssignLeaderOpen(true)}>Assign Team Leader</Button>
            <Button variant="secondary" size="sm" icon={Package}    onClick={()=>setAllocateOpen(true)}>Allocate Resources</Button>
          </div>

          {/* ── SUMMARY CARDS ── */}
          <div className="pm-summary-grid" style={{flexShrink: 0}}>
            {[
              {
                accent:'blue',
                ibg:'icon-bg-blue',
                icon:<Users size={18}/>,
                value:summary.total,
                label:'Total Managers',
                desc:'All registered PMs',
                onClick: () => {
                  setViewMode('card');
                  dispatch({ type: 'GO_BACK' });
                  dispatch({ type: 'RESET_FILTERS' });
                  setCardFilter('');
                  setPage(1);
                  addToast('info', 'Viewing All Managers in Card view');
                  scrollToDirectory();
                }
              },
              {
                accent:'green',
                ibg:'icon-bg-green',
                icon:<UserCog size={18}/>,
                value:summary.active,
                label:'Active Managers',
                desc:'Currently operational',
                onClick: () => {
                  setViewMode('card');
                  dispatch({ type: 'GO_BACK' });
                  dispatch({ type: 'RESET_FILTERS' });
                  setCardFilter('active');
                  setPage(1);
                  addToast('info', 'Viewing Active Managers in Card view');
                  scrollToDirectory();
                }
              },
              {
                accent:'purple',
                ibg:'icon-bg-purple',
                icon:<Briefcase size={18}/>,
                value:summary.totalProj,
                label:'Total Projects Managed',
                desc:'Across all PMs',
                onClick: () => {
                  setViewMode('card');
                  dispatch({ type: 'GO_BACK' });
                  dispatch({ type: 'RESET_FILTERS' });
                  setCardFilter('');
                  setSortCol('activeProjects');
                  setSortDir('desc');
                  setPage(1);
                  addToast('info', 'Viewing PMs sorted by Projects Managed');
                  scrollToDirectory();
                }
              },
              {
                accent:'teal',
                ibg:'icon-bg-teal',
                icon:<Activity size={18}/>,
                value:summary.activeProj,
                label:'Active Projects',
                desc:'Currently in execution',
                onClick: () => {
                  setViewMode('card');
                  dispatch({ type: 'GO_BACK' });
                  dispatch({ type: 'RESET_FILTERS' });
                  setCardFilter('has_active_projects');
                  setPage(1);
                  addToast('info', 'Viewing PMs with Active Projects in Card view');
                  scrollToDirectory();
                }
              },
              {
                accent:'amber',
                ibg:'icon-bg-amber',
                icon:<Users size={18}/>,
                value:summary.members.toLocaleString(),
                label:'Team Members Managed',
                desc:'Total headcount under PMs',
                onClick: () => {
                  setViewMode('card');
                  dispatch({ type: 'GO_BACK' });
                  dispatch({ type: 'RESET_FILTERS' });
                  setCardFilter('');
                  setSortCol('teamMembers');
                  setSortDir('desc');
                  setPage(1);
                  addToast('info', 'Viewing PMs sorted by Headcount Managed');
                  scrollToDirectory();
                }
              },
              {
                accent:'pink',
                ibg:'icon-bg-pink',
                icon:<Star size={18}/>,
                value:`${summary.rate}%`,
                label:'Project Success Rate',
                desc:'Avg across all PMs',
                onClick: () => {
                  setViewMode('card');
                  dispatch({ type: 'GO_BACK' });
                  dispatch({ type: 'RESET_FILTERS' });
                  setCardFilter('');
                  setSortCol('successRate');
                  setSortDir('desc');
                  setPage(1);
                  addToast('info', 'Viewing PMs sorted by Success Rate');
                  scrollToDirectory();
                }
              },
            ].map((c,i)=>(
              <div key={i} className={`pm-stat-card pm-accent-${c.accent}${
                (c.label === 'Active Managers' && cardFilter === 'active') ||
                (c.label === 'Active Projects' && cardFilter === 'has_active_projects') ||
                (c.label === 'Total Managers' && cardFilter === '' && sortCol === 'name' && viewMode === 'card') ||
                (c.label === 'Total Projects Managed' && sortCol === 'activeProjects' && viewMode === 'card') ||
                (c.label === 'Team Members Managed' && sortCol === 'teamMembers' && viewMode === 'card') ||
                (c.label === 'Project Success Rate' && sortCol === 'successRate' && viewMode === 'card')
                  ? ' active-filter'
                  : ''
              }`}
                style={{cursor:'pointer'}} onClick={c.onClick}>
                <div className="pm-stat-card-top">
                  <div>
                    <div className="pm-stat-value">{c.value}</div>
                    <div className="pm-stat-label">{c.label}</div>
                    <div className="pm-stat-desc">{c.desc}</div>
                  </div>
                  <div className={`pm-stat-icon ${c.ibg}`}>{c.icon}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── ANALYTICS ── */}
          <div className="card" style={{padding:'var(--space-5)', flexShrink: 0}}>
            <div className="pm-analytics-header">
              <div>
                <div className="pm-analytics-title">Manager Performance Analytics — Leadership Overview</div>
                <div className="pm-analytics-subtitle">Delivery, productivity, resource utilization, budget compliance and client satisfaction</div>
              </div>
            </div>
            {/* KPI row */}
            <div className="pm-kpi-row">
              {[{label:'Avg Delivery Rate',value:'93%',up:true},{label:'Avg Team Productivity',value:'89%',up:true},{label:'Avg Resource Utilization',value:'76%',up:false},{label:'Budget Compliance',value:'82%',up:true}].map((k,i)=>(
                <div key={i} className="pm-kpi-card">
                  <div className="pm-kpi-label">{k.label}</div>
                  <div className="pm-kpi-value">{k.value}&nbsp;<span className={k.up?'pm-kpi-trend-up':'pm-kpi-trend-down'}>{k.up?'↑':'↓'}</span></div>
                </div>
              ))}
            </div>
            {/* Charts grid */}
            <div className="pm-charts-grid">
              {/* 1 Delivery Bar */}
              <div className="pm-chart-card">
                <div className="pm-chart-title">Project Delivery Performance</div>
                <div className="pm-chart-subtitle">Delivery % per PM</div>
                <div className="pm-chart-body">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={DELIVERY_DATA} barSize={18}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                      <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false}/>
                      <YAxis domain={[70,100]} stroke="var(--text-muted)" fontSize={10} tickLine={false}/>
                      <Tooltip {...TT}/>
                      <Bar dataKey="delivery" radius={[4,4,0,0]}>{DELIVERY_DATA.map((_,i)=><Cell key={i} fill={i===0?'#d946ef':'#8b5cf6'}/>)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {/* 2 Radial */}
              <div className="pm-chart-card">
                <div className="pm-chart-title">Team Productivity</div>
                <div className="pm-chart-subtitle">Productivity % by team</div>
                <div className="pm-chart-body">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart cx="50%" cy="50%" innerRadius="25%" outerRadius="90%" data={RADIAL_DATA} barSize={12}>
                      <RadialBar dataKey="productivity" cornerRadius={4} label={{position:'insideStart',fill:'var(--text-muted)',fontSize:9}}/>
                      <Tooltip {...TT}/>
                      <Legend iconSize={8} wrapperStyle={{fontSize:'0.7rem',color:'var(--text-muted)'}}/>
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {/* 3 Resource Donut */}
              <div className="pm-chart-card">
                <div className="pm-chart-title">Resource Utilization</div>
                <div className="pm-chart-subtitle">Team capacity breakdown</div>
                <div className="pm-chart-body">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={RESOURCE_DATA} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                        {RESOURCE_DATA.map((e,i)=><Cell key={i} fill={e.color}/>)}
                      </Pie>
                      <Tooltip {...TT} formatter={(v,n)=>[`${v}%`,n]}/>
                      <Legend iconSize={8} wrapperStyle={{fontSize:'0.7rem',color:'var(--text-muted)'}}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {/* 4 Budget Stacked */}
              <div className="pm-chart-card">
                <div className="pm-chart-title">Budget Management</div>
                <div className="pm-chart-subtitle">Estimated vs Actual (Lakhs ₹)</div>
                <div className="pm-chart-body">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={BUDGET_DATA} barSize={12}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                      <XAxis dataKey="project" stroke="var(--text-muted)" fontSize={10} tickLine={false}/>
                      <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false}/>
                      <Tooltip {...TT}/>
                      <Legend iconSize={8} wrapperStyle={{fontSize:'0.7rem',color:'var(--text-muted)'}}/>
                      <Bar dataKey="estimated" name="Estimated" fill="#3b82f6" radius={[2,2,0,0]}/>
                      <Bar dataKey="actual"    name="Actual"    fill="#10b981" radius={[2,2,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {/* 5 Deadline Pie */}
              <div className="pm-chart-card">
                <div className="pm-chart-title">Deadline Compliance Rate</div>
                <div className="pm-chart-subtitle">On Time / Delayed / At Risk</div>
                <div className="pm-chart-body">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={DEADLINE_DATA} cx="50%" cy="50%" outerRadius={75} dataKey="value" paddingAngle={3}>
                        {DEADLINE_DATA.map((e,i)=><Cell key={i} fill={e.color}/>)}
                      </Pie>
                      <Tooltip {...TT} formatter={(v,n)=>[`${v}%`,n]}/>
                      <Legend iconSize={8} wrapperStyle={{fontSize:'0.7rem',color:'var(--text-muted)'}}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {/* 6 CSAT Horizontal Bar */}
              <div className="pm-chart-card">
                <div className="pm-chart-title">Client Satisfaction Score</div>
                <div className="pm-chart-subtitle">Score out of 10 per PM</div>
                <div className="pm-chart-body">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={CSAT_DATA} layout="vertical" barSize={14}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false}/>
                      <XAxis type="number" domain={[0,10]} stroke="var(--text-muted)" fontSize={10} tickLine={false}/>
                      <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={10} tickLine={false} width={60}/>
                      <Tooltip {...TT}/>
                      <Bar dataKey="score" radius={[0,4,4,0]}>{CSAT_DATA.map((e,i)=><Cell key={i} fill={e.score>=8?'#10b981':e.score>=5?'#f59e0b':'#ef4444'}/>)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* ── RANKING TABLE ── */}
          <div className="pm-dir-card" style={{flexShrink: 0}}>
            <div className="pm-dir-toolbar">
              <span className="pm-dir-title">Manager Ranking</span>
              <Badge variant="info">{ranking.length} Managers</Badge>
            </div>
            <div className="pm-ranking-table-wrap">
              <table className="pm-dir-table">
                <thead><tr><th>Rank</th><th>Manager</th><th>Projects</th><th>Success Rate</th><th>Performance</th></tr></thead>
                <tbody>
                  {ranking.map((pm,idx)=>(
                    <tr key={pm.id} onClick={()=>dispatch({type:'SELECT_PM',pm})} style={{cursor:'pointer'}}>
                      <td><div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div className={`pm-rank-num${idx===0?' pm-rank-gold':idx===1?' pm-rank-silver':idx===2?' pm-rank-bronze':''}`}>{idx+1}</div>
                        {idx===0?'🏆':idx===1?'🥈':idx===2?'🥉':''}
                      </div></td>
                      <td><div className="pm-name-cell"><Avatar name={pm.name} size="sm"/><span className="pm-name-text">{pm.name}</span></div></td>
                      <td>{pm.activeProjects}</td>
                      <td><Badge variant={getPerfBadge(pm.successRate)}>{pm.successRate}%</Badge></td>
                      <td><Badge variant={getPerfBadge(pm.productivity)}>{pm.productivity}%</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── FILTERS ── */}
          <div className="pm-filters-card" style={{flexShrink: 0}}>
            <div className="pm-filters-row">
              <div className="pm-search-wrap">
                <Search size={15} className="pm-search-icon"/>
                <input className="pm-search-input" placeholder="Search by name, ID, department, branch..." value={filters.search} onChange={e=>setFilter('search',e.target.value)}/>
                {filters.search&&<button className="pm-search-clear" onClick={()=>setFilter('search','')} aria-label="Clear search"><X size={14}/></button>}
              </div>
              <select className="pm-filter-select" value={filters.status}     onChange={e=>setFilter('status',e.target.value)}>
                <option value="">All Statuses</option><option>Active</option><option>On Leave</option><option>Training</option><option>Inactive</option><option>Suspended</option>
              </select>
              <select className="pm-filter-select" value={filters.department} onChange={e=>setFilter('department',e.target.value)}>
                <option value="">All Departments</option><option>IT</option><option>Marketing</option><option>Sales</option><option>HR</option>
              </select>
              <select className="pm-filter-select" value={filters.performance}onChange={e=>setFilter('performance',e.target.value)}>
                <option value="">All Performance</option><option value="high">High (90%+)</option><option value="average">Average (70–89%)</option><option value="low">Low (&lt;70%)</option>
              </select>
              <select className="pm-filter-select" value={filters.branch}    onChange={e=>setFilter('branch',e.target.value)}>
                <option value="">All Branches</option><option>Head Office</option><option>Branch Office</option><option>Agency</option>
              </select>
              {hasFilters&&<Button variant="ghost" size="sm" onClick={()=>{dispatch({type:'RESET_FILTERS'});setCardFilter('');setPage(1);}}>Reset All</Button>}
              <span className="pm-filter-count">Showing {filtered.length} of {pmList.length} managers</span>
            </div>
            {chips.length>0&&<div className="pm-chips-row">{chips.map(c=><span key={c.key} className="pm-filter-chip">{c.label}<button className="pm-chip-remove" onClick={()=>removeChip(c.key)} aria-label={`Remove ${c.label}`}><X size={12}/></button></span>)}</div>}
          </div>

          {/* ── DIRECTORY TABLE ── */}
          <div ref={directoryRef} className="pm-dir-card" style={{flexShrink: 0}}>
            <div className="pm-dir-toolbar">
              <span className="pm-dir-title">Managers Directory</span>
              <Badge variant="neutral">{filtered.length} records</Badge>
            </div>
            {viewMode === 'table' ? (
              <div className="pm-dir-table-wrap">
                <table className="pm-dir-table">
                  <thead>
                    <tr>
                      {[{c:'empId',l:'Employee ID',w:100},{c:'name',l:'Manager Name',w:180},{c:null,l:'Photo',w:60},{c:'department',l:'Department',w:120},{c:'branch',l:'Branch / Agency',w:140},{c:'designation',l:'Designation',w:160},{c:'activeProjects',l:'Active Projects',w:110},{c:null,l:'Team Leaders',w:110},{c:'teamMembers',l:'Team Members',w:110},{c:'successRate',l:'Success Rate',w:130},{c:'productivity',l:'Productivity',w:120},{c:'status',l:'Status',w:120},{c:null,l:'Actions',w:140}].map(({c,l,w})=>(
                        <th key={l} style={{minWidth:w}} className={c&&sortCol===c?'sorted':''} onClick={c?()=>handleSort(c):undefined}>
                          <span style={{display:'inline-flex',alignItems:'center',gap:4}}>{l}{c&&<SI col={c}/>}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paged.length>0?paged.map(pm=>(
                      <tr key={pm.id} onClick={()=>dispatch({type:'SELECT_PM',pm})}>
                        <td style={{color:'var(--text-muted)',fontFamily:'monospace',fontSize:'0.8rem'}}>{pm.empId}</td>
                        <td><div className="pm-name-cell"><Avatar name={pm.name} size="sm"/><span className="pm-name-text">{pm.name}</span></div></td>
                        <td><Avatar name={pm.name} size="sm"/></td>
                        <td>{pm.department}</td>
                        <td>{pm.branch}</td>
                        <td style={{fontSize:'0.82rem'}}>{pm.designation}</td>
                        <td><Badge variant="info">{pm.activeProjects}</Badge></td>
                        <td>{pm.teamLeaders}</td>
                        <td>{pm.teamMembers.toLocaleString()}</td>
                        <td><Badge variant={getPerfBadge(pm.successRate)}>{pm.successRate}%</Badge></td>
                        <td><Badge variant={getPerfBadge(pm.productivity)}>{pm.productivity}%</Badge></td>
                        <td><Badge variant={getStatusBadge(pm.status)}>{pm.status}</Badge></td>
                        <td onClick={e=>e.stopPropagation()}>
                          <div className="pm-row-actions">
                            <button className="icon-action-btn" title="View" aria-label="View" onClick={()=>dispatch({type:'SELECT_PM',pm})}><Eye size={14}/></button>
                            <button className="icon-action-btn" title="Edit" aria-label="Edit" onClick={()=>openEdit(pm)}><Pencil size={14}/></button>
                            <button className="icon-action-btn icon-action-danger" title="Delete" aria-label="Delete" onClick={()=>deletePM(pm)}><Trash2 size={14}/></button>
                          </div>
                        </td>
                      </tr>
                    )):(
                      <tr><td colSpan={13}><div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,padding:'40px 0'}}><Users size={36} style={{color:'var(--text-muted)',opacity:.35}}/><span style={{color:'var(--text-muted)',fontSize:'0.875rem'}}>No project managers found</span></div></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="pm-cards-grid-wrap">
                {paged.length > 0 ? (
                  <div className="pm-cards-grid">
                    {paged.map(pm => (
                      <div 
                        key={pm.id} 
                        className="pm-grid-card animate-fade-in" 
                        onClick={() => dispatch({ type: 'SELECT_PM', pm })}
                      >
                        <div className="pm-card-badge-row">
                          <Badge variant={getStatusBadge(pm.status)}>{pm.status}</Badge>
                          <span className="pm-card-empid">{pm.empId}</span>
                        </div>
                        
                        <div className="pm-card-profile">
                          <Avatar name={pm.name} size="md" />
                          <div className="pm-card-profile-info">
                            <h3 className="pm-card-name">{pm.name}</h3>
                            <p className="pm-card-desig">{pm.designation}</p>
                            <p className="pm-card-dept">{pm.department} · {pm.branch}</p>
                          </div>
                        </div>

                        <div className="pm-card-metrics">
                          <div className="pm-card-metric-item">
                            <Briefcase size={14} className="pm-card-metric-icon text-blue" />
                            <div>
                              <div className="pm-card-metric-val">{pm.activeProjects}</div>
                              <div className="pm-card-metric-label">Projects</div>
                            </div>
                          </div>
                          <div className="pm-card-metric-item">
                            <Users size={14} className="pm-card-metric-icon text-orange" />
                            <div>
                              <div className="pm-card-metric-val">{pm.teamMembers.toLocaleString()}</div>
                              <div className="pm-card-metric-label">Headcount</div>
                            </div>
                          </div>
                          <div className="pm-card-metric-item">
                            <Target size={14} className="pm-card-metric-icon text-pink" />
                            <div>
                              <div className="pm-card-metric-val">{pm.successRate}%</div>
                              <div className="pm-card-metric-label">Success</div>
                            </div>
                          </div>
                          <div className="pm-card-metric-item">
                            <Zap size={14} className="pm-card-metric-icon text-teal" />
                            <div>
                              <div className="pm-card-metric-val">{pm.productivity}%</div>
                              <div className="pm-card-metric-label">Productivity</div>
                            </div>
                          </div>
                        </div>

                        <div className="pm-card-progress-section">
                          <div className="pm-card-progress-header">
                            <span>Delivery Performance</span>
                            <span>{pm.successRate}%</span>
                          </div>
                          <div className="pm-progress-bar">
                            <div 
                              className="pm-progress-fill" 
                              style={{ 
                                width: `${pm.successRate}%`, 
                                background: pm.successRate >= 90 ? 'var(--color-success)' : pm.successRate >= 70 ? 'var(--color-warning)' : 'var(--color-danger)' 
                              }} 
                            />
                          </div>
                        </div>

                        <div className="pm-card-actions" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" icon={Eye} onClick={() => dispatch({ type: 'SELECT_PM', pm })}>View Profile</Button>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="icon-action-btn" title="Edit" aria-label="Edit" onClick={() => openEdit(pm)}><Pencil size={14}/></button>
                            <button className="icon-action-btn icon-action-danger" title="Delete" aria-label="Delete" onClick={() => deletePM(pm)}><Trash2 size={14}/></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,padding:'40px 0'}}>
                    <Users size={36} style={{color:'var(--text-muted)',opacity:.35}} />
                    <span style={{color:'var(--text-muted)',fontSize:'0.875rem'}}>No project managers found</span>
                  </div>
                )}
              </div>
            )}
            <div className="pm-pagination">
              <span className="pm-pagination-info">Showing {sorted.length===0?0:(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE,sorted.length)} of {sorted.length} project managers</span>
              <div className="pm-pagination-controls">
                <button className="pm-page-btn" disabled={page===1} onClick={()=>setPage(p=>p-1)}>‹ Prev</button>
                {Array.from({length:totalPages},(_,i)=>i+1).map(p=><button key={p} className={`pm-page-btn${p===page?' active':''}`} onClick={()=>setPage(p)}>{p}</button>)}
                <button className="pm-page-btn" disabled={page===totalPages} onClick={()=>setPage(p=>p+1)}>Next ›</button>
              </div>
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div className="pm-footer-bar" style={{flexShrink: 0}}>
            <div className="pm-footer-stat"><span className="pm-footer-stat-label">Total Managers</span><span className="pm-footer-stat-value">{pmList.length}</span></div>
            <div className="pm-footer-stat"><span className="pm-footer-stat-label">Projects Managed</span><span className="pm-footer-stat-value">{summary.totalProj}</span></div>
            <div className="pm-footer-stat"><span className="pm-footer-stat-label">Last Updated</span><span className="pm-footer-stat-value">Just Now</span></div>
            <div className="pm-footer-stat"><span className="pm-footer-stat-label">System Status</span><span className="pm-status-dot">Manager Module Active</span></div>
          </div>
        </>
      ) : (
        /* ══════════════════════════════════════════════════════
           DETAIL VIEW
           ══════════════════════════════════════════════════════ */
        selectedPM&&(
          <div className="animate-slide-up">
            {/* Breadcrumb + top bar */}
            <div style={{marginBottom:'var(--space-4)'}}>
              <div className="pm-breadcrumb" style={{marginBottom:'var(--space-3)'}}>
                <span className="pm-breadcrumb-link" onClick={()=>dispatch({type:'GO_BACK'})}>Manager Panel</span>
                <ChevronRight size={14} className="pm-breadcrumb-sep"/>
                <span className="pm-breadcrumb-current">{selectedPM.name}</span>
              </div>
              <div className="pm-detail-topbar">
                <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={()=>dispatch({type:'GO_BACK'})}>Back</Button>
                <div className="pm-detail-topbar-actions">
                  <Button variant="secondary" size="sm" icon={Pencil} onClick={()=>openEdit(selectedPM)}>Edit Profile</Button>
                  <Button variant="ghost" size="sm" icon={Download} onClick={()=>addToast('success','PM Profile PDF exported.')}>Export PDF</Button>
                </div>
              </div>
            </div>

            {/* ── Profile Hero Header ── */}
            <div className="pm-hero-card" style={{marginBottom:'var(--space-4)'}}>
              <div className="pm-hero-bg-gradient" />
              <div className="pm-hero-content">
                <div className="pm-hero-profile-row">
                  <div className="pm-hero-avatar-wrapper">
                    <Avatar name={selectedPM.name} size="lg" />
                    <span className={`pm-hero-status-glow status-${selectedPM.status.toLowerCase().replace(/\s+/g, '-')}`} />
                  </div>
                  <div className="pm-hero-info">
                    <div className="pm-hero-name-row">
                      <h2 className="pm-hero-name">{selectedPM.name}</h2>
                      <Badge variant={getStatusBadge(selectedPM.status)}>{selectedPM.status}</Badge>
                    </div>
                    <p className="pm-hero-designation">{selectedPM.designation}</p>
                    <div className="pm-hero-meta-badges">
                      <span className="pm-hero-meta-badge"><Building2 size={13} /> {selectedPM.department}</span>
                      <span className="pm-hero-meta-badge"><MapPin size={13} /> {selectedPM.branch}</span>
                      <span className="pm-hero-meta-badge"><Calendar size={13} /> Joined {selectedPM.joiningDate}</span>
                      <span className="pm-hero-meta-badge-id">ID: {selectedPM.empId}</span>
                    </div>
                  </div>
                  <div className="pm-hero-quick-stats">
                    <div className="pm-hero-stat-box">
                      <span className="pm-hero-stat-num">{selectedPM.successRate}%</span>
                      <span className="pm-hero-stat-lbl">Success Rate</span>
                    </div>
                    <div className="pm-hero-stat-box">
                      <span className="pm-hero-stat-num">{selectedPM.productivity}%</span>
                      <span className="pm-hero-stat-lbl">Productivity</span>
                    </div>
                    <div className="pm-hero-stat-box">
                      <span className="pm-hero-stat-num">{selectedPM.clientSatisfaction}/10</span>
                      <span className="pm-hero-stat-lbl">Satisfaction</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Tabs Navigation Bar ── */}
            <div className="pm-detail-tabs-bar" style={{marginBottom:'var(--space-4)'}}>
              {[
                { id: 'overview', label: 'Overview', icon: <UserCog size={15} /> },
                { id: 'projects', label: 'Projects & Budget', icon: <Briefcase size={15} /> },
                { id: 'team', label: 'Team & Workload', icon: <Users size={15} /> },
                { id: 'tasks', label: 'Tasks & Workflows', icon: <CheckCircle2 size={15} /> },
                { id: 'governance', label: 'Governance & Risks', icon: <Shield size={15} /> },
                { id: 'activity', label: 'Activity Log', icon: <Activity size={15} /> },
              ].map(t => (
                <button
                  key={t.id}
                  className={`pm-detail-tab-btn ${activeDetailTab === t.id ? 'active' : ''}`}
                  onClick={() => setActiveDetailTab(t.id)}
                >
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            {/* ── Tab Contents ── */}
            <div className="pm-tab-content-container animate-fade-in" key={activeDetailTab}>
              {activeDetailTab === 'overview' && (
                <div className="pm-tab-pane flex-column gap-4">
                  {/* Personal info summary */}
                  <div className="pm-personal-card">
                    <h3 className="pm-section-title"><UserCog size={16} /> Contact & Professional Overview</h3>
                    <div className="pm-personal-grid">
                      <div className="pm-personal-left">
                        <div className="pm-info-row"><Phone size={14} className="pm-info-icon"/><div><div className="pm-info-label">Contact Number</div><div className="pm-info-value">{selectedPM.phone}</div></div></div>
                        <div className="pm-info-row"><Mail size={14} className="pm-info-icon"/><div><div className="pm-info-label">Official Email</div><a href={`mailto:${selectedPM.email}`} style={{color:'var(--color-primary)',fontSize:'0.875rem',fontWeight:500}}>{selectedPM.email}</a></div></div>
                      </div>
                      <div className="pm-personal-right">
                        <div className="pm-info-row"><Zap size={14} className="pm-info-icon"/><div><div className="pm-info-label">Current Role Designation</div><div className="pm-info-value">{selectedPM.designation}</div></div></div>
                        <div className="pm-info-row"><Calendar size={14} className="pm-info-icon"/><div><div className="pm-info-label">Joining Anniversary</div><div className="pm-info-value">{selectedPM.joiningDate}</div></div></div>
                      </div>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="pm-section-card">
                    <div className="pm-section-title"><TrendingUp size={16}/>Performance Metrics & Competency</div>
                    <div className="pm-kpi-grid-3x2">
                      {[{label:'Project Success Rate',val:`${selectedPM.successRate}%`,desc:'Projects completed on time'},{label:'Task Completion Rate',val:'88%',desc:'Tasks completed vs assigned'},{label:'Team Productivity',val:`${selectedPM.productivity}%`,desc:'Avg across all teams'},{label:'Employee Utilization',val:'79%',desc:'Team capacity used'},{label:'Client Satisfaction',val:`${selectedPM.clientSatisfaction}/10`,desc:'Manual score rating'},{label:'Deadline Compliance',val:'91%',desc:'Milestones hit on time'}].map((k,i)=>(
                        <div key={i} className="pm-kpi-big-card"><div className="pm-kpi-big-val">{k.val}</div><div className="pm-kpi-big-label">{k.label}</div><div className="pm-kpi-big-desc">{k.desc}</div></div>
                      ))}
                    </div>
                    <div className="pm-detail-3-charts">
                      <div className="pm-chart-card"><div className="pm-chart-title">Delivery (6 Months)</div><div className="pm-chart-body-sm"><ResponsiveContainer width="100%" height="100%"><BarChart data={MONTHS_DATA} barSize={14}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/><XAxis dataKey="month" stroke="var(--text-muted)" fontSize={10} tickLine={false}/><YAxis domain={[70,100]} stroke="var(--text-muted)" fontSize={10} tickLine={false}/><Tooltip {...TT}/><Bar dataKey="delivery" fill="var(--color-primary)" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div></div>
                      <div className="pm-chart-card"><div className="pm-chart-title">Team Productivity Trend</div><div className="pm-chart-body-sm"><ResponsiveContainer width="100%" height="100%"><LineChart data={MONTHS_DATA}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/><XAxis dataKey="month" stroke="var(--text-muted)" fontSize={10} tickLine={false}/><YAxis domain={[70,100]} stroke="var(--text-muted)" fontSize={10} tickLine={false}/><Tooltip {...TT}/><Line type="monotone" dataKey="productivity" stroke="var(--color-success)" strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer></div></div>
                      <div className="pm-chart-card"><div className="pm-chart-title">Resource Utilization per Team</div><div className="pm-chart-body-sm"><ResponsiveContainer width="100%" height="100%"><RadialBarChart cx="50%" cy="50%" innerRadius="25%" outerRadius="90%" data={RADIAL_DATA.slice(0,Math.max(pmTLs.length,2))} barSize={10}><RadialBar dataKey="productivity" cornerRadius={4}/><Tooltip {...TT}/></RadialBarChart></ResponsiveContainer></div></div>
                    </div>
                  </div>
                </div>
              )}

              {activeDetailTab === 'projects' && (
                <div className="pm-tab-pane flex-column gap-4">
                  {/* Project Assignment Summary */}
                  <div className="pm-section-card">
                    <div className="pm-section-title"><Briefcase size={16}/>Project Assignment Summary</div>
                    <div className="pm-proj-mini-grid">
                      {[{label:'Total Assigned',value:pmProjects.length,color:'var(--text-primary)'},{label:'Active',value:pmProjects.filter(p=>p.status==='In Progress').length,color:'var(--accent-blue-solid)'},{label:'Completed',value:pmProjects.filter(p=>p.status==='Completed').length,color:'var(--color-success)'},{label:'Delayed',value:pmProjects.filter(p=>p.status==='Delayed').length,color:'var(--color-danger)'},{label:'Planning',value:pmProjects.filter(p=>p.status==='Planning').length,color:'var(--color-purple)'}].map((c,i)=>(
                        <div key={i} className="pm-proj-mini-card"><div className="pm-proj-mini-num" style={{color:c.color}}>{c.value}</div><div className="pm-proj-mini-label">{c.label}</div></div>
                      ))}
                    </div>
                  </div>

                  {/* Project Portfolio */}
                  <div className="pm-dir-card">
                    <div className="pm-dir-toolbar">
                      <span className="pm-dir-title">Project Portfolio & Client Accounts</span>
                      <div className="pm-health-badges" style={{marginTop:0}}>
                        {[{status:'In Progress',label:'On Track',c:'var(--color-success)',bg:'rgba(16,185,129,0.1)'},{status:'Delayed',label:'Delayed',c:'var(--color-danger)',bg:'rgba(239,68,68,0.1)'},{status:'Planning',label:'Planning',c:'var(--accent-blue-solid)',bg:'rgba(59,130,246,0.1)'},{status:'Completed',label:'Completed',c:'var(--text-muted)',bg:'var(--bg-elevated)'}].map(item=>(
                          <button key={item.status} className={`pm-health-badge${healthFilter===item.status?' active-badge':''}`} style={{background:item.bg,color:item.c,borderColor:healthFilter===item.status?item.c:item.c+'40'}} onClick={()=>setHealthFilter(p=>p===item.status?'':item.status)}>
                            <span className="pm-health-dot" style={{background:item.c}}/>{item.label}: {pmProjects.filter(p=>p.status===item.status).length}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="pm-dir-table-wrap">
                      <table className="pm-dir-table">
                        <thead><tr><th style={{minWidth:90}}>ID</th><th style={{minWidth:180}}>Project Name</th><th style={{minWidth:140}}>Client Name</th><th style={{minWidth:130}}>Team Leader</th><th style={{minWidth:100}}>Start</th><th style={{minWidth:100}}>End</th><th style={{minWidth:100}}>Budget</th><th style={{minWidth:130}}>Progress</th><th style={{minWidth:100}}>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                          {(healthFilter?pmProjects.filter(p=>p.status===healthFilter):pmProjects).map(p=>(
                            <tr key={p.id}>
                              <td style={{fontFamily:'monospace',fontSize:'0.8rem',color:'var(--text-muted)'}}>{p.id}</td>
                              <td style={{fontWeight:600,color:'var(--text-primary)'}}>{p.name}</td>
                              <td>{p.clientName || 'N/A'}</td>
                              <td>{p.teamLeader}</td>
                              <td>{p.startDate}</td>
                              <td>{p.endDate}</td>
                              <td style={{fontWeight:500,color:'var(--text-primary)'}}>₹{p.budget ? `${p.budget} L` : 'N/A'}</td>
                              <td><div style={{display:'flex',alignItems:'center',gap:8}}><div className="pm-progress-bar" style={{flex:1}}><div className="pm-progress-fill" style={{width:`${p.progress}%`,background:p.progress===100?'var(--color-success)':p.status==='Delayed'?'var(--color-danger)':'var(--color-primary)'}}/></div><span style={{fontSize:'0.78rem',color:'var(--text-muted)',minWidth:32}}>{p.progress}%</span></div></td>
                              <td><Badge variant={getProjBadge(p.status)}>{p.status}</Badge></td>
                              <td><Button variant="ghost" size="sm" onClick={() => { setSelectedProject(p); setProjectDetailOpen(true); }}>View</Button></td>
                            </tr>
                          ))}
                          {pmProjects.length===0&&<tr><td colSpan={10} style={{textAlign:'center',padding:24,color:'var(--text-muted)'}}>No projects assigned to this PM.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Budget Management */}
                  <div className="pm-section-card">
                    <div className="pm-section-title"><TrendingUp size={16}/>Budget Management & Analysis</div>
                    <div className="pm-proj-mini-grid" style={{marginBottom:'var(--space-4)'}}>
                      <div className="pm-proj-mini-card">
                        <div className="pm-proj-mini-num" style={{color:'var(--text-primary)'}}>₹{budgetSummary.total.toFixed(1)} L</div>
                        <div className="pm-proj-mini-label">Total Budget Managed</div>
                      </div>
                      <div className="pm-proj-mini-card">
                        <div className="pm-proj-mini-num" style={{color:'var(--color-success)'}}>₹{budgetSummary.utilized.toFixed(1)} L</div>
                        <div className="pm-proj-mini-label">Budget Utilized</div>
                      </div>
                      <div className="pm-proj-mini-card">
                        <div className="pm-proj-mini-num" style={{color:'var(--accent-blue-solid)'}}>₹{budgetSummary.remaining.toFixed(1)} L</div>
                        <div className="pm-proj-mini-label">Budget Remaining</div>
                      </div>
                      <div className="pm-proj-mini-card">
                        <div className="pm-proj-mini-num" style={{color:budgetSummary.percentage > 90 ? 'var(--color-danger)' : 'var(--color-primary)'}}>{budgetSummary.percentage}%</div>
                        <div className="pm-proj-mini-label">Utilization Rate</div>
                      </div>
                    </div>
                    <div className="pm-card-progress-section" style={{maxWidth:'600px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom: 6, fontSize:'0.82rem'}}>
                        <span style={{fontWeight:600,color:'var(--text-secondary)'}}>Budget Consumption Progress</span>
                        <span style={{fontWeight:700,color:'var(--color-primary)'}}>{budgetSummary.percentage}%</span>
                      </div>
                      <div className="pm-progress-bar" style={{height:8}}>
                        <div className="pm-progress-fill" style={{width:`${budgetSummary.percentage}%`,background:budgetSummary.percentage > 90 ? 'var(--color-danger)' : 'var(--color-primary)'}}/>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeDetailTab === 'team' && (
                <div className="pm-tab-pane flex-column gap-4">
                  {/* Reporting Team Leaders */}
                  <div className="pm-section-card">
                    <div className="pm-section-title"><Users size={16}/>Team Structure & Hierarchy</div>
                    <div style={{fontSize:'0.75rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-secondary)',marginBottom:'var(--space-3)'}}>Reporting Team Leaders</div>
                    <div style={{overflowX:'auto',marginBottom:'var(--space-4)'}}>
                      <table className="pm-dir-table">
                        <thead><tr><th style={{minWidth:160}}>Team Leader</th><th>Department</th><th style={{minWidth:150}}>Team Name</th><th>Members</th><th>Projects</th><th>Productivity</th><th>Attendance</th><th style={{minWidth:170}}>Actions</th></tr></thead>
                        <tbody>
                          {pmTLs.map(tl=>(
                            <tr key={tl.id}>
                              <td><div className="pm-name-cell"><Avatar name={tl.name} size="sm"/><span style={{fontWeight:600,color:'var(--text-primary)'}}>{tl.name}</span></div></td>
                              <td>{tl.department}</td><td>{tl.teamName}</td><td>{tl.teamMembers}</td><td>{tl.activeProjects}</td>
                              <td><Badge variant={getPerfBadge(tl.productivity)}>{tl.productivity}%</Badge></td>
                              <td><Badge variant={tl.attendance>=95?'success':'warning'}>{tl.attendance}%</Badge></td>
                              <td onClick={e=>e.stopPropagation()}>
                                <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                                  <Button variant="ghost" size="sm" onClick={()=>{ setSelectedTL(tl); setViewTeamOpen(true); }}>View Team</Button>
                                  <Button variant="ghost" size="sm" onClick={()=>{ setSelectedTL(tl); setWorkProject(pmProjects[0]?.name || ''); setAssignWorkOpen(true); }}>Assign Work</Button>
                                  <Button variant="ghost" size="sm" onClick={()=>{ setSelectedTL(tl); setRevProductivity(tl.productivity); setRevAttendance(tl.attendance); setReviewLeaderOpen(true); }}>Review Performance</Button>
                                  <Button variant="ghost" size="sm" onClick={()=>{ setSelectedTL(tl); setTransferTargetPM(''); setTransferTeamOpen(true); }}>Transfer Team</Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {pmTLs.length===0&&<tr><td colSpan={8} style={{textAlign:'center',padding:20,color:'var(--text-muted)'}}>No team leaders assigned.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Teams Managed Grid */}
                  <div className="pm-section-card">
                    <div className="pm-section-title"><Users size={16}/>Active Teams Managed</div>
                    <div className="pm-teams-grid" style={{marginBottom:'var(--space-4)'}}>
                      {pmTLs.map(tl=><div key={tl.id} className="pm-team-card"><div className="pm-team-card-name">{tl.teamName}</div><div className="pm-team-card-sub">Leader: {tl.name}</div><div style={{marginTop:8,display:'flex',gap:6,flexWrap:'wrap'}}><Badge variant="neutral">{tl.teamMembers} Members</Badge><Badge variant="info">{tl.activeProjects} Projects</Badge><Badge variant={getPerfBadge(tl.productivity)}>{tl.productivity}%</Badge></div></div>)}
                    </div>
                    <div style={{fontSize:'0.75rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-secondary)',marginBottom:'var(--space-2)'}}>Assigned Departments</div>
                    <div className="pm-dept-chips">{(selectedPM.departments||[selectedPM.department]).map(d=><span key={d} className="pm-dept-chip">{d}</span>)}</div>
                  </div>

                  {/* Workload chart */}
                  {pmTLs.length>0&&<div className="pm-chart-card">
                    <div className="pm-chart-title">Workload Distribution by Team</div>
                    <div className="pm-chart-body-sm"><ResponsiveContainer width="100%" height="100%"><BarChart data={pmTLs.map(tl=>({name:tl.teamName,util:tl.productivity})).sort((a,b)=>b.util-a.util)} layout="vertical" barSize={16}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false}/><XAxis type="number" domain={[0,100]} stroke="var(--text-muted)" fontSize={10} tickLine={false}/><YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={10} tickLine={false} width={110}/><Tooltip {...TT}/><Bar dataKey="util" fill="var(--color-purple)" radius={[0,4,4,0]}/></BarChart></ResponsiveContainer></div>
                  </div>}
                </div>
              )}

              {activeDetailTab === 'tasks' && (
                <div className="pm-tab-pane flex-column gap-4">
                  {/* Task & Workflow Overview */}
                  <div className="pm-section-card">
                    <div className="pm-section-title"><Activity size={16}/>Task & Workflow Overview</div>
                    <div className="pm-task-5-grid">
                      {[{label:'Tasks Assigned',val:taskStats.assigned},{label:'Tasks Completed',val:taskStats.completed},{label:'Tasks Pending',val:taskStats.pending},{label:'Overdue Tasks',val:taskStats.overdue,danger:true},{label:'Workflow Efficiency',val:`${taskStats.efficiency}%`}].map((s,i)=>(
                        <div key={i} className="pm-task-stat"><div className="pm-task-stat-val" style={{color:s.danger?'var(--color-danger)':'var(--text-primary)'}}>{s.val}</div><div className="pm-task-stat-label">{s.label}</div></div>
                      ))}
                    </div>
                    <div className="pm-detail-charts-row">
                      <div className="pm-chart-card"><div className="pm-chart-title">Task Progress Breakdown</div><div className="pm-chart-body-sm"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={taskPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>{taskPieData.map((_,i)=><Cell key={i} fill={TASK_PIE_COLORS[i]}/>)}</Pie><Tooltip {...TT}/><Legend iconSize={8} wrapperStyle={{fontSize:'0.7rem',color:'var(--text-muted)'}}/></PieChart></ResponsiveContainer></div></div>
                      <div className="pm-chart-card"><div className="pm-chart-title">Completion Trends (8 Weeks)</div><div className="pm-chart-body-sm"><ResponsiveContainer width="100%" height="100%"><LineChart data={WEEKS_DATA}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/><XAxis dataKey="week" stroke="var(--text-muted)" fontSize={10} tickLine={false}/><YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false}/><Tooltip {...TT}/><Legend iconSize={8} wrapperStyle={{fontSize:'0.7rem'}}/><Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} dot={false} name="Completed"/><Line type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={2} dot={false} name="Pending"/></LineChart></ResponsiveContainer></div></div>
                    </div>
                  </div>

                  {/* Tasks table */}
                  <div className="pm-dir-card">
                    <div className="pm-dir-toolbar"><span className="pm-dir-title">Operational Tasks & Deliverables Log</span></div>
                    <div style={{overflowX:'auto'}}>
                      <table className="pm-dir-table">
                        <thead><tr><th>Task ID</th><th style={{minWidth:160}}>Task Name</th><th style={{minWidth:140}}>Project</th><th style={{minWidth:130}}>Assigned To</th><th>Priority</th><th>Due Date</th><th>Status</th><th style={{minWidth:100}}>Progress</th></tr></thead>
                        <tbody>{pmTasks.map(t=>(
                          <tr key={t.id}>
                            <td style={{fontFamily:'monospace',fontSize:'0.78rem',color:'var(--text-muted)'}}>{t.id}</td>
                            <td style={{fontWeight:500,color:'var(--text-primary)'}}>{t.title || t.name}</td>
                            <td style={{fontSize:'0.82rem'}}>{t.project || t.projectName}</td>
                            <td>{t.assigneeName || t.assignee}</td>
                            <td><Badge variant={getPriBadge(t.priority)}>{t.priority}</Badge></td>
                            <td style={{fontSize:'0.82rem',color:t.status==='Overdue'?'var(--color-danger)':'var(--text-muted)'}}>{t.dueDate || t.due}</td>
                            <td><Badge variant={t.status==='In Progress' || t.status==='In Review'?'info':t.status==='Overdue' || t.status==='Rejected'?'danger':'neutral'}>{t.status}</Badge></td>
                            <td><div style={{display:'flex',alignItems:'center',gap:6}}><div className="pm-progress-bar" style={{width:60}}><div className="pm-progress-fill" style={{width:`${t.progress}%`,background:'var(--color-primary)'}}/></div><span style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>{t.progress}%</span></div></td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeDetailTab === 'governance' && (
                <div className="pm-tab-pane flex-column gap-4">
                  {/* Risk Management */}
                  <div className="pm-section-card">
                    <div className="pm-section-title"><AlertTriangle size={16} style={{color:'var(--color-warning)'}}/>Project Risk Management</div>
                    <div className="pm-proj-mini-grid" style={{marginBottom:'var(--space-4)'}}>
                      <div className="pm-proj-mini-card">
                        <div className="pm-proj-mini-num" style={{color:pmProjects.some(p=>p.status==='Delayed')?'var(--color-danger)':'var(--color-success)'}}>
                          {pmProjects.filter(p=>p.status==='Delayed').length} Delayed
                        </div>
                        <div className="pm-proj-mini-label">Critical Milestones Overdue</div>
                      </div>
                      <div className="pm-proj-mini-card">
                        <div className="pm-proj-mini-num" style={{color:pmProjects.some(p=>p.status==='Delayed')?'var(--color-danger)':'var(--color-success)'}}>
                          {pmProjects.some(p=>p.status==='Delayed') ? '₹1.8L Overrun' : '₹0.0L Overrun'}
                        </div>
                        <div className="pm-proj-mini-label">Budget Overruns Detected</div>
                      </div>
                      <div className="pm-proj-mini-card">
                        <div className="pm-proj-mini-num" style={{color:'var(--accent-blue-solid)'}}>
                          {selectedPM.teamMembers > 200 ? 'High Capacity' : 'Optimal Capacity'}
                        </div>
                        <div className="pm-proj-mini-label">Resource Allocation Status</div>
                      </div>
                      <div className="pm-proj-mini-card">
                        <div className="pm-proj-mini-num" style={{color:selectedPM.clientSatisfaction >= 9 ? 'var(--color-success)' : 'var(--color-warning)'}}>
                          {selectedPM.clientSatisfaction}/10
                        </div>
                        <div className="pm-proj-mini-label">Client Compliance Rating</div>
                      </div>
                    </div>
                    <div style={{background:'var(--bg-elevated)',borderRadius:'var(--radius-lg)',padding:'var(--space-4)'}}>
                      <div style={{fontSize:'0.75rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--text-secondary)',marginBottom:'var(--space-2)'}}>Live Risk Monitoring Logs</div>
                      <div style={{display:'flex',flexDirection:'column',gap:8}}>
                        {pmProjects.filter(p=>p.status==='Delayed').map(p=>(
                          <div key={p.id} style={{fontSize:'0.82rem',color:'var(--color-danger)',display:'flex',alignItems:'center',gap:6}}>
                            ⚠️ <strong>[Project Delay]</strong> Project "{p.name}" has active milestone delays. Adjust resource allocations.
                          </div>
                        ))}
                        {selectedPM.clientSatisfaction < 8 && (
                          <div style={{fontSize:'0.82rem',color:'var(--color-warning)',display:'flex',alignItems:'center',gap:6}}>
                            ⚠️ <strong>[CSAT Review Needed]</strong> Score ({selectedPM.clientSatisfaction}/10) is below standard. Schedule review with client.
                          </div>
                        )}
                        {pmProjects.filter(p=>p.status==='Delayed').length === 0 && selectedPM.clientSatisfaction >= 8 && (
                          <div style={{fontSize:'0.82rem',color:'var(--color-success)',display:'flex',alignItems:'center',gap:6}}>
                            ✓ <strong>[No Risks Detected]</strong> All projects are on track. Resource utilization is optimized.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Approvals */}
                  <div className="pm-section-card">
                    <div className="pm-section-title"><CheckCircle2 size={16}/>Pending Approvals & Authorizations</div>
                    {appByType.map(({type,items})=>(
                      <div key={type} className="pm-approval-panel">
                        <div className="pm-approval-header" onClick={()=>setExpandedApp(p=>({...p,[type]:!p[type]}))}>
                          <div className="pm-approval-header-left"><Shield size={14} style={{color:'var(--color-primary)'}}/>{type}<Badge variant={items.length>0?'warning':'neutral'}>{items.length}</Badge></div>
                          {expandedApp[type]?<ChevronUp size={16} style={{color:'var(--text-muted)'}}/>:<ChevronDown size={16} style={{color:'var(--text-muted)'}}/>}
                        </div>
                        {expandedApp[type]&&<div className="pm-approval-body">
                          {items.length>0?items.map(item=>(
                            <div key={item.id} className="pm-approval-item">
                              <div style={{flex:1}}><div className="pm-approval-desc">{item.description}</div><div className="pm-approval-meta">By {item.requester} · {item.submittedDate}</div></div>
                              <div className="pm-approval-actions">
                                <Button variant="primary" size="sm" icon={Check} onClick={()=>approve(item)}>Approve</Button>
                                <Button variant="danger"  size="sm" icon={XCircle} onClick={()=>setRejectingItem(item)}>Reject</Button>
                                {type==='Team Resource Requests'&&<Button variant="ghost" size="sm" onClick={()=>addToast('info','Escalating...')}>Escalate</Button>}
                              </div>
                            </div>
                          )):<div style={{textAlign:'center',padding:'16px',color:'var(--text-muted)',fontSize:'0.82rem'}}>✓ No pending {type.toLowerCase()}</div>}
                        </div>}
                      </div>
                    ))}
                  </div>

                  {/* Project Governance */}
                  <div className="pm-section-card">
                    <div className="pm-section-title"><Shield size={16} style={{color:'var(--color-primary)'}}/>Project Governance Board</div>
                    <div style={{display:'flex',flexDirection:'column',gap:12}}>
                      {/* Active Escalations */}
                      <div className="pm-approval-panel">
                        <div className="pm-approval-header" onClick={()=>setExpandedApp(p=>({...p,GovEsc:!p.GovEsc}))}>
                          <div className="pm-approval-header-left"><Flag size={14} style={{color:'var(--color-danger)'}}/>Active Escalations<Badge variant="danger">1</Badge></div>
                          {expandedApp.GovEsc?<ChevronUp size={16} style={{color:'var(--text-muted)'}}/>:<ChevronDown size={16} style={{color:'var(--text-muted)'}}/>}
                        </div>
                        {expandedApp.GovEsc&&<div className="pm-approval-body">
                          <div className="pm-approval-item">
                            <div style={{flex:1}}>
                              <div className="pm-approval-desc"><strong>[SaaS Platform v3.0]</strong> Critical path block in API gateway synchronization. Sneha Patel reports frontend developers are blocked.</div>
                              <div className="pm-approval-meta">Logged by Sneha Patel (TL) · 2 hours ago</div>
                            </div>
                            <div className="pm-approval-actions">
                              <Button variant="primary" size="sm" onClick={()=>{addToast('success','Escalation acknowledged. Alert sent to Super Admin.'); dispatch({type:'ADD_ACTIVITY',entry:mkActivity('Acknowledged API synchronization escalation','Super Admin')})}}>Acknowledge</Button>
                              <Button variant="ghost" size="sm" onClick={()=>{addToast('info','Reassigned to IT director.');}}>Reassign</Button>
                            </div>
                          </div>
                        </div>}
                      </div>

                      {/* Document Release */}
                      <div className="pm-approval-panel">
                        <div className="pm-approval-header" onClick={()=>setExpandedApp(p=>({...p,GovDoc:!p.GovDoc}))}>
                          <div className="pm-approval-header-left"><FileText size={14} style={{color:'var(--accent-blue-solid)'}}/>Pending Document Releases<Badge variant="warning">1</Badge></div>
                          {expandedApp.GovDoc?<ChevronUp size={16} style={{color:'var(--text-muted)'}}/>:<ChevronDown size={16} style={{color:'var(--text-muted)'}}/>}
                        </div>
                        {expandedApp.GovDoc&&<div className="pm-approval-body">
                          <div className="pm-approval-item">
                            <div style={{flex:1}}>
                              <div className="pm-approval-desc"><strong>[AI Analytics Module]</strong> Release request for System Architecture PRD v1.2 & security review certification.</div>
                              <div className="pm-approval-meta">Submitted by Rahul Sharma (PM) · 1 day ago</div>
                            </div>
                            <div className="pm-approval-actions">
                              <Button variant="primary" size="sm" onClick={()=>{addToast('success','PRD and Security certification approved for release.'); dispatch({type:'ADD_ACTIVITY',entry:mkActivity('Approved AI Analytics Module PRD v1.2 release','Admin')})}}>Release Doc</Button>
                              <Button variant="ghost" size="sm" onClick={()=>{addToast('warning','Revision requested for security logs.');}}>Request Revision</Button>
                            </div>
                          </div>
                        </div>}
                      </div>

                      {/* Budget Hike */}
                      <div className="pm-approval-panel">
                        <div className="pm-approval-header" onClick={()=>setExpandedApp(p=>({...p,GovBud:!p.GovBud}))}>
                          <div className="pm-approval-header-left"><TrendingUp size={14} style={{color:'var(--color-success)'}}/>Budget Hike Requests<Badge variant="info">1</Badge></div>
                          {expandedApp.GovBud?<ChevronUp size={16} style={{color:'var(--text-muted)'}}/>:<ChevronDown size={16} style={{color:'var(--text-muted)'}}/>}
                        </div>
                        {expandedApp.GovBud&&<div className="pm-approval-body">
                          <div className="pm-approval-item">
                            <div style={{flex:1}}>
                              <div className="pm-approval-desc"><strong>[Mobile App Redesign]</strong> Additional ₹3.0 Lakhs requested for AWS GPU dev instances and third-party UI framework licensing.</div>
                              <div className="pm-approval-meta">Submitted by Sneha Patel (TL) · 3 hours ago</div>
                            </div>
                            <div className="pm-approval-actions">
                              <Button variant="primary" size="sm" onClick={()=>{
                                dispatch({
                                  type: 'ADD_ACTIVITY',
                                  entry: mkActivity('Approved ₹3.0L budget hike for Mobile App Redesign', 'Admin')
                                });
                                addToast('success','Budget hike of ₹3.0L approved.');
                                setExpandedApp(p=>({...p,GovBud:false}));
                              }}>Approve Hike</Button>
                              <Button variant="danger" size="sm" onClick={()=>{addToast('danger','Budget hike request rejected.');}}>Reject</Button>
                            </div>
                          </div>
                        </div>}
                      </div>
                    </div>
                  </div>

                  {/* Alerts & Notifications */}
                  <div className="pm-section-card">
                    <div className="pm-section-title"><Bell size={16}/>Active Notifications & Alerts</div>
                    <div style={{display:'flex',flexDirection:'column',gap:'var(--space-3)'}}>
                      {notifications.length===0&&<div style={{textAlign:'center',padding:24,color:'var(--text-muted)',fontSize:'0.875rem'}}>✓ No active notifications</div>}
                      {notifications.map(n=>(
                        <div key={n.id} className={`pm-alert-item pm-alert-${n.color}`}>
                          <NotifIcon color={n.color}/>
                          <div className="pm-alert-text"><div className="pm-alert-message">{n.message}</div><div className="pm-alert-time">{n.timestamp}</div></div>
                          <button className="pm-alert-dismiss" onClick={()=>dispatch({type:'DISMISS_NOTIF',id:n.id})} aria-label="Dismiss"><X size={14}/></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeDetailTab === 'activity' && (
                <div className="pm-tab-pane flex-column gap-4">
                  {/* Recent Activities */}
                  <div className="pm-section-card">
                    <div className="pm-section-title"><Activity size={16}/>Historical Activity Logs</div>
                    <div className="pm-activity-feed">
                      {activityFeed.map((e,idx)=>(
                        <div key={e.id||idx} className="pm-activity-item">
                          <ActIcon type={e.iconType} idx={idx}/>
                          <div className="pm-activity-content"><div className="pm-activity-desc">{e.action}</div><div className="pm-activity-meta">{e.actor} · {e.timestamp}</div></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      )}

      {/* ═══════════════════════════════ MODALS ═══════════════════════════════ */}

      {/* Add / Edit PM */}
      <Modal isOpen={addEditOpen} onClose={()=>setAddEditOpen(false)} title={editingPM?`Edit — ${editingPM.name}`:'Assign Manager'} size="lg"
        footer={<div style={{display:'flex',justifyContent:'flex-end',gap:8,width:'100%'}}><Button variant="ghost" onClick={()=>setAddEditOpen(false)}>Cancel</Button><Button variant="primary" onClick={savePM}>{editingPM?'Update Manager':'Save Manager'}</Button></div>}>
        <div className="pm-form-grid">
          <span className="pm-form-section-heading">Personal Information</span>
          <div className="pm-form-group"><label htmlFor="f-empid" className="pm-form-label">Employee ID</label><div className="pm-read-only-field" id="f-empid">{editingPM?editingPM.empId:`EMP-${210+pmList.length}`}</div></div>
          <div className="pm-form-group"><label htmlFor="f-name" className="pm-form-label">Full Name *</label><input id="f-name" type="text" placeholder="e.g. Rahul Sharma" className={formErr.name?'pm-form-input-err':''} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>{formErr.name&&<span className="pm-form-err-text">{formErr.name}</span>}</div>
          <div className="pm-form-group"><label htmlFor="f-phone" className="pm-form-label">Contact Number *</label><input id="f-phone" type="tel" placeholder="+91-9876543210" className={formErr.phone?'pm-form-input-err':''} value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}/>{formErr.phone&&<span className="pm-form-err-text">{formErr.phone}</span>}</div>
          <div className="pm-form-group"><label htmlFor="f-email" className="pm-form-label">Official Email *</label><input id="f-email" type="email" placeholder="name@enterprise.com" className={formErr.email?'pm-form-input-err':''} value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/>{formErr.email&&<span className="pm-form-err-text">{formErr.email}</span>}</div>
          <div className="pm-form-group"><label htmlFor="f-dept" className="pm-form-label">Department</label><select id="f-dept" value={form.department} onChange={e=>setForm(f=>({...f,department:e.target.value}))}><option>IT</option><option>Marketing</option><option>Sales</option><option>HR</option></select></div>
          <div className="pm-form-group"><label htmlFor="f-branch" className="pm-form-label">Branch / Agency</label><select id="f-branch" value={form.branch} onChange={e=>setForm(f=>({...f,branch:e.target.value}))}><option>Head Office</option><option>Branch Office</option><option>Agency</option></select></div>
          <div className="pm-form-group"><label htmlFor="f-desig" className="pm-form-label">Designation *</label><input id="f-desig" type="text" placeholder="e.g. Senior Manager" className={formErr.designation?'pm-form-input-err':''} value={form.designation} onChange={e=>setForm(f=>({...f,designation:e.target.value}))}/>{formErr.designation&&<span className="pm-form-err-text">{formErr.designation}</span>}</div>
          <div className="pm-form-group"><label htmlFor="f-join" className="pm-form-label">Joining Date</label><input id="f-join" type="date" value={form.joiningDate} onChange={e=>setForm(f=>({...f,joiningDate:e.target.value}))}/></div>
          <div className="pm-form-group"><label htmlFor="f-status" className="pm-form-label">Status</label><select id="f-status" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}><option>Active</option><option>On Leave</option><option>Training</option><option>Inactive</option><option>Suspended</option></select></div>
          <span className="pm-form-section-heading">Performance (Optional)</span>
          <div className="pm-form-group"><label htmlFor="f-sr" className="pm-form-label">Project Success Rate (0–100)</label><input id="f-sr" type="number" min={0} max={100} value={form.successRate} onChange={e=>setForm(f=>({...f,successRate:Number(e.target.value)}))}/></div>
          <div className="pm-form-group"><label htmlFor="f-pr" className="pm-form-label">Productivity Score (0–100)</label><input id="f-pr" type="number" min={0} max={100} value={form.productivity} onChange={e=>setForm(f=>({...f,productivity:Number(e.target.value)}))}/></div>
          <div className="pm-form-group"><label htmlFor="f-cs" className="pm-form-label">Client Satisfaction (0–10)</label><input id="f-cs" type="number" min={0} max={10} step={0.1} value={form.clientSatisfaction} onChange={e=>setForm(f=>({...f,clientSatisfaction:Number(e.target.value)}))}/></div>
        </div>
      </Modal>

      {/* Reject Remarks */}
      <Modal isOpen={!!rejectingItem} onClose={()=>{setRejectingItem(null);setRejectRemarks('');}} title="Reject Request" size="sm"
        footer={<div style={{display:'flex',justifyContent:'flex-end',gap:8,width:'100%'}}><Button variant="ghost" onClick={()=>{setRejectingItem(null);setRejectRemarks('');}}>Cancel</Button><Button variant="danger" onClick={rejectSubmit}>Confirm Rejection</Button></div>}>
        <div style={{display:'flex',flexDirection:'column',gap:'var(--space-3)'}}>
          <p style={{fontSize:'0.875rem',color:'var(--text-secondary)'}}>{rejectingItem?.description}</p>
          <div className="pm-form-group"><label htmlFor="rej-rmk" className="pm-form-label">Rejection Remarks *</label><textarea id="rej-rmk" rows={3} placeholder="Enter reason for rejection..." value={rejectRemarks} onChange={e=>setRejectRemarks(e.target.value)} style={{resize:'vertical'}}/></div>
        </div>
      </Modal>

      {/* Assign Project */}
      <Modal isOpen={assignProjOpen} onClose={()=>setAssignProjOpen(false)} title="Assign Project to PM" size="sm"
        footer={<div style={{display:'flex',justifyContent:'flex-end',gap:8,width:'100%'}}><Button variant="ghost" onClick={()=>setAssignProjOpen(false)}>Cancel</Button><Button variant="primary" onClick={()=>{if(!aPM||!aProj){addToast('danger','Select PM and project.');return;} dispatch({type:'ASSIGN_PROJECT',pmId:aPM,projectName:aProj}); setAssignProjOpen(false); setAPM(''); setAProj(''); addToast('success','Project assigned.');}}>Assign</Button></div>}>
        <div className="pm-quick-assign-body">
          <div className="pm-form-group"><label htmlFor="ap-pm" className="pm-form-label">Manager</label><select id="ap-pm" value={aPM} onChange={e=>setAPM(e.target.value)}><option value="">— Select PM —</option>{pmList.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div className="pm-form-group"><label htmlFor="ap-proj" className="pm-form-label">Project</label><select id="ap-proj" value={aProj} onChange={e=>setAProj(e.target.value)}><option value="">— Select Project —</option>{projects.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}<option value="AI Analytics Module">AI Analytics Module (New)</option></select></div>
        </div>
      </Modal>

      {/* Assign Team Leader */}
      <Modal isOpen={assignLeaderOpen} onClose={()=>setAssignLeaderOpen(false)} title="Assign Team Leader to PM" size="sm"
        footer={<div style={{display:'flex',justifyContent:'flex-end',gap:8,width:'100%'}}><Button variant="ghost" onClick={()=>setAssignLeaderOpen(false)}>Cancel</Button><Button variant="primary" onClick={()=>{if(!alPM||!aLead){addToast('danger','Select PM and team leader.');return;} dispatch({type:'ASSIGN_TEAM_LEADER',pmId:alPM,leaderName:aLead}); setAssignLeaderOpen(false); setALPM(''); setALead(''); addToast('success','Team Leader assigned.');}}>Assign</Button></div>}>
        <div className="pm-quick-assign-body">
          <div className="pm-form-group"><label htmlFor="al-pm" className="pm-form-label">Manager</label><select id="al-pm" value={alPM} onChange={e=>setALPM(e.target.value)}><option value="">— Select PM —</option>{pmList.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div className="pm-form-group"><label htmlFor="al-lead" className="pm-form-label">Team Leader</label><select id="al-lead" value={aLead} onChange={e=>setALead(e.target.value)}><option value="">— Select Leader —</option>{teamLeaders.map(tl=><option key={tl.id} value={tl.name}>{tl.name} ({tl.teamName})</option>)}</select></div>
        </div>
      </Modal>

      {/* Allocate Resources */}
      <Modal isOpen={allocateOpen} onClose={()=>setAllocateOpen(false)} title="Allocate Resources" size="sm"
        footer={<div style={{display:'flex',justifyContent:'flex-end',gap:8,width:'100%'}}><Button variant="ghost" onClick={()=>setAllocateOpen(false)}>Cancel</Button><Button variant="primary" onClick={()=>{if(!rPM){addToast('danger','Select a PM.');return;} const countVal = Number(document.getElementById('ra-count')?.value || 2); dispatch({type:'ALLOCATE_RESOURCES',pmId:rPM,headcount:countVal}); setAllocateOpen(false); setRPM(''); addToast('success','Resources allocated.');}}>Allocate</Button></div>}>
        <div className="pm-quick-assign-body">
          <div className="pm-form-group"><label htmlFor="ra-pm" className="pm-form-label">Manager</label><select id="ra-pm" value={rPM} onChange={e=>setRPM(e.target.value)}><option value="">— Select PM —</option>{pmList.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div className="pm-form-group"><label htmlFor="ra-type" className="pm-form-label">Resource Type</label><select id="ra-type"><option>Developer</option><option>UI/UX Designer</option><option>QA Engineer</option><option>DevOps Engineer</option><option>Business Analyst</option></select></div>
          <div className="pm-form-group"><label htmlFor="ra-count" className="pm-form-label">Headcount</label><input id="ra-count" type="number" min={1} max={20} defaultValue={2}/></div>
        </div>
      </Modal>

      {/* Generate Reports */}
      <Modal isOpen={reportOpen} onClose={()=>setReportOpen(false)} title="Generate Report" size="md"
        footer={<div style={{display:'flex',justifyContent:'flex-end',gap:8,width:'100%'}}><Button variant="ghost" onClick={()=>setReportOpen(false)}>Cancel</Button><Button variant="primary" icon={Download} loading={rLoading} onClick={generateReport}>{rLoading?'Generating...':'Generate & Download'}</Button></div>}>
        <div style={{display:'flex',flexDirection:'column',gap:'var(--space-4)'}}>
          <div className="pm-form-group"><label htmlFor="rpt-type" className="pm-form-label">Report Type</label><select id="rpt-type" value={rType} onChange={e=>setRType(e.target.value)}><optgroup label="PM Reports"><option>Manager Performance Report</option><option>Project Delivery Report</option><option>Budget Utilization Report</option></optgroup><optgroup label="Project Reports"><option>Project Progress Report</option><option>Milestone Report</option><option>Resource Utilization Report</option></optgroup><optgroup label="Team Reports"><option>Team Performance Report</option><option>Productivity Report</option></optgroup></select></div>
          <div><label className="pm-form-label">Export Format</label><div style={{display:'flex',gap:'var(--space-3)',marginTop:8}}>{['PDF','Excel','CSV'].map(fmt=><label key={fmt} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:'0.875rem',color:'var(--text-secondary)'}}><input type="radio" name="rpt-fmt" value={fmt} checked={rFmt===fmt} onChange={()=>setRFmt(fmt)} style={{width:'auto'}}/>{fmt}</label>)}</div></div>
          <div style={{background:'var(--bg-elevated)',borderRadius:'var(--radius-md)',padding:'var(--space-4)',fontSize:'0.82rem',color:'var(--text-muted)'}}>📄 <strong style={{color:'var(--text-primary)'}}>{rType}</strong> will be generated as <strong style={{color:'var(--text-primary)'}}>{rFmt}</strong> and downloaded automatically.</div>
        </div>
      </Modal>

      {/* Export */}
      <Modal isOpen={exportOpen} onClose={()=>setExportOpen(false)} title="Export PM Directory" size="sm"
        footer={<div style={{display:'flex',justifyContent:'flex-end',gap:8,width:'100%'}}><Button variant="ghost" onClick={()=>setExportOpen(false)}>Cancel</Button><Button variant="primary" icon={Download} onClick={()=>{setExportOpen(false);addToast('success',`Exported ${filtered.length} project managers to CSV.`);}}>Download CSV</Button></div>}>
        <div style={{display:'flex',flexDirection:'column',gap:'var(--space-3)'}}>
          <p style={{fontSize:'0.875rem',color:'var(--text-secondary)'}}>This will export <strong>{filtered.length}</strong> project managers (current filtered view) with all columns.</p>
          <div style={{background:'var(--bg-elevated)',borderRadius:'var(--radius-md)',padding:'var(--space-3)',fontSize:'0.78rem',color:'var(--text-muted)'}}>Columns: Employee ID, Name, Department, Branch, Designation, Active Projects, Team Members, Success Rate, Productivity, Client Satisfaction, Status</div>
        </div>
      </Modal>

      {/* View Team Modal */}
      <Modal isOpen={viewTeamOpen} onClose={()=>setViewTeamOpen(false)} title={`Team Members — ${selectedTL?.teamName || 'Team'}`} size="lg"
        footer={<div style={{display:'flex',justifyContent:'flex-end',width:'100%'}}><Button variant="ghost" onClick={()=>setViewTeamOpen(false)}>Close</Button></div>}>
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div style={{fontSize:'0.82rem',color:'var(--text-muted)'}}>Leader: <strong style={{color:'var(--text-primary)'}}>{selectedTL?.name}</strong> | Department: <strong style={{color:'var(--text-primary)'}}>{selectedTL?.department}</strong></div>
          <div style={{overflowX:'auto'}}>
            <table className="pm-dir-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Designation</th>
                  <th>Status</th>
                  <th>Productivity</th>
                  <th>Attendance</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {teamMembersList.map(member => (
                  <tr key={member.id}>
                    <td><div className="pm-name-cell"><Avatar name={member.name} size="sm"/><span style={{fontWeight:600}}>{member.name}</span></div></td>
                    <td>{member.designation}</td>
                    <td><Badge variant={member.status === 'Active' || member.status === 'Confirmed' ? 'success' : 'warning'}>{member.status || 'Active'}</Badge></td>
                    <td><Badge variant={getPerfBadge(member.productivityScore || 90)}>{member.productivityScore || 90}%</Badge></td>
                    <td><Badge variant={(member.attendanceStatus === 'Present' || member.attendanceStatus === 'Punched In') ? 'success' : 'warning'}>{member.attendanceStatus || 'Present'}</Badge></td>
                    <td><span style={{fontSize:'0.82rem',color:'var(--text-muted)'}}>{member.workEmail || member.email}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* Assign Work Modal */}
      <Modal isOpen={assignWorkOpen} onClose={()=>setAssignWorkOpen(false)} title={`Assign Task — ${selectedTL?.teamName || 'Team'}`} size="md"
        footer={<div style={{display:'flex',justifyContent:'flex-end',gap:8,width:'100%'}}><Button variant="ghost" onClick={()=>setAssignWorkOpen(false)}>Cancel</Button><Button variant="primary" onClick={handleAssignWork}>Assign Task</Button></div>}>
        <div className="pm-form-grid" style={{gridTemplateColumns:'1fr'}}>
          <div className="pm-form-group">
            <label htmlFor="w-assignee" className="pm-form-label">Assignee (Team Member) *</label>
            <select id="w-assignee" value={workAssignee} onChange={e=>setWorkAssignee(e.target.value)}>
              <option value="">— Select Member —</option>
              {teamMembersList.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.designation})</option>
              ))}
            </select>
          </div>
          <div className="pm-form-group">
            <label htmlFor="w-proj" className="pm-form-label">Associated Project *</label>
            <select id="w-proj" value={workProject} onChange={e=>setWorkProject(e.target.value)}>
              <option value="">— Select Project —</option>
              {pmProjects.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="pm-form-group">
            <label htmlFor="w-title" className="pm-form-label">Task Title *</label>
            <input id="w-title" type="text" placeholder="e.g. Implement dashboard widgets" value={workTitle} onChange={e=>setWorkTitle(e.target.value)}/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div className="pm-form-group">
              <label htmlFor="w-priority" className="pm-form-label">Priority</label>
              <select id="w-priority" value={workPriority} onChange={e=>setWorkPriority(e.target.value)}>
                <option>Critical</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
            <div className="pm-form-group">
              <label htmlFor="w-hours" className="pm-form-label">Est. Hours</label>
              <input id="w-hours" type="number" min={1} value={workHours} onChange={e=>setWorkHours(e.target.value)}/>
            </div>
          </div>
          <div className="pm-form-group">
            <label htmlFor="w-due" className="pm-form-label">Due Date</label>
            <input id="w-due" type="date" value={workDueDate} onChange={e=>setWorkDueDate(e.target.value)}/>
          </div>
          <div className="pm-form-group">
            <label htmlFor="w-desc" className="pm-form-label">Task Description</label>
            <textarea id="w-desc" rows={3} placeholder="Provide details about the deliverables..." value={workDesc} onChange={e=>setWorkDesc(e.target.value)} style={{resize:'vertical'}}/>
          </div>
        </div>
      </Modal>

      {/* Review Performance Modal */}
      <Modal isOpen={reviewLeaderOpen} onClose={()=>setReviewLeaderOpen(false)} title={`Review Performance — ${selectedTL?.name}`} size="sm"
        footer={<div style={{display:'flex',justifyContent:'flex-end',gap:8,width:'100%'}}><Button variant="ghost" onClick={()=>setReviewLeaderOpen(false)}>Cancel</Button><Button variant="primary" onClick={handleReviewLeader}>Save Review</Button></div>}>
        <div className="pm-quick-assign-body">
          <div className="pm-form-group">
            <label htmlFor="rev-prod" className="pm-form-label">Productivity Score (0–100): {revProductivity}%</label>
            <input id="rev-prod" type="range" min={0} max={100} value={revProductivity} onChange={e=>setRevProductivity(Number(e.target.value))} style={{width:'100%', padding: 0, border: 'none'}}/>
          </div>
          <div className="pm-form-group">
            <label htmlFor="rev-att" className="pm-form-label">Attendance Rate (0–100): {revAttendance}%</label>
            <input id="rev-att" type="range" min={0} max={100} value={revAttendance} onChange={e=>setRevAttendance(Number(e.target.value))} style={{width:'100%', padding: 0, border: 'none'}}/>
          </div>
          <div className="pm-form-group">
            <label htmlFor="rev-rating" className="pm-form-label">Overall Rating</label>
            <select id="rev-rating" value={revRating} onChange={e=>setRevRating(e.target.value)}>
              <option>Outstanding</option>
              <option>Excellent</option>
              <option>Good</option>
              <option>Average</option>
              <option>Needs Improvement</option>
            </select>
          </div>
          <div className="pm-form-group">
            <label htmlFor="rev-comments" className="pm-form-label">Manager Feedback</label>
            <textarea id="rev-comments" rows={2} placeholder="Add review notes..." value={revComments} onChange={e=>setRevComments(e.target.value)} style={{resize:'vertical'}}/>
          </div>
        </div>
      </Modal>

      {/* Transfer Team Modal */}
      <Modal isOpen={transferTeamOpen} onClose={()=>setTransferTeamOpen(false)} title={`Transfer Team — ${selectedTL?.teamName || ''}`} size="sm"
        footer={<div style={{display:'flex',justifyContent:'flex-end',gap:8,width:'100%'}}><Button variant="ghost" onClick={()=>setTransferTeamOpen(false)}>Cancel</Button><Button variant="primary" onClick={handleTransferLeader}>Confirm Transfer</Button></div>}>
        <div className="pm-quick-assign-body">
          <div style={{fontSize:'0.82rem',color:'var(--text-muted)',marginBottom:12}}>Transfer team leader <strong style={{color:'var(--text-primary)'}}>{selectedTL?.name}</strong> and their team to another Manager.</div>
          <div className="pm-form-group">
            <label htmlFor="tr-pm" className="pm-form-label">Target Manager *</label>
            <select id="tr-pm" value={transferTargetPM} onChange={e=>setTransferTargetPM(e.target.value)}>
              <option value="">— Select Target PM —</option>
              {pmList.filter(p => p.id !== selectedPM?.id).map(pm => (
                <option key={pm.id} value={pm.id}>{pm.name} ({pm.designation})</option>
              ))}
            </select>
          </div>
          <div className="pm-form-group">
            <label htmlFor="tr-reason" className="pm-form-label">Reason for Transfer</label>
            <textarea id="tr-reason" rows={2} placeholder="Enter transfer remarks..." value={transferReason} onChange={e=>setTransferReason(e.target.value)} style={{resize:'vertical'}}/>
          </div>
        </div>
      </Modal>

      {/* Project Detail Modal ("Project Card") */}
      <Modal 
        isOpen={projectDetailOpen} 
        onClose={() => { setProjectDetailOpen(false); setSelectedProject(null); }} 
        title={`Project Details — ${selectedProject?.id || 'Project'}`} 
        size="lg"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, width: '100%' }}>
            <Button variant="ghost" onClick={() => { setProjectDetailOpen(false); setSelectedProject(null); }}>Close</Button>
            <Button variant="primary" onClick={() => { setProjectDetailOpen(false); setSelectedProject(null); navigate('/projects'); }}>Go to Projects Module</Button>
          </div>
        }
      >
        {selectedProject && (
          <div className="pm-project-detail-popup">
            <div className="pm-proj-popup-header">
              <div>
                <h3 className="pm-proj-popup-title" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{selectedProject.name}</h3>
                <p className="pm-proj-popup-client" style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Client: <strong style={{ color: 'var(--text-primary)' }}>{selectedProject.clientName || 'N/A'}</strong></p>
              </div>
              <Badge variant={getProjBadge(selectedProject.status)}>{selectedProject.status}</Badge>
            </div>

            <div className="pm-proj-popup-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 16, margin: '20px 0', background: 'var(--bg-elevated)', padding: 16, borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Budget</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-primary)' }}>₹{selectedProject.budget || 0} Lakhs</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Team Leader</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{selectedProject.teamLeader}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Start Date</span>
                <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>{selectedProject.startDate}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>End Date</span>
                <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>{selectedProject.endDate}</span>
              </div>
            </div>

            <div className="pm-proj-popup-progress-section" style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.82rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Completion Progress</span>
                <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{selectedProject.progress}%</span>
              </div>
              <div className="pm-progress-bar" style={{ height: 8 }}>
                <div 
                  className="pm-progress-fill" 
                  style={{ 
                    width: `${selectedProject.progress}%`, 
                    background: selectedProject.progress === 100 ? 'var(--color-success)' : selectedProject.status === 'Delayed' ? 'var(--color-danger)' : 'var(--color-primary)' 
                  }} 
                />
              </div>
            </div>

            <div className="pm-proj-popup-tasks-section">
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8 }}>Active Project Deliverables</h4>
              <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <table className="pm-dir-table">
                  <thead>
                    <tr>
                      <th style={{ padding: '8px 12px' }}>Task</th>
                      <th style={{ padding: '8px 12px' }}>Assignee</th>
                      <th style={{ padding: '8px 12px' }}>Priority</th>
                      <th style={{ padding: '8px 12px' }}>Due Date</th>
                      <th style={{ padding: '8px 12px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectTasks.length > 0 ? (
                      projectTasks.map(t => (
                        <tr key={t.id}>
                          <td style={{ padding: '8px 12px', fontWeight: 500, fontSize: '0.82rem', color: 'var(--text-primary)' }}>{t.title || t.name}</td>
                          <td style={{ padding: '8px 12px', fontSize: '0.82rem' }}>{t.assigneeName || t.assignee}</td>
                          <td style={{ padding: '8px 12px' }}><Badge variant={getPriBadge(t.priority)}>{t.priority}</Badge></td>
                          <td style={{ padding: '8px 12px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t.dueDate || t.due}</td>
                          <td style={{ padding: '8px 12px' }}><Badge variant={t.status === 'Done' || t.status === 'done' ? 'success' : t.status === 'In Progress' ? 'info' : 'warning'}>{t.status}</Badge></td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                          No active deliverables listed for this project.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default Managers;
