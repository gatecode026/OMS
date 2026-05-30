/**
 * @file src/config/env.js
 * @description Safe environment variables loader and schema integrity checker.
 */

import dotenv from 'dotenv';
dotenv.config();

const requiredEnv = ['JWT_SECRET', 'DB_URI'];
const missingEnv = requiredEnv.filter((envVar) => !process.env[envVar]);

if (missingEnv.length > 0) {
  console.warn(`[WARNING] Missing critical environment variables: ${missingEnv.join(', ')}`);
}

export const env = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  dbUri: process.env.DB_URI || 'mongodb://localhost:27017/office_management_db',
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
};

export default env;
