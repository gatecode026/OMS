import mongoose from 'mongoose';
import dns from 'dns';
dns.setServers(['1.1.1.1']);

const DB_URI = 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management';

import './src/modules/employees/employees.model.js';

async function main() {
  await mongoose.connect(DB_URI);
  console.log('Connected to DB.');

  const Employee = mongoose.model('Employee');
  const employees = await Employee.find({});
  
  for (const emp of employees) {
    console.log(`Employee: ${emp.name} (${emp.id})`);
    console.log(`  avatar URL: ${emp.avatar ? emp.avatar.substring(0, 100) : 'EMPTY'}`);
    console.log(`  photoUrl: ${emp.photoUrl ? emp.photoUrl.substring(0, 100) : 'EMPTY'}`);
    console.log(`  documents:`);
    if (emp.documents) {
      emp.documents.forEach(d => {
        console.log(`    - Category: ${d.category}, downloadUrl: ${d.downloadUrl ? d.downloadUrl.substring(0, 100) : 'EMPTY'}`);
      });
    }
    console.log('---');
  }

  await mongoose.disconnect();
}
main();
