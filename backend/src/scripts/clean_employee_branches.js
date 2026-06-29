import dotenv from 'dotenv';
dotenv.config();
import { setServers } from 'dns';
setServers(['1.1.1.1']);
import mongoose from 'mongoose';
import { getTenantConnection } from '../utils/multidbConnection.js';

const dbUri = process.env.DB_URI;

async function main() {
  console.log('Connecting to database...');
  await mongoose.connect(dbUri);
  console.log('Connected!');

  const connection = await getTenantConnection('COMP-001');
  const Employee = connection.models['Employee'] || connection.model('Employee', new mongoose.Schema({}, { strict: false }));
  
  const employees = await Employee.find({}).lean();
  console.log('\n--- Trimming employee branches ---');
  for (const e of employees) {
    if (typeof e.branch === 'string' && e.branch !== e.branch.trim()) {
      const trimmedBranch = e.branch.trim();
      console.log(`Updating employee ${e.id} (${e.name}): "${e.branch}" -> "${trimmedBranch}"`);
      await Employee.updateOne({ id: e.id }, { $set: { branch: trimmedBranch } });
    }
  }

  console.log('Cleanup complete.');
  await mongoose.disconnect();
}

main().catch(console.error);
