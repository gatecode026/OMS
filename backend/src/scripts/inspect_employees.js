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
  const Branch = connection.models['Branch'] || connection.model('Branch', new mongoose.Schema({}, { strict: false }));
  const Team = connection.models['Team'] || connection.model('Team', new mongoose.Schema({}, { strict: false }));
  const Project = connection.models['Project'] || connection.model('Project', new mongoose.Schema({}, { strict: false }));
  
  const branches = await Branch.find({}).lean();
  console.log('Total branches found:', branches.length);
  branches.forEach(b => {
    console.log(`ID: ${b.id}, Name: "${b.name}", Code: "${b.code}", Manager: "${b.manager}", EmpCount: ${b.employeeCount}`);
  });

  const teams = await Team.find({}).lean();
  console.log('Total teams found:', teams.length);
  teams.forEach(t => {
    console.log(`ID: ${t.id}, Name: "${t.name}", Leader: "${t.leader}"`);
  });

  const projects = await Project.find({}).lean();
  console.log('Total projects found:', projects.length);
  projects.forEach(p => {
    console.log(`ID: ${p.id}, Name: "${p.name}", Status: "${p.status}"`);
  });
  
  await mongoose.disconnect();
}

check().catch(console.error);
