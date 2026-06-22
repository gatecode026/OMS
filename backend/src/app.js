/**
 * @file src/app.js
 * @description Main Express application instance configuration. Sets up middlewares, modular routing, and error handlers.
 * @author Antigravity
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';

// Configuration Imports
import corsOptions from './config/cors.js';
import logger from './config/logger.js';

// Middleware Imports
import { errorMiddleware } from './middlewares/error.middleware.js';
import { loggerMiddleware } from './middlewares/logger.middleware.js';

// Global Router Import
import globalRouter from './routes/index.js';
import eventRoutes from './routes/eventRoutes.js';
import adminRouter from './modules/admin/admin.routes.js';
import { authenticate } from './middlewares/auth.middleware.js';
import { tenantMiddleware } from './middlewares/tenant.middleware.js';
import { checkRoleAccess } from './middlewares/roleGuard.middleware.js';
import publicRouter from './modules/companies/public.routes.js';

const app = express();


// ─── SECURITY MIDDLEWARES ────────────────────────────────────────────────────
app.use(helmet());
app.use(cors(corsOptions));

// Sanitize MongoDB inputs to prevent Query Injection attacks
app.use(mongoSanitize());

// Rate Limiting Config
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 10000 : 100, // Limit each IP to 10000 requests in dev, 100 in production
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 15, // Limit each IP to 1000 attempts in dev, 15 in production
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    message: 'Too many login attempts from this IP, please try again after 15 minutes.'
  }
});

// Apply rate limiting
app.use('/api', generalLimiter);
app.use('/api/v1/auth', authLimiter);

// ─── REQUEST PARSING ─────────────────────────────────────────────────────────
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

// ─── REQUEST LOGGING ─────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
}
app.use(loggerMiddleware);

// ─── STATIC FILE VAULT ───────────────────────────────────────────────────────
app.use('/uploads', express.static('uploads'));

// ─── HEALTH CHECK ROUTE ──────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Gatecode OMS Workforce Backend API is fully operational',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ─── PUBLIC BRANDING ROUTES ──────────────────────────────────────────────────
app.use('/api/public', publicRouter);

// ─── GLOBAL MODULAR ROUTING BINDING ─────────────────────────────────────────
app.use('/api/v1', (req, res, next) => {
  if (req.path.startsWith('/auth')) {
    return next();
  }
  return authenticate(req, res, () => {
    checkRoleAccess(req, res, () => {
      tenantMiddleware(req, res, next);
    });
  });
});

app.use('/api/v1', globalRouter);
app.use('/api/admin', authenticate, checkRoleAccess, adminRouter);
app.use('/api/events', authenticate, checkRoleAccess, tenantMiddleware, eventRoutes);

// ─── FALLBACK FOR UNKNOWN ROUTES ─────────────────────────────────────────────
app.all('*', (req, res, next) => {
  const error = new Error(`Resource ${req.originalUrl} not found on this server`);
  error.statusCode = 404;
  error.status = 'fail';
  next(error);
});

// ─── GLOBAL ERROR HANDLER MIDDLEWARE ─────────────────────────────────────────
app.use(errorMiddleware);

export default app;


