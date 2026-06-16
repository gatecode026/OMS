import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Company from '../modules/companies/company.model.js';
import { getTenantConnection } from '../database/connectionManager.js';

async function run() {
  try {
    console.log('Connecting to main database...');
    await mongoose.connect(process.env.DB_URI);
    console.log('Connected to main DB!');

    const companies = await Company.find({});
    console.log(`Found ${companies.length} companies. Starting updates...`);

    // 1. Update shared database (main connection)
    const mainDb = mongoose.connection.db;
    const updateResult = await mainDb.collection('system_settings').updateMany(
      {
        $or: [
          { 'companyProfile.companyName': 'Office Management Pvt. Ltd.' },
          { 'generalSettings.companyName': 'Office Management Pvt. Ltd.' },
          { 'companyProfile.companyName': 'one' },
          { 'generalSettings.companyName': 'one' }
        ]
      },
      {
        $set: {
          'companyProfile.companyName': 'Gatecode OMS',
          'generalSettings.companyName': 'Gatecode OMS'
        }
      }
    );
    console.log(`Shared database: Matched ${updateResult.matchedCount}, modified ${updateResult.modifiedCount}`);

    // 2. Update each company's dedicated database
    for (const company of companies) {
      console.log(`\nResolving connection for Company ID: ${company.id} (${company.name})...`);
      try {
        const connection = await getTenantConnection(company.id);
        if (connection === mongoose.connection) {
          console.log(`Company ${company.id} is on shared database (already updated).`);
          continue;
        }

        // Wait for connection to open
        await connection.asPromise();

        const db = connection.db;
        const result = await db.collection('system_settings').updateMany(
          {
            $or: [
              { 'companyProfile.companyName': 'Office Management Pvt. Ltd.' },
              { 'generalSettings.companyName': 'Office Management Pvt. Ltd.' },
              { 'companyProfile.companyName': 'one' },
              { 'generalSettings.companyName': 'one' }
            ]
          },
          {
            $set: {
              'companyProfile.companyName': 'Gatecode OMS',
              'generalSettings.companyName': 'Gatecode OMS'
            }
          }
        );
        console.log(`Dedicated DB for ${company.id} [${db.databaseName}]: Matched ${result.matchedCount}, modified ${result.modifiedCount}`);
        await connection.close();
      } catch (err) {
        console.error(`Error updating database for company ${company.id}:`, err.message);
      }
    }

    console.log('\nAll databases successfully processed!');
    process.exit(0);
  } catch (err) {
    console.error('Error running script:', err);
    process.exit(1);
  }
}

run();
