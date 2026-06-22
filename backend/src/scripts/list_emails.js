import mongoose from 'mongoose';

const DB_URI = 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management';

async function run() {
  await mongoose.connect(DB_URI);
  console.log('Connected to MongoDB');
  const db = mongoose.connection.db;

  const convs = await db.collection('conversations').find({
    'participants.name': { $in: [/Geeta/i, /Udit/i] }
  }).toArray();

  console.log(`Found ${convs.length} matching conversations:`);
  convs.forEach((c, idx) => {
    const participantNames = c.participants.map(p => p.name);
    console.log(`Conv ${idx + 1}: ID=${c._id} | Type=${c.type} | Participants=[${participantNames.join(', ')}]`);
  });

  await mongoose.connection.close();
}

run().catch(console.error);
