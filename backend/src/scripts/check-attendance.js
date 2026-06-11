import dns from 'dns';
dns.setServers(['1.1.1.1']);
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const DB_URI = process.env.DB_URI || 'mongodb://localhost:27017/office_management_db';

async function check() {
  try {
    console.log('Connecting to', DB_URI.replace(/:([^:@]+)@/, ':****@'));
    await mongoose.connect(DB_URI);
    console.log('Connected!');
    
    // Check attendance collection
    const attendance = await mongoose.connection.db.collection('attendance').find().toArray();
    console.log(`Found ${attendance.length} attendance records:`);
    attendance.forEach(att => {
      console.log(`- ID: ${att.id}, Name: ${att.employeeName}, Date: ${att.date}, Status: ${att.status}, PunchIn: ${att.punchIn}, PunchOut: ${att.punchOut}`);
    });
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

check();
