import mongoose from 'mongoose';
import dns from 'dns';
dns.setServers(['1.1.1.1']);

const dbUri = 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management';

const run = async () => {
  try {
    await mongoose.connect(dbUri);
    const branches = await mongoose.connection.db.collection('branches').find({}).toArray();
    console.log(branches.map(x => ({ name: x.name, revenue: x.revenue, id: x.id })));
  } catch (e) {
    console.error(e);
  } finally {
    await mongoose.disconnect();
  }
};
run();
