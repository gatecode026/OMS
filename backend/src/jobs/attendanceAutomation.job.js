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

      // ─── 2. ATTENDANCE REMINDERS ────────────────────────────────────────────
      if (rules.attendanceReminders && rules.startTime) {
        const startMinutes = parseTimeToMinutes(rules.startTime);
        const currentMinutes = parseTimeToMinutes(timeStr);

        // Run when current time matches rules.startTime, and not run today
        if (currentMinutes >= startMinutes && lastRunState.reminders[companyId] !== dateStr) {
          logger.info(`[AttendanceAutomationJob] Triggering Attendance Reminders for tenant ${companyId}`);

          const activeEmployees = await EmployeeModel.find({ status: 'Active' }).lean();

          for (const employee of activeEmployees) {
            // Check if already punched in
            const punchedToday = await AttendanceModel.findOne({
              employeeId: employee.id,
              date: dateStr
            });

            if (!punchedToday) {
              await createNotification(employee.id, companyId, {
                type: 'attendance',
                title: 'Attendance Reminder',
                message: `Good morning ${employee.name}! Remember to punch in for work. Start time is ${rules.startTime}.`,
                priority: 'high'
              });
            }
          }

          lastRunState.reminders[companyId] = dateStr;
        }
      }

      // ─── 3. MISSING ATTENDANCE ALERTS ───────────────────────────────────────
      if (rules.missingAlerts && rules.startTime) {
        const startMinutes = parseTimeToMinutes(rules.startTime);
        const currentMinutes = parseTimeToMinutes(timeStr);
        // Alert trigger is set to 2 hours after standard start time
        const alertMinutes = startMinutes + 120;

        if (currentMinutes >= alertMinutes && lastRunState.missingAlerts[companyId] !== dateStr) {
          logger.info(`[AttendanceAutomationJob] Analyzing missing attendance for tenant ${companyId}`);

          const activeEmployees = await EmployeeModel.find({ status: 'Active' }).lean();

          for (const employee of activeEmployees) {
            // Check if has attendance record
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
                // Determine Department Head (HOD) or Admin/HR to alert
                const dept = employee.department;
                let managerId = null;

                if (dept) {
                  const departmentObj = (company.departments || []).find(d => d.name === dept);
                  if (departmentObj && departmentObj.head) {
                    // Try to find the HOD employee by name or ID to get their correct custom ID
                    const hodEmployee = await EmployeeModel.findOne({
                      $or: [
                        { id: departmentObj.head },
                        { name: departmentObj.head }
                      ]
                    }).lean();
                    if (hodEmployee) {
                      managerId = hodEmployee.id;
                    }
                  }
                }

                // If we found a valid HOD, alert them
                if (managerId) {
                  await createNotification(managerId, companyId, {
                    type: 'attendance',
                    title: 'Missing Attendance Alert',
                    message: `Alert: Employee ${employee.name} (${employee.department || 'No Dept'}) has not punched in today as of ${timeStr}.`,
                    priority: 'high'
                  });
                } else {
                  // Fallback: Notify admins/HR
                  const managers = await EmployeeModel.find({
                    roleId: { $in: ['manager', 'hr', 'admin'] },
                    status: 'Active'
                  }).lean();

                  for (const manager of managers) {
                    await createNotification(manager.id, companyId, {
                      type: 'attendance',
                      title: 'Missing Attendance Alert',
                      message: `Alert: Employee ${employee.name} (${employee.department || 'No Dept'}) has not punched in today as of ${timeStr}.`,
                      priority: 'high'
                    });
                  }
                }
              }
            }
          }

          lastRunState.missingAlerts[companyId] = dateStr;
        }
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
