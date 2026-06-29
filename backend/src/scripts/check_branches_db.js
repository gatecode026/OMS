import dotenv from 'dotenv';
dotenv.config();
import { setServers } from 'dns';
setServers(['1.1.1.1']);
import mongoose from 'mongoose';

const dbUri = process.env.DB_URI;

async function check() {
  await mongoose.connect(dbUri);
  console.log('Connected to Main DB');
  
  const Branch = mongoose.connection.db.collection('branches');
  const branches = await Branch.find({}).toArray();
  console.log('Branches in DB:');
  branches.forEach(b => {
    console.log(JSON.stringify(b));
  });
  
  await mongoose.disconnect();
}

check().catch(console.error);
