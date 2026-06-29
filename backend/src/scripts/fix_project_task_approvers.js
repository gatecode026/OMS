import dotenv from 'dotenv';
dotenv.config();
import { setServers } from 'dns';
setServers(['1.1.1.1']);
import mongoose from 'mongoose';
import { getTenantConnection } from '../utils/multidbConnection.js';

const dbUri = process.env.DB_URI;

async function main() {
  console.log('Connecting to database...');
  await mongoose.connect(dbUri);
  console.log('Connected!');

  const connection = await getTenantConnection('COMP-001');
  const Project = connection.models['Project'] || connection.model('Project', new mongoose.Schema({}, { strict: false }));
  
  const projects = await Project.find({});
  console.log(`Found ${projects.length} projects to check.`);

  for (const project of projects) {
    let modified = false;
    const currentManager = project.manager;
    
    if (project.tasks && Array.isArray(project.tasks)) {
      for (const task of project.tasks) {
        if (task.approvals && Array.isArray(task.approvals)) {
          for (const approval of task.approvals) {
            if (approval.role === 'Project Manager Approval' && approval.status === 'Pending') {
              if (approval.approver !== currentManager) {
                console.log(`Updating task "${task.title}" (ID: ${task.id}) in Project "${project.name}": "${approval.approver}" -> "${currentManager}"`);
                approval.approver = currentManager;
                modified = true;
              }
            }
          }
        }
      }
    }
    
    if (modified) {
      console.log(`Saving changes for project "${project.name}" (ID: ${project.id})...`);
      // Since it's a raw Mongoose doc, we can mark modified and save
      project.markModified('tasks');
      await project.save();
    }
  }

  console.log('Finished updating task approvers.');
  await mongoose.disconnect();
}

main().catch(console.error);
