/**
 * @file src/config/cors.js
 * @description Cross-Origin Resource Sharing rules config.
 */

import env from './env.js';

export const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      env.clientUrl,
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ];

    const cleanHost = (url) => url ? url.replace(/^https?:\/\/(www\.)?/, '').split(':')[0] : '';
    const requestHost = cleanHost(origin);
    const clientHost = cleanHost(env.clientUrl);

    const isMatch = allowedOrigins.includes(origin) || 
                    (clientHost && requestHost === clientHost) || 
                    env.nodeEnv === 'development';

    if (isMatch) {
      callback(null, true);
    } else {
      callback(new Error('Cross-Origin Request Blocked by Security Policy'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'x-tenant-id',
    'X-Tenant-Id',
    'x-device-id',
    'x-app-version',
    'x-timezone',
    'x-language',
    'x-platform',
    'x-action-description',
  ],
  credentials: true,
  optionsSuccessStatus: 200,
};

export default corsOptions;
