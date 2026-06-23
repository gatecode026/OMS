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
  
  const tasksCount = await Task.countDocuments({});
  console.log('Total tasks in DB:', tasksCount);
  const tasks = await Task.find({}).lean();
  tasks.forEach(t => {
    console.log(`Task Title: ${t.title || t.name}, AssigneeId: ${t.assigneeId}, AssigneeName: ${t.assigneeName}, Status: ${t.status}, Completed: ${t.completed}`);
  });
  
  await mongoose.disconnect();
}

check().catch(console.error);
