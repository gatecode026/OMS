/**
 * @file src/middlewares/logger.middleware.js
 * @description Out-of-the-box performance metrics and API request auditing log triggers.
 */

import logger from '../config/logger.js';

export const loggerMiddleware = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.debug(`${req.method} ${req.originalUrl} - status: ${res.statusCode} | elapsed: ${duration}ms`);
  });

  next();
};

export default loggerMiddleware;
