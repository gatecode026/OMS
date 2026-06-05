import mongoose from 'mongoose';
import dns, { setServers } from 'dns';
setServers(['1.1.1.1']);

const DB_URI = 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management';

async function main() {
  try {
    await mongoose.connect(DB_URI);
    console.log('Connected to MongoDB database successfully.');
    
    const result = await mongoose.connection.collection('employees').deleteMany({ name: { $ne: 'Animesh Jain' } });
    console.log(`Successfully deleted ${result.deletedCount} dummy employee records from the database, keeping 'Animesh Jain'.`);
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  } catch (error) {
    console.error('Error clearing employee database collection:', error);
    process.exit(1);
  }
}

main();
