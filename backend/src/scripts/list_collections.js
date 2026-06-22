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
  const db = connection.db;
  const collections = await db.listCollections().toArray();
  console.log('Collections in COMP-001:');
  for (const col of collections) {
    const count = await db.collection(col.name).countDocuments();
    console.log(`- ${col.name}: ${count} documents`);
  }
  
  await mongoose.disconnect();
}

check().catch(console.error);
