import dotenv from 'dotenv';
dotenv.config();
import { setServers } from 'dns';
setServers(['1.1.1.1']);
import mongoose from 'mongoose';

const dbUri = process.env.DB_URI;

async function check() {
  await mongoose.connect(dbUri);
  console.log('Connected to Main DB');
  
  const Payments = mongoose.connection.db.collection('payrollpayments');
  const docs = await Payments.find({}).toArray();
  console.log('Payroll Payments in DB:');
  docs.forEach(d => {
    console.log(`id: ${d.id}, empId: ${d.employeeId}, empName: ${d.employeeName}, branch: ${d.branch}, dept: ${d.department}`);
  });
  
  await mongoose.disconnect();
}

check().catch(console.error);
