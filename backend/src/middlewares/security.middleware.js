/**
 * @file src/middlewares/security.middleware.js
 * @description Express middlewares for NoSQL Injection prevention, XSS escaping, request correlation tracking, and Redis rate limiting.
 */

import crypto from 'crypto';
import { runWithCorrelation } from '../utils/correlationContext.js';
import { sanitizeNoSql, sanitizeXss, validateFileUpload } from '../services/security.service.js';
import { checkRateLimit } from '../services/rateLimiter.service.js';
import { incrementMetric, recordComponentLatency } from '../services/monitoring.service.js';
import logger from '../config/logger.js';

/**
 * Attaches a unique correlation ID to the request and scopes it under AsyncLocalStorage.
 */
export const correlationMiddleware = (req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] || req.headers['x-request-id'] || crypto.randomUUID();
  req.id = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  // Store globally as a fallback for non-http contexts
  global._activeCorrelationId = correlationId;

  // Track HTTP API request latency
  const start = performance.now();
  res.on('finish', () => {
    const end = performance.now();
    const duration = end - start;
    recordComponentLatency('api', duration);
    incrementMetric('totalHttpRequests');
    if (res.statusCode >= 400) {
      incrementMetric('failedHttpRequests');
    }
  });

  runWithCorrelation(correlationId, next);
};

/**
 * Sanitizes req.body, req.query, and req.params from NoSQL injections and XSS.
 */
export const sanitizeInputMiddleware = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeNoSql(req.body);
    req.body = sanitizeXss(req.body);
  }
  if (req.query) {
    req.query = sanitizeNoSql(req.query);
    req.query = sanitizeXss(req.query);
  }
  if (req.params) {
    req.params = sanitizeNoSql(req.params);
    req.params = sanitizeXss(req.params);
  }
  next();
};

/**
 * Factory for creating Redis-backed distributed rate limiting middlewares.
 * @param {String} prefix - Prefix identifier (e.g. 'login', 'api')
 * @param {Number} limit - Allowed hits in window
 * @param {Number} windowSeconds - Expire window in seconds
 */
export const rateLimiterMiddleware = (prefix, limit, windowSeconds = 60) => {
  return async (req, res, next) => {
    // Generate rate limiting key by IP address
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const key = `rate:${prefix}:${ip}`;

    const check = await checkRateLimit(key, limit, windowSeconds);
    
    // Set headers
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - check.current));
    res.setHeader('X-RateLimit-Reset', check.ttl);

    if (!check.allowed) {
      return res.status(429).json({
        status: 'fail',
        message: `Too many requests. Please try again in ${check.ttl} seconds.`,
        retryAfter: check.ttl
      });
    }

    next();
  };
};

/**
 * Middleware validating file uploads for size, type, and malware signatures.
 */
export const fileUploadSecurityMiddleware = (req, res, next) => {
  // Check if multer or multipart parser populated req.file or req.files
  const files = [];
  if (req.file) files.push(req.file);
  if (req.files) {
    if (Array.isArray(req.files)) {
      files.push(...req.files);
    } else if (typeof req.files === 'object') {
      Object.keys(req.files).forEach(fieldName => {
        files.push(...(Array.isArray(req.files[fieldName]) ? req.files[fieldName] : [req.files[fieldName]]));
      });
    }
  }

  for (const file of files) {
    const check = validateFileUpload(file);
    if (!check.isValid) {
      logger.warn(`[Security] File upload rejected: ${check.reason} (file: ${file.originalname || file.name})`);
      return res.status(400).json({
        status: 'fail',
        message: `File upload rejected: ${check.reason}`
      });
    }
  }

  next();
};

export default {
  correlationMiddleware,
  sanitizeInputMiddleware,
  rateLimiterMiddleware,
  fileUploadSecurityMiddleware
};
