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
  const Employee = connection.models['Employee'] || connection.model('Employee', new mongoose.Schema({}, { strict: false }));
  
  const employees = await Employee.find({}).lean();
  console.log('\n--- Employees in COMP-001 ---');
  for (const e of employees) {
    console.log(`ID: ${e.id} | Name: ${e.name} | Email: ${e.email} | Branch: "${e.branch}" | Role: "${e.roleId || e.role}"`);
  }

  await mongoose.disconnect();
}

main().catch(console.error);
