/**
 * @file src/middlewares/validation.middleware.js
 * @description Standard express validation runner hook.
 */

import logger from '../config/logger.js';

/**
 * Validates request payload based on custom module validations schemas.
 * @param {Function} validationSchema - Validator function returning boolean/errors.
 */
export const validateRequest = (validationSchema) => {
  return (req, res, next) => {
    try {
      if (!validationSchema) return next();
      
      const { isValid, errors } = validationSchema(req.body);
      
      if (!isValid) {
        logger.warn(`Request validation failed for route: ${req.originalUrl}`, errors);
        return res.status(400).json({
          status: 'fail',
          message: 'Validation failed. Input details are incomplete or incorrect.',
          errors,
        });
      }
      
      next();
    } catch (error) {
      logger.error('Request validation framework crashed:', error);
      next(error);
    }
  };
};

export default validateRequest;
