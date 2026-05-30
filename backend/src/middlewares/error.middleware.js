/**
 * @file src/middlewares/error.middleware.js
 * @description Centralized global error handling middleware wrapper.
 */

import logger from '../config/logger.js';

export const errorMiddleware = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Standard log format
  logger.error(`[Error Handler] Routing Error: ${err.message}`, {
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  // Development VS Production responses
  if (process.env.NODE_ENV === 'development') {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      stack: err.stack,
      error: err,
    });
  }

  // Production response (clean sanitization)
  return res.status(err.statusCode).json({
    status: err.status,
    message: err.statusCode === 500 ? 'An unexpected internal server error occurred' : err.message,
  });
};

export default errorMiddleware;
