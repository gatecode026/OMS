import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import * as chatService from '../modules/chat/chat.service.js';
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
    // Find any message in the DB
    const msg = await Message.findOne({});
    if (!msg) {
      console.log('No messages found in DB');
      return;
    }
    console.log('Found message:', msg.id, 'content:', msg.content, 'reactions:', msg.reactions);

    try {
      console.log('Attempting to add reaction...');
      const res = await chatService.addReaction(
        msg.id,
        'GATECO-EMP-003',
        'RATIWALRAHUL',
        '👍',
        companyId
      );
      console.log('Result:', res);

      // Fetch the message again to verify
      const updatedMsg = await Message.findOne({ id: msg.id });
      console.log('Updated message reactions:', updatedMsg.reactions);
    } catch (err) {
      console.error('Error adding reaction:', err);
    }
  });

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(console.error);
