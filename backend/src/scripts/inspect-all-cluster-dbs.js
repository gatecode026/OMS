import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const CLUSTER_URI = process.env.CLUSTER_1_URI || 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net';

async function run() {
  console.log(`Connecting to Mongo cluster: ${CLUSTER_URI}`);
  const client = await mongoose.connect(CLUSTER_URI);
  console.log('Connected!');

  const adminDb = mongoose.connection.db.admin();
  const dbsInfo = await adminDb.listDatabases();
  console.log('\n--- DATABASES ON CLUSTER ---');
  console.log(JSON.stringify(dbsInfo.databases, null, 2));

  for (const dbInfo of dbsInfo.databases) {
    const dbName = dbInfo.name;
    // Skip system/local databases
    if (['admin', 'local', 'config'].includes(dbName)) continue;

    console.log(`\n======================================`);
    console.log(`DATABASE: ${dbName}`);
    
    // Create connection to this database
    const conn = mongoose.createConnection(`${CLUSTER_URI}/${dbName}`);
    await conn.asPromise();

    const collections = await conn.db.listCollections().toArray();
    console.log(`Collections: ${collections.map(c => c.name).join(', ')}`);

    for (const col of collections) {
      if (col.name === 'employees' || col.name === 'companies' || col.name === 'admins') {
        const docs = await conn.db.collection(col.name).find({}).toArray();
        console.log(`- Collection "${col.name}": ${docs.length} documents`);
        if (docs.length > 0) {
          console.log(`  Sample:`);
          docs.slice(0, 5).forEach(doc => {
            console.log(`    ${JSON.stringify({
              id: doc.id || doc._id,
              name: doc.name || doc.companyName || doc.adminName || doc.email,
              email: doc.email,
              role: doc.role,
              status: doc.status || doc.accountStatus
            })}`);
          });
        }
      }
    }
    await conn.close();
  }

  await mongoose.disconnect();
  console.log('\n--- Done ---');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
