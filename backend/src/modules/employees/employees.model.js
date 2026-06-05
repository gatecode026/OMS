/**
 * @file src/modules/employees/employees.model.js
 * @description Mongoose schema definition for Employees module.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const employeeSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  dob: String,
  gender: String,
  phone: {
    type: String,
    required: true
  },
  alternatePhone: String,
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  personalEmail: String,
  workEmail: String,
  avatar: String,
  bloodGroup: String,
  maritalStatus: String,
  experience: String,
  nationality: String,

  // Address details
  currentAddress: String,
  permanentAddress: String,
  city: String,
  state: String,
  zipCode: String,
  country: String,

  // Emergency contact details
  emergencyContactName: String,
  emergencyContactPhone: String,
  emergencyContactPhoneAlt: String,
  emergencyContactRelation: String,

  // Login credentials
  username: {
    type: String,
    unique: true,
    sparse: true
  },
  password: {
    type: String,
    select: false
  },

  // Professional details
  role: {
    type: String,
    default: 'Employee'
  },
  roleId: {
    type: String,
    default: 'employee'
  },
  designation: String,
  department: String,
  branch: String,
  branchAddress: String,
  team: String,
  teamLeader: String,
  projectManager: String,
  joinDate: String,
  shiftTiming: String,
  shiftType: String,
  workLocation: String,
  workMode: String,

  // Employment status
  employeeType: String,
  employmentStatus: String,
  status: {
    type: String,
    default: 'Active'
  },
  accountStatus: {
    type: String,
    default: 'Active'
  },
  probationEndDate: String,
  contractEndDate: String,

  // Bank details
  bankName: String,
  bankAccountNumber: String,
  bankIfscCode: String,
  bankUpiId: String,

  // Salary & Payroll
  salaryType: String,
  monthlySalary: String,
  salaryAmount: String,
  salaryDeductions: String,
  overtimeEligibility: {
    type: Boolean,
    default: false
  },

  // Identity documents
  panNumber: String,
  aadhaarNumber: String,
  documents: [{
    category: String,
    fileName: String,
    uploadDate: String,
    fileType: String,
    downloadUrl: String
  }],

  // Analytics & history fields
  attendanceStatus: {
    type: String,
    default: 'Present'
  },
  workStatus: {
    type: String,
    default: 'Offline'
  },
  todayPunchIn: {
    type: String,
    default: null
  },
  todayPunchOut: {
    type: String,
    default: null
  },
  todayWorkingHours: {
    type: Number,
    default: 0
  },
  todayPunchStatus: {
    type: String,
    default: 'Not Punched'
  },
  lastSeen: {
    type: String,
    default: '—'
  },
  productivityScore: {
    type: Number,
    default: 75
  },
  performanceRating: {
    type: String,
    default: 'Good'
  },
  leaveBalance: {
    type: Number,
    default: 15
  },
  currentProjectsCount: {
    type: Number,
    default: 0
  },
  skills: [{
    name: String,
    level: String
  }],
  certifications: [{
    name: String,
    expiryDate: String
  }],
  attendanceHistory: [mongoose.Schema.Types.Mixed],
  overtimeHistory: [mongoose.Schema.Types.Mixed],
  leaveHistory: [mongoose.Schema.Types.Mixed],
  taskHistory: [mongoose.Schema.Types.Mixed],
  performanceScore: {
    overall: { type: Number, default: 75 },
    attendance: { type: Number, default: 80 },
    taskCompletion: { type: Number, default: 75 },
    reportSubmission: { type: Number, default: 80 },
    leaveDiscipline: { type: Number, default: 80 },
    monthly: { type: [Number], default: [75, 75, 75, 75, 75, 75] }
  },
  activityLog: [mongoose.Schema.Types.Mixed],
  securityInfo: {
    lastLogin: { type: String, default: '—' },
    loginDevice: { type: String, default: '—' },
    loginLocation: { type: String, default: '—' },
    failedAttempts: { type: Number, default: 0 },
    mfaStatus: { type: String, default: 'Disabled' }
  },
  payrollSummary: {
    salaryStatus: { type: String, default: 'Pending' },
    lastSalaryDate: { type: String, default: '—' },
    upcomingPayrollDate: { type: String, default: '—' },
    bonusHistory: [mongoose.Schema.Types.Mixed]
  }
}, {
  timestamps: true,
  collection: 'employees'
});

// Pre-save password hashing
employeeSchema.pre('save', async function(next) {
  if (!this.password) return next();
  if (!this.isModified('password')) return next();
  
  // Safeguard against double-hashing if already a bcrypt string
  if (/^\$2[ab]\$/.test(this.password)) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

employeeSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

const Employee = mongoose.model('Employee', employeeSchema);

export default Employee;
