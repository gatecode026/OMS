import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Message from '../modules/chat/message.model.js';
import { runWithTenant } from '../utils/tenantContext.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const CLUSTER_URI = process.env.CLUSTER_1_URI || 'mongodb://localhost:27017';
const companyId = 'COMP-001';

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(`${CLUSTER_URI}/office-management`);
  console.log('Connected!');

  await runWithTenant(companyId, async () => {
    const messages = await Message.find({}).sort({ createdAt: -1 }).limit(10).lean();
    console.log(`Found ${messages.length} messages:`);
    messages.forEach((msg, idx) => {
      console.log(`\n--- Message ${idx + 1} ---`);
      console.log(`ID: ${msg.id}`);
      console.log(`Sender ID: ${msg.senderId} (${msg.senderName})`);
      console.log(`Content: "${msg.content}"`);
      console.log(`ReadBy:`, JSON.stringify(msg.readBy));
      console.log(`DeliveredTo:`, JSON.stringify(msg.deliveredTo));
    });
  });

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(console.error);
