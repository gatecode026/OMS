/**
 * @file src/modules/leaves/leaves.validation.js
 * @description Validation schemas for Leaves module.
 */

export const createSchema = (data) => {
  const errors = [];
  if (!data || Object.keys(data).length === 0) {
    errors.push('Request payload body is empty');
    return { isValid: false, errors };
  }

  if (!data.type || !data.type.trim()) {
    errors.push('Leave type is required');
  }

  if (!data.fromDate) {
    errors.push('Start date is required');
  }

  if (!data.toDate) {
    errors.push('End date is required');
  }

  if (data.fromDate && data.toDate) {
    if (data.toDate < data.fromDate) {
      errors.push('End date cannot be before start date');
    }

    const today = new Date().toISOString().split('T')[0];
    if (data.fromDate < today) {
      errors.push('Start date cannot be before today');
    }

    const start = new Date(data.fromDate);
    const end = new Date(data.toDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      errors.push('Invalid date format');
    } else {
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      if (diffDays > 365) {
        errors.push('Leave request duration cannot exceed 365 days');
      }
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

  if (data.fromDate && data.toDate) {
    if (data.toDate < data.fromDate) {
      errors.push('End date cannot be before start date');
    }

    const start = new Date(data.fromDate);
    const end = new Date(data.toDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      errors.push('Invalid date format');
    } else {
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      if (diffDays > 365) {
        errors.push('Leave request duration cannot exceed 365 days');
      }
    }
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
