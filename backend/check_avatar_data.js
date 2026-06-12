import mongoose from 'mongoose';
import dns, { setServers } from 'dns';
setServers(['1.1.1.1']);

const DB_URI = 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management';

import './src/modules/employees/employees.model.js';

async function main() {
  try {
    await mongoose.connect(DB_URI);
    console.log('Connected to DB');

    const Employee = mongoose.model('Employee');
    const employees = await Employee.find({});

    console.log('\n--- EMPLOYEE AVATAR DATA ---');
    employees.forEach(emp => {
      console.log(`Name: ${emp.name}`);
      console.log(`  id: ${emp.id}`);
      console.log(`  avatar prefix: ${emp.avatar ? emp.avatar.substring(0, 100) : 'EMPTY'}`);
      console.log(`  photoUrl prefix: ${emp.photoUrl ? emp.photoUrl.substring(0, 100) : 'EMPTY'}`);
      console.log(`  avatar length: ${emp.avatar ? emp.avatar.length : 0}`);
      console.log(`  photoUrl length: ${emp.photoUrl ? emp.photoUrl.length : 0}`);
    });

    await mongoose.disconnect();
  } catch (e) {
    console.error(e);
  }
}
main();
