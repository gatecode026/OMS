import dotenv from 'dotenv';
dotenv.config();
import { setServers } from 'dns';
setServers(['1.1.1.1']);
import mongoose from 'mongoose';
import { getTenantConnection } from '../utils/multidbConnection.js';

const dbUri = process.env.DB_URI;

async function check() {
  await mongoose.connect(dbUri);
  const connection = await getTenantConnection('COMP-001');
  
  const Employee = connection.models['Employee'] || connection.model('Employee', new mongoose.Schema({}, { strict: false }));
  const Project = connection.models['Project'] || connection.model('Project', new mongoose.Schema({}, { strict: false }));
  const Team = connection.models['Team'] || connection.model('Team', new mongoose.Schema({}, { strict: false }));
  
  const employees = await Employee.find({}).lean();
  const projectsList = await Project.find({}).lean();
  const teams = await Team.find({}).lean();
  
  console.log('--- ALL ACTIVE/OPERATIONAL EMPLOYEES ---');
  employees.forEach(e => {
    const isManager = e.roleId === 'manager' || e.designation?.toLowerCase().includes('manager');
    console.log(`Name: "${e.name}" | RoleId: "${e.roleId}" | Designation: "${e.designation}" | status: "${e.status}" | productivityScore: ${e.productivityScore} | IS_PM: ${isManager}`);
  });
  
  console.log('\n--- ALL PROJECTS ---');
  projectsList.forEach(p => {
    console.log(`Project: "${p.name}" | Manager: "${p.manager}" | ManagerId: "${p.managerId}" | Leader: "${p.leader}"`);
  });
  
  console.log('\n--- ALL TEAMS ---');
  teams.forEach(t => {
    console.log(`Team: "${t.name}" | Leader: "${t.leader}" | Department: "${t.department}"`);
  });
  
  await mongoose.disconnect();
}

check().catch(console.error);
