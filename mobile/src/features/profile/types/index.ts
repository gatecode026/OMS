/**
 * @file index.ts
 * @description TypeScript type definitions for the Enterprise Profile feature module.
 */

// ─── Employee Profile ──────────────────────────────────────────────────────────

export interface EmployeeProfile {
  // Identity
  id: string;
  employeeId?: string;
  employeeCode?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  personalEmail?: string;
  alternatePhone?: string;
  officeExtension?: string;
  officePhone?: string;
  avatarUrl?: string;
  profilePhoto?: string;

  // Role & Position
  role?: string;
  designation?: string;
  department?: string;
  departmentId?: string;
  grade?: string;
  
  // Reporting
  reportingManager?: string;
  reportingManagerId?: string;
  reportingManagerName?: string;
  teamName?: string;

  // Employment
  employmentType?: string;
  status?: string;
  joiningDate?: string;
  confirmationDate?: string;

  // Location
  branch?: string;
  officeLocation?: string;
  businessUnit?: string;
  division?: string;
  shift?: string;
  shiftTiming?: string;
  
  // Personal Details
  gender?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  nationality?: string;
  maritalStatus?: string;
  religion?: string;
  
  // Company
  companyId?: string;
  companyName?: string;
  
  // Address
  currentAddress?: Address;
  permanentAddress?: Address;
  
  // Identity
  aadhaarNumber?: string;
  panNumber?: string;
  passportNumber?: string;
  passportExpiry?: string;
  drivingLicenseNumber?: string;
  drivingLicenseExpiry?: string;
  
  // Project
  currentProject?: string;
  
  // Meta
  createdAt?: string;
  updatedAt?: string;
  
  [key: string]: any;
}

export interface Address {
  line1?: string;
  line2?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  pinCode?: string;
}

// ─── Bank Details ─────────────────────────────────────────────────────────────

export interface BankDetails {
  id?: string;
  bankName?: string;
  branchName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  isSalaryAccount?: boolean;
  accountType?: string;
}

// ─── Emergency Contact ────────────────────────────────────────────────────────

export interface EmergencyContact {
  id?: string;
  name?: string;
  relationship?: string;
  primaryPhone?: string;
  alternatePhone?: string;
  address?: string;
}

// ─── Document ─────────────────────────────────────────────────────────────────

export interface ProfileDocument {
  id?: string;
  type?: string;
  name?: string;
  url?: string;
  fileUrl?: string;
  uploadedAt?: string;
  size?: number;
  mimeType?: string;
}

// ─── Leave Summary ────────────────────────────────────────────────────────────

export interface LeaveBalance {
  type: string;
  total: number;
  used: number;
  remaining: number;
}

export interface LeaveSummary {
  balances?: LeaveBalance[];
  pendingCount?: number;
  approvedCount?: number;
  rejectedCount?: number;
  totalApplied?: number;
}

// ─── Payroll ──────────────────────────────────────────────────────────────────

export interface PayrollRecord {
  id?: string;
  month?: string;
  year?: string;
  grossSalary?: number;
  totalDeductions?: number;
  netSalary?: number;
  payslipUrl?: string;
  status?: string;
  paidOn?: string;
  basicSalary?: number;
  bonusAmount?: number;
  overtimeAmount?: number;
  reimbursementAmount?: number;
  loanEMI?: number;
  advanceDeduct?: number;
  lateDeductions?: number;
  leaveDeductions?: number;
  pan?: string;
  regime?: string;
  bankName?: string;
  bankAccount?: string;
  bankIfsc?: string;
  designation?: string;
  department?: string;
  branch?: string;
  employeeName?: string;
  employeeId?: string;
  updatedAt?: string;
}

// ─── Profile Completeness ────────────────────────────────────────────────────

export interface ProfileCompletenessSection {
  label: string;
  complete: boolean;
  weight: number;
}

export interface ProfileCompletenessResult {
  percentage: number;
  sections: ProfileCompletenessSection[];
}
