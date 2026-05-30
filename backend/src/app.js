/**
 * @file src/app.js
 * @description Main Express application instance configuration. Sets up middlewares, modular routing, and error handlers.
 * @author Antigravity
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

// Configuration Imports
import corsOptions from './config/cors.js';
import logger from './config/logger.js';

// Middleware Imports
import { errorMiddleware } from './middlewares/error.middleware.js';
import { loggerMiddleware } from './middlewares/logger.middleware.js';

// Global Router Import
import globalRouter from './routes/index.js';

const app = express();

// ─── SECURITY MIDDLEWARES ────────────────────────────────────────────────────
app.use(helmet());
app.use(cors(corsOptions));

// ─── REQUEST PARSING ─────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
    message: 'Office Management Workforce Backend API is fully operational',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ─── GLOBAL MODULAR ROUTING BINDING ─────────────────────────────────────────
app.use('/api/v1', globalRouter);

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
