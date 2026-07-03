import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.DB_URI);
  const conn = mongoose.connection;
  
  const myId = 'GATECO-EMP-008'; // Rahul Kumawat
  const query = { id: { $ne: myId }, status: { $ne: 'Inactive' } };

  const employees = await conn.collection('employees').find(
    query,
    {
      projection: {
        id: 1, name: 1, avatar: 1, designation: 1,
        department: 1, workStatus: 1, lastSeen: 1, roleId: 1
      }
    }
  ).limit(20).toArray();

  console.log('Employees found by query:', employees.map(e => ({ id: e.id, name: e.name, status: e.status })));
  await mongoose.disconnect();
}

run().catch(console.error);
