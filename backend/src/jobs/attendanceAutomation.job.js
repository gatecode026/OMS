/**
 * @file src/jobs/attendanceAutomation.job.js
 * @description Background cron job to execute Attendance Automation Policies (Auto Punch-Out, Reminders, HOD Alerts).
 */

import { getTenantConnection } from '../utils/multidbConnection.js';
import Company from '../modules/companies/company.model.js';
import logger from '../config/logger.js';
import { createNotification } from '../modules/notifications/notifications.service.js';
import mongoose from 'mongoose';
// Pre-import model files so schemas are guaranteed to be registered in global Mongoose
import '../modules/attendance/attendance.model.js';
import '../modules/employees/employees.model.js';
import '../modules/leaves/leaves.model.js';
import '../modules/settings/settings.model.js';


// Track execution dates to prevent duplicate runs in the same minute/hour
const lastRunState = {
  autoPunchOut: {},      // companyId: last_run_date_string
  reminders: {},        // companyId: last_run_date_string
  missingAlerts: {}     // companyId: last_run_date_string
};

/**
 * Executes attendance automation rules across all active companies
 */
export const checkAttendanceAutomation = async () => {
  const now = new Date();
  
  // Find all active companies
  const companies = await Company.find({ tenantStatus: 'active', status: 'Active' }).lean();

  for (const company of companies) {
    const companyId = company.id;
    try {
      const conn = await getTenantConnection(companyId);
      if (!conn) continue;

      // Ensure model is registered
      const AttendanceModel = conn.models['Attendance'] || conn.model('Attendance', mongoose.model('Attendance').schema);
      const EmployeeModel = conn.models['Employee'] || conn.model('Employee', mongoose.model('Employee').schema);
      const SystemSettingsModel = conn.models['SystemSettings'] || conn.model('SystemSettings', mongoose.model('SystemSettings').schema);
      const LeaveModel = conn.models['Leave'] || conn.model('Leave', mongoose.model('Leave').schema);

      // Fetch global settings
      const settings = await SystemSettingsModel.findOne({ key: 'global' }).lean();
      const rules = settings?.attendanceRules || {};
      
      const timezone = settings?.generalSettings?.timezone || 'Asia/Kolkata';

      // Get current hour:minute and date in company's timezone
      let timeStr, dateStr;
      try {
        const formatterTime = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        const partsT = formatterTime.formatToParts(now);
        let hour = partsT.find(p => p.type === 'hour').value;
        const minute = partsT.find(p => p.type === 'minute').value;
        if (hour === '24') hour = '00';
        timeStr = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;

        const formatterDate = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        const partsD = formatterDate.formatToParts(now);
        const year = partsD.find(p => p.type === 'year').value;
        const month = partsD.find(p => p.type === 'month').value;
        const day = partsD.find(p => p.type === 'day').value;
        dateStr = `${year}-${month}-${day}`;
      } catch (err) {
        // Fallback to IST / Local
        const d = now;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hour = String(d.getHours()).padStart(2, '0');
        const minute = String(d.getMinutes()).padStart(2, '0');
        timeStr = `${hour}:${minute}`;
        dateStr = `${year}-${month}-${day}`;
      }

      // Helper: parse "HH:MM" to minutes
      const parseTimeToMinutes = (tStr) => {
        if (!tStr || !tStr.includes(':')) return 0;
        const [h, m] = tStr.split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
      };

      // ─── 1. AUTO PUNCH-OUT ──────────────────────────────────────────────────
      if (rules.autoPunchOut && rules.punchOutTime) {
        const cutoffMinutes = parseTimeToMinutes(rules.punchOutTime);
        const currentMinutes = parseTimeToMinutes(timeStr);

        // Run if current time is at or after cutoff, and not already run today
        if (currentMinutes >= cutoffMinutes && lastRunState.autoPunchOut[companyId] !== dateStr) {
          logger.info(`[AttendanceAutomationJob] Running Auto Punch-Out for tenant ${companyId} at cutoff time ${rules.punchOutTime}`);

          const activeRecords = await AttendanceModel.find({
            date: dateStr,
            punchIn: { $ne: '--:--' },
            punchOut: '--:--'
          });

          for (const rec of activeRecords) {
            const minIn = parseTimeToMinutes(rec.punchIn);
            const totalHours = parseFloat(((cutoffMinutes - minIn) / 60).toFixed(2));

            await AttendanceModel.updateOne(
              { _id: rec._id },
              {
                $set: {
                  punchOut: rules.punchOutTime,
                  totalHours: totalHours > 0 ? totalHours : 0,
                  notes: rec.notes ? `${rec.notes} (Auto Punched Out)` : 'Auto Punched Out'
                }
              }
            );

            // Send notification to employee
            await createNotification(rec.employeeId, companyId, {
              type: 'attendance',
              title: 'Auto Punch-Out Executed',
              message: `Your attendance record for ${dateStr} has been automatically punched out at ${rules.punchOutTime}.`,
              priority: 'normal'
            });
          }

          lastRunState.autoPunchOut[companyId] = dateStr;
        }
      }

      // ─── 2. ATTENDANCE REMINDER (5 Minutes After Shift Start) ────────────────
      const shiftStartTime = rules.startTime || '09:00';
      const startMinutes = parseTimeToMinutes(shiftStartTime);
      const currentMinutes = parseTimeToMinutes(timeStr);
      const reminderMinutes = startMinutes + 5;

      if (currentMinutes >= reminderMinutes && lastRunState.reminders[companyId] !== dateStr) {
        logger.info(`[AttendanceAutomationJob] Triggering 5-Min Post-Shift Punch-In Reminder for tenant ${companyId}`);

        const activeEmployees = await EmployeeModel.find({ status: 'Active' }).lean();

        for (const employee of activeEmployees) {
          const punchedToday = await AttendanceModel.findOne({
            employeeId: employee.id,
            date: dateStr
          });

          if (!punchedToday) {
            await createNotification(employee.id, companyId, {
              type: 'attendance',
              title: 'Attendance Punch-In Reminder',
              message: `Good morning ${employee.name}! Your shift started at ${shiftStartTime} (5 mins ago). Please punch in to avoid being marked Absent.`,
              priority: 'high'
            });
          }
        }

        lastRunState.reminders[companyId] = dateStr;
      }

      // ─── 3. AUTO MARK ABSENT (If still unpunched 30 Mins After Shift Start) ────────
      const absentCutoffMinutes = startMinutes + 30;

      if (currentMinutes >= absentCutoffMinutes && lastRunState.missingAlerts[companyId] !== dateStr) {
        logger.info(`[AttendanceAutomationJob] Executing Auto-Mark Absent for tenant ${companyId}`);

        const activeEmployees = await EmployeeModel.find({ status: 'Active' }).lean();

        for (const employee of activeEmployees) {
          const punchedToday = await AttendanceModel.findOne({
            employeeId: employee.id,
            date: dateStr
          });

          if (!punchedToday) {
            // Check if employee is on approved leave today
            const activeLeave = await LeaveModel.findOne({
              employeeId: employee.id,
              status: 'Approved',
              fromDate: { $lte: dateStr },
              toDate: { $gte: dateStr }
            });

            if (!activeLeave) {
              // 1. Create Attendance record with status 'Absent'
              await AttendanceModel.create({
                id: `ATT-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
                companyId,
                employeeId: employee.id,
                employeeName: employee.name,
                department: employee.department || 'General',
                branch: employee.branch || 'Main',
                date: dateStr,
                status: 'Absent',
                workMode: 'Office',
                punchIn: '--:--',
                punchOut: '--:--',
                totalHours: 0,
                notes: `System Auto-Marked Absent (No Punch-In 30 mins after ${shiftStartTime} start)`
              });

              // 2. Update employee document status fields
              await EmployeeModel.updateOne(
                { id: employee.id },
                {
                  $set: {
                    todayPunchStatus: 'Absent',
                    attendanceStatus: 'Absent'
                  }
                }
              );

              // 3. Send notification to Employee
              await createNotification(employee.id, companyId, {
                type: 'attendance',
                title: 'Marked Absent for Today',
                message: `You did not punch in after shift start (${shiftStartTime}). You have been automatically marked Absent for today (${dateStr}).`,
                priority: 'high'
              });

              // 4. Send notification to Department Head / Admin
              const managers = await EmployeeModel.find({
                roleId: { $in: ['manager', 'branch_manager', 'hr', 'admin'] },
                status: 'Active'
              }).lean();

              for (const mgr of managers) {
                if (mgr.id !== employee.id) {
                  await createNotification(mgr.id, companyId, {
                    type: 'attendance',
                    title: 'Employee Marked Absent (Missing Punch)',
                    message: `Notice: Employee ${employee.name} (${employee.department || 'General'}) failed to punch in after shift start and has been automatically marked Absent.`,
                    priority: 'high'
                  });
                }
              }
            }
          }
        }

        lastRunState.missingAlerts[companyId] = dateStr;
      }

    } catch (err) {
      logger.error(`[AttendanceAutomationJob] Error executing attendance automation for tenant ${companyId}:`, err);
    }
  }
};

/**
 * Starts the attendance automation background checker
 */
export const startAttendanceAutomationJob = () => {
  logger.info('Initializing 1-minute Attendance Automation background job...');

  // Run checks once initially on startup after 8 seconds
  setTimeout(() => {
    checkAttendanceAutomation().catch(err => logger.error('[AttendanceAutomationJob] Error in initial run:', err));
  }, 8000);

  // Check every 1 minute (60000 ms)
  setInterval(async () => {
    try {
      await checkAttendanceAutomation();
    } catch (err) {
      logger.error('[AttendanceAutomationJob] Error in checkAttendanceAutomation cycle:', err);
    }
  }, 60000);
};

export default {
  checkAttendanceAutomation,
  startAttendanceAutomationJob
};
