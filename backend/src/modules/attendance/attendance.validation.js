/**
 * @file src/modules/attendance/attendance.validation.js
 * @description Validation schemas for Attendance module.
 */

export const createSchema = (data) => {
  const errors = [];
  if (!data || Object.keys(data).length === 0) {
    errors.push('Request payload body is empty');
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

export const qrPunchSchema = (data) => {
  const errors = [];
  if (!data || !data.employeeId) {
    errors.push('Employee ID is required for QR punch');
  }
  if (!data || !data.companyId) {
    errors.push('Company ID is required for QR punch');
  }
  return {
    isValid: errors.length === 0,
    errors
  };
};

export default {
  create: createSchema,
  update: updateSchema,
  qrPunch: qrPunchSchema
};
