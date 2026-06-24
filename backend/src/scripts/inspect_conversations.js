import mongoose from 'mongoose';

const DB_URI = 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management';

async function main() {
  console.log('Connecting to database...');
  await mongoose.connect(DB_URI);
  console.log('Connected!');

  const db = mongoose.connection.db;

  console.log('\n--- CONVERSATIONS ---');
  const convs = await db.collection('conversations').find({}).toArray();
  convs.forEach(c => {
    console.log(`ID: ${c.id || c._id} | Type: ${c.type} | Name: ${c.name} | Participants: ${JSON.stringify(c.participants.map(p => ({ id: p.employeeId, name: p.name })))}`);
  });

  await mongoose.disconnect();
}

main().catch(console.error);
