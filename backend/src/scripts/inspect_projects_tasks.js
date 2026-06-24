import dotenv from 'dotenv';
dotenv.config();
import { setServers } from 'dns';
setServers(['1.1.1.1']);
import mongoose from 'mongoose';
import { getTenantConnection } from '../utils/multidbConnection.js';

const dbUri = process.env.DB_URI;

async function check() {
  await mongoose.connect(dbUri);
  console.log('Connected to DB');
  
  const connection = await getTenantConnection('COMP-001');
  const Project = connection.models['Project'] || connection.model('Project', new mongoose.Schema({}, { strict: false }));
  
  const projects = await Project.find({}).lean();
  console.log('\n--- Projects Details ---');
  projects.forEach(p => {
    console.log(`Name: ${p.name} | ID: ${p.id} | Tasks Count: ${p.tasks ? p.tasks.length : 0}`);
    if (p.tasks && p.tasks.length > 0) {
      p.tasks.forEach(t => {
        console.log(`  Task Title: "${t.title}" | Status: "${t.status}" | AssigneeId: "${t.assigneeId}" | AssigneeName: "${t.assigneeName}"`);
      });
    }
  });
  
  await mongoose.disconnect();
}

check().catch(console.error);
