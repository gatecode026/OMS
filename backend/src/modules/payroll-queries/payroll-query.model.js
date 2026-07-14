/**
 * @file src/modules/payroll-queries/payroll-query.model.js
 * @description Mongoose schema definition for Payroll Queries / disputes module.
 */

import mongoose from 'mongoose';
import { tenantPlugin } from '../../utils/tenantPlugin.js';

const payrollQuerySchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  employeeId: { type: String, required: true, index: true },
  employeeName: { type: String, required: true, trim: true },
  department: { type: String, required: true },
  branch: { type: String, required: true },
  designation: { type: String, required: true },

  // Query details
  category: {
    type: String,
    required: true,
    enum: [
      'Incorrect Salary Amount',
      'Missing Salary Credit',
      'Incorrect Leave Deduction',
      'Wrong LOP Calculation',
      'Overtime Missing',
      'Bonus Missing',
      'Incentive Missing',
      'Incorrect Tax Deduction',
      'Incorrect PF/ESI',
      'Wrong Attendance Calculation',
      'Salary Paid Late',
      'Other'
    ]
  },
  subject: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  priority: { type: String, required: true, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  status: {
    type: String,
    required: true,
    enum: [
      'Pending',
      'Under Review',
      'Waiting for Employee',
      'Approved',
      'Rejected',
      'Resolved'
    ],
    default: 'Pending'
  },
  attachments: [{
    fileName: { type: String },
    fileUrl: { type: String }
  }],
  submittedDate: { type: Date, default: Date.now },

  // Linked payroll details (Snapshot at raise)
  payrollId: { type: String, required: true, index: true },
  payrollPeriod: { type: String, required: true },
  payrollMonth: { type: String, required: true },
  payrollYear: { type: String, required: true },
  grossSalary: { type: Number, required: true },
  netSalary: { type: Number, required: true },
  deductions: { type: Number, required: true },
  allowances: { type: Number, required: true },
  bonus: { type: Number, required: true },
  lop: { type: Number, required: true },
  paidLeave: { type: Number, default: 0 },
  unpaidLeave: { type: Number, default: 0 },
  attendanceSummary: { type: String, default: '' },

  // Threaded messages/ticket conversation
  messages: [{
    senderId: { type: String, required: true },
    senderName: { type: String, required: true },
    senderRole: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    attachments: [{
      fileName: { type: String },
      fileUrl: { type: String }
    }],
    readBy: [{ type: String }]
  }],

  // Investigation/Audit/Notes logs
  internalNotes: [{
    authorName: { type: String, required: true },
    note: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],

  auditTrail: [{
    action: { type: String, required: true },
    user: { type: String, required: true },
    userId: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    previousValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed },
    reason: { type: String },
    sourceModule: { type: String, default: 'Payroll Query' }
  }]
}, { 
  timestamps: true,
  collection: 'payroll_queries'
});

payrollQuerySchema.plugin(tenantPlugin);
payrollQuerySchema.index({ companyId: 1, id: 1 }, { unique: true });

payrollQuerySchema.pre('validate', async function(next) {
  if (this.isNew && !this.id) {
    try {
      const { generateCompanyUniqueId } = await import('../../utils/idGenerator.js');
      this.id = await generateCompanyUniqueId(this.companyId, 'payroll_queries');
    } catch (err) {
      return next(err);
    }
  }
  next();
});

const PayrollQuery = mongoose.model('PayrollQuery', payrollQuerySchema);

export default PayrollQuery;
