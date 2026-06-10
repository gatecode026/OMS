import dns from 'dns';
dns.setServers(['1.1.1.1']);
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const DB_URI = process.env.DB_URI || 'mongodb://localhost:27017/office_management_db';

async function check() {
  try {
    await mongoose.connect(DB_URI);
    console.log('Connected!');
    const roles = await mongoose.connection.db.collection('rbac_roles').find().toArray();
    console.log(`Found ${roles.length} roles:`);
    roles.forEach(role => {
      console.log(`- ID: ${role.id}, Name: ${role.name}`);
    });
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

check();
