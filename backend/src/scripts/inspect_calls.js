import mongoose from 'mongoose';

const DB_URI = 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management';

async function main() {
  console.log('Connecting to database...');
  await mongoose.connect(DB_URI);
  console.log('Connected!');

  const db = mongoose.connection.db;

  console.log('\n--- CALLS ---');
  const calls = await db.collection('calls').find({}).sort({ createdAt: -1 }).limit(10).toArray();
  calls.forEach(c => {
    console.log(JSON.stringify(c, null, 2));
  });

  await mongoose.disconnect();
}

main().catch(console.error);
