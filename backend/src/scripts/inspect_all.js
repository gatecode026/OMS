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
  
  for (const modelName of ['Employee', 'Project', 'Team', 'Task', 'Attendance', 'Department', 'Branch']) {
    const Model = connection.models[modelName] || connection.model(modelName, new mongoose.Schema({}, { strict: false }));
    const count = await Model.countDocuments({});
    console.log(`${modelName} count:`, count);
    if (count > 0) {
      const sample = await Model.findOne({}).lean();
      console.log(`Sample ${modelName}:`, sample);
    }
  }
  
  await mongoose.disconnect();
}

check().catch(console.error);
