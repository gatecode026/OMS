import mongoose from 'mongoose';
import dns, { setServers } from 'dns';
setServers(['1.1.1.1']);

const DB_URI = 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management';

async function main() {
  try {
    await mongoose.connect(DB_URI);
    console.log('Connected to DB');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    console.log('--- ALL COLLECTIONS STATS ---');
    for (const col of collections) {
      const name = col.name;
      // Skip system collections
      if (name.startsWith('system.')) continue;
      
      const stats = await db.command({ collStats: name });
      console.log(`\nCollection: ${name}`);
      console.log(` - Count: ${stats.count}`);
      console.log(` - Avg Obj Size: ${(stats.avgObjSize / 1024).toFixed(2)} KB (${stats.avgObjSize} bytes)`);
      console.log(` - Storage Size: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`);
      
      // Let's check if there are any base64 fields in a sample document
      const sample = await db.collection(name).findOne({});
      if (sample) {
        const largeFields = [];
        for (const [key, val] of Object.entries(sample)) {
          const valSize = JSON.stringify(val)?.length || 0;
          if (valSize > 50000) {
            largeFields.push(`${key} (${(valSize / 1024).toFixed(2)} KB)`);
          }
        }
        if (largeFields.length > 0) {
          console.log(` - Bloated Fields: ${largeFields.join(', ')}`);
        }
      }
    }

    await mongoose.disconnect();
  } catch (e) {
    console.error(e);
  }
}
main();
