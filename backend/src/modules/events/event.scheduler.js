/**
 * @file src/modules/events/event.scheduler.js
 * @description Background scheduler querying MongoDB for upcoming meetings and sending notification reminders.
 */

import Event from './event.model.js';
import Employee from '../employees/employees.model.js';
import Admin from '../admin/admin.model.js';
import notificationRepository from '../notifications/notifications.repository.js';
import notificationService from '../notifications/notification.service.js';
import logger from '../../config/logger.js';

/**
 * Resolves current/future date and time strings in the organization's timezone.
 * @param {number} minutesOffset Offset in minutes from the current time.
 * @returns {{dateStr: string, timeStr: string}}
 */
const getFutureTimeStrings = (minutesOffset) => {
  const tz = process.env.ORG_TIMEZONE || 'Asia/Kolkata';
  const now = new Date();
  const futureDate = new Date(now.getTime() + minutesOffset * 60 * 1000);

  try {
    const formatterDate = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const partsD = formatterDate.formatToParts(futureDate);
    const year = partsD.find(p => p.type === 'year').value;
    const month = partsD.find(p => p.type === 'month').value;
    const day = partsD.find(p => p.type === 'day').value;
    const dateStr = `${year}-${month}-${day}`;

    const formatterTime = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const partsT = formatterTime.formatToParts(futureDate);
    let hour = partsT.find(p => p.type === 'hour').value;
    const minute = partsT.find(p => p.type === 'minute').value;
    if (hour === '24') hour = '00';
    const timeStr = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;

    return { dateStr, timeStr };
  } catch (error) {
    logger.warn(`Failed resolving future time strings for timezone ${tz}. Error: ${error.message}`);
    // Local fallback
    const d = futureDate;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    return {
      dateStr: `${year}-${month}-${day}`,
      timeStr: `${hour}:${minute}`
    };
  }
};

/**
 * Processes reminders for a list of meetings.
 * @param {Array} events List of Event documents.
 * @param {string} remindedField Name of the tracking field ('reminded10' or 'reminded5').
 * @param {string} minutesString User-facing reminder message duration.
 */
const processReminders = async (events, remindedField, minutesString) => {
  if (!events || events.length === 0) return;

  const userIds = new Set();
  events.forEach(event => {
    if (event.createdBy) userIds.add(event.createdBy.toString());
    if (event.attendees && event.attendees.length > 0) {
      event.attendees.forEach(id => {
        if (id) userIds.add(id.toString());
      });
    }
  });

  const uniqueUserIds = Array.from(userIds);
  if (uniqueUserIds.length === 0) return;

  // Fetch all corresponding employees and admins
  const [employees, admins] = await Promise.all([
    Employee.find({ _id: { $in: uniqueUserIds } }).select('_id id name').lean(),
    Admin.find({ _id: { $in: uniqueUserIds } }).select('_id id name').lean()
  ]);

  const userMap = {};
  const mapUser = (u) => {
    userMap[u._id.toString()] = { id: u.id, name: u.name };
  };
  employees.forEach(mapUser);
  admins.forEach(mapUser);

  // Send reminders
  for (const event of events) {
    const creatorInfo = userMap[event.createdBy?.toString()];
    const creatorId = creatorInfo?.id || 'system';
    
    const recipients = new Set();
    if (event.createdBy) {
      const creatorCustomId = userMap[event.createdBy.toString()]?.id;
      if (creatorCustomId) recipients.add(creatorCustomId);
    }
    if (event.attendees) {
      event.attendees.forEach(att => {
        if (att) {
          const attendeeCustomId = userMap[att.toString()]?.id;
          if (attendeeCustomId) recipients.add(attendeeCustomId);
        }
      });
    }

    const todayStr = getFutureTimeStrings(0).dateStr;

    for (const recipientId of recipients) {
      try {
        await notificationService.createNotification(recipientId, event.companyId || 'COMP-001', {
          type: 'meeting',
          title: `Meeting Reminder (${minutesString})`,
          message: `Reminder: The ${event.type} "${event.title}" is starting in ${minutesString} at ${event.startTime}.`,
          data: {
            meetingId: event.id || event._id.toString(),
            action: 'reminder',
            senderName: creatorId
          }
        });
      } catch (err) {
        logger.error(`Failed sending reminder notification to recipient ${recipientId} for event ${event._id}:`, err);
      }
    }

    // Set flag in database to avoid duplicate reminders
    event[remindedField] = true;
    await event.save();
    logger.info(`Reminders (${minutesString}) sent successfully for event: "${event.title}" [${event._id}]`);
  }
};

/**
 * Checks for upcoming meetings in the next 10 and 5 minutes.
 */
const checkReminders = async () => {
  // 1. Check for meetings in exactly 10 minutes
  const { dateStr: date10, timeStr: time10 } = getFutureTimeStrings(10);
  const meetings10 = await Event.find({
    date: date10,
    startTime: time10,
    status: 'confirmed',
    reminded10: { $ne: true }
  });
  
  if (meetings10.length > 0) {
    logger.debug(`Found ${meetings10.length} meetings starting in 10 minutes at ${time10} (${date10}). Sending reminders.`);
    await processReminders(meetings10, 'reminded10', '10 minutes');
  }

  // 2. Check for meetings in exactly 5 minutes
  const { dateStr: date5, timeStr: time5 } = getFutureTimeStrings(5);
  const meetings5 = await Event.find({
    date: date5,
    startTime: time5,
    status: 'confirmed',
    reminded5: { $ne: true }
  });

  if (meetings5.length > 0) {
    logger.debug(`Found ${meetings5.length} meetings starting in 5 minutes at ${time5} (${date5}). Sending reminders.`);
    await processReminders(meetings5, 'reminded5', '5 minutes');
  }
};

/**
 * Starts the background loop.
 */
export const startEventScheduler = () => {
  logger.info('Initializing Meetings Reminder background scheduler...');
  
  // Run checks once initially on startup after a 5 second grace period
  setTimeout(() => {
    checkReminders().catch(err => logger.error('Error in initial checkReminders run:', err));
  }, 5000);

  // Then check every 60 seconds
  setInterval(async () => {
    try {
      await checkReminders();
    } catch (err) {
      logger.error('Error running checkReminders scheduler cycle:', err);
    }
  }, 60000);
};

export default {
  startEventScheduler
};
