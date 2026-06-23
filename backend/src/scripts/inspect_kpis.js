import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';

dotenv.config();

import { getTenantConnection } from '../utils/multidbConnection.js';

const dbUri = process.env.DB_URI;

async function check() {
  await mongoose.connect(dbUri);
  console.log('Connected to DB');
  
  const connection = await getTenantConnection('COMP-001');
  const Employee = connection.models['Employee'] || connection.model('Employee', new mongoose.Schema({}, { strict: false }));
  
  const employees = await Employee.find({}).lean();
  console.log('\n--- Employees KPIs ---');
  employees.forEach(e => {
    console.log(`Name: ${e.name}`);
    console.log(`  productivityScore: ${e.productivityScore}`);
    console.log(`  performanceScore: ${JSON.stringify(e.performanceScore)}`);
    console.log(`  attendanceRate: ${e.attendanceRate}`);
    console.log(`  attendanceStatus: ${e.attendanceStatus}`);
    console.log(`  todayPunchStatus: ${e.todayPunchStatus}`);
  });
  
  await mongoose.disconnect();
}

check().catch(console.error);
