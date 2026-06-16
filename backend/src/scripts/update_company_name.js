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

    console.log('Updating system_settings collection...');
    const result = await db.collection('system_settings').updateMany(
      {
        $or: [
          { 'companyProfile.companyName': 'Office Management Pvt. Ltd.' },
          { 'generalSettings.companyName': 'Office Management Pvt. Ltd.' }
        ]
      },
      {
        $set: {
          'companyProfile.companyName': 'Gatecode OMS',
          'generalSettings.companyName': 'Gatecode OMS'
        }
      }
    );
    console.log(`Matched ${result.matchedCount} and updated ${result.modifiedCount} documents.`);

    console.log('Database name updates completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error running script:', err);
    process.exit(1);
  }
}

run();
