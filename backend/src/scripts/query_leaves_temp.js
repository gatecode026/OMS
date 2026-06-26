import dotenv from 'dotenv';
dotenv.config();
import { setServers } from 'dns';
setServers(['1.1.1.1']);
import mongoose from 'mongoose';

const dbUri = process.env.DB_URI;

async function check() {
  await mongoose.connect(dbUri);
  console.log('Connected to Main DB');
  
  // Query all documents in the 'companies' collection
  const companies = await mongoose.connection.db.collection('companies').find({}).toArray();
  console.log('Total companies in master DB:', companies.length);
  companies.forEach(c => {
    console.log(`ID: ${c.id}, Name: ${c.name}, Subdomain: ${c.subdomain}, dbType: ${c.databaseType}, dbName: ${c.databaseName}`);
  });
  
  // Query all documents in the 'tenantregistries' or 'registries' collection
  const registries = await mongoose.connection.db.collection('tenantregistries').find({}).toArray();
  console.log('Total registries in master DB:', registries.length);
  registries.forEach(r => {
    console.log(`Email: ${r.email}, companyId: ${r.companyId}, role: ${r.role}`);
  });

  await mongoose.disconnect();
}

check().catch(console.error);
