import dotenv from 'dotenv';
dotenv.config();
import { setServers } from 'dns';
setServers(['1.1.1.1']);
import mongoose from 'mongoose';
import { getTenantConnection } from '../utils/multidbConnection.js';

const dbUri = process.env.DB_URI;

async function check() {
  await mongoose.connect(dbUri);
  console.log('Connected to Main DB');
  
  const connection = await getTenantConnection('COMP-001');
  const Task = connection.models['Task'] || connection.model('Task', new mongoose.Schema({}, { strict: false }));
  
  const tasks = await Task.find({}).lean();
  console.log('Total tasks in DB:', tasks.length);
  if (tasks.length > 0) {
    console.log('Example task fields:', Object.keys(tasks[0]));
    tasks.forEach(t => {
      console.log(`Task: "${t.title}", Status: "${t.status}", Assignee: "${t.assigneeName}", Assignee ID: "${t.assigneeId}"`);
    });
  }
  
  await mongoose.disconnect();
}

check().catch(console.error);
