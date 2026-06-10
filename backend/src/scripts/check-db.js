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
    const employees = await mongoose.connection.db.collection('employees').find().toArray();
    console.log(`Found ${employees.length} employees:`);
    employees.forEach(emp => {
      console.log(`- ID: ${emp.id}, Name: ${emp.name}, AvatarLength: ${emp.avatar ? emp.avatar.length : 0}, DocumentsCount: ${emp.documents ? emp.documents.length : 0}`);
      console.log(`  Avatar Value Prefix: "${emp.avatar ? emp.avatar.substring(0, 100) : 'none'}"`);
      if (emp.documents && emp.documents.length > 0) {
        console.log('  Documents:', emp.documents.map(d => ({ category: d.category, fileName: d.fileName })));
      }
    });

    const admins = await mongoose.connection.db.collection('admins').find().toArray();
    console.log(`Found ${admins.length} admins:`);
    admins.forEach(adm => {
      console.log(`- ID: ${adm.id}, Name: ${adm.name}, AvatarLength: ${adm.avatar ? adm.avatar.length : 0}`);
      console.log(`  Avatar Value Prefix: "${adm.avatar ? adm.avatar.substring(0, 100) : 'none'}"`);
    });
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

check();
