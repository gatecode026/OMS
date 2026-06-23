import dotenv from 'dotenv';
dotenv.config();
import { setServers } from 'dns';
setServers(['1.1.1.1']);
import mongoose from 'mongoose';

const dbUri = process.env.DB_URI;

async function check() {
  await mongoose.connect(dbUri);
  console.log('Connected to Main DB');
  
  const db = mongoose.connection.db;
  const users = await db.collection('users').find({}).toArray();
  users.forEach(u => {
    console.log(`User ID: ${u.id || u._id} | Name: ${u.name} | Email: ${u.email} | Role: ${u.roleId || u.role} | CompanyId: ${u.companyId}`);
  });
  
  await mongoose.disconnect();
}

check().catch(console.error);
