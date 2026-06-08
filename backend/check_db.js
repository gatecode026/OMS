import mongoose from 'mongoose';
import dns, { setServers } from 'dns';
setServers(['1.1.1.1']);

const DB_URI = 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management';

async function main() {
  try {
    await mongoose.connect(DB_URI);
    console.log('Connected to DB');

    const branches = await mongoose.connection.collection('branches').find({}).toArray();
    console.log('Branches documents:');
    console.log(JSON.stringify(branches, null, 2));

    const employees = await mongoose.connection.collection('employees').find({}).toArray();
    console.log('Employees documents:');
    console.log(JSON.stringify(employees, null, 2));

    const attendance = await mongoose.connection.collection('attendance').find({}).toArray();
    console.log('Attendance documents:');
    console.log(JSON.stringify(attendance, null, 2));

    await mongoose.disconnect();
  } catch (e) {
    console.error(e);
  }
}
main();
