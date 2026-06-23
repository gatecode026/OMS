import mongoose from 'mongoose';

const DB_URI = 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management';

async function main() {
  console.log('Connecting to database...');
  await mongoose.connect(DB_URI);
  console.log('Connected!');

  const db = mongoose.connection.db;

  // List all admins
  console.log('\n--- ADMINS ---');
  const admins = await db.collection('admins').find({}).toArray();
  admins.forEach(a => {
    console.log(`Admin ID: ${a.id || a._id} | Name: ${a.name} | Email: ${a.email}`);
  });

  await mongoose.disconnect();
}

main().catch(console.error);
