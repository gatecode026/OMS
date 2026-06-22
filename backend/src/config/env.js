/**
 * @file src/config/env.js
 * @description Safe environment variables loader and schema integrity checker.
 */

import dotenv from 'dotenv';
dotenv.config();

const requiredEnv = ['JWT_SECRET', 'DB_URI', 'IMAGEKIT_PRIVATE_KEY'];
const missingEnv = requiredEnv.filter((envVar) => !process.env[envVar] || process.env[envVar].includes('***'));

if (missingEnv.length > 0) {
  console.warn(`[WARNING] Missing or unconfigured environment variables: ${missingEnv.join(', ')}`);
}

export const env = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  dbUri: process.env.DB_URI || 'mongodb://localhost:27017/office_management_db',
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  imagekitPublicKey: process.env.IMAGEKIT_PUBLIC_KEY || 'public_CpBAKCTW3cCxoXfv',
  imagekitUrlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/zjd5xircoy',
  imagekitPrivateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  multidbMaxPoolSize: parseInt(process.env.MULTIDB_MAX_POOL_SIZE || '5', 10),
  multidbMaxTotalConnections: parseInt(process.env.MULTIDB_MAX_TOTAL_CONNECTIONS || '50', 10),
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY
};

export default env;
