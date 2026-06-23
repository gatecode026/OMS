import mongoose from 'mongoose';

const DB_URI = 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management';

async function main() {
  console.log('Connecting to database...');
  await mongoose.connect(DB_URI);
  console.log('Connected!');

  const db = mongoose.connection.db;

  // List all users
  console.log('\n--- USERS ---');
  const users = await db.collection('users').find({}).toArray();
  users.forEach(u => {
    console.log(`User ID: ${u.id || u._id} | Name: ${u.name} | Email: ${u.email} | Role: ${u.roleId || u.role}`);
  });

  await mongoose.disconnect();
}

main().catch(console.error);
