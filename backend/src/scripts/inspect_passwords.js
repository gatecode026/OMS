import dotenv from 'dotenv';
dotenv.config();
import { setServers } from 'dns';
setServers(['1.1.1.1']);
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { getTenantConnection } from '../utils/multidbConnection.js';
import Admin from '../modules/admin/admin.model.js';

const dbUri = process.env.DB_URI;

async function main() {
  console.log('Connecting to database...');
  await mongoose.connect(dbUri);
  console.log('Connected!');

  const connection = await getTenantConnection('COMP-001');
  const Employee = connection.models['Employee'] || connection.model('Employee', new mongoose.Schema({}, { strict: false }));
  
  const employees = await Employee.find({}).lean();
  console.log('\n--- TESTING EMPLOYEE PASSWORDS ---');
  for (const e of employees) {
    const isPw = await bcrypt.compare('password', e.password || '');
    const isPw123 = await bcrypt.compare('password123', e.password || '');
    console.log(`Employee ID: ${e.id} | Name: ${e.name} | Email: ${e.email} | Is 'password': ${isPw} | Is 'password123': ${isPw123}`);
  }

  console.log('\n--- TESTING ADMIN PASSWORDS ---');
  const admins = await Admin.find({}).select('+password').lean();
  for (const adm of admins) {
    const isPw = await bcrypt.compare('password', adm.password || '');
    const isPw123 = await bcrypt.compare('password123', adm.password || '');
    console.log(`Admin ID: ${adm.id} | Name: ${adm.name} | Email: ${adm.email} | Is 'password': ${isPw} | Is 'password123': ${isPw123}`);
  }

  await mongoose.disconnect();
}

main().catch(console.error);
