import mongoose from 'mongoose';
import dns, { setServers } from 'dns';
setServers(['1.1.1.1']);

const DB_URI = 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management';

async function main() {
  try {
    await mongoose.connect(DB_URI);
    console.log('Connected to MongoDB database successfully.');
    
    const result = await mongoose.connection.collection('branches').deleteMany({});
    console.log(`Successfully deleted ${result.deletedCount} dummy branch records from the database.`);
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  } catch (error) {
    console.error('Error clearing branches from database:', error);
    process.exit(1);
  }
}

main();
