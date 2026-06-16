import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const DB_URI = process.env.DB_URI || 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management';

async function run() {
  await mongoose.connect(DB_URI);
  console.log('Connected to MongoDB');
  const db = mongoose.connection.db;

  const collections = await db.listCollections().toArray();
  for (const col of collections) {
    const name = col.name;
    const docs = await db.collection(name).find({}).toArray();
    for (const doc of docs) {
      const docStr = JSON.stringify(doc);
      if (docStr.includes('imagekit.io')) {
        console.log(`\nFound imagekit match in collection "${name}":`);
        console.log(`_id: ${doc._id} | id: ${doc.id} | name: ${doc.name || doc.title || 'no name'}`);
        // Print fields that contain imagekit
        for (const key of Object.keys(doc)) {
          const val = doc[key];
          if (typeof val === 'string' && val.includes('imagekit.io')) {
            console.log(`  ${key}: ${val}`);
          } else if (typeof val === 'object' && val !== null && JSON.stringify(val).includes('imagekit.io')) {
            console.log(`  ${key}: ${JSON.stringify(val)}`);
          }
        }
      }
    }
  }

  await mongoose.connection.close();
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
