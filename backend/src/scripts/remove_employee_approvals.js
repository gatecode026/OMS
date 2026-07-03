import dotenv from 'dotenv';
dotenv.config();
import { setServers } from 'dns';
setServers(['1.1.1.1']);
import mongoose from 'mongoose';
import { getTenantConnection } from '../utils/multidbConnection.js';

const dbUri = process.env.DB_URI;

async function run() {
  await mongoose.connect(dbUri);
  console.log('Connected to Main DB');
  
  const db = mongoose.connection.db;
  const companies = await db.collection('companies').find().toArray();
  
  for (const company of companies) {
    console.log(`Processing company: ${company.name} (${company.id})`);
    const connection = await getTenantConnection(company.id);
    const Project = connection.models['Project'] || connection.model('Project', new mongoose.Schema({}, { strict: false }));
    
    const projects = await Project.find({});
    console.log(`Found ${projects.length} projects`);
    
    for (const project of projects) {
      let projectModified = false;
      
      if (project.tasks && Array.isArray(project.tasks)) {
        for (const task of project.tasks) {
          if (task.approvals && Array.isArray(task.approvals)) {
            // Check if there is an Employee approval level
            const hasEmployeeApproval = task.approvals.some(app => app.role === 'Employee');
            if (hasEmployeeApproval) {
              console.log(`Updating task approvals for project "${project.name}" - task "${task.title}"`);
              
              // Filter out Employee approval
              const remainingApprovals = task.approvals.filter(app => app.role !== 'Employee');
              
              // Re-index remaining levels
              remainingApprovals.forEach((app, index) => {
                app.level = index + 1;
              });
              
              task.approvals = remainingApprovals;
              projectModified = true;
            }
          }
        }
      }
      
      if (projectModified) {
        project.markModified('tasks');
        await project.save();
        console.log(`Saved project "${project.name}"`);
      }
    }
  }
  
  console.log('Done!');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
