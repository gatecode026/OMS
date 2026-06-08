/**
 * @file src/modules/appraisal-reviews/appraisal-reviews.validation.js
 * @description Validation schemas for Appraisal Reviews module.
 */

export const createSchema = (data) => {
  const errors = [];
  if (!data || Object.keys(data).length === 0) {
    errors.push('Request payload body is empty');
  }
  if (!data.employeeName) {
    errors.push('employeeName is required');
  }
  if (!data.employeeId) {
    errors.push('employeeId is required');
  }
  if (!data.notes) {
    errors.push('notes is required');
  }
  return {
    isValid: errors.length === 0,
    errors
  };
};

export default {
  create: createSchema
};
