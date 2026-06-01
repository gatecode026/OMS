// ─── Helper Generators ──────────────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtDate = (d) => {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,'0')} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
};

function genAttendanceHistory(seed) {
  const statuses = ['Present','Present','Present','Present','Late','Absent','On Leave','Work From Home','Overtime'];
  const res = [];
  const sources = ['Biometric', 'Web Portal', 'Mobile App'];
  for (let i = 29; i >= 0; i--) {
    const d = new Date('2026-05-29');
    d.setDate(d.getDate() - i);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const s = statuses[(seed + i) % statuses.length];
    
    let pIn = null;
    let pOut = null;
    let totalHours = 0;
    let breakTime = '0 mins';
    let overtime = '0 hrs';
    
    if (s === 'Present') {
      const minVal = String((seed * 3 + i * 7) % 15).padStart(2, '0');
      pIn = `08:${minVal} AM`;
      pOut = `05:${String((seed * 2 + i * 5) % 15 + 15).padStart(2, '0')} PM`;
      totalHours = 8.2;
      breakTime = '45 mins';
      overtime = '0 hrs';
    } else if (s === 'Late') {
      pIn = `10:${String((seed * 5 + i) % 15 + 15).padStart(2, '0')} AM`;
      pOut = `06:00 PM`;
      totalHours = 7.25;
      breakTime = '40 mins';
      overtime = '0 hrs';
    } else if (s === 'Work From Home') {
      pIn = '09:00 AM';
      pOut = '06:00 PM';
      totalHours = 8.0;
      breakTime = '60 mins';
      overtime = '0 hrs';
    } else if (s === 'Overtime') {
      pIn = '09:00 AM';
      pOut = '08:30 PM';
      totalHours = 10.5;
      breakTime = '45 mins';
      overtime = '2.5 hrs';
    }
    
    res.push({
      date: d.toISOString().split('T')[0],
      punchIn: pIn || '--:--',
      punchOut: pOut || '--:--',
      totalHours: totalHours,
      breakTime: breakTime,
      overtime: overtime,
      status: s,
      source: pIn ? sources[(seed + i) % sources.length] : '—'
    });
  }
  return res;
}

function genOvertimeHistory(seed) {
  const reasons = ['Critical server bug resolution', 'Deploying Nexus Platform update', 'Preparing quarterly board decks', 'System security audit follow-up'];
  const statuses = ['Approved', 'Pending', 'Rejected'];
  const dates = ['2026-05-28', '2026-05-25', '2026-05-20', '2026-05-15'];
  const count = 2 + (seed % 2);
  return Array.from({ length: count }, (_, i) => ({
    date: dates[i % dates.length],
    extraHours: 1.5 + (i * 0.5) + (seed % 2),
    reason: reasons[(seed + i) % reasons.length],
    status: statuses[(seed + i) % statuses.length]
  }));
}


function genLeaveHistory(seed, empId, empName) {
  const types = ['Casual Leave','Sick Leave','Annual Leave','Emergency Leave','Maternity Leave'];
  const statuses = ['Approved','Approved','Rejected','Pending'];
  const reasons = ['Medical appointment and rest','Personal work at home city','Family vacation trip','Attending sibling wedding','Post-surgery recovery'];
  const approvers = ['Aarav Sharma','Vikram Singh','Ananya Gupta'];
  const count = 3 + (seed % 3);
  return Array.from({ length: count }, (_, i) => {
    const mo = String(1 + ((seed + i) % 5)).padStart(2,'0');
    const d1 = String(5 + (seed % 10)).padStart(2,'0');
    const d2 = String(7 + (seed % 10)).padStart(2,'0');
    return {
      id: `LVH-${seed}-${i}`,
      employeeId: empId,
      employeeName: empName,
      type: types[(seed + i) % types.length],
      fromDate: `2026-${mo}-${d1}`,
      toDate: `2026-${mo}-${d2}`,
      days: 2 + (i % 3),
      reason: reasons[(seed + i) % reasons.length],
      status: statuses[(seed + i) % statuses.length],
      approvedBy: approvers[seed % 3],
      approvedDate: `2026-${mo}-${String(3 + seed % 3).padStart(2,'0')}`
    };
  });
}

function genTaskHistory(seed, empId, empName) {
  const titles = ['Implement auth flow','Fix production bug #334','Update API docs','Deploy to staging','Code review batch','Write unit tests','Design system mockups','Optimize DB queries','Setup CI pipeline','Refactor module X'];
  const projects = ['Project Aurora','Mercury Launch','Nexus Platform','Data Pipeline V2','UI Redesign 3.0'];
  const taskStatuses = ['Done','In Progress','To Do','Overdue','In Review','Cancelled'];
  const priorities = ['High','Medium','Low','Critical'];
  const count = 5 + (seed % 5);
  return Array.from({ length: count }, (_, i) => {
    const mo1 = String(1 + ((seed + i) % 4)).padStart(2,'0');
    const mo2 = String(2 + ((seed + i) % 4)).padStart(2,'0');
    const d1 = String(5 + ((seed * 2 + i) % 20)).padStart(2,'0');
    const d2 = String(10 + ((seed + i) % 15)).padStart(2,'0');
    const st = taskStatuses[(seed + i * 2) % taskStatuses.length];
    return {
      id: `TSK-H-${seed}-${i}`,
      title: titles[(seed + i) % titles.length],
      project: projects[(seed + i) % projects.length],
      assignedDate: `2026-${mo1}-${d1}`,
      dueDate: `2026-${mo2}-${d2}`,
      completionDate: st === 'Done' ? `2026-${mo2}-${String(parseInt(d2) - 2).padStart(2,'0')}` : null,
      priority: priorities[(seed + i) % priorities.length],
      status: st
    };
  });
}

function genPerformanceScore(seed) {
  const base = 65 + (seed % 30);
  return {
    overall: base,
    attendance: Math.min(100, base + (seed % 12)),
    taskCompletion: Math.min(100, base - 3 + (seed % 15)),
    reportSubmission: Math.min(100, base + 4 - (seed % 9)),
    leaveDiscipline: Math.min(100, base - 2 + (seed % 11)),
    monthly: [
      Math.max(50, base - 8), Math.max(50, base - 5), Math.max(50, base - 2),
      base, Math.min(100, base + 3), Math.min(100, base + 5)
    ]
  };
}

function genDocuments(seed, empName) {
  const categories = ['Offer Letter','Employment Contract','ID Proof','Payslip','Certificate','NDA'];
  const types = ['pdf','pdf','image','pdf','pdf'];
  const count = 2 + (seed % 3);
  return Array.from({ length: count }, (_, i) => {
    const cat = categories[(seed + i) % categories.length];
    return {
      id: `DOC-${seed}-${i}`,
      category: cat,
      fileName: `${cat.toLowerCase().replace(/ /g,'_')}_${empName.split(' ')[0].toLowerCase()}.pdf`,
      uploadDate: `2026-0${1 + (seed % 4)}-${String(10 + seed % 15).padStart(2,'0')}`,
      fileType: types[(seed + i) % types.length],
      downloadUrl: '#'
    };
  });
}

function genActivityLog(seed, empName) {
  const actions = ['Updated','Created','Status Changed','Updated','Updated','Deleted'];
  const fields = ['Designation','Email','Account Status','Department','Phone','Branch','Joining Date','Role'];
  const actors = ['Aarav Sharma (Super Admin)','Vikram Singh (Branch Admin)','System Cron','Ananya Gupta (Team Leader)'];
  const oldVals = ['Junior Engineer','old@email.com','Disabled','Marketing','555-0000','Mumbai'];
  const newVals = ['Senior Engineer','new@saas.io','Active','Engineering','98765 43210','Delhi'];
  const count = 5 + (seed % 5);
  return Array.from({ length: count }, (_, i) => ({
    id: `ACT-${seed}-${i}`,
    timestamp: `2026-05-${String(Math.max(1, 28 - i)).padStart(2,'0')} ${String(10 + i).padStart(2,'0')}:${String((seed * 7 + i) % 60).padStart(2,'0')}:00`,
    actor: actors[(seed + i) % actors.length],
    actionType: actions[(seed + i) % actions.length],
    fieldChanged: fields[(seed + i) % fields.length],
    oldValue: oldVals[(seed + i) % oldVals.length],
    newValue: newVals[(seed + i) % newVals.length],
    ip: `192.168.${seed % 10}.${(seed * 3 + i * 17) % 255}`
  }));
}

function enrichEmployee(emp, seed) {
  const [firstName, ...restParts] = emp.name.split(' ');
  const lastName = restParts.join('') || 'user';
  
  const empType = ['Full-Time', 'Part-Time', 'Contract', 'Internship'][seed % 4];
  const empStatus = seed % 5 === 0 ? 'Probation' : 'Confirmed';
  const probEnd = empStatus === 'Probation' ? '2026-08-30' : '';
  const contrEnd = empType === 'Contract' ? '2027-05-29' : '';
  
  const skillList = [
    [{ name: 'React', level: 'Expert' }, { name: 'Node.js', level: 'Intermediate' }, { name: 'Git', level: 'Expert' }],
    [{ name: 'Salesforce', level: 'Expert' }, { name: 'Negotiation', level: 'Expert' }],
    [{ name: 'Recruiting', level: 'Expert' }, { name: 'HR Policies', level: 'Expert' }],
    [{ name: 'Operations', level: 'Expert' }, { name: 'Project Management', level: 'Intermediate' }],
    [{ name: 'Figma', level: 'Expert' }, { name: 'CSS/HTML', level: 'Expert' }, { name: 'UX Research', level: 'Intermediate' }]
  ][seed % 5];

  const certList = [
    [{ name: 'AWS Certified Developer', expiryDate: '2027-12-31' }],
    [{ name: 'Certified Scrum Master', expiryDate: '2026-10-15' }],
    [{ name: 'Google UX Design Certificate', expiryDate: '2028-04-20' }],
    []
  ][seed % 4];

  const histList = [
    [
      { date: '2025-03-15', type: 'Promotion', details: 'Promoted to Senior designation' },
      { date: '2024-03-15', type: 'Salary Revision', details: '12% base salary hike' }
    ],
    [
      { date: '2024-09-01', type: 'Department Transfer', details: 'Transferred from IT Support to Engineering' }
    ],
    [
      { date: '2025-01-10', type: 'Role Change', details: 'Assigned as Team Coordinator' }
    ]
  ][seed % 3];

  const attStatus = ['Present','Present','Present','Late','Absent','On Leave','Work From Home','Overtime'][seed % 8];
  
  let todayPunchIn = null;
  let todayPunchOut = null;
  let todayWorkingHours = 0;
  let todayPunchStatus = 'Not Punched';
  let lastSeen = 'Yesterday 06:15 PM';

  if (attStatus === 'Present') {
    todayPunchIn = '09:02 AM';
    todayPunchOut = (seed % 9 === 0) ? null : '06:15 PM';
    todayWorkingHours = (seed % 9 === 0) ? 5.4 : 8.2;
    todayPunchStatus = (seed % 9 === 0) ? 'Missing Punch Out' : 'Punched In';
    lastSeen = 'Just now';
  } else if (attStatus === 'Late') {
    todayPunchIn = '10:15 AM';
    todayPunchOut = '06:30 PM';
    todayWorkingHours = 7.25;
    todayPunchStatus = 'Punched In';
    lastSeen = 'Just now';
  } else if (attStatus === 'Work From Home') {
    todayPunchIn = '09:00 AM';
    todayPunchOut = '06:00 PM';
    todayWorkingHours = 8.0;
    todayPunchStatus = 'Punched In';
    lastSeen = 'Just now';
  } else if (attStatus === 'Overtime') {
    todayPunchIn = '09:00 AM';
    todayPunchOut = '08:30 PM';
    todayWorkingHours = 10.5;
    todayPunchStatus = 'Punched In';
    lastSeen = 'Just now';
  }

  return {
    ...emp,
    workEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@saas.io`,
    designation: emp.designation || emp.role,
    attendanceStatus: attStatus,
    workStatus: ['Active','Active','In Meeting','Idle','Working','Offline'][(seed * 2) % 6],
    accountStatus: seed % 10 < 8 ? 'Active' : seed % 10 < 9 ? 'Disabled' : 'Suspended',
    teamLeader: emp.teamLeader || 'Ananya Gupta',
    projectManager: emp.projectManager || 'Vikram Singh',
    nationality: emp.nationality || 'Indian',
    personalEmail: `${firstName.toLowerCase()}${lastName.toLowerCase()}${seed}@gmail.com`,
    emergencyContactName: emp.emergencyContactName || 'Rajesh Sharma',
    emergencyContactPhone: emp.emergencyContactPhone || '+91 98000 11000',
    emergencyContactPhoneAlt: '+91 98000 22000',
    currentAddress: emp.currentAddress || `${10 + seed} MG Road, City, India - 40000${seed}`,
    permanentAddress: emp.permanentAddress || `${10 + seed} MG Road, City, India - 40000${seed}`,
    employmentType: emp.employmentType || empType,
    workLocation: emp.workLocation || emp.branch,
    attendanceHistory: genAttendanceHistory(seed),
    overtimeHistory: genOvertimeHistory(seed),
    leaveHistory: genLeaveHistory(seed, emp.id, emp.name),
    taskHistory: genTaskHistory(seed, emp.id, emp.name),
    performanceScore: genPerformanceScore(seed),
    documents: genDocuments(seed, emp.name),
    activityLog: genActivityLog(seed, emp.name),
    
    // New fields
    companyName: emp.companyName || (emp.email && emp.email.includes('enterprise.com') ? 'Enterprise Corp' : emp.email && emp.email.includes('saas.com') ? 'SaaS Global' : 'OM Enterprise'),
    branchAddress: emp.branchAddress || (() => {
      const name = (emp.branch || '').toLowerCase().trim();
      if (name.includes('delhi')) return 'Connaught Place, New Delhi - 110001';
      if (name.includes('mumbai')) return 'Bandra Kurla Complex, Mumbai - 400051';
      if (name.includes('bangalore') || name.includes('bengaluru')) return 'MG Road, Bangalore - 560001';
      return 'Malviya Nagar, Jaipur, Rajasthan 302017';
    })(),
    employeeType: empType,
    probationEndDate: probEnd,
    contractEndDate: contrEnd,
    employmentStatus: empStatus,
    bankName: ['HDFC Bank', 'ICICI Bank', 'SBI Bank', 'Axis Bank'][seed % 4],
    bankAccountNumber: `501009876${100 + seed}`,
    bankIfscCode: `HDFCB000${100 + seed}`,
    bankUpiId: `${firstName.toLowerCase()}@upi`,
    skills: skillList,
    certifications: certList,
    employmentHistory: histList,
    securityInfo: {
      lastLogin: `2026-05-29 1${seed % 6}:${20 + seed % 30}:05`,
      loginDevice: ['Windows 11 PC - Chrome', 'macOS - Safari', 'iPhone - Safari App', 'Android - Chrome'][seed % 4],
      loginLocation: ['Jaipur, India', 'Delhi, India', 'Mumbai, India', 'Bangalore, India'][seed % 4],
      failedAttempts: seed % 7 === 0 ? 1 : 0,
      mfaStatus: seed % 3 === 0 ? 'Disabled' : 'Enabled'
    },
    payrollSummary: {
      salaryStatus: seed % 3 === 0 ? 'Pending' : 'Processed',
      lastSalaryDate: '2026-04-30',
      upcomingPayrollDate: '2026-05-31',
      bonusHistory: [
        { date: '2025-12-31', amount: 5000 + (seed % 5) * 1000, reason: 'Annual Performance Bonus' }
      ]
    },
    productivityScore: 70 + (seed % 25),
    performanceRating: ['Needs Improvement', 'Average', 'Good', 'Excellent', 'Outstanding'][(seed % 4) + 1],
    leaveBalance: 12 + (seed % 10),
    currentProjectsCount: 1 + (seed % 3),
    experience: 1 + (seed % 10),
    shift: ['Morning (09:00 AM - 06:00 PM)', 'Night (10:00 PM - 07:00 AM)', 'Evening (02:00 PM - 11:00 PM)', 'Flexible (09:00 AM - 06:00 PM)'][seed % 4],
    todayPunchIn,
    todayPunchOut,
    todayWorkingHours,
    todayPunchStatus,
    lastSeen
  };
}

// ─── Roles ───────────────────────────────────────────────────────────────────
export const mockRoles = [
  {
    id: 'super_admin',
    name: 'Super Admin',
    description: 'Full system access to all branches, departments, billing, and settings.',
    userCount: 2,
    accentColor: '#2563eb',
    permissions: {
      dashboard: { create: true, read: true, update: true, delete: true },
      employees: { create: true, read: true, update: true, delete: true },
      attendance: { create: true, read: true, update: true, delete: true },
      leaves: { create: true, read: true, update: true, delete: true },
      tasks: { create: true, read: true, update: true, delete: true },
      payroll: { create: true, read: true, update: true, delete: true },
      permissions: { create: true, read: true, update: true, delete: true },
      settings: { create: true, read: true, update: true, delete: true }
    }
  },
  {
    id: 'branch_admin',
    name: 'Branch Admin',
    description: 'Access to employees, attendance, payroll, and tasks within the assigned branch.',
    userCount: 4,
    accentColor: '#7c3aed',
    permissions: {
      dashboard: { create: false, read: true, update: false, delete: false },
      employees: { create: true, read: true, update: true, delete: false },
      attendance: { create: true, read: true, update: true, delete: false },
      leaves: { create: true, read: true, update: true, delete: true },
      tasks: { create: true, read: true, update: true, delete: true },
      payroll: { create: true, read: true, update: true, delete: false },
      permissions: { create: false, read: true, update: false, delete: false },
      settings: { create: false, read: true, update: true, delete: false }
    }
  },
  {
    id: 'team_leader',
    name: 'Team Leader',
    description: 'Manage tasks, reviews, and attendance for assigned team members.',
    userCount: 8,
    accentColor: '#16a34a',
    permissions: {
      dashboard: { create: false, read: true, update: false, delete: false },
      employees: { create: false, read: true, update: false, delete: false },
      attendance: { create: false, read: true, update: false, delete: false },
      leaves: { create: false, read: true, update: true, delete: false },
      tasks: { create: true, read: true, update: true, delete: true },
      payroll: { create: false, read: false, update: false, delete: false },
      permissions: { create: false, read: false, update: false, delete: false },
      settings: { create: false, read: true, update: false, delete: false }
    }
  },
  {
    id: 'employee',
    name: 'Employee',
    description: 'Standard employee access to check own tasks, leave requests, attendance, and profile.',
    userCount: 48,
    accentColor: '#64748b',
    permissions: {
      dashboard: { create: false, read: true, update: false, delete: false },
      employees: { create: false, read: false, update: false, delete: false },
      attendance: { create: true, read: true, update: false, delete: false },
      leaves: { create: true, read: true, update: false, delete: false },
      tasks: { create: false, read: true, update: true, delete: false },
      payroll: { create: false, read: true, update: false, delete: false },
      permissions: { create: false, read: false, update: false, delete: false },
      settings: { create: false, read: true, update: false, delete: false }
    }
  }
];

// ─── Base Employee Records ───────────────────────────────────────────────────
const baseEmployees = [
  {
    id: 'EMP-2026-001', name: 'Aarav Sharma', email: 'aarav.sharma@saas.com',
    phone: '+91 98765 43210', dob: '1985-11-10', gender: 'Male',
    department: 'Operations', branch: 'Jaipur', team: 'Operations Core',
    role: 'Super Admin', roleId: 'super_admin', joinDate: '2022-03-15',
    status: 'Active', avatar: '', designation: 'Chief Operations Officer',
    teamLeader: 'Aarav Sharma', projectManager: 'Aarav Sharma',
    nationality: 'Indian', emergencyContactName: 'Priya Sharma', emergencyContactPhone: '+91 98001 00001',
    currentAddress: '12 Lal Kothi, Jaipur, Rajasthan - 302015', permanentAddress: '12 Lal Kothi, Jaipur, Rajasthan - 302015', employmentType: 'Full-Time', workLocation: 'Jaipur HQ'
  },
  {
    id: 'EMP-2026-002', name: 'Vikram Singh', email: 'vikram.singh@saas.com',
    phone: '+1 (555) 014-9821', dob: '1990-05-24', gender: 'Male',
    department: 'Engineering', branch: 'Delhi', team: 'Frontend Devs',
    role: 'Branch Admin', roleId: 'branch_admin', joinDate: '2023-01-10',
    status: 'Active', avatar: '', designation: 'Engineering Manager',
    teamLeader: 'Ananya Gupta', projectManager: 'Vikram Singh',
    nationality: 'Indian', emergencyContactName: 'Smita Singh', emergencyContactPhone: '+91 98765 10002',
    currentAddress: '45 MI Road, Jaipur, Rajasthan - 302001', permanentAddress: '45 MI Road, Jaipur, Rajasthan - 302001', employmentType: 'Full-Time', workLocation: 'Delhi Office'
  },
  {
    id: 'EMP-2026-003', name: 'Ananya Gupta', email: 'ananya.gupta@saas.com',
    phone: '+44 20 7946 0958', dob: '1992-08-14', gender: 'Female',
    department: 'Engineering', branch: 'Delhi', team: 'Frontend Devs',
    role: 'Team Leader', roleId: 'team_leader', joinDate: '2023-06-20',
    status: 'Active', avatar: '', designation: 'Senior Frontend Engineer',
    teamLeader: 'Ananya Gupta', projectManager: 'Vikram Singh',
    nationality: 'Indian', emergencyContactName: 'Rahul Gupta', emergencyContactPhone: '+91 98765 10003',
    currentAddress: '22 Sodala, Jaipur, Rajasthan - 302006', permanentAddress: '22 Sodala, Jaipur, Rajasthan - 302006', employmentType: 'Full-Time', workLocation: 'Delhi Office'
  },
  {
    id: 'EMP-2026-004', name: 'Rohit Sharma', email: 'rohit.sharma@saas.com',
    phone: '+1 (555) 017-3849', dob: '1988-02-28', gender: 'Male',
    department: 'Sales', branch: 'Delhi', team: 'Domestic Sales',
    role: 'Team Leader', roleId: 'team_leader', joinDate: '2022-10-05',
    status: 'Active', avatar: '', designation: 'Regional Sales Manager',
    teamLeader: 'Rohit Sharma', projectManager: 'Aarav Sharma',
    nationality: 'Indian', emergencyContactName: 'Ritu Sharma', emergencyContactPhone: '+91 98765 10004',
    currentAddress: '89 C-Scheme, Jaipur, Rajasthan - 302001', permanentAddress: '89 C-Scheme, Jaipur, Rajasthan - 302001', employmentType: 'Full-Time', workLocation: 'Delhi Office'
  },
  {
    id: 'EMP-2026-005', name: 'Priya Patel', email: 'priya.patel@saas.com',
    phone: '+81 3 5555 0143', dob: '1994-12-05', gender: 'Female',
    department: 'Marketing', branch: 'Mumbai', team: 'Digital Marketing',
    role: 'Branch Admin', roleId: 'branch_admin', joinDate: '2023-11-01',
    status: 'Active', avatar: '', designation: 'Marketing Director APAC',
    teamLeader: 'Priya Patel', projectManager: 'Aarav Sharma',
    nationality: 'Indian', emergencyContactName: 'Suresh Patel', emergencyContactPhone: '+91 98765 10005',
    currentAddress: '3-14 Tonk Road, Jaipur, Rajasthan - 302015', permanentAddress: '3-14 Tonk Road, Jaipur, Rajasthan - 302015', employmentType: 'Full-Time', workLocation: 'Mumbai Office'
  },
  {
    id: 'EMP-2026-006', name: 'Arjun Mehta', email: 'arjun.mehta@saas.com',
    phone: '+65 6789 0123', dob: '1991-04-18', gender: 'Male',
    department: 'Engineering', branch: 'Bangalore', team: 'Data Services',
    role: 'Employee', roleId: 'employee', joinDate: '2024-02-15',
    status: 'Active', avatar: '', designation: 'Data Engineer',
    teamLeader: 'Ananya Gupta', projectManager: 'Vikram Singh',
    nationality: 'Indian', emergencyContactName: 'Ravi Mehta', emergencyContactPhone: '+91 98765 10006',
    currentAddress: '88 JLN Marg, Jaipur, Rajasthan - 302017', permanentAddress: '88 JLN Marg, Jaipur, Rajasthan - 302017', employmentType: 'Full-Time', workLocation: 'Bangalore Office'
  },
  {
    id: 'EMP-2026-007', name: 'Neha Verma', email: 'neha.verma@saas.com',
    phone: '+33 1 42 27 78 90', dob: '1993-09-30', gender: 'Female',
    department: 'Human Resources', branch: 'Delhi', team: 'HR Operations',
    role: 'Employee', roleId: 'employee', joinDate: '2024-05-10',
    status: 'On Leave', avatar: '', designation: 'HR Business Partner',
    teamLeader: 'Vikram Singh', projectManager: 'Aarav Sharma',
    nationality: 'Indian', emergencyContactName: 'Amit Verma', emergencyContactPhone: '+91 98765 10007',
    currentAddress: '16 Bani Park, Jaipur, Rajasthan - 302016', permanentAddress: '16 Bani Park, Jaipur, Rajasthan - 302016', employmentType: 'Full-Time', workLocation: 'Delhi Office'
  },
  {
    id: 'EMP-2026-008', name: 'Deepak Joshi', email: 'deepak.joshi@saas.com',
    phone: '+1 (555) 012-4455', dob: '1987-07-22', gender: 'Male',
    department: 'Sales', branch: 'Delhi', team: 'Domestic Sales',
    role: 'Employee', roleId: 'employee', joinDate: '2023-08-12',
    status: 'Active', avatar: '', designation: 'Account Executive',
    teamLeader: 'Rohit Sharma', projectManager: 'Rohit Sharma',
    nationality: 'Indian', emergencyContactName: 'Sunita Joshi', emergencyContactPhone: '+91 98765 10008',
    currentAddress: '201 Vaishali Nagar, Jaipur, Rajasthan - 302021', permanentAddress: '201 Vaishali Nagar, Jaipur, Rajasthan - 302021', employmentType: 'Full-Time', workLocation: 'Delhi Office'
  },
  {
    id: 'EMP-2026-009', name: "Suresh Kumar", email: 'suresh.kumar@saas.com',
    phone: '+44 20 7946 0192', dob: '1995-10-12', gender: 'Male',
    department: 'Engineering', branch: 'Delhi', team: 'Frontend Devs',
    role: 'Employee', roleId: 'employee', joinDate: '2024-08-01',
    status: 'Active', avatar: '', designation: 'Frontend Developer',
    teamLeader: 'Ananya Gupta', projectManager: 'Vikram Singh',
    nationality: 'Indian', emergencyContactName: "Neelam Kumar", emergencyContactPhone: '+91 98765 10009',
    currentAddress: '7 Chitrakoot, Jaipur, Rajasthan - 302021', permanentAddress: '7 Chitrakoot, Jaipur, Rajasthan - 302021', employmentType: 'Full-Time', workLocation: 'Delhi Office'
  },
  {
    id: 'EMP-2026-010', name: 'Priya Sharma', email: 'priya.sharma@enterprise.com',
    phone: '+1 (555) 015-8833', dob: '1990-03-08', gender: 'Female',
    department: 'Marketing', branch: 'Delhi', team: 'Global Campaigns',
    role: 'Employee', roleId: 'employee', joinDate: '2023-04-18',
    status: 'Inactive', avatar: '', designation: 'Marketing Analyst',
    teamLeader: 'Rohit Sharma', projectManager: 'Priya Patel',
    nationality: 'Indian', emergencyContactName: 'Vikram Sharma', emergencyContactPhone: '+91 98765 10010',
    currentAddress: '55 Malviya Nagar, Jaipur, Rajasthan - 302017', permanentAddress: '55 Malviya Nagar, Jaipur, Rajasthan - 302017', employmentType: 'Part-Time', workLocation: 'Remote'
  },
  {
    id: 'EMP-2026-011', name: 'Riya Patel', email: 'riya.patel@enterprise.com',
    phone: '+91 98200 11011', dob: '1996-03-22', gender: 'Female',
    department: 'Engineering', branch: 'Jaipur', team: 'Backend Core',
    role: 'Employee', roleId: 'employee', joinDate: '2024-09-01',
    status: 'Active', avatar: '', designation: 'Backend Developer',
    teamLeader: 'Aarav Sharma', projectManager: 'Vikram Singh',
    nationality: 'Indian', emergencyContactName: 'Suresh Patel', emergencyContactPhone: '+91 98200 00011',
    currentAddress: '7 Civil Lines, Jaipur, Rajasthan - 302006', permanentAddress: '7 Civil Lines, Jaipur, Rajasthan - 302006', employmentType: 'Full-Time', workLocation: 'Jaipur HQ'
  },
  {
    id: 'EMP-2026-012', name: 'Manoj Tiwari', email: 'manoj.tiwari@saas.com',
    phone: '+44 20 7946 0212', dob: '1989-06-15', gender: 'Male',
    department: 'Operations', branch: 'Delhi', team: 'Ops Support',
    role: 'Employee', roleId: 'employee', joinDate: '2022-07-20',
    status: 'Active', avatar: '', designation: 'Operations Analyst',
    teamLeader: 'Vikram Singh', projectManager: 'Aarav Sharma',
    nationality: 'Indian', emergencyContactName: 'Pooja Tiwari', emergencyContactPhone: '+91 98765 10012',
    currentAddress: '33 Jagatpura, Jaipur, Rajasthan - 302017', permanentAddress: '33 Jagatpura, Jaipur, Rajasthan - 302017', employmentType: 'Full-Time', workLocation: 'Delhi Office'
  },
  {
    id: 'EMP-2026-013', name: 'Rahul Jain', email: 'rahul.jain@saas.com',
    phone: '+81 3 5555 0313', dob: '1993-01-09', gender: 'Male',
    department: 'Engineering', branch: 'Mumbai', team: 'Mobile Dev',
    role: 'Employee', roleId: 'employee', joinDate: '2023-03-15',
    status: 'Active', avatar: '', designation: 'Mobile Engineer',
    teamLeader: 'Priya Patel', projectManager: 'Vikram Singh',
    nationality: 'Indian', emergencyContactName: 'Vikas Jain', emergencyContactPhone: '+91 98765 10013',
    currentAddress: '5-9 Mansarovar, Jaipur, Rajasthan - 302020', permanentAddress: '5-9 Mansarovar, Jaipur, Rajasthan - 302020', employmentType: 'Full-Time', workLocation: 'Mumbai Office'
  },
  {
    id: 'EMP-2026-014', name: 'Pooja Yadav', email: 'pooja.yadav@saas.com',
    phone: '+65 6789 0414', dob: '1994-08-20', gender: 'Female',
    department: 'Marketing', branch: 'Bangalore', team: 'SEA Marketing',
    role: 'Employee', roleId: 'employee', joinDate: '2023-12-01',
    status: 'Active', avatar: '', designation: 'Digital Marketing Specialist',
    teamLeader: 'Priya Patel', projectManager: 'Priya Patel',
    nationality: 'Indian', emergencyContactName: 'Imran Yadav', emergencyContactPhone: '+91 98765 10014',
    currentAddress: '12 Vidhyadhar Nagar, Jaipur, Rajasthan - 302039', permanentAddress: '12 Vidhyadhar Nagar, Jaipur, Rajasthan - 302039', employmentType: 'Full-Time', workLocation: 'Bangalore Office'
  },
  {
    id: 'EMP-2026-015', name: 'Raj Mehta', email: 'raj.mehta@enterprise.com',
    phone: '+91 98300 11515', dob: '1991-11-28', gender: 'Male',
    department: 'Human Resources', branch: 'Jaipur', team: 'Talent Acquisition',
    role: 'Employee', roleId: 'employee', joinDate: '2022-05-10',
    status: 'Active', avatar: '', designation: 'Talent Acquisition Lead',
    teamLeader: 'Aarav Sharma', projectManager: 'Aarav Sharma',
    nationality: 'Indian', emergencyContactName: 'Anita Mehta', emergencyContactPhone: '+91 98300 00015',
    currentAddress: '5 Vaishali Nagar, Jaipur, Rajasthan - 302021', permanentAddress: '5 Vaishali Nagar, Jaipur, Rajasthan - 302021', employmentType: 'Full-Time', workLocation: 'Jaipur HQ'
  },
  {
    id: 'EMP-2026-016', name: 'Kavita Singh', email: 'kavita.singh@saas.com',
    phone: '+44 20 7946 0616', dob: '1997-05-14', gender: 'Female',
    department: 'Engineering', branch: 'Delhi', team: 'QA Team',
    role: 'Employee', roleId: 'employee', joinDate: '2026-04-28',
    status: 'Active', avatar: '', designation: 'QA Engineer',
    teamLeader: 'Ananya Gupta', projectManager: 'Vikram Singh',
    nationality: 'Indian', emergencyContactName: 'Arun Singh', emergencyContactPhone: '+91 98765 10016',
    currentAddress: '9 Pratap Nagar, Jaipur, Rajasthan - 302033', permanentAddress: '9 Pratap Nagar, Jaipur, Rajasthan - 302033', employmentType: 'Full-Time', workLocation: 'Delhi Office'
  },
  {
    id: 'EMP-2026-017', name: 'Amit Bose', email: 'amit.bose@saas.com',
    phone: '+65 6789 0717', dob: '1990-07-07', gender: 'Male',
    department: 'Engineering', branch: 'Bangalore', team: 'Cloud Infra',
    role: 'Employee', roleId: 'employee', joinDate: '2023-09-20',
    status: 'Active', avatar: '', designation: 'Cloud Infrastructure Engineer',
    teamLeader: 'Arjun Mehta', projectManager: 'Vikram Singh',
    nationality: 'Indian', emergencyContactName: 'Raj Bose', emergencyContactPhone: '+91 98765 10017',
    currentAddress: '22 Shyam Nagar, Jaipur, Rajasthan - 302019', permanentAddress: '22 Shyam Nagar, Jaipur, Rajasthan - 302019', employmentType: 'Full-Time', workLocation: 'Bangalore Office'
  },
  {
    id: 'EMP-2026-018', name: 'Sneha Reddy', email: 'sneha.reddy@saas.com',
    phone: '+1 (555) 018-8181', dob: '1995-02-18', gender: 'Female',
    department: 'Sales', branch: 'Delhi', team: 'Enterprise Sales',
    role: 'Employee', roleId: 'employee', joinDate: '2024-01-08',
    status: 'Active', avatar: '', designation: 'Enterprise Account Manager',
    teamLeader: 'Rohit Sharma', projectManager: 'Rohit Sharma',
    nationality: 'Indian', emergencyContactName: 'Kiran Reddy', emergencyContactPhone: '+91 98765 10018',
    currentAddress: '123 Lal Kothi, Jaipur, Rajasthan - 302015', permanentAddress: '123 Lal Kothi, Jaipur, Rajasthan - 302015', employmentType: 'Full-Time', workLocation: 'Delhi Office'
  },
  {
    id: 'EMP-2026-019', name: 'Mohd. Imran', email: 'mohd.imran@saas.com',
    phone: '+65 6789 0919', dob: '1988-09-03', gender: 'Male',
    department: 'Operations', branch: 'Bangalore', team: 'Ops Support',
    role: 'Employee', roleId: 'employee', joinDate: '2022-11-15',
    status: 'Active', avatar: '', designation: 'Operations Manager',
    teamLeader: 'Arjun Mehta', projectManager: 'Aarav Sharma',
    nationality: 'Indian', emergencyContactName: 'Zara Imran', emergencyContactPhone: '+91 98765 10019',
    currentAddress: '5 GT Bypass, Jaipur, Rajasthan - 302018', permanentAddress: '5 GT Bypass, Jaipur, Rajasthan - 302018', employmentType: 'Full-Time', workLocation: 'Bangalore Office'
  },
  {
    id: 'EMP-2026-020', name: 'Fatima Khan', email: 'fatima.khan@enterprise.com',
    phone: '+91 98400 12020', dob: '1993-12-12', gender: 'Female',
    department: 'Human Resources', branch: 'Jaipur', team: 'HR Operations',
    role: 'Employee', roleId: 'employee', joinDate: '2023-07-01',
    status: 'Active', avatar: '', designation: 'HR Generalist',
    teamLeader: 'Raj Mehta', projectManager: 'Aarav Sharma',
    nationality: 'Pakistani', emergencyContactName: 'Ali Khan', emergencyContactPhone: '+91 98400 00020',
    currentAddress: '14 Pink City, Jaipur, Rajasthan - 302003', permanentAddress: '14 Pink City, Jaipur, Rajasthan - 302003', employmentType: 'Full-Time', workLocation: 'Jaipur HQ'
  },
  {
    id: 'EMP-2026-021', name: 'Vijay Chauhan', email: 'vijay.chauhan@saas.com',
    phone: '+33 1 42 27 0221', dob: '1992-04-25', gender: 'Male',
    department: 'Marketing', branch: 'Delhi', team: 'Content Team',
    role: 'Employee', roleId: 'employee', joinDate: '2023-05-18',
    status: 'Active', avatar: '', designation: 'Content Strategist',
    teamLeader: 'Neha Verma', projectManager: 'Priya Patel',
    nationality: 'Indian', emergencyContactName: 'Anita Chauhan', emergencyContactPhone: '+91 98765 10021',
    currentAddress: '8 Raja Park, Jaipur, Rajasthan - 302004', permanentAddress: '8 Raja Park, Jaipur, Rajasthan - 302004', employmentType: 'Full-Time', workLocation: 'Delhi Office'
  },
  {
    id: 'EMP-2026-022', name: 'Sunita Rao', email: 'sunita.rao@enterprise.com',
    phone: '+91 98500 12222', dob: '1989-10-01', gender: 'Female',
    department: 'Engineering', branch: 'Jaipur', team: 'Backend Core',
    role: 'Employee', roleId: 'employee', joinDate: '2022-08-10',
    status: 'Active', avatar: '', designation: 'Senior Backend Engineer',
    teamLeader: 'Aarav Sharma', projectManager: 'Vikram Singh',
    nationality: 'Indian', emergencyContactName: 'Ramesh Rao', emergencyContactPhone: '+91 98500 00022',
    currentAddress: '22 Malviya Nagar, Jaipur, Rajasthan - 302017', permanentAddress: '22 Malviya Nagar, Jaipur, Rajasthan - 302017', employmentType: 'Full-Time', workLocation: 'Jaipur HQ'
  },
  {
    id: 'EMP-2026-023', name: 'Naveen Saxena', email: 'naveen.saxena@saas.com',
    phone: '+44 20 7946 0523', dob: '1994-07-30', gender: 'Male',
    department: 'Sales', branch: 'Delhi', team: 'UK Sales',
    role: 'Employee', roleId: 'employee', joinDate: '2024-03-10',
    status: 'Active', avatar: '', designation: 'Sales Development Rep',
    teamLeader: 'Rohit Sharma', projectManager: 'Rohit Sharma',
    nationality: 'Indian', emergencyContactName: 'Deepa Saxena', emergencyContactPhone: '+91 98765 10023',
    currentAddress: '67 Gandhi Path, Jaipur, Rajasthan - 302021', permanentAddress: '67 Gandhi Path, Jaipur, Rajasthan - 302021', employmentType: 'Full-Time', workLocation: 'Delhi Office'
  },
  {
    id: 'EMP-2026-024', name: 'Mei Lin', email: 'mei.lin@enterprise.com',
    phone: '+81 3 5555 0624', dob: '1996-01-14', gender: 'Female',
    department: 'Engineering', branch: 'Mumbai', team: 'Mobile Dev',
    role: 'Employee', roleId: 'employee', joinDate: '2025-01-06',
    status: 'Active', avatar: '', designation: 'iOS Developer',
    teamLeader: 'Rahul Jain', projectManager: 'Vikram Singh',
    nationality: 'Indian', emergencyContactName: 'Priyanka Bose', emergencyContactPhone: '+91 98765 10024',
    currentAddress: '2-8 Kukas, Jaipur, Rajasthan - 302028', permanentAddress: '2-8 Kukas, Jaipur, Rajasthan - 302028', employmentType: 'Full-Time', workLocation: 'Mumbai Office'
  },
  {
    id: 'EMP-2026-025', name: 'Ashok Mishra', email: 'ashok.mishra@saas.com',
    phone: '+1 (555) 025-2525', dob: '1990-06-06', gender: 'Male',
    department: 'Operations', branch: 'Delhi', team: 'US Ops',
    role: 'Employee', roleId: 'employee', joinDate: '2022-12-05',
    status: 'Active', avatar: '', designation: 'Operations Coordinator',
    teamLeader: 'Rohit Sharma', projectManager: 'Aarav Sharma',
    nationality: 'Indian', emergencyContactName: 'Maya Mishra', emergencyContactPhone: '+91 98765 10025',
    currentAddress: '300 Sitapura, Jaipur, Rajasthan - 302022', permanentAddress: '300 Sitapura, Jaipur, Rajasthan - 302022', employmentType: 'Full-Time', workLocation: 'Delhi Office'
  }
];

export const mockEmployees = baseEmployees.map((emp, i) => enrichEmployee(emp, i + 1));

// ─── Attendance Records ────────────────────────────────────────────────────────
export const mockAttendance = [
  { id: 'ATT-001', employeeId: 'EMP-2026-001', employeeName: 'Aarav Sharma', department: 'Operations', branch: 'Jaipur', date: '2026-05-29', punchIn: '08:45', punchOut: '17:15', totalHours: 8.5, status: 'Present' },
  { id: 'ATT-002', employeeId: 'EMP-2026-002', employeeName: 'Vikram Singh', department: 'Engineering', branch: 'Delhi', date: '2026-05-29', punchIn: '09:05', punchOut: '18:00', totalHours: 8.92, status: 'Present' },
  { id: 'ATT-003', employeeId: 'EMP-2026-003', employeeName: 'Ananya Gupta', department: 'Engineering', branch: 'Delhi', date: '2026-05-29', punchIn: '09:35', punchOut: '17:45', totalHours: 8.16, status: 'Late' },
  { id: 'ATT-004', employeeId: 'EMP-2026-004', employeeName: 'Rohit Sharma', department: 'Sales', branch: 'Delhi', date: '2026-05-29', punchIn: '08:55', punchOut: '17:05', totalHours: 8.16, status: 'Present' },
  { id: 'ATT-005', employeeId: 'EMP-2026-005', employeeName: 'Priya Patel', department: 'Marketing', branch: 'Mumbai', date: '2026-05-29', punchIn: '09:12', punchOut: '18:15', totalHours: 9.05, status: 'Late' },
  { id: 'ATT-006', employeeId: 'EMP-2026-006', employeeName: 'Arjun Mehta', department: 'Engineering', branch: 'Bangalore', date: '2026-05-29', punchIn: '08:50', punchOut: '13:00', totalHours: 4.16, status: 'Half Day' },
  { id: 'ATT-007', employeeId: 'EMP-2026-007', employeeName: 'Neha Verma', department: 'Human Resources', branch: 'Delhi', date: '2026-05-29', punchIn: '--:--', punchOut: '--:--', totalHours: 0, status: 'Absent' },
  { id: 'ATT-008', employeeId: 'EMP-2026-008', employeeName: 'Deepak Joshi', department: 'Sales', branch: 'Delhi', date: '2026-05-29', punchIn: '08:30', punchOut: '17:00', totalHours: 8.5, status: 'Present' },
  { id: 'ATT-009', employeeId: "EMP-2026-009", employeeName: "Suresh Kumar", department: 'Engineering', branch: 'Delhi', date: '2026-05-29', punchIn: '09:00', punchOut: '17:30', totalHours: 8.5, status: 'Present' },
  { id: 'ATT-101', employeeId: 'EMP-2026-001', employeeName: 'Aarav Sharma', department: 'Operations', branch: 'Jaipur', date: '2026-05-28', punchIn: '08:42', punchOut: '17:30', totalHours: 8.8, status: 'Present' },
  { id: 'ATT-102', employeeId: 'EMP-2026-002', employeeName: 'Vikram Singh', department: 'Engineering', branch: 'Delhi', date: '2026-05-28', punchIn: '08:58', punchOut: '18:15', totalHours: 9.28, status: 'Present' },
  { id: 'ATT-103', employeeId: 'EMP-2026-003', employeeName: 'Ananya Gupta', department: 'Engineering', branch: 'Delhi', date: '2026-05-28', punchIn: '09:10', punchOut: '17:50', totalHours: 8.66, status: 'Late' },
  { id: 'ATT-104', employeeId: 'EMP-2026-004', employeeName: 'Rohit Sharma', department: 'Sales', branch: 'Delhi', date: '2026-05-28', punchIn: '08:45', punchOut: '17:00', totalHours: 8.25, status: 'Present' },
  { id: 'ATT-107', employeeId: 'EMP-2026-007', employeeName: 'Neha Verma', department: 'Human Resources', branch: 'Delhi', date: '2026-05-28', punchIn: '--:--', punchOut: '--:--', totalHours: 0, status: 'Absent' }
];

// ─── Leave Requests ────────────────────────────────────────────────────────────
export const mockLeaveRequests = [
  {
    id: 'LR-001', employeeId: 'EMP-2026-007', employeeName: 'Neha Verma', department: 'Human Resources',
    type: 'Sick Leave', fromDate: '2026-05-28', toDate: '2026-05-30', days: 3,
    reason: 'Recovering from minor dental surgery. Medical certificate attached.',
    status: 'Approved', appliedDate: '2026-05-26',
    history: [{ date: '2026-05-26', status: 'Pending', comment: 'Applied by Neha Verma' }, { date: '2026-05-26', status: 'Approved', comment: 'Approved by Aarav Sharma' }],
    approverNotes: 'Get well soon, Sophia.'
  },
  {
    id: 'LR-002', employeeId: 'EMP-2026-006', employeeName: 'Arjun Mehta', department: 'Engineering',
    type: 'Annual Leave', fromDate: '2026-06-15', toDate: '2026-06-26', days: 10,
    reason: 'Family summer vacation and travel out of the country.',
    status: 'Pending', appliedDate: '2026-05-27',
    history: [{ date: '2026-05-27', status: 'Pending', comment: 'Applied by Arjun Mehta' }],
    approverNotes: ''
  },
  {
    id: 'LR-003', employeeId: 'EMP-2026-009', employeeName: "Suresh Kumar", department: 'Engineering',
    type: 'Casual Leave', fromDate: '2026-06-02', toDate: '2026-06-03', days: 2,
    reason: 'Personal errands and attending a family wedding.',
    status: 'Pending', appliedDate: '2026-05-28',
    history: [{ date: '2026-05-28', status: 'Pending', comment: "Applied by Suresh Kumar" }],
    approverNotes: ''
  },
  {
    id: 'LR-004', employeeId: 'EMP-2026-008', employeeName: 'Deepak Joshi', department: 'Sales',
    type: 'Casual Leave', fromDate: '2026-05-20', toDate: '2026-05-21', days: 2,
    reason: 'Moving to a new apartment in Brooklyn.',
    status: 'Rejected', appliedDate: '2026-05-15',
    history: [{ date: '2026-05-15', status: 'Pending', comment: 'Applied by Deepak Joshi' }, { date: '2026-05-16', status: 'Rejected', comment: 'Rejected by Aarav Sharma - Sales quota deadline.' }],
    approverNotes: 'Please reschedule to after the end of month sales review.'
  },
  {
    id: 'LR-005', employeeId: 'EMP-2026-002', employeeName: 'Vikram Singh', department: 'Engineering',
    type: 'Annual Leave', fromDate: '2026-07-10', toDate: '2026-07-15', days: 5,
    reason: 'Attending developer conference in Bangalore.',
    status: 'Pending', appliedDate: '2026-05-28',
    history: [{ date: '2026-05-28', status: 'Pending', comment: 'Applied by Vikram Singh' }],
    approverNotes: ''
  }
];

// ─── Tasks ─────────────────────────────────────────────────────────────────────
export const mockTasks = [
  { id: 'TSK-101', title: 'Design Dashboard UI Mockups', project: 'SaaS Platform', description: 'Create high-fidelity screens for the new landing page, overview dashboard, and user analytics pages.', assigneeId: 'EMP-2026-003', assigneeName: 'Ananya Gupta', priority: 'High', dueDate: '2026-05-25', status: 'In Review' },
  { id: 'TSK-102', title: 'Migrate State to Context API', project: 'SaaS Platform', description: 'Refactor standard props-drilling state management to a unified context manager.', assigneeId: 'EMP-2026-006', assigneeName: 'Arjun Mehta', priority: 'Critical', dueDate: '2026-05-27', status: 'In Progress' },
  { id: 'TSK-103', title: 'Write Technical Documentation', project: 'Engineering Operations', description: 'Document standard API response designs, mock schemas, developer onboarding steps.', assigneeId: 'EMP-2026-009', assigneeName: "Suresh Kumar", priority: 'Medium', dueDate: '2026-05-24', status: 'To Do' },
  { id: 'TSK-104', title: 'Conduct Employee Performance Audits', project: 'HR System', description: 'Perform biannual reviews of all departments, check KPI scores, and update leaderboards.', assigneeId: 'EMP-2026-007', assigneeName: 'Neha Verma', priority: 'Low', dueDate: '2026-05-18', status: 'Done' },
  { id: 'TSK-105', title: 'Optimize Core Recharts Gradients', project: 'SaaS Platform', description: 'Update the main dashboard charts with smooth CSS gradients and custom tooltips.', assigneeId: 'EMP-2026-002', assigneeName: 'Vikram Singh', priority: 'High', dueDate: '2026-05-28', status: 'To Do' },
  { id: 'TSK-106', title: 'Finalize Q2 Sales Strategy', project: 'Marketing Outreach', description: 'Build pitch decks, analyze competitor campaigns, coordinate regional sales targets.', assigneeId: 'EMP-2026-004', assigneeName: 'Rohit Sharma', priority: 'High', dueDate: '2026-05-30', status: 'In Progress' }
];

// ─── Payroll ───────────────────────────────────────────────────────────────────
export const mockPayroll = [
  { id: 'PAY-001', employeeId: 'EMP-2026-001', employeeName: 'Aarav Sharma', department: 'Operations', baseSalary: 125000, allowances: 15000, deductions: 8000, netPay: 132000, status: 'Paid' },
  { id: 'PAY-002', employeeId: 'EMP-2026-002', employeeName: 'Vikram Singh', department: 'Engineering', baseSalary: 85000, allowances: 10000, deductions: 5000, netPay: 90000, status: 'Paid' },
  { id: 'PAY-003', employeeId: 'EMP-2026-003', employeeName: 'Ananya Gupta', department: 'Engineering', baseSalary: 72000, allowances: 8000, deductions: 4500, netPay: 75500, status: 'Paid' },
  { id: 'PAY-004', employeeId: 'EMP-2026-004', employeeName: 'Rohit Sharma', department: 'Sales', baseSalary: 68000, allowances: 25000, deductions: 4000, netPay: 89000, status: 'Pending' },
  { id: 'PAY-005', employeeId: 'EMP-2026-005', employeeName: 'Priya Patel', department: 'Marketing', baseSalary: 65000, allowances: 6000, deductions: 3500, netPay: 67500, status: 'Pending' },
  { id: 'PAY-006', employeeId: 'EMP-2026-006', employeeName: 'Arjun Mehta', department: 'Engineering', baseSalary: 55000, allowances: 5000, deductions: 3000, netPay: 57000, status: 'Pending' },
  { id: 'PAY-007', employeeId: 'EMP-2026-007', employeeName: 'Neha Verma', department: 'Human Resources', baseSalary: 58000, allowances: 5000, deductions: 3000, netPay: 60000, status: 'Pending' }
];

// ─── Notifications ─────────────────────────────────────────────────────────────
export const mockNotifications = [
  { id: 'NTF-001', type: 'warning', message: 'New leave request from Arjun Mehta requires your approval.', timestamp: '5 minutes ago', read: false },
  { id: 'NTF-002', type: 'error', message: 'Task "Design Dashboard UI Mockups" is overdue by 4 days!', timestamp: '1 hour ago', read: false },
  { id: 'NTF-003', type: 'success', message: 'Monthly payroll for Engineering department processed successfully.', timestamp: '2 hours ago', read: false },
  { id: 'NTF-004', type: 'info', message: 'Company-wide Announcement: CEO Townhall scheduled for June 5th.', timestamp: '1 day ago', read: true },
  { id: 'NTF-005', type: 'success', message: 'Employee directory updated. Neha Verma set to status "On Leave".', timestamp: '2 days ago', read: true }
];

// ─── Activity Logs ─────────────────────────────────────────────────────────────
export const mockActivityLogs = [
  { id: 'LOG-001', employeeName: 'Aarav Sharma', department: 'Operations', action: 'Approved leave request for Neha Verma', module: 'Leaves', timestamp: '5 minutes ago', status: 'success' },
  { id: 'LOG-002', employeeName: 'Vikram Singh', department: 'Engineering', action: 'Created task "Optimize Core Recharts Gradients"', module: 'Tasks', timestamp: '15 minutes ago', status: 'success' },
  { id: 'LOG-003', employeeName: 'Arjun Mehta', department: 'Engineering', action: 'Submitted leave request (10 days)', module: 'Leaves', timestamp: '30 minutes ago', status: 'warning' },
  { id: 'LOG-004', employeeName: 'System Cron', department: 'Operations', action: 'Flagged task "Design Dashboard UI Mockups" as Overdue', module: 'Tasks', timestamp: '1 hour ago', status: 'danger' },
  { id: 'LOG-005', employeeName: 'Rohit Sharma', department: 'Sales', action: 'Punched In (Late)', module: 'Attendance', timestamp: '2 hours ago', status: 'warning' },
  { id: 'LOG-006', employeeName: 'Neha Verma', department: 'Human Resources', action: 'Updated profile contact details', module: 'Employees', timestamp: '3 hours ago', status: 'success' },
  { id: 'LOG-007', employeeName: 'Priya Patel', department: 'Marketing', action: 'Punched In (On Time)', module: 'Attendance', timestamp: '4 hours ago', status: 'success' },
  { id: 'LOG-008', employeeName: 'Ananya Gupta', department: 'Engineering', action: 'Moved task "Design Dashboard UI Mockups" to In Review', module: 'Tasks', timestamp: '5 hours ago', status: 'success' },
  { id: 'LOG-009', employeeName: 'Aarav Sharma', department: 'Operations', action: 'Modified permissions for role "Branch Admin"', module: 'Administration', timestamp: '1 day ago', status: 'success' },
  { id: 'LOG-010', employeeName: "Suresh Kumar", department: 'Engineering', action: 'Punched Out (08.50 hours)', module: 'Attendance', timestamp: '1 day ago', status: 'success' }
];
