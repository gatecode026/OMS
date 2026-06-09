import mongoose from 'mongoose';
import dns, { setServers } from 'dns';
setServers(['1.1.1.1']);

const DB_URI = 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management';

async function main() {
  try {
    await mongoose.connect(DB_URI);
    
    console.log('=== ADMINS ===');
    const admins = await mongoose.connection.collection('admins').find({}).toArray();
    admins.forEach(a => {
      console.log(`Name: ${a.name}, Email: ${a.email}, RoleId: ${a.roleId || a.role}, Status: ${a.status}`);
    });

    console.log('=== EMPLOYEES ===');
    const employees = await mongoose.connection.collection('employees').find({}).toArray();
    employees.forEach(e => {
      console.log(`Name: ${e.name}, Email: ${e.email}, RoleId: ${e.roleId || e.role}, Status: ${e.status}`);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}
main();
