import mongoose from 'mongoose';
import dns, { setServers } from 'dns';
setServers(['1.1.1.1']);

const DB_URI = 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management';

async function main() {
  try {
    await mongoose.connect(DB_URI);
    console.log('Connected to MongoDB database successfully.');
    
    const employees = await mongoose.connection.collection('employees').find({}).toArray();
    console.log(`Found ${employees.length} employees in database:`);
    employees.forEach(emp => {
      console.log(JSON.stringify({
        id: emp.id,
        name: emp.name,
        email: emp.email,
        branch: emp.branch,
        department: emp.department,
        role: emp.role,
        roleId: emp.roleId,
        designation: emp.designation
      }, null, 2));
    });
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  } catch (error) {
    console.error('Error listing employees:', error);
    process.exit(1);
  }
}

main();
