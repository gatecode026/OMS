import mongoose from 'mongoose';
import dns, { setServers } from 'dns';
setServers(['1.1.1.1']);

const DB_URI = 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management';

async function main() {
  try {
    await mongoose.connect(DB_URI);
    console.log('Connected to DB');

    const projects = await mongoose.connection.collection('projects').find({}).toArray();
    console.log('Projects count:', projects.length);
    console.log('Projects documents:');
    console.log(JSON.stringify(projects, null, 2));

    await mongoose.disconnect();
  } catch (e) {
    console.error(e);
  }
}
main();
