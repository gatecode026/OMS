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
  const employees = await Employee.find({}).lean();
  employees.forEach(e => {
    console.log(`Name: ${e.name}`);
    console.log(`  attendanceHistory length: ${e.attendanceHistory ? e.attendanceHistory.length : 0}`);
    console.log(`  performanceScore: ${JSON.stringify(e.performanceScore)}`);
  });
  await mongoose.disconnect();
}

check().catch(console.error);
