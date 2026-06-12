import mongoose from 'mongoose';
import dns, { setServers } from 'dns';
import dotenv from 'dotenv';
dotenv.config();
setServers(['1.1.1.1']);

const DB_URI = 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management';

import './src/modules/employees/employees.model.js';
import { processEmployeeAssets } from './src/utils/imagekit.js';

async function main() {
  try {
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    if (!privateKey || privateKey.includes('***')) {
      console.error('ERROR: IMAGEKIT_PRIVATE_KEY is not configured in environment variables or contains asterisks.');
      console.log('Please configure it in the backend/.env file first before running this script.');
      process.exit(1);
    }

    await mongoose.connect(DB_URI);
    console.log('Connected to DB. Starting migration...');

    const Employee = mongoose.model('Employee');
    const employees = await Employee.find({});

    console.log(`Found ${employees.length} employees to check.`);

    let migratedCount = 0;

    for (const emp of employees) {
      console.log(`Checking assets for employee: ${emp.name} (${emp.id})...`);
      
      const empObj = emp.toObject();
      const processed = await processEmployeeAssets(empObj);

      let needsSave = false;

      if (processed.avatar !== empObj.avatar) {
        console.log(`-> Avatar will be migrated to CDN URL.`);
        needsSave = true;
      }

      if (JSON.stringify(processed.documents) !== JSON.stringify(empObj.documents)) {
        console.log(`-> Documents will be migrated to CDN URLs.`);
        needsSave = true;
      }

      if (needsSave) {
        await Employee.updateOne({ id: emp.id }, {
          avatar: processed.avatar,
          photoUrl: processed.photoUrl,
          documents: processed.documents
        });
        console.log(`Successfully migrated and saved employee: ${emp.name}`);
        migratedCount++;
      } else {
        console.log(`No base64 assets found for employee: ${emp.name}.`);
      }
    }

    console.log(`\nMigration completed. Total employees updated: ${migratedCount}`);
    await mongoose.disconnect();
  } catch (e) {
    console.error('Migration failed:', e);
  }
}
main();
