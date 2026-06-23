import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const DB_URI = 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management';

async function main() {
  console.log('Connecting to database...');
  await mongoose.connect(DB_URI);
  console.log('Connected!');

  const db = mongoose.connection.db;

  // List all employees and test passwords
  console.log('\n--- TESTING EMPLOYEE PASSWORDS ---');
  const employees = await db.collection('employees').find({}).toArray();
  for (const e of employees) {
    const isPw = await bcrypt.compare('password', e.password || '');
    const isPw123 = await bcrypt.compare('password123', e.password || '');
    console.log(`Employee ID: ${e.id} | Name: ${e.name} | Role: ${e.roleId} | Email: ${e.email} | Is 'password': ${isPw} | Is 'password123': ${isPw123}`);
  }

  await mongoose.disconnect();
}

main().catch(console.error);
