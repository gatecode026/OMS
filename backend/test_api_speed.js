import mongoose from 'mongoose';
import dns, { setServers } from 'dns';
setServers(['1.1.1.1']);

const DB_URI = 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management';

// Import Employee model schema via mongoose (which registers the 'Employee' model)
import './src/modules/employees/employees.model.js';

async function main() {
  try {
    await mongoose.connect(DB_URI);
    console.log('Connected to DB');

    const Employee = mongoose.model('Employee');

    // Test 1: Full query (simulating how it was before)
    console.log('Testing query speed BEFORE optimization (loading full document)...');
    let start = Date.now();
    const beforeDocs = await Employee.find({});
    let duration = Date.now() - start;
    console.log(`BEFORE optimization took: ${duration} ms`);
    console.log(`Docs count: ${beforeDocs.length}`);
    if (beforeDocs.length > 0) {
      const sizeJson = JSON.stringify(beforeDocs).length;
      console.log(`Payload size (JSON chars): ${(sizeJson / (1024 * 1024)).toFixed(2)} MB`);
    }

    // Test 2: Optimized query (simulating how it is now)
    console.log('\nTesting query speed AFTER optimization (excluding heavy fields and using lean)...');
    start = Date.now();
    const afterDocs = await Employee.find({})
      .select('-attendanceHistory -overtimeHistory -leaveHistory -taskHistory -activityLog -avatar -documents')
      .lean();
    duration = Date.now() - start;
    console.log(`AFTER optimization took: ${duration} ms`);
    console.log(`Docs count: ${afterDocs.length}`);
    if (afterDocs.length > 0) {
      const sizeJson = JSON.stringify(afterDocs).length;
      console.log(`Payload size (JSON chars): ${(sizeJson / 1024).toFixed(2)} KB`);
      // Print first employee structure to verify avatar and history are missing
      console.log('Sample Employee keys:', Object.keys(afterDocs[0]));
    }

    await mongoose.disconnect();
  } catch (e) {
    console.error(e);
  }
}
main();
