/**
 * @file src/modules/attendance-corrections/attendance-correction.validation.js
 * @description Custom request validation schemas for Attendance Corrections.
 */

export const createSchema = (data) => {
  const errors = [];
  if (!data) {
    errors.push('Request payload body is empty');
    return { isValid: false, errors };
  }

  const { date, correctionType, requestedStatus, reason } = data;

  if (!date) errors.push('Date is required');
  if (!correctionType) errors.push('Correction Type is required');
  if (!requestedStatus) errors.push('Requested Status is required');
  if (!reason) errors.push('Reason for correction is required');

  // Verify format of punch times if provided (supports HH:MM, HH:MM:SS, and 12h hh:mm AM/PM)
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?(\s*(AM|PM))?$/i;
  if (data.requestedPunchIn && data.requestedPunchIn !== '--:--') {
    if (!timeRegex.test(data.requestedPunchIn)) {
      errors.push('Requested Punch In must be in valid time format (e.g. HH:MM or HH:MM AM/PM)');
    }
  }
  if (data.requestedPunchOut && data.requestedPunchOut !== '--:--') {
    if (!timeRegex.test(data.requestedPunchOut)) {
      errors.push('Requested Punch Out must be in valid time format (e.g. HH:MM or HH:MM AM/PM)');
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
  }
  return {
    isValid: errors.length === 0,
    errors
  };
};

export default {
  create: createSchema,
  update: updateSchema
};
