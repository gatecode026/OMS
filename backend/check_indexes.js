import mongoose from 'mongoose';
import dns, { setServers } from 'dns';
setServers(['1.1.1.1']);

const DB_URI = 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management';

async function main() {
  try {
    await mongoose.connect(DB_URI);
    console.log('Connected to DB');

    const db = mongoose.connection.db;
    const employeesColl = db.collection('employees');

    console.log('Creating indexes...');
    await employeesColl.createIndex({ department: 1 });
    await employeesColl.createIndex({ branch: 1 });
    await employeesColl.createIndex({ status: 1 });
    console.log('Indexes created successfully.');

    console.log('\n--- EXISTING INDEXES ---');
    const indexes = await employeesColl.indexes();
    console.log(JSON.stringify(indexes, null, 2));

    await mongoose.disconnect();
  } catch (e) {
    console.error('Error:', e);
  }
}
main();
