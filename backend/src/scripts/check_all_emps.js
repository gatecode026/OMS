import mongoose from 'mongoose';
import dns from 'dns';
dns.setServers(['1.1.1.1']);

const DB_URI = 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management';

async function main() {
  try {
    await mongoose.connect(DB_URI);
    const emps = await mongoose.connection.db.collection('employees').find({}).toArray();
    console.log(`Found ${emps.length} employees:`);
    emps.forEach(e => {
      console.log(`Name: ${e.name}, ID: ${e.id}, Email: ${e.email}, avatar length: ${e.avatar ? e.avatar.length : 0}`);
    });
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}
main();
