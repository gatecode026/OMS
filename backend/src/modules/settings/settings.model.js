import mongoose from 'mongoose';
import { tenantPlugin } from '../../utils/tenantPlugin.js';

const SystemSettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    default: 'global'
  },
  companyProfile: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      companyName: 'Office Management Pvt. Ltd.',
      regNumber: 'U72200DL2026PTC394850',
      gstNumber: '07AAAAA1111A1Z1',
      panNumber: 'AAAAA1111A',
      cinNumber: 'L72200DL2026PLC394850',
      websiteUrl: 'https://office-management.com',
      officialEmail: 'admin@saas.com',
      officialPhone: '+91 11 4050 6070',
      address: 'Plot No. 12, Sector 18, Udyog Vihar',
      city: 'Gurugram',
      state: 'Haryana',
      country: 'India',
      postalCode: '122008'
    }
  },
  branches: {
    type: [mongoose.Schema.Types.Mixed],
    default: [
      { code: 'BR-DEL', name: 'Delhi Head Office', manager: '', status: 'Active' },
      { code: 'BR-MUM', name: 'Mumbai Branch', manager: '', status: 'Active' },
      { code: 'BR-BLR', name: 'Bangalore Tech Center', manager: '', status: 'Active' },
      { code: 'BR-JPR', name: 'Jaipur Operations', manager: '', status: 'Active' }
    ]
  },
  departments: {
    type: [mongoose.Schema.Types.Mixed],
    default: [
      { id: '1', name: 'Engineering', head: '', capacity: 150 },
      { id: '2', name: 'Human Resources', head: '', capacity: 30 },
      { id: '3', name: 'Sales & Marketing', head: '', capacity: 80 },
      { id: '4', name: 'Operations', head: '', capacity: 120 },
      { id: '5', name: 'Finance', head: '', capacity: 25 }
    ]
  },
  empSettings: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      autoIdGen: true,
      idPrefix: 'EMP-',
      idSuffix: '-2026',
      startingSeq: '001',
      idType: 'Branch-Based',
      activeStatus: true,
      probationStatus: true,
      confirmedStatus: true,
      noticeStatus: true,
      resignedStatus: true,
      terminatedStatus: true
    }
  },
  attendanceRules: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      dailyHours: 8,
      weeklyHours: 40,
      shiftRules: 'Fixed Shift Rules',
      startTime: '09:00',
      endTime: '18:00',
      gracePeriod: 15,
      lateMarkLimit: 30,
      halfDayLimit: 120,
      overtimeRate: 1.5,
      autoPunchOut: true,
      punchOutTime: '21:00',
      attendanceReminders: true,
      missingAlerts: true,
      lateTimeThreshold: '09:15',
      halfDayHoursThreshold: 8
    }
  },
  leaveRules: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      clBalance: 12,
      slBalance: 10,
      elBalance: 15,
      maternityBalance: 90,
      paternityBalance: 15,
      wfhBalance: 24,
      carryForwardLimit: 5,
      encashmentAllowed: true,
      holidayAdjustment: true
    }
  },
  payrollRules: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      cycle: 'Monthly Payroll',
      basicSalaryPct: 50,
      hraPct: 20,
      conveyanceFlat: 1600,
      medicalFlat: 1250,
      pfPct: 12,
      esiPct: 0.75,
      tdsFlat: 0,
      overtimeMultiplier: 1.5,
      holidayMultiplier: 2.0
    }
  },
  projectRules: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      stages: 'Backlog, Design, In Progress, QA, Completed',
      milestonesRequired: true,
      approvalRequired: true,
      priorityCritical: true,
      priorityHigh: true,
      priorityMedium: true,
      priorityLow: true,
      overdueTaskHours: 24,
      escalationLevel: 'Project Manager'
    }
  },
  docRules: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      pdfAllowed: true,
      docxAllowed: true,
      xlsxAllowed: true,
      pngAllowed: true,
      maxFileSize: 10,
      storageLimit: 50,
      retentionYears: 5,
      autoArchive: true
    }
  },
  smtpConfig: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      host: 'smtp.saasenterprise.com',
      port: '587',
      senderEmail: 'notifications@saasenterprise.com',
      authRequired: true,
      username: 'smtp_auth_user',
      password: '••••••••••••••••'
    }
  },
  smsConfig: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      provider: 'Twilio Gateway API',
      apiKey: 'SK-a9f8b7c6d5e4f3a2b1c0d9e8f7a6b5c4',
      senderId: 'SAASER',
      gatewayUrl: 'https://api.twilio.com/2010-04-01/Accounts/'
    }
  },
  generalSettings: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      companyName: 'Office Management Pvt. Ltd.',
      timezone: 'IST (UTC+5:30)',
      language: 'English (IN)',
      dateFormat: 'DD-MM-YYYY',
      currency: 'INR (₹)',
      fiscalYear: 'January'
    }
  },
  notificationSettings: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      emailNotifs: true,
      pushNotifs: true,
      leaveAlerts: true,
      payrollAlerts: true,
      securityAlerts: true,
      weeklyDigest: false
    }
  },
  securitySettings: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      twoFactor: false,
      sessionTimeout: '30 minutes',
      loginAlerts: true,
      ipWhitelist: ''
    }
  }
}, { timestamps: true });

SystemSettingsSchema.plugin(tenantPlugin);
SystemSettingsSchema.index({ key: 1, companyId: 1 }, { unique: true });

const SystemSettings = mongoose.model('SystemSettings', SystemSettingsSchema, 'system_settings');
export default SystemSettings;
