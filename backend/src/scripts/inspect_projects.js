import mongoose from 'mongoose';

const DB_URI = 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management';

async function main() {
  console.log('Connecting to database...');
  await mongoose.connect(DB_URI);
  console.log('Connected!');

  const db = mongoose.connection.db;

  // List all projects
  console.log('\n--- PROJECTS ---');
  const projects = await db.collection('projects').find({}).toArray();
  projects.forEach(p => {
    console.log(`Project ID: ${p.id} | Name: ${p.name} | Members: ${JSON.stringify(p.members)}`);
  });

  // List all employees
  console.log('\n--- EMPLOYEES ---');
  const employees = await db.collection('employees').find({}).toArray();
  employees.forEach(e => {
    console.log(`Employee ID: ${e.id} | Name: ${e.name} | Designation: ${e.designation || e.position}`);
  });

  await mongoose.disconnect();
}

main().catch(console.error);
