import dotenv from 'dotenv';
dotenv.config();
import { setServers } from 'dns';
setServers(['1.1.1.1']);
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import fs from 'fs';
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
  let output = '--- EMPLOYEE PASSWORDS ---\n';
  for (const e of employees) {
    const isPw = await bcrypt.compare('password', e.password || '');
    const isPw123 = await bcrypt.compare('password123', e.password || '');
    const determinedPassword = isPw ? 'password' : (isPw123 ? 'password123' : 'unknown');
    output += `Name: ${e.name} | Email: ${e.email} | Role: ${e.role} | Password: ${determinedPassword}\n`;
  }

  output += '\n--- ADMIN PASSWORDS ---\n';
  const admins = await Admin.find({}).select('+password').lean();
  for (const adm of admins) {
    const isPw = await bcrypt.compare('password', adm.password || '');
    const isPw123 = await bcrypt.compare('password123', adm.password || '');
    const determinedPassword = isPw ? 'password' : (isPw123 ? 'password123' : 'unknown');
    output += `Name: ${adm.name} | Email: ${adm.email} | Role: ${adm.roleId} | Password: ${determinedPassword}\n`;
  }

  fs.writeFileSync('src/scripts/credentials_output.txt', output);
  console.log('Done writing credentials_output.txt!');
  await mongoose.disconnect();
}

main().catch(console.error);
