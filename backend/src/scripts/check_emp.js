import mongoose from 'mongoose';
import Employee from '../modules/employees/employees.model.js';
import env from '../config/env.js';

async function check() {
  await mongoose.connect(env.dbUri);
  console.log("Connected to DB.");
  const emp = await Employee.findOne({ email: 'dheeraj@gmail.com' });
  console.log("Employee:", JSON.stringify(emp, null, 2));
  await mongoose.disconnect();
}

check().catch(console.error);
