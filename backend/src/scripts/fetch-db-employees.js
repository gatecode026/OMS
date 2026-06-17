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
  console.log('--- Connected to MongoDB ---');
  const db = mongoose.connection.db;
  
  const employees = await db.collection('employees').find({}).toArray();
  console.log(`\nTotal Employees in Database: ${employees.length}`);
  
  employees.forEach(emp => {
    console.log(JSON.stringify({
      id: emp.id,
      name: emp.name,
      email: emp.email,
      role: emp.role,
      status: emp.status,
      companyId: emp.companyId,
      avatar: emp.avatar,
      photoUrl: emp.photoUrl
    }));
  });
  
  await mongoose.connection.close();
  console.log('--- Disconnected ---');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
