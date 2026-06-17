import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

dns.setServers(['1.1.1.1']);

const DB_URI = process.env.DB_URI || 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management';

async function run() {
  await mongoose.connect(DB_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;

  // 1. Reset Animesh Jain (GATECO-EMP-001) to empty
  await db.collection('employees').updateOne(
    { id: 'GATECO-EMP-001' },
    { $set: { avatar: '', photoUrl: '' } }
  );
  console.log('Restored Animesh Jain to empty');

  // 2. Reset Balram Suman (GATECO-EMP-002) to empty
  await db.collection('employees').updateOne(
    { id: 'GATECO-EMP-002' },
    { $set: { avatar: '', photoUrl: '' } }
  );
  console.log('Restored Balram Suman to empty');

  // 3. Restore RATIWALRAHUL (GATECO-EMP-003) to original URL
  await db.collection('employees').updateOne(
    { id: 'GATECO-EMP-003' },
    { $set: { avatar: 'https://ik.imagekit.io/zjd5xircoy/Office_managements/avatar_1781603574414_qJa95fviJ.jpg', photoUrl: '' } }
  );
  console.log('Restored RATIWALRAHUL to original URL');

  // 4. Restore Vikash Kumawat (GATECO-EMP-004) to original URL
  await db.collection('employees').updateOne(
    { id: 'GATECO-EMP-004' },
    { $set: { avatar: 'https://ik.imagekit.io/zjd5xircoy/Office_managements/avatar_1781603996233_fwCn0WAzE.jpg', photoUrl: '' } }
  );
  console.log('Restored Vikash Kumawat to original URL');

  // 5. Reset Geeta (GATECO-EMP-005) to empty
  await db.collection('employees').updateOne(
    { id: 'GATECO-EMP-005' },
    { $set: { avatar: '', photoUrl: '' } }
  );
  console.log('Restored Geeta to empty');

  await mongoose.connection.close();
  console.log('Database connection closed');
  process.exit(0);
}

run().catch(err => {
  console.error('Restore script failed:', err);
  process.exit(1);
});
