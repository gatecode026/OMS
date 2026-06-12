import mongoose from 'mongoose';
import dns from 'dns';
dns.setServers(['1.1.1.1']);

const DB_URI = 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management';

async function main() {
  try {
    await mongoose.connect(DB_URI);
    console.log('Connected to Atlas DB.');

    const adminDb = mongoose.connection.db.admin();
    const dbsInfo = await adminDb.listDatabases();
    
    console.log('--- ALL DATABASES ON CLUSTER ---');
    for (const dbInfo of dbsInfo.databases) {
      console.log(`Database: ${dbInfo.name}`);
      const conn = mongoose.connection.useDb(dbInfo.name);
      const collections = await conn.db.listCollections().toArray();
      for (const col of collections) {
        const stats = await conn.db.command({ collStats: col.name });
        if (stats.count > 0 || col.name === 'documents') {
          console.log(`  - Collection: ${col.name}, Count: ${stats.count}`);
          if (col.name === 'documents') {
            const sample = await conn.db.collection(col.name).findOne({});
            if (sample) {
              console.log(`    Sample doc name: ${sample.name}, fileUrl: "${sample.fileUrl}"`);
            }
          }
        }
      }
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}
main();
