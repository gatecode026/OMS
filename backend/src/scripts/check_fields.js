import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const DB_URI = process.env.DB_URI || 'mongodb://localhost:27017/office_management_db';

async function check() {
  await mongoose.connect(DB_URI);
  const Employee = mongoose.model('Employee', new mongoose.Schema({}, { strict: false }));
  const emps = await Employee.find({});
  console.log(`Found ${emps.length} employees:`);
  emps.forEach(emp => {
    console.log(`- name: "${emp.get('name')}", id: "${emp.get('id')}", email: "${emp.get('email')}", avatarExists: ${!!emp.get('avatar')}`);
  });
  await mongoose.disconnect();
}

check().catch(console.error);
