const mongoose = require('mongoose');
const dns = require('dns');

dns.setServers(['1.1.1.1']);

const dbUri = 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management';

const run = async () => {
  try {
    await mongoose.connect(dbUri);
    const db = mongoose.connection.db;

    const employees = await db.collection('employees').find({}).toArray();
    console.log('--- Employee Scores ---');
    employees.forEach(emp => {
      console.log(`Name: ${emp.name}, Productivity: ${emp.productivityScore}, Performance Overall: ${emp.performanceScore?.overall}`);
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
};

run();
