// ─── Helper Generators ──────────────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtDate = (d) => {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,'0')} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
};

function genAttendanceHistory(seed) {
  const statuses = ['Present','Present','Present','Present','Late','Absent','On Leave','Work From Home'];
  const res = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date('2026-05-29');
    d.setDate(d.getDate() - i);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const s = statuses[(seed + i) % statuses.length];
    const hr = 8 + (seed % 2);
    const min = String((seed * 3 + i * 7) % 45).padStart(2,'0');
    const pIn = s === 'Present' ? `${hr}:${min}` : s === 'Late' ? `10:${String((seed * 5 + i) % 30 + 15).padStart(2,'0')}` : s === 'Work From Home' ? '09:00' : null;
    const pOut = pIn ? '18:00' : null;
    res.push({ date: d.toISOString().split('T')[0], punchIn: pIn, punchOut: pOut, totalHours: pIn ? 9 : 0, status: s });
  }
  return res;
}

function genLeaveHistory(seed, empId, empName) {
  const types = ['Casual Leave','Sick Leave','Annual Leave','Emergency Leave','Maternity Leave'];
  const statuses = ['Approved','Approved','Rejected','Pending'];
  const reasons = ['Medical appointment and rest','Personal work at home city','Family vacation trip','Attending sibling wedding','Post-surgery recovery'];
  const approvers = ['Aarav Sharma','John Miller','Elena Rostova'];
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
  const actors = ['Aarav Sharma (Super Admin)','John Miller (Branch Admin)','System Cron','Elena Rostova (Team Leader)'];
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
  return {
    ...emp,
    workEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@saas.io`,
    designation: emp.designation || emp.role,
    attendanceStatus: ['Present','Present','Present','Late','Absent','On Leave','Work From Home'][seed % 7],
    workStatus: ['Active','Active','In Meeting','Idle','Working','Offline'][(seed * 2) % 6],
    accountStatus: seed % 10 < 8 ? 'Active' : seed % 10 < 9 ? 'Disabled' : 'Suspended',
    teamLeader: emp.teamLeader || 'Elena Rostova',
    projectManager: emp.projectManager || 'John Miller',
    nationality: emp.nationality || 'Indian',
    personalEmail: `${firstName.toLowerCase()}${lastName.toLowerCase()}${seed}@gmail.com`,
    emergencyContactName: emp.emergencyContactName || 'Rajesh Sharma',
    emergencyContactPhone: emp.emergencyContactPhone || '+91 98000 11000',
    currentAddress: emp.currentAddress || `${10 + seed} MG Road, City, India - 40000${seed}`,
    permanentAddress: emp.permanentAddress || `${10 + seed} MG Road, City, India - 40000${seed}`,
    employmentType: emp.employmentType || 'Full-Time',
    workLocation: emp.workLocation || emp.branch,
    attendanceHistory: genAttendanceHistory(seed),
    leaveHistory: genLeaveHistory(seed, emp.id, emp.name),
    taskHistory: genTaskHistory(seed, emp.id, emp.name),
    performanceScore: genPerformanceScore(seed),
    documents: genDocuments(seed, emp.name),
    activityLog: genActivityLog(seed, emp.name)
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
    currentAddress:
    permanentAddress: '12 Lal Kothi, Jaipur, Rajasthan - 302015', employmentType: 'Full-Time', workLocation: 'Jaipur HQ'
  },
  {
    id: 'EMP-2026-002', name: 'John Miller', email: 'john.miller@enterprise.com',
    phone: '+1 (555) 014-9821', dob: '1990-05-24', gender: 'Male',
    department: 'Engineering', branch: 'London', team: 'Frontend Devs',
    role: 'Branch Admin', roleId: 'branch_admin', joinDate: '2023-01-10',
    status: 'Active', avatar: '', designation: 'Engineering Manager',
    teamLeader: 'Elena Rostova', projectManager: 'John Miller',
    nationality: 'American', emergencyContactName: 'Sarah Miller', emergencyContactPhone: '+1 555 014 0002',
    currentAddress:
    permanentAddress: '45 Baker Street, London, UK - W1U 7BH', employmentType: 'Full-Time', workLocation: 'London Office'
  },
  {
    id: 'EMP-2026-003', name: 'Elena Rostova', email: 'elena.rostova@enterprise.com',
    phone: '+44 20 7946 0958', dob: '1992-08-14', gender: 'Female',
    department: 'Engineering', branch: 'London', team: 'Frontend Devs',
    role: 'Team Leader', roleId: 'team_leader', joinDate: '2023-06-20',
    status: 'Active', avatar: '', designation: 'Senior Frontend Engineer',
    teamLeader: 'Elena Rostova', projectManager: 'John Miller',
    nationality: 'Russian', emergencyContactName: 'Ivan Rostov', emergencyContactPhone: '+44 20 7946 0003',
    currentAddress:
    permanentAddress: '22 Oxford Street, London, UK - W1C 1AB', employmentType: 'Full-Time', workLocation: 'London Office'
  },
  {
    id: 'EMP-2026-004', name: 'Marcus Vance', email: 'marcus.vance@enterprise.com',
    phone: '+1 (555) 017-3849', dob: '1988-02-28', gender: 'Male',
    department: 'Sales', branch: 'New York', team: 'US Sales East',
    role: 'Team Leader', roleId: 'team_leader', joinDate: '2022-10-05',
    status: 'Active', avatar: '', designation: 'Regional Sales Manager',
    teamLeader: 'Marcus Vance', projectManager: 'Aarav Sharma',
    nationality: 'American', emergencyContactName: 'Lisa Vance', emergencyContactPhone: '+1 555 017 0004',
    currentAddress:
    permanentAddress: '89 5th Ave, New York, NY - 10003', employmentType: 'Full-Time', workLocation: 'New York Office'
  },
  {
    id: 'EMP-2026-005', name: 'Aiko Tanaka', email: 'aiko.tanaka@enterprise.com',
    phone: '+81 3 5555 0143', dob: '1994-12-05', gender: 'Female',
    department: 'Marketing', branch: 'Tokyo', team: 'APAC Marketing',
    role: 'Branch Admin', roleId: 'branch_admin', joinDate: '2023-11-01',
    status: 'Active', avatar: '', designation: 'Marketing Director APAC',
    teamLeader: 'Aiko Tanaka', projectManager: 'Aarav Sharma',
    nationality: 'Japanese', emergencyContactName: 'Hiroshi Tanaka', emergencyContactPhone: '+81 3 5555 0005',
    currentAddress:
    permanentAddress: '3-14 Shinjuku, Tokyo - 160-0022', employmentType: 'Full-Time', workLocation: 'Tokyo Office'
  },
  {
    id: 'EMP-2026-006', name: 'David Kim', email: 'david.kim@enterprise.com',
    phone: '+65 6789 0123', dob: '1991-04-18', gender: 'Male',
    department: 'Engineering', branch: 'Singapore', team: 'Data Services',
    role: 'Employee', roleId: 'employee', joinDate: '2024-02-15',
    status: 'Active', avatar: '', designation: 'Data Engineer',
    teamLeader: 'Elena Rostova', projectManager: 'John Miller',
    nationality: 'Korean', emergencyContactName: 'Min Kim', emergencyContactPhone: '+65 6789 0006',
    currentAddress:
    permanentAddress: '88 Marina Bay, Singapore - 018981', employmentType: 'Full-Time', workLocation: 'Singapore Office'
  },
  {
    id: 'EMP-2026-007', name: 'Sophia Laurent', email: 'sophia.laurent@enterprise.com',
    phone: '+33 1 42 27 78 90', dob: '1993-09-30', gender: 'Female',
    department: 'Human Resources', branch: 'London', team: 'HR Operations',
    role: 'Employee', roleId: 'employee', joinDate: '2024-05-10',
    status: 'On Leave', avatar: '', designation: 'HR Business Partner',
    teamLeader: 'John Miller', projectManager: 'Aarav Sharma',
    nationality: 'French', emergencyContactName: 'Pierre Laurent', emergencyContactPhone: '+33 1 42 27 0007',
    currentAddress:
    permanentAddress: '16 Rue de la Paix, London, UK - EC1A 1BB', employmentType: 'Full-Time', workLocation: 'London Office'
  },
  {
    id: 'EMP-2026-008', name: 'Carlos Mendez', email: 'carlos.mendez@enterprise.com',
    phone: '+1 (555) 012-4455', dob: '1987-07-22', gender: 'Male',
    department: 'Sales', branch: 'New York', team: 'US Sales East',
    role: 'Employee', roleId: 'employee', joinDate: '2023-08-12',
    status: 'Active', avatar: '', designation: 'Account Executive',
    teamLeader: 'Marcus Vance', projectManager: 'Marcus Vance',
    nationality: 'Mexican', emergencyContactName: 'Rosa Mendez', emergencyContactPhone: '+1 555 012 0008',
    currentAddress:
    permanentAddress: '201 Brooklyn Ave, New York, NY - 11213', employmentType: 'Full-Time', workLocation: 'New York Office'
  },
  {
    id: 'EMP-2026-009', name: "Liam O'Connor", email: 'liam.oconnor@enterprise.com',
    phone: '+44 20 7946 0192', dob: '1995-10-12', gender: 'Male',
    department: 'Engineering', branch: 'London', team: 'Frontend Devs',
    role: 'Employee', roleId: 'employee', joinDate: '2024-08-01',
    status: 'Active', avatar: '', designation: 'Frontend Developer',
    teamLeader: 'Elena Rostova', projectManager: 'John Miller',
    nationality: 'Irish', emergencyContactName: "Siobhan O'Connor", emergencyContactPhone: '+44 20 7946 0009',
    currentAddress:
    permanentAddress: '7 Camden High St, London, UK - NW1 7JE', employmentType: 'Full-Time', workLocation: 'London Office'
  },
  {
    id: 'EMP-2026-010', name: 'Priya Sharma', email: 'priya.sharma@enterprise.com',
    phone: '+1 (555) 015-8833', dob: '1990-03-08', gender: 'Female',
    department: 'Marketing', branch: 'New York', team: 'Global Campaigns',
    role: 'Employee', roleId: 'employee', joinDate: '2023-04-18',
    status: 'Inactive', avatar: '', designation: 'Marketing Analyst',
    teamLeader: 'Marcus Vance', projectManager: 'Aiko Tanaka',
    nationality: 'Indian', emergencyContactName: 'Vikram Sharma', emergencyContactPhone: '+1 555 015 0010',
    currentAddress:
    permanentAddress: '55 Park Ave, New York, NY - 10016', employmentType: 'Part-Time', workLocation: 'Remote'
  },
  {
    id: 'EMP-2026-011', name: 'Riya Patel', email: 'riya.patel@enterprise.com',
    phone: '+91 98200 11011', dob: '1996-03-22', gender: 'Female',
    department: 'Engineering', branch: 'Jaipur', team: 'Backend Core',
    role: 'Employee', roleId: 'employee', joinDate: '2024-09-01',
    status: 'Active', avatar: '', designation: 'Backend Developer',
    teamLeader: 'Aarav Sharma', projectManager: 'John Miller',
    nationality: 'Indian', emergencyContactName: 'Suresh Patel', emergencyContactPhone: '+91 98200 00011',
    currentAddress:
    permanentAddress: '7 Civil Lines, Jaipur, Rajasthan - 302006', employmentType: 'Full-Time', workLocation: 'Jaipur HQ'
  },
  {
    id: 'EMP-2026-012', name: 'Tom Harrison', email: 'tom.harrison@enterprise.com',
    phone: '+44 20 7946 0212', dob: '1989-06-15', gender: 'Male',
    department: 'Operations', branch: 'London', team: 'Ops Support',
    role: 'Employee', roleId: 'employee', joinDate: '2022-07-20',
    status: 'Active', avatar: '', designation: 'Operations Analyst',
    teamLeader: 'John Miller', projectManager: 'Aarav Sharma',
    nationality: 'British', emergencyContactName: 'Jane Harrison', emergencyContactPhone: '+44 20 7946 0012',
    currentAddress:
    permanentAddress: '33 Canary Wharf, London, UK - E14 5AB', employmentType: 'Full-Time', workLocation: 'London Office'
  },
  {
    id: 'EMP-2026-013', name: 'Kenji Nakamura', email: 'kenji.nakamura@enterprise.com',
    phone: '+81 3 5555 0313', dob: '1993-01-09', gender: 'Male',
    department: 'Engineering', branch: 'Tokyo', team: 'Mobile Dev',
    role: 'Employee', roleId: 'employee', joinDate: '2023-03-15',
    status: 'Active', avatar: '', designation: 'Mobile Engineer',
    teamLeader: 'Aiko Tanaka', projectManager: 'John Miller',
    nationality: 'Japanese', emergencyContactName: 'Yuki Nakamura', emergencyContactPhone: '+81 3 5555 0013',
    currentAddress:
    permanentAddress: '5-9 Akihabara, Tokyo - 101-0021', employmentType: 'Full-Time', workLocation: 'Tokyo Office'
  },
  {
    id: 'EMP-2026-014', name: 'Amira Hassan', email: 'amira.hassan@enterprise.com',
    phone: '+65 6789 0414', dob: '1994-08-20', gender: 'Female',
    department: 'Marketing', branch: 'Singapore', team: 'SEA Marketing',
    role: 'Employee', roleId: 'employee', joinDate: '2023-12-01',
    status: 'Active', avatar: '', designation: 'Digital Marketing Specialist',
    teamLeader: 'Aiko Tanaka', projectManager: 'Aiko Tanaka',
    nationality: 'Egyptian', emergencyContactName: 'Omar Hassan', emergencyContactPhone: '+65 6789 0014',
    currentAddress:
    permanentAddress: '12 Orchard Road, Singapore - 238895', employmentType: 'Full-Time', workLocation: 'Singapore Office'
  },
  {
    id: 'EMP-2026-015', name: 'Raj Mehta', email: 'raj.mehta@enterprise.com',
    phone: '+91 98300 11515', dob: '1991-11-28', gender: 'Male',
    department: 'Human Resources', branch: 'Jaipur', team: 'Talent Acquisition',
    role: 'Employee', roleId: 'employee', joinDate: '2022-05-10',
    status: 'Active', avatar: '', designation: 'Talent Acquisition Lead',
    teamLeader: 'Aarav Sharma', projectManager: 'Aarav Sharma',
    nationality: 'Indian', emergencyContactName: 'Anita Mehta', emergencyContactPhone: '+91 98300 00015',
    currentAddress:
    permanentAddress: '5 Vaishali Nagar, Jaipur, Rajasthan - 302021', employmentType: 'Full-Time', workLocation: 'Jaipur HQ'
  },
  {
    id: 'EMP-2026-016', name: 'Nadia Volkova', email: 'nadia.volkova@enterprise.com',
    phone: '+44 20 7946 0616', dob: '1997-05-14', gender: 'Female',
    department: 'Engineering', branch: 'London', team: 'QA Team',
    role: 'Employee', roleId: 'employee', joinDate: '2026-04-28',
    status: 'Active', avatar: '', designation: 'QA Engineer',
    teamLeader: 'Elena Rostova', projectManager: 'John Miller',
    nationality: 'Russian', emergencyContactName: 'Alexei Volkov', emergencyContactPhone: '+44 20 7946 0016',
    currentAddress:
    permanentAddress: '9 Tower Bridge Rd, London, UK - SE1 4TR', employmentType: 'Full-Time', workLocation: 'London Office'
  },
  {
    id: 'EMP-2026-017', name: 'Wei Zhang', email: 'wei.zhang@enterprise.com',
    phone: '+65 6789 0717', dob: '1990-07-07', gender: 'Male',
    department: 'Engineering', branch: 'Singapore', team: 'Cloud Infra',
    role: 'Employee', roleId: 'employee', joinDate: '2023-09-20',
    status: 'Active', avatar: '', designation: 'Cloud Infrastructure Engineer',
    teamLeader: 'David Kim', projectManager: 'John Miller',
    nationality: 'Chinese', emergencyContactName: 'Li Zhang', emergencyContactPhone: '+65 6789 0017',
    currentAddress:
    permanentAddress: '22 Jurong East, Singapore - 609731', employmentType: 'Full-Time', workLocation: 'Singapore Office'
  },
  {
    id: 'EMP-2026-018', name: 'Isabella Rossi', email: 'isabella.rossi@enterprise.com',
    phone: '+1 (555) 018-8181', dob: '1995-02-18', gender: 'Female',
    department: 'Sales', branch: 'New York', team: 'Enterprise Sales',
    role: 'Employee', roleId: 'employee', joinDate: '2024-01-08',
    status: 'Active', avatar: '', designation: 'Enterprise Account Manager',
    teamLeader: 'Marcus Vance', projectManager: 'Marcus Vance',
    nationality: 'Italian', emergencyContactName: 'Marco Rossi', emergencyContactPhone: '+1 555 018 0018',
    currentAddress:
    permanentAddress: '123 Madison Ave, New York, NY - 10016', employmentType: 'Full-Time', workLocation: 'New York Office'
  },
  {
    id: 'EMP-2026-019', name: 'Ahmed Al-Farsi', email: 'ahmed.alfarsi@enterprise.com',
    phone: '+65 6789 0919', dob: '1988-09-03', gender: 'Male',
    department: 'Operations', branch: 'Singapore', team: 'Ops Support',
    role: 'Employee', roleId: 'employee', joinDate: '2022-11-15',
    status: 'Active', avatar: '', designation: 'Operations Manager',
    teamLeader: 'David Kim', projectManager: 'Aarav Sharma',
    nationality: 'Emirati', emergencyContactName: 'Fatima Al-Farsi', emergencyContactPhone: '+65 6789 0019',
    currentAddress:
    permanentAddress: '5 Raffles Place, Singapore - 048618', employmentType: 'Full-Time', workLocation: 'Singapore Office'
  },
  {
    id: 'EMP-2026-020', name: 'Fatima Khan', email: 'fatima.khan@enterprise.com',
    phone: '+91 98400 12020', dob: '1993-12-12', gender: 'Female',
    department: 'Human Resources', branch: 'Jaipur', team: 'HR Operations',
    role: 'Employee', roleId: 'employee', joinDate: '2023-07-01',
    status: 'Active', avatar: '', designation: 'HR Generalist',
    teamLeader: 'Raj Mehta', projectManager: 'Aarav Sharma',
    nationality: 'Pakistani', emergencyContactName: 'Ali Khan', emergencyContactPhone: '+91 98400 00020',
    currentAddress:
    permanentAddress: '14 Pink City, Jaipur, Rajasthan - 302003', employmentType: 'Full-Time', workLocation: 'Jaipur HQ'
  },
  {
    id: 'EMP-2026-021', name: 'Lucas Bernard', email: 'lucas.bernard@enterprise.com',
    phone: '+33 1 42 27 0221', dob: '1992-04-25', gender: 'Male',
    department: 'Marketing', branch: 'London', team: 'Content Team',
    role: 'Employee', roleId: 'employee', joinDate: '2023-05-18',
    status: 'Active', avatar: '', designation: 'Content Strategist',
    teamLeader: 'Sophia Laurent', projectManager: 'Aiko Tanaka',
    nationality: 'French', emergencyContactName: 'Marie Bernard', emergencyContactPhone: '+33 1 42 27 0021',
    currentAddress:
    permanentAddress: '8 Kensington, London, UK - W8 4PT', employmentType: 'Full-Time', workLocation: 'London Office'
  },
  {
    id: 'EMP-2026-022', name: 'Sunita Rao', email: 'sunita.rao@enterprise.com',
    phone: '+91 98500 12222', dob: '1989-10-01', gender: 'Female',
    department: 'Engineering', branch: 'Jaipur', team: 'Backend Core',
    role: 'Employee', roleId: 'employee', joinDate: '2022-08-10',
    status: 'Active', avatar: '', designation: 'Senior Backend Engineer',
    teamLeader: 'Aarav Sharma', projectManager: 'John Miller',
    nationality: 'Indian', emergencyContactName: 'Ramesh Rao', emergencyContactPhone: '+91 98500 00022',
    currentAddress:
    permanentAddress: '22 Malviya Nagar, Jaipur, Rajasthan - 302017', employmentType: 'Full-Time', workLocation: 'Jaipur HQ'
  },
  {
    id: 'EMP-2026-023', name: 'Oliver Hughes', email: 'oliver.hughes@enterprise.com',
    phone: '+44 20 7946 0523', dob: '1994-07-30', gender: 'Male',
    department: 'Sales', branch: 'London', team: 'UK Sales',
    role: 'Employee', roleId: 'employee', joinDate: '2024-03-10',
    status: 'Active', avatar: '', designation: 'Sales Development Rep',
    teamLeader: 'Marcus Vance', projectManager: 'Marcus Vance',
    nationality: 'British', emergencyContactName: 'Emily Hughes', emergencyContactPhone: '+44 20 7946 0023',
    currentAddress:
    permanentAddress: '67 Soho Square, London, UK - W1D 3QX', employmentType: 'Full-Time', workLocation: 'London Office'
  },
  {
    id: 'EMP-2026-024', name: 'Mei Lin', email: 'mei.lin@enterprise.com',
    phone: '+81 3 5555 0624', dob: '1996-01-14', gender: 'Female',
    department: 'Engineering', branch: 'Tokyo', team: 'Mobile Dev',
    role: 'Employee', roleId: 'employee', joinDate: '2025-01-06',
    status: 'Active', avatar: '', designation: 'iOS Developer',
    teamLeader: 'Kenji Nakamura', projectManager: 'John Miller',
    nationality: 'Chinese', emergencyContactName: 'Chen Lin', emergencyContactPhone: '+81 3 5555 0024',
    currentAddress:
    permanentAddress: '2-8 Harajuku, Tokyo - 150-0001', employmentType: 'Full-Time', workLocation: 'Tokyo Office'
  },
  {
    id: 'EMP-2026-025', name: 'Daniel Osei', email: 'daniel.osei@enterprise.com',
    phone: '+1 (555) 025-2525', dob: '1990-06-06', gender: 'Male',
    department: 'Operations', branch: 'New York', team: 'US Ops',
    role: 'Employee', roleId: 'employee', joinDate: '2022-12-05',
    status: 'Active', avatar: '', designation: 'Operations Coordinator',
    teamLeader: 'Marcus Vance', projectManager: 'Aarav Sharma',
    nationality: 'Ghanaian', emergencyContactName: 'Grace Osei', emergencyContactPhone: '+1 555 025 0025',
    currentAddress:
    permanentAddress: '300 W 57th St, New York, NY - 10019', employmentType: 'Full-Time', workLocation: 'New York Office'
  }
];

export const mockEmployees = baseEmployees.map((emp, i) => enrichEmployee(emp, i + 1));

// ─── Attendance Records ────────────────────────────────────────────────────────
export const mockAttendance = [
  { id: 'ATT-001', employeeId: 'EMP-2026-001', employeeName: 'Aarav Sharma', department: 'Operations', branch: 'Jaipur', date: '2026-05-29', punchIn: '08:45', punchOut: '17:15', totalHours: 8.5, status: 'Present' },
  { id: 'ATT-002', employeeId: 'EMP-2026-002', employeeName: 'John Miller', department: 'Engineering', branch: 'London', date: '2026-05-29', punchIn: '09:05', punchOut: '18:00', totalHours: 8.92, status: 'Present' },
  { id: 'ATT-003', employeeId: 'EMP-2026-003', employeeName: 'Elena Rostova', department: 'Engineering', branch: 'London', date: '2026-05-29', punchIn: '09:35', punchOut: '17:45', totalHours: 8.16, status: 'Late' },
  { id: 'ATT-004', employeeId: 'EMP-2026-004', employeeName: 'Marcus Vance', department: 'Sales', branch: 'New York', date: '2026-05-29', punchIn: '08:55', punchOut: '17:05', totalHours: 8.16, status: 'Present' },
  { id: 'ATT-005', employeeId: 'EMP-2026-005', employeeName: 'Aiko Tanaka', department: 'Marketing', branch: 'Tokyo', date: '2026-05-29', punchIn: '09:12', punchOut: '18:15', totalHours: 9.05, status: 'Late' },
  { id: 'ATT-006', employeeId: 'EMP-2026-006', employeeName: 'David Kim', department: 'Engineering', branch: 'Singapore', date: '2026-05-29', punchIn: '08:50', punchOut: '13:00', totalHours: 4.16, status: 'Half Day' },
  { id: 'ATT-007', employeeId: 'EMP-2026-007', employeeName: 'Sophia Laurent', department: 'Human Resources', branch: 'London', date: '2026-05-29', punchIn: '--:--', punchOut: '--:--', totalHours: 0, status: 'Absent' },
  { id: 'ATT-008', employeeId: 'EMP-2026-008', employeeName: 'Carlos Mendez', department: 'Sales', branch: 'New York', date: '2026-05-29', punchIn: '08:30', punchOut: '17:00', totalHours: 8.5, status: 'Present' },
  { id: 'ATT-009', employeeId: "EMP-2026-009", employeeName: "Liam O'Connor", department: 'Engineering', branch: 'London', date: '2026-05-29', punchIn: '09:00', punchOut: '17:30', totalHours: 8.5, status: 'Present' },
  { id: 'ATT-101', employeeId: 'EMP-2026-001', employeeName: 'Aarav Sharma', department: 'Operations', branch: 'Jaipur', date: '2026-05-28', punchIn: '08:42', punchOut: '17:30', totalHours: 8.8, status: 'Present' },
  { id: 'ATT-102', employeeId: 'EMP-2026-002', employeeName: 'John Miller', department: 'Engineering', branch: 'London', date: '2026-05-28', punchIn: '08:58', punchOut: '18:15', totalHours: 9.28, status: 'Present' },
  { id: 'ATT-103', employeeId: 'EMP-2026-003', employeeName: 'Elena Rostova', department: 'Engineering', branch: 'London', date: '2026-05-28', punchIn: '09:10', punchOut: '17:50', totalHours: 8.66, status: 'Late' },
  { id: 'ATT-104', employeeId: 'EMP-2026-004', employeeName: 'Marcus Vance', department: 'Sales', branch: 'New York', date: '2026-05-28', punchIn: '08:45', punchOut: '17:00', totalHours: 8.25, status: 'Present' },
  { id: 'ATT-107', employeeId: 'EMP-2026-007', employeeName: 'Sophia Laurent', department: 'Human Resources', branch: 'London', date: '2026-05-28', punchIn: '--:--', punchOut: '--:--', totalHours: 0, status: 'Absent' }
];

// ─── Leave Requests ────────────────────────────────────────────────────────────
export const mockLeaveRequests = [
  {
    id: 'LR-001', employeeId: 'EMP-2026-007', employeeName: 'Sophia Laurent', department: 'Human Resources',
    type: 'Sick Leave', fromDate: '2026-05-28', toDate: '2026-05-30', days: 3,
    reason: 'Recovering from minor dental surgery. Medical certificate attached.',
    status: 'Approved', appliedDate: '2026-05-26',
    history: [{ date: '2026-05-26', status: 'Pending', comment: 'Applied by Sophia Laurent' }, { date: '2026-05-26', status: 'Approved', comment: 'Approved by Aarav Sharma' }],
    approverNotes: 'Get well soon, Sophia.'
  },
  {
    id: 'LR-002', employeeId: 'EMP-2026-006', employeeName: 'David Kim', department: 'Engineering',
    type: 'Annual Leave', fromDate: '2026-06-15', toDate: '2026-06-26', days: 10,
    reason: 'Family summer vacation and travel out of the country.',
    status: 'Pending', appliedDate: '2026-05-27',
    history: [{ date: '2026-05-27', status: 'Pending', comment: 'Applied by David Kim' }],
    approverNotes: ''
  },
  {
    id: 'LR-003', employeeId: 'EMP-2026-009', employeeName: "Liam O'Connor", department: 'Engineering',
    type: 'Casual Leave', fromDate: '2026-06-02', toDate: '2026-06-03', days: 2,
    reason: 'Personal errands and attending a family wedding.',
    status: 'Pending', appliedDate: '2026-05-28',
    history: [{ date: '2026-05-28', status: 'Pending', comment: "Applied by Liam O'Connor" }],
    approverNotes: ''
  },
  {
    id: 'LR-004', employeeId: 'EMP-2026-008', employeeName: 'Carlos Mendez', department: 'Sales',
    type: 'Casual Leave', fromDate: '2026-05-20', toDate: '2026-05-21', days: 2,
    reason: 'Moving to a new apartment in Brooklyn.',
    status: 'Rejected', appliedDate: '2026-05-15',
    history: [{ date: '2026-05-15', status: 'Pending', comment: 'Applied by Carlos Mendez' }, { date: '2026-05-16', status: 'Rejected', comment: 'Rejected by Aarav Sharma - Sales quota deadline.' }],
    approverNotes: 'Please reschedule to after the end of month sales review.'
  },
  {
    id: 'LR-005', employeeId: 'EMP-2026-002', employeeName: 'John Miller', department: 'Engineering',
    type: 'Annual Leave', fromDate: '2026-07-10', toDate: '2026-07-15', days: 5,
    reason: 'Attending developer conference in San Francisco.',
    status: 'Pending', appliedDate: '2026-05-28',
    history: [{ date: '2026-05-28', status: 'Pending', comment: 'Applied by John Miller' }],
    approverNotes: ''
  }
];

// ─── Tasks ─────────────────────────────────────────────────────────────────────
export const mockTasks = [
  { id: 'TSK-101', title: 'Design Dashboard UI Mockups', project: 'SaaS Platform', description: 'Create high-fidelity screens for the new landing page, overview dashboard, and user analytics pages.', assigneeId: 'EMP-2026-003', assigneeName: 'Elena Rostova', priority: 'High', dueDate: '2026-05-25', status: 'In Review' },
  { id: 'TSK-102', title: 'Migrate State to Context API', project: 'SaaS Platform', description: 'Refactor standard props-drilling state management to a unified context manager.', assigneeId: 'EMP-2026-006', assigneeName: 'David Kim', priority: 'Critical', dueDate: '2026-05-27', status: 'In Progress' },
  { id: 'TSK-103', title: 'Write Technical Documentation', project: 'Engineering Operations', description: 'Document standard API response designs, mock schemas, developer onboarding steps.', assigneeId: 'EMP-2026-009', assigneeName: "Liam O'Connor", priority: 'Medium', dueDate: '2026-05-24', status: 'To Do' },
  { id: 'TSK-104', title: 'Conduct Employee Performance Audits', project: 'HR System', description: 'Perform biannual reviews of all departments, check KPI scores, and update leaderboards.', assigneeId: 'EMP-2026-007', assigneeName: 'Sophia Laurent', priority: 'Low', dueDate: '2026-05-18', status: 'Done' },
  { id: 'TSK-105', title: 'Optimize Core Recharts Gradients', project: 'SaaS Platform', description: 'Update the main dashboard charts with smooth CSS gradients and custom tooltips.', assigneeId: 'EMP-2026-002', assigneeName: 'John Miller', priority: 'High', dueDate: '2026-05-28', status: 'To Do' },
  { id: 'TSK-106', title: 'Finalize Q2 Sales Strategy', project: 'Marketing Outreach', description: 'Build pitch decks, analyze competitor campaigns, coordinate regional sales targets.', assigneeId: 'EMP-2026-004', assigneeName: 'Marcus Vance', priority: 'High', dueDate: '2026-05-30', status: 'In Progress' }
];

// ─── Payroll ───────────────────────────────────────────────────────────────────
export const mockPayroll = [
  { id: 'PAY-001', employeeId: 'EMP-2026-001', employeeName: 'Aarav Sharma', department: 'Operations', baseSalary: 12500, allowances: 1500, deductions: 800, netPay: 13200, status: 'Paid' },
  { id: 'PAY-002', employeeId: 'EMP-2026-002', employeeName: 'John Miller', department: 'Engineering', baseSalary: 8500, allowances: 1000, deductions: 500, netPay: 9000, status: 'Paid' },
  { id: 'PAY-003', employeeId: 'EMP-2026-003', employeeName: 'Elena Rostova', department: 'Engineering', baseSalary: 7200, allowances: 800, deductions: 450, netPay: 7550, status: 'Paid' },
  { id: 'PAY-004', employeeId: 'EMP-2026-004', employeeName: 'Marcus Vance', department: 'Sales', baseSalary: 6800, allowances: 2500, deductions: 400, netPay: 8900, status: 'Pending' },
  { id: 'PAY-005', employeeId: 'EMP-2026-005', employeeName: 'Aiko Tanaka', department: 'Marketing', baseSalary: 6500, allowances: 600, deductions: 350, netPay: 6750, status: 'Pending' },
  { id: 'PAY-006', employeeId: 'EMP-2026-006', employeeName: 'David Kim', department: 'Engineering', baseSalary: 5500, allowances: 500, deductions: 300, netPay: 5700, status: 'Pending' },
  { id: 'PAY-007', employeeId: 'EMP-2026-007', employeeName: 'Sophia Laurent', department: 'Human Resources', baseSalary: 5800, allowances: 500, deductions: 300, netPay: 6000, status: 'Pending' }
];

// ─── Notifications ─────────────────────────────────────────────────────────────
export const mockNotifications = [
  { id: 'NTF-001', type: 'warning', message: 'New leave request from David Kim requires your approval.', timestamp: '5 minutes ago', read: false },
  { id: 'NTF-002', type: 'error', message: 'Task "Design Dashboard UI Mockups" is overdue by 4 days!', timestamp: '1 hour ago', read: false },
  { id: 'NTF-003', type: 'success', message: 'Monthly payroll for Engineering department processed successfully.', timestamp: '2 hours ago', read: false },
  { id: 'NTF-004', type: 'info', message: 'Company-wide Announcement: CEO Townhall scheduled for June 5th.', timestamp: '1 day ago', read: true },
  { id: 'NTF-005', type: 'success', message: 'Employee directory updated. Sophia Laurent set to status "On Leave".', timestamp: '2 days ago', read: true }
];

// ─── Activity Logs ─────────────────────────────────────────────────────────────
export const mockActivityLogs = [
  { id: 'LOG-001', employeeName: 'Aarav Sharma', department: 'Operations', action: 'Approved leave request for Sophia Laurent', module: 'Leaves', timestamp: '5 minutes ago', status: 'success' },
  { id: 'LOG-002', employeeName: 'John Miller', department: 'Engineering', action: 'Created task "Optimize Core Recharts Gradients"', module: 'Tasks', timestamp: '15 minutes ago', status: 'success' },
  { id: 'LOG-003', employeeName: 'David Kim', department: 'Engineering', action: 'Submitted leave request (10 days)', module: 'Leaves', timestamp: '30 minutes ago', status: 'warning' },
  { id: 'LOG-004', employeeName: 'System Cron', department: 'Operations', action: 'Flagged task "Design Dashboard UI Mockups" as Overdue', module: 'Tasks', timestamp: '1 hour ago', status: 'danger' },
  { id: 'LOG-005', employeeName: 'Marcus Vance', department: 'Sales', action: 'Punched In (Late)', module: 'Attendance', timestamp: '2 hours ago', status: 'warning' },
  { id: 'LOG-006', employeeName: 'Sophia Laurent', department: 'Human Resources', action: 'Updated profile contact details', module: 'Employees', timestamp: '3 hours ago', status: 'success' },
  { id: 'LOG-007', employeeName: 'Aiko Tanaka', department: 'Marketing', action: 'Punched In (On Time)', module: 'Attendance', timestamp: '4 hours ago', status: 'success' },
  { id: 'LOG-008', employeeName: 'Elena Rostova', department: 'Engineering', action: 'Moved task "Design Dashboard UI Mockups" to In Review', module: 'Tasks', timestamp: '5 hours ago', status: 'success' },
  { id: 'LOG-009', employeeName: 'Aarav Sharma', department: 'Operations', action: 'Modified permissions for role "Branch Admin"', module: 'Administration', timestamp: '1 day ago', status: 'success' },
  { id: 'LOG-010', employeeName: "Liam O'Connor", department: 'Engineering', action: 'Punched Out (08.50 hours)', module: 'Attendance', timestamp: '1 day ago', status: 'success' }
];
