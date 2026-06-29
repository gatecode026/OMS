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
  const emps = await Employee.find({ id: { $in: ['GATECO-EMP-005', 'GATECO-EMP-006'] } }).toArray();
  console.log('Geeta & Udit details:');
  emps.forEach(e => {
    console.log(JSON.stringify(e));
  });
  
  await mongoose.disconnect();
}

check().catch(console.error);
