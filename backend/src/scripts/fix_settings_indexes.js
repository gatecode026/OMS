import dns from 'dns';
dns.setServers(['1.1.1.1']); // Set stable DNS
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const DB_URI = process.env.DB_URI || 'mongodb://localhost:27017/office_management_db';

async function fix() {
  try {
    console.log(`Connecting to: ${DB_URI.replace(/:([^:@]+)@/, ':****@')}`);
    await mongoose.connect(DB_URI);
    console.log('Connected to DB successfully!');

    const db = mongoose.connection.db;
    const settingsColl = db.collection('system_settings');

    console.log('\n--- EXISTING INDEXES on system_settings ---');
    const indexes = await settingsColl.indexes();
    console.log(JSON.stringify(indexes, null, 2));

    // Find and drop key_1 index
    const hasKey1 = indexes.some(idx => idx.name === 'key_1');
    if (hasKey1) {
      console.log('\nFound unique index "key_1" on "key" field. Dropping it to support multi-tenancy...');
      await settingsColl.dropIndex('key_1');
      console.log('Successfully dropped "key_1" index.');
    } else {
      console.log('\nUnique index "key_1" not found.');
    }

    console.log('\nEnsuring compound unique index { key: 1, companyId: 1 } exists...');
    await settingsColl.createIndex({ key: 1, companyId: 1 }, { unique: true });
    console.log('Compound unique index ensured.');

    console.log('\nUpdated indexes on system_settings:');
    const updatedIndexes = await settingsColl.indexes();
    console.log(JSON.stringify(updatedIndexes, null, 2));

  } catch (err) {
    console.error('Error fixing settings indexes:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Database disconnected.');
  }
}

fix();
