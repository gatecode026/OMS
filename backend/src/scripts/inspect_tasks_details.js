import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { getTenantConnection } from '../utils/multidbConnection.js';

const dbUri = process.env.DB_URI;

async function check() {
  await mongoose.connect(dbUri);
  console.log('Connected to Main DB');
  
  const connection = await getTenantConnection('COMP-001');
  const Task = connection.models['Task'] || connection.model('Task', new mongoose.Schema({}, { strict: false }));
  
  const tasks = await Task.find({ assigneeId: 'GATECO-EMP-008' }).lean();
  console.log('Total tasks for GATECO-EMP-008:', tasks.length);
  if (tasks.length > 0) {
    console.log('First 5 tasks:', JSON.stringify(tasks.slice(0, 5), null, 2));
  }
  
  await mongoose.disconnect();
}

check().catch(console.error);
