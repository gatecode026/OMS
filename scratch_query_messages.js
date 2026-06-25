import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: './backend/.env' });

async function run() {
  const dbUri = process.env.DB_URI;
  if (!dbUri) {
    console.error('No DB_URI in backend/.env');
    process.exit(1);
  }

  console.log('Connecting to database...');
  await mongoose.connect(dbUri);

  // Define minimal Message schema for reading
  const MessageSchema = new mongoose.Schema({
    id: String,
    conversationId: String,
    senderId: String,
    content: String,
    type: String,
    isDeleted: Boolean,
    readBy: Array,
    deliveredTo: Array,
    createdAt: Date
  }, { collection: 'messages' });

  const Message = mongoose.model('Message', MessageSchema);

  console.log('Fetching last 10 messages...');
  const messages = await Message.find({}).sort({ createdAt: -1 }).limit(10);
  
  messages.forEach(msg => {
    console.log(`[${msg.createdAt}] msgId=${msg.id} sender=${msg.senderId} type=${msg.type} content="${msg.content}"`);
    console.log(`  readBy=${JSON.stringify(msg.readBy)}`);
    console.log(`  deliveredTo=${JSON.stringify(msg.deliveredTo)}`);
  });

  await mongoose.connection.close();
}

run();
