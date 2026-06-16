import dotenv from 'dotenv';
dotenv.config();
import { setServers } from 'dns';
setServers(['1.1.1.1']);
import mongoose from 'mongoose';
import { getTenantConnection } from '../utils/multidbConnection.js';

const dbUri = process.env.DB_URI;

async function run() {
  await mongoose.connect(dbUri);
  console.log('Connected to Main DB');
  
  const connection = await getTenantConnection('COMP-001');
  const Employee = connection.models['Employee'] || connection.model('Employee', new mongoose.Schema({}, { strict: false }));
  
  const result = await Employee.updateMany({}, {
    $set: {
      department: ''
    }
  });
  
  console.log(`Updated ${result.modifiedCount} employees' department to empty in database.`);
  
  await mongoose.disconnect();
}

run().catch(console.error);
