/**
 * @file src/modules/attendance/attendance.model.js
 * @description Mongoose schema definition for Attendance module.
 */

import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  employeeId: {
    type: String,
    index: true
  },
  employeeName: {
    type: String,
    trim: true
  },
  department: {
    type: String
  },
  branch: {
    type: String
  },
  date: {
    type: String,
    index: true
  },
  punchIn: {
    type: String,
    default: '--:--'
  },
  punchOut: {
    type: String,
    default: '--:--'
  },
  totalHours: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Present', 'Late', 'Absent', 'Half Day', 'Work From Home', 'On Leave', 'Overtime', 'Leave', 'Half-Day', 'WFH'],
    default: 'Present'
  },
  source: {
    type: String,
    default: 'Biometric'
  },
  breakTime: {
    type: String,
    default: '45 mins'
  },
  breaks: [{
    breakType: { type: String },
    duration: { type: Number }
  }],
  shift: {
    type: String
  },
  workMode: {
    type: String
  },
  overtime: {
    type: String,
    default: '0 hrs'
  }
}, {
  timestamps: true,
  collection: 'attendance'
});

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;
