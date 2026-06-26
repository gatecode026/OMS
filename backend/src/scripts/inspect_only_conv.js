import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { runWithTenant } from '../utils/tenantContext.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const CLUSTER_URI = process.env.CLUSTER_1_URI || 'mongodb://localhost:27017';
const companyId = 'COMP-001';
const convId = 'GATECO-CONV-005';

async function run() {
  await mongoose.connect(`${CLUSTER_URI}/office-management`);
  await runWithTenant(companyId, async () => {
    const conn = mongoose.connection;
    const conv = await conn.collection('conversations').findOne({ id: convId });
    console.log('CONVERSATION DATA:');
    console.log(JSON.stringify(conv, null, 2));
  });
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(console.error);
