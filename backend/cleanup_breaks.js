import mongoose from 'mongoose';
import dns from 'dns';
dns.setServers(['1.1.1.1']);

const DB_URI = 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management';

async function main() {
  try {
    await mongoose.connect(DB_URI);
    console.log('Connected to DB');

    const result = await mongoose.connection.collection('attendance').deleteMany({
      $or: [
        { id: /SETTINGS-BREAKS/i },
        { employeeId: /SETTINGS-BREAKS/i }
      ]
    });
    console.log(`Successfully deleted ${result.deletedCount} settings documents from the attendance collection.`);

    await mongoose.disconnect();
    console.log('Disconnected from DB');
  } catch (e) {
    console.error(e);
  }
}

main();
