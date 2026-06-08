import mongoose from 'mongoose';
import dns, { setServers } from 'dns';
setServers(['1.1.1.1']);

const DB_URI = 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management';

async function main() {
  try {
    await mongoose.connect(DB_URI);
    console.log('Connected to DB');

    const leaves = await mongoose.connection.collection('leaves').find({}).toArray();
    console.log('Leaves collection documents:');
    console.log(JSON.stringify(leaves, null, 2));

    await mongoose.disconnect();
  } catch (e) {
    console.error(e);
  }
}
main();
