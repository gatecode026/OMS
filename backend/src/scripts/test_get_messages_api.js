import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import * as chatService from '../modules/chat/chat.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const CLUSTER_URI = process.env.CLUSTER_1_URI || 'mongodb://localhost:27017';
const companyId = 'COMP-001';
const employeeId = 'GATECO-EMP-005'; // Geeta
const convId = 'GATECO-CONV-005';

async function run() {
  await mongoose.connect(`${CLUSTER_URI}/office-management`);
  
  try {
    const result = await chatService.getMessages(convId, employeeId, companyId, null, 20);
    console.log('GET MESSAGES RESULT:');
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error fetching messages:', err);
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(console.error);
