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
  console.log('Connecting to MongoDB...');
  await mongoose.connect(`${CLUSTER_URI}/office-management`);
  console.log('Connected!');

  await runWithTenant(companyId, async () => {
    const conn = mongoose.connection;
    const conv = await conn.collection('conversations').findOne({ id: convId });
    console.log('Conversation Data:');
    console.log(JSON.stringify(conv, null, 2));

    const messages = await conn.collection('messages').find({ conversationId: convId }).toArray();
    console.log(`\nMessages count for ${convId}: ${messages.length}`);
    messages.forEach((msg, idx) => {
      console.log(`[${idx + 1}] ID: ${msg.id} | Sender: ${msg.senderName} | Content: "${msg.content}" | CreatedAt: ${msg.createdAt}`);
    });
  });

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(console.error);
