import dotenv from 'dotenv';
dotenv.config();
import { setServers } from 'dns';
setServers(['1.1.1.1']);
import mongoose from 'mongoose';
import { getTenantConnection } from '../utils/multidbConnection.js';

const dbUri = process.env.DB_URI;

async function check() {
  await mongoose.connect(dbUri);
  const connection = await getTenantConnection('COMP-001');
  const Team = connection.models['Team'] || connection.model('Team', new mongoose.Schema({}, { strict: false }));
  const teams = await Team.find({}).lean();
  teams.forEach(t => {
    console.log(`Team: ${t.name} | Members count: ${t.membersList ? t.membersList.length : 0}`);
    if (t.membersList) {
      t.membersList.forEach(m => {
        console.log(`  Member ID: ${m.id} | Name: ${m.name} | Productivity: ${m.productivity} | Attendance: ${m.attendance}`);
      });
    }
  });
  await mongoose.disconnect();
}

check().catch(console.error);
