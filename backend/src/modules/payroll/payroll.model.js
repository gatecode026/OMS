/**
 * @file src/modules/payroll/payroll.model.js
 * @description Mongoose schema definitions for all payroll entities (Grades, Reimbursements, Loans, Bonuses, Payments, Configurations).
 */

import mongoose from 'mongoose';
import { tenantPlugin } from '../../utils/tenantPlugin.js';

// 1. Salary Grades Schema
const payrollGradeSchema = new mongoose.Schema({
  id: { type: String, required: true, index: true },
  grade: { type: String, required: true },
  payBand: { type: String, required: true },
  basic: { type: Number, required: true },
  hra: { type: Number, required: true },
  travel: { type: Number, default: 0 },
  medical: { type: Number, default: 0 },
  special: { type: Number, default: 0 },
  pf: { type: Number, default: 0 },
  esi: { type: Number, default: 0 },
  pt: { type: Number, default: 200 },
  tdsRate: { type: Number, default: 10 },
  effectiveDate: { type: String, required: true }
}, { timestamps: true });

// 2. Reimbursements Schema
const payrollReimbursementSchema = new mongoose.Schema({
  id: { type: String, required: true, index: true },
  employeeId: { type: String, required: true, index: true },
  employeeName: { type: String, required: true },
  category: { type: String, required: true },
  amount: { type: Number, required: true },
  requestDate: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Released'], default: 'Pending' },
  approvedBy: { type: String, default: '—' }
}, { timestamps: true });

// 3. Loans & Advances Schema
const payrollLoanAdvanceSchema = new mongoose.Schema({
  id: { type: String, required: true, index: true },
  employeeId: { type: String, required: true, index: true },
  employeeName: { type: String, required: true },
  type: { type: String, enum: ['Loan', 'Advance'], required: true },
  loanType: { type: String, default: 'Personal Loan' },
  amount: { type: Number, required: true },
  emi: { type: Number, default: 0 },
  recoverySchedule: { type: String, required: true },
  remainingBalance: { type: Number, required: true },
  progress: { type: Number, default: 0 },
  status: { type: String, default: 'Approved' }
}, { timestamps: true });

payrollLoanAdvanceSchema.pre('validate', function (next) {
  if (this.type === 'Advance') {
    this.loanType = 'Advance Salary';
    this.emi = 0;
  }
  next();
});

// 4. Bonuses & Incentives Schema
const payrollBonusSchema = new mongoose.Schema({
  id: { type: String, required: true, index: true },
  employeeId: { type: String, required: true, index: true },
  employeeName: { type: String, required: true },
  type: { type: String, required: true },
  amount: { type: Number, required: true },
  requestDate: { type: String, required: true },
  status: { type: String, default: 'Pending' },
  approvalFlow: { type: [String], default: [] }
}, { timestamps: true });

// 5. Monthly Processed Payroll Payments Schema
const payrollPaymentSchema = new mongoose.Schema({
  id: { type: String, required: true, index: true }, // employeeId-month-year
  payrollCode: {
    type: String,
    sparse: true,
    trim: true,
    index: true
  },
  employeeId: { type: String, required: true, index: true },
  employeeName: { type: String, required: true },
  department: { type: String, required: true },
  designation: { type: String, required: true },
  branch: { type: String, required: true },
  month: { type: String, required: true },
  year: { type: String, required: true },
  status: { type: String, enum: ['Calculated', 'HR Verified', 'Finance Approved', 'Released', 'Hold'], default: 'Hold' },
  basicSalary: { type: Number, required: true },
  grossSalary: { type: Number, required: true },
  totalDeductions: { type: Number, required: true },
  netSalary: { type: Number, required: true },
  overtimeAmount: { type: Number, default: 0 },
  bonusAmount: { type: Number, default: 0 },
  reimbursementAmount: { type: Number, default: 0 },
  loanEMI: { type: Number, default: 0 },
  advanceDeduct: { type: Number, default: 0 },
  leaveDeductions: { type: Number, default: 0 },
  lateDeductions: { type: Number, default: 0 },
  statutoryDeductions: { type: Number, required: true },
  bankName: { type: String, default: 'HDFC Bank' },
  bankAccount: { type: String, default: '' },
  bankIfsc: { type: String, default: '' },
  pan: { type: String, default: '' },
  regime: { type: String, enum: ['Old', 'New'], default: 'New' }
}, { timestamps: true });

// 6. Global Configuration Schema (Stores penality settings, custom salary structures, tax regimes, and attendance configurations)
const payrollConfigSchema = new mongoose.Schema({
  id: { type: String, required: true, default: 'GLOBAL_CONFIG', index: true },
  leaveDeductionRate: { type: Number, default: 2000 },
  lateArrivalPenalty: { type: Number, default: 300 },
  overtimeHourlyRate: { type: Number, default: 500 },
  // Map fields use Mixed to allow easy serialization of dynamic configurations keyed by employeeId
  taxProfiles: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
  salaryStructures: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
  attendanceDaysMap: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true, collection: 'payroll_configs' });

payrollGradeSchema.index({ companyId: 1, id: 1 }, { unique: true });
payrollReimbursementSchema.index({ companyId: 1, id: 1 }, { unique: true });
payrollLoanAdvanceSchema.index({ companyId: 1, id: 1 }, { unique: true });
payrollBonusSchema.index({ companyId: 1, id: 1 }, { unique: true });
payrollPaymentSchema.index({ companyId: 1, id: 1 }, { unique: true });
payrollConfigSchema.index({ companyId: 1, id: 1 }, { unique: true });

payrollGradeSchema.plugin(tenantPlugin);
payrollReimbursementSchema.plugin(tenantPlugin);
payrollLoanAdvanceSchema.plugin(tenantPlugin);
payrollBonusSchema.plugin(tenantPlugin);
payrollPaymentSchema.plugin(tenantPlugin);
payrollPaymentSchema.index({ companyId: 1, payrollCode: 1 }, { unique: true, sparse: true });
payrollConfigSchema.plugin(tenantPlugin);

payrollPaymentSchema.pre('save', async function(next) {
  if (this.isNew && !this.payrollCode) {
    try {
      const { generateCompanyUniqueId } = await import('../../utils/idGenerator.js');
      this.payrollCode = await generateCompanyUniqueId(this.companyId, 'payroll');
    } catch (err) {
      return next(err);
    }
  }
  next();
});

export const PayrollGrade = mongoose.model('PayrollGrade', payrollGradeSchema);
export const PayrollReimbursement = mongoose.model('PayrollReimbursement', payrollReimbursementSchema);
export const PayrollLoanAdvance = mongoose.model('PayrollLoanAdvance', payrollLoanAdvanceSchema);
export const PayrollBonus = mongoose.model('PayrollBonus', payrollBonusSchema);
export const PayrollPayment = mongoose.model('PayrollPayment', payrollPaymentSchema);
export const PayrollConfig = mongoose.model('PayrollConfig', payrollConfigSchema);

export default {
  PayrollGrade,
  PayrollReimbursement,
  PayrollLoanAdvance,
  PayrollBonus,
  PayrollPayment,
  PayrollConfig
};
