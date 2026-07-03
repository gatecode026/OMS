import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.DB_URI);
  const conn = mongoose.connection;
  const emp = await conn.collection('employees').findOne({ id: 'GATECO-EMP-005' });
  console.log('Employee GATECO-EMP-005 document keys and values:');
  console.log(emp);
  await mongoose.disconnect();
}

run().catch(console.error);
