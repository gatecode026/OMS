import dotenv from 'dotenv';
dotenv.config();
import { setServers } from 'dns';
setServers(['1.1.1.1']);
import mongoose from 'mongoose';
import { getTenantConnection } from '../utils/multidbConnection.js';

const dbUri = process.env.DB_URI;

// Clear any workLocation values that look like branch names (contain "Branch" or "Office")
// but are NOT a real specific address (i.e., they are just duplicate branch labels)
const BRANCH_LIKE_PATTERN = /\b(branch|office|hub)\b/i;

async function main() {
  await mongoose.connect(dbUri);
  const connection = await getTenantConnection('COMP-001');
  const Employee = connection.models['Employee'] || connection.model('Employee', new mongoose.Schema({}, { strict: false }));

  const employees = await Employee.find({ workLocation: { $exists: true, $ne: '' } }).lean();
  console.log(`Found ${employees.length} employees with workLocation set.\n`);

  let cleared = 0;
  for (const e of employees) {
    const wl = (e.workLocation || '').trim();
    if (BRANCH_LIKE_PATTERN.test(wl)) {
      console.log(`Clearing: ${e.name} | workLocation: "${wl}"`);
      await Employee.updateOne({ _id: e._id }, { $set: { workLocation: '' } });
      cleared++;
    }
  }

  console.log(`\nCleared ${cleared} workLocation(s) that contained branch-like labels.`);
  await mongoose.disconnect();
}

main().catch(console.error);
