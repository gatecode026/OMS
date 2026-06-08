import mongoose from 'mongoose';
import Employee from './src/modules/employees/employees.model.js';

const DB_URI = 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management';

async function run() {
  try {
    await mongoose.connect(DB_URI);
    console.log('Connected to MongoDB');

    const employees = await Employee.find({});
    for (const emp of employees) {
      console.log(`Name: ${emp.name}, Email: ${emp.email}, Status: ${emp.status}, AccountStatus: ${emp.accountStatus}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
