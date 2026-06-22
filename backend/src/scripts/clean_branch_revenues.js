/**
 * clean_branch_revenues.js
 * Run with: node src/scripts/clean_branch_revenues.js
 *
 * Sets the revenue field to 0 for ALL branch documents in the database.
 */

import mongoose from 'mongoose';
import dns from 'dns';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dns.setServers(['1.1.1.1']);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

const MONGODB_URI = process.env.DB_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;
if (!MONGODB_URI) {
  console.error('❌  DB_URI / MONGODB_URI not set in .env');
  process.exit(1);
}

async function cleanBranchRevenues() {
  console.log('🔌  Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅  Connected.\n');

  const db = mongoose.connection.db;
  const result = await db.collection('branches').updateMany(
    { revenue: { $exists: true, $ne: 0 } },
    { $set: { revenue: 0 } }
  );

  console.log(`✅  Updated ${result.modifiedCount} branch document(s) — revenue set to 0.`);

  await mongoose.disconnect();
  console.log('🔌  Disconnected.');
}

cleanBranchRevenues().catch(err => {
  console.error('❌  Script failed:', err.message);
  process.exit(1);
});
