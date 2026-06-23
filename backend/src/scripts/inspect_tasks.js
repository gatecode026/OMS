import mongoose from 'mongoose';

const DB_URI = 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management';

async function main() {
  console.log('Connecting to database...');
  await mongoose.connect(DB_URI);
  console.log('Connected!');

  const db = mongoose.connection.db;

  // List all employees
  console.log('\n--- EMPLOYEES ---');
  const employees = await db.collection('employees').find({}).toArray();
  employees.forEach(e => {
    console.log(`Employee ID: ${e.id} | Name: ${e.name} | Role: ${e.roleId} | Email: ${e.email}`);
  });

  await mongoose.disconnect();
}

main().catch(console.error);
