import dns, { setServers } from 'dns';
setServers(['1.1.1.1']);

import mongoose from 'mongoose';
import env from './src/config/env.js';
import Employee from './src/modules/employees/employees.model.js';
import bcrypt from 'bcryptjs';

async function run() {
  try {
    console.log("Connecting to DB:", env.dbUri);
    await mongoose.connect(env.dbUri);
    console.log("Connected successfully.");

    const employees = await Employee.find({});
    console.log(`Found ${employees.length} employees.`);

    let fixedCount = 0;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password', salt);

    for (const emp of employees) {
      // We need to fetch the password explicitly since it has select: false
      const fullEmp = await Employee.findById(emp._id).select('+password');
      if (!fullEmp.password) {
        console.log(`Setting default password for: ${fullEmp.name} (${fullEmp.email})`);
        fullEmp.password = hashedPassword;
        await fullEmp.save({ validateBeforeSave: false });
        fixedCount++;
      } else {
        console.log(`Employee ${fullEmp.name} already has a password.`);
      }
    }

    console.log(`Successfully set default passwords for ${fixedCount} employees.`);
  } catch (err) {
    console.error("Failed:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
