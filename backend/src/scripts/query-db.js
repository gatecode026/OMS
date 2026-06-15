import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const dbUri = process.env.DB_URI || 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management';

const run = async () => {
  try {
    console.log('Connecting to:', dbUri);
    await mongoose.connect(dbUri);
    console.log('Connected!');

    const db = mongoose.connection.db;

    // Find companies
    const companies = await db.collection('companies').find({}).toArray();
    console.log('\n--- Companies ---');
    companies.forEach(c => {
      console.log(`ID: ${c.id} | Name: ${c.name} | Subdomain: ${c.subdomain} | DB Type: ${c.databaseType} | Email: ${c.email}`);
    });

    // Find roles
    const roles = await db.collection('rbac_roles').find({}).toArray();
    console.log('\n--- Roles ---');
    roles.forEach(r => {
      console.log(`ID: ${r.id} | Name: ${r.name} | CompanyId: ${r.companyId} | Permissions Keys: ${r.permissions ? Object.keys(r.permissions) : 'none'}`);
    });

    // Find permission modules
    const modules = await db.collection('permission_modules').find({}).toArray();
    console.log('\n--- Permission Modules ---');
    modules.forEach(m => {
      console.log(`Key: ${m.key} | Label: ${m.label} | CompanyId: ${m.companyId}`);
    });

    // Find registry entries
    const registry = await db.collection('tenant_registry').find({}).toArray();
    console.log('\n--- Tenant Registry ---');
    registry.forEach(entry => {
      console.log(`Email: ${entry.email} | CompanyId: ${entry.companyId} | Role: ${entry.role}`);
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
};

run();
