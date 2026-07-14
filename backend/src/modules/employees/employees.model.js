/**
 * @file src/modules/employees/employees.model.js
 * @description Mongoose schema definition for Employees module.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { tenantPlugin } from '../../utils/tenantPlugin.js';

const employeeSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  dob: String,
  employeeCode: {
    type: String,
    sparse: true,
    trim: true,
    index: true
  },
  gender: String,
  phone: {
    type: String,
    required: true
  },
  alternatePhone: String,
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
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
  country: {
    type: String,
    default: 'India'
  },

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
  lastLoginAt: {
    type: Date,
    default: null
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
  department: {
    type: String,
    index: true
  },
  branch: {
    type: String,
    index: true
  },
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
    default: 'Active',
    index: true
  },
  accountStatus: {
    type: String,
    default: 'Active'
  },
  probationEndDate: String,
  contractEndDate: String,
  exitInfo: {
    lastWorkingDay: String,
    exitDate: String,
    exitReason: {
      type: String,
      enum: ['Resignation', 'Termination', 'Contract End', 'Retirement', 'Abandonment', 'Other', '—'],
      default: '—'
    },
    exitNotes: String,
    deactivatedAt: Date,
    deactivatedBy: String,
    restoredAt: Date,
    restoredBy: String
  },

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
  taxRegime: {
    type: String,
    enum: ['Old', 'New', '—'],
    default: 'New'
  },
  pfUan: {
    type: String,
    default: ''
  },
  pfContribution: {
    type: Boolean,
    default: true
  },
  hra: {
    type: Number,
    default: 0
  },
  travel: {
    type: Number,
    default: 0
  },
  medical: {
    type: Number,
    default: 0
  },
  special: {
    type: Number,
    default: 0
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
    default: 'Not Punched'
  },
  workStatus: {
    type: String,
    default: 'Offline'
  },
  chatStatus: {
    type: String,
    enum: ['available', 'away', 'dnd', 'offline'],
    default: 'available'
  },
  statusEmoji: {
    type: String,
    default: null
  },
  statusExpiry: {
    type: Date,
    default: null
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
    default: 0
  },
  efficiency: {
    type: Number,
    default: 80
  },
  quality: {
    type: Number,
    default: 80
  },
  performanceRating: {
    type: String,
    default: 'Good'
  },
  leaveBalance: {
    type: Number
  },
  clBalance: {
    type: Number
  },
  slBalance: {
    type: Number
  },
  plBalance: {
    type: Number
  },
  maternityBalance: {
    type: Number
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
    overall: { type: Number, default: 0 },
    attendance: { type: Number, default: 0 },
    taskCompletion: { type: Number, default: 0 },
    reportSubmission: { type: Number, default: 0 },
    leaveDiscipline: { type: Number, default: 0 },
    monthly: { type: [Number], default: [0, 0, 0, 0, 0, 0] }
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

// Pre-validate: generate company-scoped id and employeeCode BEFORE Mongoose validates required fields
employeeSchema.pre('validate', async function (next) {
  if (!this.isNew) return next();
  try {

    const { getTenantId } = await import('../../utils/tenantContext.js');
    const tenantId = getTenantId();
    if (tenantId && !this.companyId) {
      this.companyId = tenantId;
    }

    const { generateCompanyUniqueId } = await import('../../utils/idGenerator.js');
    // Always generate a company-scoped ID — never trust the frontend-supplied value
    const generatedCode = await generateCompanyUniqueId(this.companyId, 'employees');
    if (!this.id || this.id.trim() === '') {
      this.id = generatedCode;
    }
    if (!this.employeeCode || this.employeeCode.trim() === '') {
      this.employeeCode = generatedCode;
    }
  } catch (err) {
    return next(err);
  }
  next();
});

// Pre-save password hashing
employeeSchema.pre('save', async function (next) {
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

employeeSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

employeeSchema.plugin(tenantPlugin);
// Compound unique indexes: scoped per company (allows same id/email across different companies)
employeeSchema.index({ companyId: 1, id: 1 }, { unique: true });
employeeSchema.index({ companyId: 1, email: 1 }, { unique: true });
employeeSchema.index({ companyId: 1, phone: 1 }, { sparse: true });

employeeSchema.index({ companyId: 1, employeeCode: 1 }, { unique: true, sparse: true });

const Employee = mongoose.model('Employee', employeeSchema);

export default Employee;
