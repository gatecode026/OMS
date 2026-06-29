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
  const Project = connection.models['Project'] || connection.model('Project', new mongoose.Schema({}, { strict: false }));
  const Department = connection.models['Department'] || connection.model('Department', new mongoose.Schema({}, { strict: false }));

  const projects = await Project.find({}).lean();
  console.log(`Found ${projects.length} projects to check.`);

  let updatedCount = 0;
  for (const proj of projects) {
    if (proj.department) {
      const dept = await Department.findOne({ name: { $regex: new RegExp(`^${proj.department.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') } });
      if (dept) {
        console.log(`Setting project "${proj.name}" branch to "${dept.branch}" (dept: "${proj.department}")`);
        await Project.updateOne({ _id: proj._id }, { $set: { branch: dept.branch } });
        updatedCount++;
      } else {
        console.log(`WARNING: Department "${proj.department}" not found for project "${proj.name}"`);
      }
    }
  }

  console.log(`\nMigration complete. Updated ${updatedCount} project(s).`);
  await mongoose.disconnect();
}

main().catch(console.error);
