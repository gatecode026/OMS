import dotenv from 'dotenv';
dotenv.config();
import { setServers } from 'dns';
setServers(['1.1.1.1']);
import mongoose from 'mongoose';
import { getTenantConnection } from '../utils/multidbConnection.js';

const dbUri = process.env.DB_URI;

async function main() {
  await mongoose.connect(dbUri);
  const connection = await getTenantConnection('COMP-001');
  const Employee = connection.models['Employee'] || connection.model('Employee', new mongoose.Schema({}, { strict: false }));

  const employees = await Employee.find({ workLocation: { $exists: true, $ne: '' } }).lean();
  console.log(`\nEmployees with workLocation set (${employees.length}):\n`);
  for (const e of employees) {
    console.log(`  ${e.name} | branch: "${e.branch}" | workLocation: "${e.workLocation}"`);
  }
  await mongoose.disconnect();
}

main().catch(console.error);
