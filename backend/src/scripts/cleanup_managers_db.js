import dotenv from 'dotenv';
dotenv.config();
import { setServers } from 'dns';
setServers(['1.1.1.1']);
import mongoose from 'mongoose';
import { getTenantConnection } from '../utils/multidbConnection.js';

const dbUri = process.env.DB_URI || 'mongodb://localhost:27017/office_management_db';

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(dbUri);
  console.log('Connected.');

  const connection = await getTenantConnection('COMP-001');
  const Employee = connection.models['Employee'] || connection.model('Employee', new mongoose.Schema({}, { strict: false }));

  // Clear department and branch for all employees with manager role
  const result = await Employee.updateMany(
    { $or: [{ roleId: 'manager' }, { role: 'Manager' }] },
    {
      $set: {
        department: '',
        branch: ''
      }
    }
  );

  console.log(`Successfully updated ${result.modifiedCount} manager records in the database.`);
  await mongoose.disconnect();
}

run().catch(console.error);
