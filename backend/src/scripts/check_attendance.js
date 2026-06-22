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
  const Attendance = connection.models['Attendance'] || connection.model('Attendance', new mongoose.Schema({}, { strict: false }));
  
  const records = await Attendance.find({}).lean();
  console.log('Total attendance records in DB:', records.length);
  if (records.length > 0) {
    console.log('Example record fields:', Object.keys(records[0]));
    records.forEach(r => {
      console.log(`Date: ${r.date}, Employee: "${r.employeeName}", ID: "${r.employeeId}", Status: "${r.status}"`);
    });
  }
  
  await mongoose.disconnect();
}

check().catch(console.error);
