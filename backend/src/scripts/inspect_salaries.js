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
  let totalSalary = 0;
  employees.forEach(e => {
    const salary = parseFloat(e.salaryAmount) || 0;
    totalSalary += salary;
    console.log(`Name: ${e.name} | Salary: ${salary} | raw: ${e.salaryAmount}`);
  });
  console.log('Total Salary:', totalSalary);
  await mongoose.disconnect();
}

check().catch(console.error);
