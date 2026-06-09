import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dns, { setServers } from 'dns';
setServers(['1.1.1.1']);

const DB_URI = 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management';

async function main() {
  try {
    await mongoose.connect(DB_URI);
    console.log('Connected to DB');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password', salt);

    console.log('Updating employees...');
    const result = await mongoose.connection.collection('employees').updateMany(
      {},
      { 
        $set: { 
          status: 'Active',
          password: hashedPassword 
        } 
      }
    );
    console.log(`Updated ${result.modifiedCount} employees.`);

    console.log('Updating admins...');
    const adminResult = await mongoose.connection.collection('admins').updateMany(
      {},
      { 
        $set: { 
          status: 'Active',
          password: hashedPassword 
        } 
      }
    );
    console.log(`Updated ${adminResult.modifiedCount} admins.`);

    await mongoose.disconnect();
    console.log('Done!');
  } catch (err) {
    console.error(err);
  }
}
main();
