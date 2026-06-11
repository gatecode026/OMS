import mongoose from 'mongoose';
import Leave from '../modules/leaves/leaves.model.js';
import env from '../config/env.js';

async function check() {
  await mongoose.connect(env.dbUri);
  console.log("Connected to DB.");
  const leaves = await Leave.find({});
  console.log("Total leaves in DB:", leaves.length);
  leaves.forEach(l => {
    console.log(`ID: ${l.id}, Emp: ${l.employeeName} (${l.employeeId}), Type: ${l.type}, Status: ${l.status}, Date: ${l.fromDate} to ${l.toDate}, Days: ${l.days}, Reason: ${l.reason}`);
  });
  await mongoose.disconnect();
}

check().catch(console.error);
