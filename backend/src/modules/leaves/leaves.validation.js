/**
 * @file src/modules/leaves/leaves.validation.js
 * @description Validation schemas for Leaves module.
 */

export const createSchema = (data) => {
  const errors = [];
  if (!data || Object.keys(data).length === 0) {
    errors.push('Request payload body is empty');
  }
  if (data && data.fromDate) {
    const today = new Date().toISOString().split('T')[0];
    if (data.fromDate < today) {
      errors.push('Start date cannot be before today');
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
