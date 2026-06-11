import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env' });

const DB_URI = process.env.DB_URI || 'mongodb://localhost:27017/office_management_db';

async function check() {
  console.log('Connecting to DB...');
  await mongoose.connect(DB_URI);
  console.log('Connected!');
  const Employee = mongoose.model('Employee', new mongoose.Schema({}, { strict: false }));
  const emp = await Employee.findOne({ name: /soniya/i });
  if (emp) {
    console.log('Found Soniya:');
    console.log('id:', emp.get('id'));
    console.log('name:', emp.get('name'));
    console.log('avatar length:', emp.get('avatar') ? emp.get('avatar').length : 0);
    console.log('photoUrl length:', emp.get('photoUrl') ? emp.get('photoUrl').length : 0);
    console.log('documents:', JSON.stringify(emp.get('documents'), null, 2));
  } else {
    console.log('Soniya not found');
  }
  await mongoose.disconnect();
}

check().catch(console.error);
