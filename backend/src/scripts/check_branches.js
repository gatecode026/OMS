import dotenv from 'dotenv';
dotenv.config();
import { setServers } from 'dns';
setServers(['1.1.1.1']);
import mongoose from 'mongoose';
import { getTenantConnection } from '../utils/multidbConnection.js';

const dbUri = process.env.DB_URI;

async function check() {
  await mongoose.connect(dbUri);
  console.log('Connected to Main DB');
  
  const connection = await getTenantConnection('COMP-001');
  
  // Let's list the models to see what models exist
  console.log('Registered Models:', Object.keys(connection.models));
  
  // Check if Branch and Department models exist
  const Branch = connection.models['Branch'] || connection.model('Branch', new mongoose.Schema({}, { strict: false }));
  const Department = connection.models['Department'] || connection.model('Department', new mongoose.Schema({}, { strict: false }));
  
  const branches = await Branch.find({}).lean();
  const departments = await Department.find({}).lean();
  
  console.log('Branches in database:', branches);
  console.log('Departments in database:', departments);
  
  await mongoose.disconnect();
}

check().catch(console.error);
