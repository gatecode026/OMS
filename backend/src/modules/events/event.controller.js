/**
 * @file src/modules/events/event.controller.js
 * @description Controllers implementing business logic and validation for Event / Meeting resources.
 */

import Event from './event.model.js';
import Employee from '../employees/employees.model.js';
import Admin from '../admin/admin.model.js';
import Company from '../companies/company.model.js';
import notificationRepository from '../notifications/notifications.repository.js';
import SystemSettings from '../settings/settings.model.js';
import logger from '../../config/logger.js';
import asyncHandler from '../../utils/asyncHandler.js';

/**
 * Gets today's date formatted as YYYY-MM-DD in the ORG_TIMEZONE.
 * @returns {string} YYYY-MM-DD
 */
const getTodayString = () => {
  const tz = process.env.ORG_TIMEZONE || 'Asia/Kolkata';
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = formatter.formatToParts(new Date());
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    return `${year}-${month}-${day}`;
  } catch (error) {
    logger.warn(`Failed resolving date for timezone ${tz}, falling back to local. Error: ${error.message}`);
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
};

/**
 * Gets the current time formatted as HH:mm in the ORG_TIMEZONE.
 * @returns {string} HH:mm
 */
const getCurrentTimeFormatted = () => {
  const tz = process.env.ORG_TIMEZONE || 'Asia/Kolkata';
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const parts = formatter.formatToParts(new Date());
    let hour = parts.find(p => p.type === 'hour').value;
    const minute = parts.find(p => p.type === 'minute').value;
    if (hour === '24') hour = '00';
    return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  } catch (error) {
    logger.warn(`Failed resolving time for timezone ${tz}, falling back to local. Error: ${error.message}`);
    const d = new Date();
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    return `${hour}:${minute}`;
  }
};

/**
 * Resolves a custom string user ID to a database document with its _id.
 * Queries Employee, falling back to Admin, and Company if not found.
 */
const resolveUserByStringId = async (stringId) => {
  if (!stringId) return null;
  let user = await Employee.findOne({ id: stringId }).select('_id id name avatar photoUrl roleId').lean();
  if (!user) {
    user = await Admin.findOne({ id: stringId }).select('_id id name avatar photoUrl roleId').lean();
  }
  if (!user) {
    const comp = await Company.findOne({ id: stringId }).select('_id id name').lean();
    if (comp) {
      user = {
        _id: comp._id,
        id: comp.id,
        name: comp.name,
        roleId: 'company_admin'
      };
    }
  }
  return user;
};

/**
 * Resolves an array of custom string user IDs to database documents.
 */
const resolveUsersByStringIds = async (stringIds) => {
  if (!stringIds || stringIds.length === 0) return [];
  const employees = await Employee.find({ id: { $in: stringIds } }).select('_id id name avatar photoUrl roleId').lean();
  const admins = await Admin.find({ id: { $in: stringIds } }).select('_id id name avatar photoUrl roleId').lean();
  const companies = await Company.find({ id: { $in: stringIds } }).select('_id id name').lean();
  const mappedCompanies = companies.map(c => ({
    _id: c._id,
    id: c.id,
    name: c.name,
    roleId: 'company_admin'
  }));
  return [...employees, ...admins, ...mappedCompanies];
};

/**
 * Post-processes queried events to populate attendees and creators.
 * Avoids N+1 query limits and aggregates avatarUrl details.
 */
const populateEvents = async (events) => {
  if (!events || events.length === 0) return [];

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
  if (uniqueUserIds.length === 0) return events;

  const [employees, admins] = await Promise.all([
    Employee.find({ _id: { $in: uniqueUserIds } }).select('_id id name avatar photoUrl').lean(),
    Admin.find({ _id: { $in: uniqueUserIds } }).select('_id id name avatar photoUrl').lean()
  ]);

  const userMap = {};
  const mapUser = (u) => {
    userMap[u._id.toString()] = {
      _id: u._id,
      id: u.id,
      name: u.name,
      avatarUrl: u.avatar || u.photoUrl || ''
    };
  };

  employees.forEach(mapUser);
  admins.forEach(mapUser);

  return events.map(event => {
    const eventObj = event.toObject ? event.toObject() : event;
    const creatorStr = eventObj.createdBy ? eventObj.createdBy.toString() : '';
    eventObj.createdBy = userMap[creatorStr] || null;

    eventObj.attendees = (eventObj.attendees || [])
      .map(id => userMap[id ? id.toString() : ''])
      .filter(Boolean);

    return eventObj;
  });
};

/**
 * Checks whether a user holds administrative or HR roles.
 */
const isAdminOrHr = (user) => {
  if (!user || !user.role) return false;
  const role = user.role.toLowerCase();
  return (
    role === 'super_admin' ||
    role === 'admin' ||
    role === 'hr' ||
    role === 'hr_manager' ||
    role.includes('admin') ||
    role.includes('hr')
  );
};

/**
 * Gets office timings from database settings.
 * @returns {Promise<{startTime: string, endTime: string}>}
 */
const getOfficeTimings = async () => {
  try {
    const settings = await SystemSettings.findOne({ key: 'global' }).lean();
    if (settings && settings.attendanceRules) {
      const { startTime, endTime } = settings.attendanceRules;
      return {
        startTime: startTime || '09:00',
        endTime: endTime || '18:00'
      };
    }
  } catch (error) {
    logger.warn(`Failed fetching office timings from database settings: ${error.message}. Using default 09:00 - 18:00.`);
  }
  return { startTime: '09:00', endTime: '18:00' };
};

/**
 * Validates payload parameters.
 */
const validateEventData = async (data, isUpdate = false) => {
  const EVENT_TYPES = ["meeting", "reminder", "audit", "review", "one-on-one"];

  if (!isUpdate || data.title !== undefined) {
    if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
      return { isValid: false, error: "title is required" };
    }
  }

  if (!isUpdate || data.type !== undefined) {
    if (!data.type || !EVENT_TYPES.includes(data.type)) {
      return { isValid: false, error: "Invalid event type" };
    }
  }

  if (!isUpdate || data.date !== undefined) {
    if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
      return { isValid: false, error: "date must be in YYYY-MM-DD format" };
    }
  }

  const officeTimings = await getOfficeTimings();
  const officeStart = officeTimings.startTime;
  const officeEnd = officeTimings.endTime;

  if (!isUpdate || data.startTime !== undefined) {
    if (!data.startTime || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(data.startTime)) {
      return { isValid: false, error: "startTime must be in HH:mm format" };
    }
    // Enforce Office Hours
    if (data.startTime < officeStart || data.startTime > officeEnd) {
      return { isValid: false, error: `Meetings must be scheduled between ${officeStart} and ${officeEnd}` };
    }
  }

  if (data.endTime !== undefined && data.endTime !== null && data.endTime !== "") {
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(data.endTime)) {
      return { isValid: false, error: "endTime must be in HH:mm format" };
    }
    // Enforce Office Hours
    if (data.endTime < officeStart || data.endTime > officeEnd) {
      return { isValid: false, error: `Meetings must be scheduled between ${officeStart} and ${officeEnd}` };
    }
  }

  // Cross validate startTime & endTime
  const startTime = data.startTime;
  const endTime = data.endTime;
  if (startTime && endTime) {
    if (endTime <= startTime) {
      return { isValid: false, error: "endTime must be after startTime" };
    }
  }

  return { isValid: true };
};

/**
 * Checks for conflicts and returns a warning string if any attendee or the creator is already booked.
 */
const checkDoubleBooking = async (date, startTime, endTime, attendeeObjectIds, creatorObjectId, excludeEventId = null) => {
  const allUserIds = [...attendeeObjectIds];
  if (creatorObjectId) {
    allUserIds.push(creatorObjectId);
  }

  if (allUserIds.length === 0) return null;

  const query = {
    date,
    $or: [
      { createdBy: { $in: allUserIds } },
      { attendees: { $in: allUserIds } }
    ]
  };

  if (excludeEventId) {
    query._id = { $ne: excludeEventId };
  }

  const conflictingEvents = await Event.find(query);
  const s1 = startTime;
  const e1 = endTime || startTime;

  for (const event of conflictingEvents) {
    const s2 = event.startTime;
    const e2 = event.endTime || event.startTime;
    if (s1 < e2 && s2 < e1) {
      const conflictedUserIds = [];
      const checkedUserIdsStr = allUserIds.map(id => id.toString());

      if (checkedUserIdsStr.includes(event.createdBy.toString())) {
        conflictedUserIds.push(event.createdBy.toString());
      }
      event.attendees.forEach(att => {
        if (att && checkedUserIdsStr.includes(att.toString())) {
          conflictedUserIds.push(att.toString());
        }
      });

      if (conflictedUserIds.length > 0) {
        const employees = await Employee.find({ _id: { $in: conflictedUserIds } }).select('name').lean();
        const admins = await Admin.find({ _id: { $in: conflictedUserIds } }).select('name').lean();
        const names = [...employees, ...admins].map(u => u.name).join(', ');
        return `Warning: ${names} is already booked for "${event.title}" at ${event.startTime}`;
      }
    }
  }
  return null;
};

/**
 * GET /api/events
 * Fetch events within a date range.
 */
export const getEvents = asyncHandler(async (req, res) => {
  const { from, to, type } = req.query;

  // Validate YYYY-MM-DD query parameters
  if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return res.status(400).json({ error: "date must be in YYYY-MM-DD format" });
  }
  if (from > to) {
    return res.status(400).json({ error: "from date must be before or equal to to date" });
  }

  let query = {
    date: { $gte: from, $lte: to }
  };

  if (type) {
    query.type = type;
  }

  // Visibility boundary checks: admin/hr view everything, employees view owned or attendee events
  if (!isAdminOrHr(req.user)) {
    const dbUser = await resolveUserByStringId(req.user.id);
    if (!dbUser) {
      return res.status(401).json({ error: "Authenticated user not found in database" });
    }
    query.$or = [
      { createdBy: dbUser._id },
      { attendees: dbUser._id }
    ];
  }

  const events = await Event.find(query).sort({ date: 1, startTime: 1 });
  const populatedEvents = await populateEvents(events);

  return res.status(200).json(populatedEvents);
});

/**
 * GET /api/events/upcoming
 * Fetch upcoming events.
 */
export const getUpcomingEvents = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;
  const today = getTodayString();
  const currentTime = getCurrentTimeFormatted();

  // Filter events where date > today OR (date === today AND startTime >= currentTime)
  let query = {
    $or: [
      { date: { $gt: today } },
      {
        $and: [
          { date: today },
          { startTime: { $gte: currentTime } }
        ]
      }
    ]
  };

  if (!isAdminOrHr(req.user)) {
    const dbUser = await resolveUserByStringId(req.user.id);
    if (!dbUser) {
      return res.status(401).json({ error: "Authenticated user not found in database" });
    }
    query = {
      $and: [
        query,
        {
          $or: [
            { createdBy: dbUser._id },
            { attendees: dbUser._id }
          ]
        }
      ]
    };
  }

  const events = await Event.find(query)
    .sort({ date: 1, startTime: 1 })
    .limit(limit);

  const populatedEvents = await populateEvents(events);
  return res.status(200).json(populatedEvents);
});

/**
 * GET /api/events/stats
 * Return faceted meeting, reminder, and today counts.
 */
export const getEventStats = asyncHandler(async (req, res) => {
  const { from, to } = req.query;

  if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return res.status(400).json({ error: "date must be in YYYY-MM-DD format" });
  }
  if (from > to) {
    return res.status(400).json({ error: "from date must be before or equal to to date" });
  }

  const today = getTodayString();
  let matchStage = {};

  if (!isAdminOrHr(req.user)) {
    const dbUser = await resolveUserByStringId(req.user.id);
    if (!dbUser) {
      return res.status(401).json({ error: "Authenticated user not found in database" });
    }
    matchStage = {
      $or: [
        { createdBy: dbUser._id },
        { attendees: dbUser._id }
      ]
    };
  }

  const pipeline = [
    { $match: matchStage },
    {
      $facet: {
        todayCount: [
          { $match: { date: today } },
          { $count: "count" }
        ],
        meetingsCount: [
          {
            $match: {
              type: "meeting",
              date: { $gte: from, $lte: to }
            }
          },
          { $count: "count" }
        ],
        remindersCount: [
          {
            $match: {
              type: "reminder",
              date: { $gte: from, $lte: to }
            }
          },
          { $count: "count" }
        ],
        allEventsCount: [
          {
            $match: {
              date: { $gte: from, $lte: to }
            }
          },
          { $count: "count" }
        ]
      }
    }
  ];

  const statsResult = await Event.aggregate(pipeline);
  const stats = statsResult[0] || {};

  return res.status(200).json({
    todayCount: stats.todayCount?.[0]?.count || 0,
    meetingsCount: stats.meetingsCount?.[0]?.count || 0,
    remindersCount: stats.remindersCount?.[0]?.count || 0,
    allEventsCount: stats.allEventsCount?.[0]?.count || 0
  });
});

/**
 * POST /api/events
 * Create a new event and emit notifications.
 */
export const createEvent = asyncHandler(async (req, res) => {
  const validation = await validateEventData(req.body);
  if (!validation.isValid) {
    return res.status(400).json({ error: validation.error });
  }

  const today = getTodayString();
  if (req.body.date < today) {
    return res.status(400).json({ error: "Cannot schedule events before today" });
  }

  const { title, type, date, startTime, endTime, location, description, attendees, color } = req.body;

  const creator = await resolveUserByStringId(req.user.id);
  if (!creator) {
    return res.status(401).json({ error: "Authenticated user not found in database" });
  }

  // Validate attendee string IDs
  let attendeeObjectIds = [];
  let matchedUsers = [];
  if (attendees && attendees.length > 0) {
    matchedUsers = await resolveUsersByStringIds(attendees);
    if (matchedUsers.length !== attendees.length) {
      return res.status(400).json({ error: "One or more attendees not found" });
    }
    attendeeObjectIds = matchedUsers.map(u => u._id);
  }

  // Self-attendee prevention
  attendeeObjectIds = attendeeObjectIds.filter(id => id.toString() !== creator._id.toString());

  // Check double-booking
  const warning = await checkDoubleBooking(date, startTime, endTime, attendeeObjectIds, creator._id);

  // Check if creator is a regular employee and if any attendee is a senior
  const isCreatorSenior = creator.roleId && (
    creator.roleId.toLowerCase().includes('admin') ||
    creator.roleId.toLowerCase().includes('manager') ||
    creator.roleId.toLowerCase().includes('leader') ||
    creator.roleId.toLowerCase().includes('tl') ||
    creator.roleId.toLowerCase().includes('hr')
  );

  let hasSeniorAttendee = false;
  if (!isCreatorSenior && matchedUsers && matchedUsers.length > 0) {
    hasSeniorAttendee = matchedUsers.some(u => {
      if (u._id.toString() === creator._id.toString()) return false;
      const role = (u.roleId || '').toLowerCase();
      return (
        role.includes('admin') ||
        role.includes('manager') ||
        role.includes('leader') ||
        role.includes('tl') ||
        role.includes('hr')
      );
    });
  }

  const eventStatus = hasSeniorAttendee ? 'pending' : 'confirmed';

  const newEvent = new Event({
    title,
    type,
    date,
    startTime,
    endTime: endTime || null,
    location: location || "",
    description: description || "",
    attendees: attendeeObjectIds,
    createdBy: creator._id,
    color: color || "#38bdf8",
    status: eventStatus
  });

  await newEvent.save();

  // Create notifications side-effect
  if (attendeeObjectIds.length > 0) {
    try {
      const attendeesStrings = matchedUsers.filter(u => u._id.toString() !== creator._id.toString()).map(u => u.id);
      for (const attendeeId of attendeesStrings) {
        const titleMsg = eventStatus === 'pending' ? 'New Meeting Request' : 'New Event Scheduled';
        const bodyMsg = eventStatus === 'pending'
          ? `${creator.name} has requested a meeting: "${title}" on ${date} at ${startTime}. Please approve or decline.`
          : `${creator.name} has scheduled a new ${type}: "${title}" on ${date} at ${startTime}.`;

        await notificationRepository.save({
          type: 'system',
          title: titleMsg,
          message: bodyMsg,
          recipientType: 'employee',
          recipientId: attendeeId,
          forUserId: attendeeId,
          sentBy: creator.id,
          sentDate: getTodayString()
        });
      }
    } catch (notifErr) {
      logger.error('Failed to trigger attendee notifications:', notifErr);
    }
  }

  const populated = await populateEvents([newEvent]);
  const responseData = populated[0];
  if (warning) {
    responseData.warning = warning;
  }
  return res.status(201).json(responseData);
});

/**
 * PATCH /api/events/:id
 * Update an existing event.
 */
export const updateEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) {
    return res.status(404).json({ error: "Event not found" });
  }

  const currentUser = await resolveUserByStringId(req.user.id);
  if (!currentUser) {
    return res.status(401).json({ error: "Authenticated user not found in database" });
  }

  const isCreator = event.createdBy.toString() === currentUser._id.toString();
  const isAdmin = isAdminOrHr(req.user);

  const isAttendee = event.attendees.some(attId => attId.toString() === currentUser._id.toString());
  const isUserSenior = currentUser.roleId && (
    currentUser.roleId.toLowerCase().includes('admin') ||
    currentUser.roleId.toLowerCase().includes('manager') ||
    currentUser.roleId.toLowerCase().includes('leader') ||
    currentUser.roleId.toLowerCase().includes('tl') ||
    currentUser.roleId.toLowerCase().includes('hr')
  );
  const isSeniorAttendee = isAttendee && isUserSenior;

  if (!isCreator && !isAdmin && !isSeniorAttendee) {
    return res.status(403).json({ error: "Not authorized to modify this event" });
  }

  // Senior attendees can only modify the status field
  if (!isCreator && !isAdmin && isSeniorAttendee) {
    const keys = Object.keys(req.body).filter(k => req.body[k] !== undefined);
    const updatingOtherFields = keys.some(k => k !== 'status');
    if (updatingOtherFields) {
      return res.status(403).json({ error: "Senior attendees are only permitted to update the status of this meeting request" });
    }
  }

  // Perform a merge of current values with updates to ensure start-end checks are validated correctly
  const mergedData = {
    title: req.body.title !== undefined ? req.body.title : event.title,
    type: req.body.type !== undefined ? req.body.type : event.type,
    date: req.body.date !== undefined ? req.body.date : event.date,
    startTime: req.body.startTime !== undefined ? req.body.startTime : event.startTime,
    endTime: req.body.endTime !== undefined ? req.body.endTime : event.endTime,
  };

  const validation = await validateEventData(mergedData, true);
  if (!validation.isValid) {
    return res.status(400).json({ error: validation.error });
  }

  const today = getTodayString();
  if (req.body.date !== undefined && req.body.date < today) {
    return res.status(400).json({ error: "Cannot schedule events before today" });
  }

  // Update properties if provided
  if (req.body.title !== undefined) event.title = req.body.title;
  if (req.body.type !== undefined) event.type = req.body.type;
  if (req.body.date !== undefined) event.date = req.body.date;
  if (req.body.startTime !== undefined) event.startTime = req.body.startTime;
  if (req.body.endTime !== undefined) event.endTime = req.body.endTime;
  if (req.body.location !== undefined) event.location = req.body.location;
  if (req.body.description !== undefined) event.description = req.body.description;
  if (req.body.color !== undefined) event.color = req.body.color;

  if (req.body.status !== undefined) {
    const oldStatus = event.status;
    const newStatus = req.body.status;
    if (newStatus !== oldStatus) {
      event.status = newStatus;
      try {
        const creatorDetails = await Employee.findById(event.createdBy).select('id name').lean() 
          || await Admin.findById(event.createdBy).select('id name').lean();
        if (creatorDetails) {
          const actionWord = newStatus === 'confirmed' ? 'approved' : newStatus === 'declined' ? 'declined' : 'updated';
          await notificationRepository.save({
            type: 'system',
            title: `Meeting Request ${newStatus === 'confirmed' ? 'Approved' : 'Declined'}`,
            message: `${currentUser.name} has ${actionWord} your meeting request: "${event.title}" on ${event.date} at ${event.startTime}.`,
            recipientType: 'employee',
            recipientId: creatorDetails.id,
            forUserId: creatorDetails.id,
            sentBy: currentUser.id,
            sentDate: getTodayString()
          });
        }
      } catch (err) {
        logger.error('Failed to notify creator on meeting status change:', err);
      }
    }
  }

  if (req.body.attendees !== undefined) {
    const attendeeStringIds = req.body.attendees;
    const matchedUsers = await resolveUsersByStringIds(attendeeStringIds);
    if (matchedUsers.length !== attendeeStringIds.length) {
      return res.status(400).json({ error: "One or more attendees not found" });
    }
    let updatedAttendeeIds = matchedUsers.map(u => u._id);

    // Self-attendee prevention
    updatedAttendeeIds = updatedAttendeeIds.filter(id => id.toString() !== currentUser._id.toString());
    event.attendees = updatedAttendeeIds;

    // Trigger update notification side-effect
    try {
      for (const attendeeId of attendeeStringIds) {
        if (attendeeId === req.user.id) continue;
        await notificationRepository.save({
          type: 'system',
          title: 'Event Details Updated',
          message: `${currentUser.name} has updated details for the event: "${event.title}".`,
          recipientType: 'employee',
          recipientId: attendeeId,
          forUserId: attendeeId,
          sentBy: currentUser.id,
          sentDate: getTodayString()
        });
      }
    } catch (notifErr) {
      logger.error('Failed to trigger update notifications:', notifErr);
    }
  }

  // Check double-booking warning after merge
  const warning = await checkDoubleBooking(
    mergedData.date,
    mergedData.startTime,
    mergedData.endTime,
    event.attendees,
    event.createdBy,
    event._id
  );

  await event.save();

  const populated = await populateEvents([event]);
  const responseData = populated[0];
  if (warning) {
    responseData.warning = warning;
  }
  return res.status(200).json(responseData);
});

/**
 * DELETE /api/events/:id
 * Delete an existing event.
 */
export const deleteEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) {
    return res.status(404).json({ error: "Event not found" });
  }

  const currentUser = await resolveUserByStringId(req.user.id);
  if (!currentUser) {
    return res.status(401).json({ error: "Authenticated user not found in database" });
  }

  const isCreator = event.createdBy.toString() === currentUser._id.toString();
  const isAdmin = isAdminOrHr(req.user);

  if (!isCreator && !isAdmin) {
    return res.status(403).json({ error: "Not authorized to modify this event" });
  }

  await Event.findByIdAndDelete(req.params.id);

  return res.status(200).json({ success: true, id: req.params.id });
});

export default {
  getEvents,
  getUpcomingEvents,
  getEventStats,
  createEvent,
  updateEvent,
  deleteEvent
};
