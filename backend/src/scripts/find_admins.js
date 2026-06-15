import dns from 'dns';
dns.setServers(['1.1.1.1']); // Stable DNS setup
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const DB_URI = process.env.DB_URI || 'mongodb://localhost:27017/office_management_db';

async function fetchAdmins() {
  try {
    console.log(`Connecting to: ${DB_URI.replace(/:([^:@]+)@/, ':****@')}`);
    await mongoose.connect(DB_URI);
    console.log('Connected successfully!\n');

    const admins = await mongoose.connection.db.collection('admins').find().toArray();
    console.log(`Total admins found: ${admins.length}\n`);
    
    admins.forEach((adm, index) => {
      console.log(`--- Admin #${index + 1} ---`);
      const details = { ...adm };
      // Redact password hash for safety
      if (details.password) {
        details.password = '[REDACTED_PASSWORD_HASH]';
      }
      // Truncate large avatar string if present
      if (details.avatar && details.avatar.length > 100) {
        details.avatar = `${details.avatar.substring(0, 100)}... (truncated, total length: ${details.avatar.length})`;
      }
      console.log(JSON.stringify(details, null, 2));
      console.log('');
    });

  } catch (err) {
    console.error('Error fetching admins:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Database disconnected.');
  }
}

fetchAdmins();
