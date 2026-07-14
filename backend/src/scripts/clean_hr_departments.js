import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

async function clean() {
  await mongoose.connect(process.env.DB_URI);
  const Employees = mongoose.connection.db.collection('employees');
  
  // Find all employees whose designation or role contains 'hr'
  const result = await Employees.updateMany(
    {
      $or: [
        { roleId: /hr/i },
        { role: /hr/i },
        { designation: /hr/i }
      ]
    },
    {
      $set: {
        department: '—',
        teamLeader: '—',
        team: '—'
      }
    }
  );
  
  console.log(`Successfully cleared department and team for ${result.modifiedCount} HR employees.`);
  await mongoose.disconnect();
}

clean().catch(console.error);
