import mongoose from 'mongoose';
import dns from 'dns';
import dotenv from 'dotenv';
dotenv.config();

dns.setServers(['8.8.8.8']);

async function run() {
  await mongoose.connect(process.env.DB_URI);
  console.log('Connected to Main DB');

  await mongoose.connect(process.env.DB_URI);
  console.log('Connected to Main DB');

  await mongoose.connect(process.env.DB_URI);
  console.log('Connected to Main DB');

  await mongoose.connect(process.env.DB_URI);
  console.log('Connected to Main DB');

  await mongoose.connect(process.env.DB_URI);
  console.log('Connected to Main DB');

  await mongoose.connect(process.env.DB_URI);
  console.log('Connected to Main DB');

  await mongoose.connect(process.env.DB_URI);
  console.log('Connected to Main DB');

  await mongoose.connect(process.env.DB_URI);
  console.log('Connected to Main DB');

  const messages = await mongoose.connection.collection('messages').find({
    conversationId: 'GATECO-CONV-006'
  }).toArray();

  console.log('Raw messages in GATECO-CONV-006:');
  console.log(JSON.stringify(messages.map(m => ({
    _id: m._id,
    id: m.id,
    senderId: m.senderId,
    content: m.content,
    createdAt: m.createdAt,
    readBy: m.readBy,
    deliveredTo: m.deliveredTo
  })), null, 2));
  process.exit(0);
}

run().catch(console.error);
