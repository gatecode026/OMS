import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const DB_URI = process.env.DB_URI || 'mongodb://localhost:27017/office_management_db';

async function run() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(DB_URI);
    console.log('Connected!');

    const db = mongoose.connection.db;

    // 1. Find all companies
    const companies = await db.collection('companies').find().toArray();
    console.log('\n--- COMPANIES ---');
    companies.forEach(c => {
      console.log(`ID: ${c.id} | Name: ${c.name} | Subdomain: ${c.subdomain} | dbUri: ${c.settings?.dbUri || '(none)'}`);
    });

    // 2. Find all settings in main DB
    const settings = await db.collection('system_settings').find().toArray();
    console.log('\n--- SYSTEM SETTINGS ---');
    settings.forEach(s => {
      console.log(`CompanyId: ${s.companyId} | Profile Name: ${s.companyProfile?.companyName} | General Name: ${s.generalSettings?.companyName}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Error running script:', err);
    process.exit(1);
  }
}

run();
