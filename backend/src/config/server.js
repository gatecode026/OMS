/**
 * @file src/config/server.js
 * @description Standard express HTTP configuration tokens.
 */

import env from './env.js';

export const serverConfig = {
  port: env.port,
  env: env.nodeEnv,
  corsOptions: {
    origin: env.clientUrl,
    credentials: true,
  },
  bodyLimits: {
    json: '10mb',
    urlencoded: '10mb',
  }
};

export default serverConfig;
