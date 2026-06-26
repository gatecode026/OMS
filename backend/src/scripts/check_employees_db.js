import dotenv from 'dotenv';
dotenv.config();
import { setServers } from 'dns';
setServers(['1.1.1.1']);
import mongoose from 'mongoose';

const dbUri = process.env.DB_URI;

async function check() {
  await mongoose.connect(dbUri);
  console.log('Connected to Main DB');
  
  const Employee = mongoose.connection.db.collection('employees');
  const emps = await Employee.find({}).toArray();
  console.log('Employees in DB:');
  emps.forEach(e => {
    console.log(`ID: ${e.id}, Name: ${e.name}, leaveBalance: ${JSON.stringify(e.leaveBalance)}, leaveHistory: ${JSON.stringify(e.leaveHistory)}`);
  });
  
  await mongoose.disconnect();
}

check().catch(console.error);
