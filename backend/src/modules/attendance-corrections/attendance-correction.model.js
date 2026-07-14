/**
 * @file src/modules/attendance-corrections/attendance-correction.model.js
 * @description Mongoose schema definition for Attendance Correction Requests.
 */

import mongoose from 'mongoose';
import { tenantPlugin } from '../../utils/tenantPlugin.js';

const timelineEventSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: ['Submitted', 'Approved', 'Rejected', 'Under Review', 'More Info Requested', 'Resubmitted', 'Cancelled']
  },
  actorId: { type: String, required: true },
  actorName: { type: String, required: true },
  actorRole: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  comments: { type: String, default: '' },
  oldValues: { type: mongoose.Schema.Types.Mixed, default: {} },
  newValues: { type: mongoose.Schema.Types.Mixed, default: {} }
});

const attendanceCorrectionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  employeeId: {
    type: String,
    required: true,
    index: true
  },
  employeeName: {
    type: String,
    required: true
  },
  department: {
    type: String
  },
  branch: {
    type: String
  },
  attendanceId: {
    type: String,
    required: true,
    index: true
  },
  date: {
    type: String, // YYYY-MM-DD
    required: true,
    index: true
  },
  correctionType: {
    type: String,
    required: true,
    enum: [
      'Missing Punch In',
      'Missing Punch Out',
      'Wrong Punch In Time',
      'Wrong Punch Out Time',
      'Forgot to Punch',
      'Wrong Working Hours',
      'Wrong Shift',
      'Wrong Attendance Status',
      'Wrong Break Time',
      'Wrong Overtime',
      'Manual Attendance Request',
      'Work From Home Correction',
      'Field Visit Attendance'
    ]
  },
  currentPunchIn: {
    type: String,
    default: '--:--'
  },
  currentPunchOut: {
    type: String,
    default: '--:--'
  },
  currentStatus: {
    type: String,
    default: 'Absent'
  },
  currentShift: {
    type: String,
    default: ''
  },
  currentTotalHours: {
    type: Number,
    default: 0
  },
  requestedPunchIn: {
    type: String,
    default: '--:--'
  },
  requestedPunchOut: {
    type: String,
    default: '--:--'
  },
  requestedStatus: {
    type: String,
    required: true
  },
  requestedShift: {
    type: String,
    default: ''
  },
  reason: {
    type: String,
    required: true
  },
  remarks: {
    type: String,
    default: ''
  },
  attachmentUrl: {
    type: String,
    default: ''
  },
  attachmentName: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: [
      'Pending',
      'Under Review',
      'Approved',
      'Rejected',
      'More Information Required',
      'Cancelled'
    ],
    default: 'Pending',
    index: true
  },
  approverId: {
    type: String,
    default: ''
  },
  approvedBy: {
    type: String,
    default: ''
  },
  approvalDate: {
    type: Date
  },
  timeline: [timelineEventSchema]
}, {
  timestamps: true,
  collection: 'attendance_corrections'
});

attendanceCorrectionSchema.plugin(tenantPlugin);
attendanceCorrectionSchema.index({ companyId: 1, id: 1 }, { unique: true });
attendanceCorrectionSchema.index({ companyId: 1, employeeId: 1, date: 1, status: 1 });

const AttendanceCorrection = mongoose.model('AttendanceCorrection', attendanceCorrectionSchema);

export default AttendanceCorrection;
