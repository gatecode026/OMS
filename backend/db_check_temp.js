import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  console.log('Connecting to database...');
  await mongoose.connect(process.env.DB_URI);
  console.log('Connected to main DB');

  const messages = await mongoose.connection.collection('messages').find({
    content: { $in: ['ook', 'hyy'] }
  }).toArray();
  console.log(`Found matching messages in DB:`, JSON.stringify(messages, null, 2));

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(console.error);
