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
  await mongoose.connect(CLUSTER_URI);
  console.log('Connected!');

  const adminDb = mongoose.connection.db.admin();
  const dbsInfo = await adminDb.listDatabases();

  for (const dbInfo of dbsInfo.databases) {
    const dbName = dbInfo.name;
    if (['admin', 'local', 'config'].includes(dbName)) continue;

    console.log(`Searching DB: ${dbName}`);
    const conn = mongoose.createConnection(`${CLUSTER_URI}/${dbName}`);
    await conn.asPromise();

    const collections = await conn.db.listCollections().toArray();
    for (const col of collections) {
      const count = await conn.db.collection(col.name).countDocuments({
        $or: [
          { id: 'GATECO-EMP-003' },
          { employeeCode: 'GATECO-EMP-003' },
          { name: /ratiwal/i },
          { email: /rahul/i }
        ]
      });

      if (count > 0) {
        console.log(`  -> Found ${count} matching document(s) in collection "${col.name}"`);
        const docs = await conn.db.collection(col.name).find({
          $or: [
            { id: 'GATECO-EMP-003' },
            { employeeCode: 'GATECO-EMP-003' },
            { name: /ratiwal/i },
            { email: /rahul/i }
          ]
        }).toArray();
        docs.forEach(d => {
          console.log(`     Doc:`, JSON.stringify(d, null, 2));
        });
      }
    }
    await conn.close();
  }

  await mongoose.disconnect();
  console.log('Done.');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
