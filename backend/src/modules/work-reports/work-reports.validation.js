/**
 * @file src/modules/work-reports/work-reports.validation.js
 * @description Validation schemas for WorkReports module with current-week date enforcement.
 */

/**
 * Returns the Monday (start) and Saturday (end) of the current week.
 * Week = Monday to Saturday. Future days within the week are excluded.
 */
export const getCurrentWeekBounds = () => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ... 6=Sat

  // Calculate Monday: if today is Sunday (0), Monday was 6 days ago
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - diffToMonday);

  // Saturday = Monday + 5
  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);

  const fmt = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  return {
    monday: fmt(monday),
    saturday: fmt(saturday),
    today: fmt(today)
  };
};

/**
 * Checks whether a date string (YYYY-MM-DD) falls within the current Mon-Sat week
 * and is not in the future.
 */
export const isCurrentWeekDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const { monday, saturday, today } = getCurrentWeekBounds();
  return dateStr >= monday && dateStr <= saturday && dateStr <= today;
};

/**
 * Statuses that employees can edit
 */
export const EMPLOYEE_EDITABLE_STATUSES = ['Draft', 'Submitted', 'Under Review', 'Escalated', 'Under Process', 'Rejected', 'Needs Revision', 'Changes Requested'];

/**
 * Statuses that are locked (no employee edits)
 */
export const LOCKED_STATUSES = ['Approved'];

export const createSchema = (data) => {
  const errors = [];

  if (!data || Object.keys(data).length === 0) {
    errors.push('Request payload body is empty');
    return { isValid: false, errors };
  }

  // Required fields
  if (!data.employeeId) errors.push('Employee ID is required');
  if (!data.employeeName) errors.push('Employee name is required');
  if (!data.department) errors.push('Department is required');
  if (!data.date) errors.push('Report date is required');
  if (!data.summary || !data.summary.trim()) errors.push('Daily work summary is required');
  if (!data.majorAccomplishments || !data.majorAccomplishments.trim()) errors.push('Major accomplishments are required');

  // Date validation: must be within current week and not in the future
  if (data.date && !isCurrentWeekDate(data.date)) {
    const { monday, today } = getCurrentWeekBounds();
    errors.push(`Report date must be within the current working week (${monday} to ${today}). Date "${data.date}" is not allowed.`);
  }

  // Tasks validation
  if (data.tasksCompleted !== undefined && data.tasksAssigned !== undefined) {
    if (Number(data.tasksCompleted) > Number(data.tasksAssigned)) {
      errors.push('Completed tasks cannot exceed assigned tasks');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const updateSchema = (data) => {
  const errors = [];

  if (!data || Object.keys(data).length === 0) {
    errors.push('Update request payload body is empty');
    return { isValid: false, errors };
  }

  // If updating the date, validate it's within current week
  if (data.date && !isCurrentWeekDate(data.date)) {
    const { monday, today } = getCurrentWeekBounds();
    errors.push(`Report date must be within the current working week (${monday} to ${today}). Date "${data.date}" is not allowed.`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export default {
  create: createSchema,
  update: updateSchema,
  isCurrentWeekDate,
  getCurrentWeekBounds,
  EMPLOYEE_EDITABLE_STATUSES,
  LOCKED_STATUSES
};
