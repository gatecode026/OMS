import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  console.log('Connecting to master database...');
  await mongoose.connect(process.env.DB_URI);
  console.log('Connected to main DB');

  const Company = mongoose.model('Company', new mongoose.Schema({}, { strict: false }), 'companies');
  const companies = await Company.find({}).lean();
  console.log('Company:', companies);

  await mongoose.disconnect();
}

run().catch(console.error);
