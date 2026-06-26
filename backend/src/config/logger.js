/**
 * @file src/config/logger.js
 * @description Standard Logger wrapper. Simulates enterprise logger output levels and correlation tracing.
 */

import { getCorrelationId } from '../utils/correlationContext.js';

const formatMessage = (level, message, ...args) => {
  const timestamp = new Date().toISOString();
  const cid = getCorrelationId() || global._activeCorrelationId || 'n/a';
  let extraArgs = args.length > 0 ? ` | ${JSON.stringify(args)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] [CID: ${cid}] ${message}${extraArgs}`;
};

export const logger = {
  info: (message, ...args) => {
    console.log(`\x1b[32m${formatMessage('info', message, ...args)}\x1b[0m`);
  },
  warn: (message, ...args) => {
    console.log(`\x1b[33m${formatMessage('warn', message, ...args)}\x1b[0m`);
  },
  error: (message, ...args) => {
    console.error(`\x1b[31m${formatMessage('error', message, ...args)}\x1b[0m`);
  },
  debug: (message, ...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`\x1b[36m${formatMessage('debug', message, ...args)}\x1b[0m`);
    }
  },
  security: (message, ...args) => {
    console.log(`\x1b[35m${formatMessage('security', message, ...args)}\x1b[0m`);
  },
  audit: (message, ...args) => {
    console.log(`\x1b[34m${formatMessage('audit', message, ...args)}\x1b[0m`);
  }
};

export default logger;
