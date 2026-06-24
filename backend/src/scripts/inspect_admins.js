import dotenv from 'dotenv';
dotenv.config();
import { setServers } from 'dns';
setServers(['1.1.1.1']);
import mongoose from 'mongoose';
import Admin from '../modules/admin/admin.model.js';

const dbUri = process.env.DB_URI;

async function check() {
  await mongoose.connect(dbUri);
  console.log('Connected to Main DB');
  
  const admins = await Admin.find({}).lean();
  console.log('Total admins found:', admins.length);
  admins.forEach(adm => {
    console.log(`ID: ${adm.id}, Name: ${adm.name}, Email: ${adm.email}, RoleId: ${adm.roleId}, status: ${adm.status}`);
  });
  
  await mongoose.disconnect();
}

check().catch(console.error);
