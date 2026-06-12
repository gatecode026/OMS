import mongoose from 'mongoose';
import dns from 'dns';
dns.setServers(['1.1.1.1']);

import dotenv from 'dotenv';
dotenv.config();

import Employee from '../modules/employees/employees.model.js';

async function main() {
  try {
    await mongoose.connect(process.env.DB_URI || 'mongodb://localhost:27017/office_management_db');
    const emps = await Employee.find({});
    console.log(`Mongoose found ${emps.length} employees.`);
    const soniya = emps.find(e => e.name.toLowerCase().includes('soniya'));
    if (soniya) {
      console.log('Soniya details:');
      console.log('id:', soniya.id);
      console.log('real id field:', soniya.get('id'));
      console.log('name:', soniya.name);
      console.log('avatar exists:', !!soniya.avatar);
      if (soniya.avatar) {
        console.log('avatar length:', soniya.avatar.length);
        console.log('avatar start:', soniya.avatar.substring(0, 50));
      }
      console.log('photoUrl exists:', !!soniya.photoUrl);
    } else {
      console.log('Soniya not found in Mongoose find');
    }
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}
main();
