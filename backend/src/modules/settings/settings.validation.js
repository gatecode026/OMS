/**
 * @file src/modules/settings/settings.validation.js
 * @description Validation schemas for Settings module.
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

export default {
  create: createSchema,
  update: updateSchema
};
