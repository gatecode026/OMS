import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

async function inspect() {
  await mongoose.connect(process.env.DB_URI);
  const Users = mongoose.connection.db.collection('users');
  const u = await Users.findOne({ id: 'GATECO-EMP-001' });
  console.log('USER OBJECT:', u);
  await mongoose.disconnect();
}
inspect().catch(console.error);
