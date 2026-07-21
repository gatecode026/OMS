import mongoose from 'mongoose';

async function check() {
  await mongoose.connect('mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management');
  console.log('Connected to Main DB');
  
  const db = mongoose.connection.db;
  const docs = await db.collection('documents').find({}).toArray();
  console.log('Total Documents in DB:', docs.length);
  docs.forEach(d => {
    console.log(`- name: ${d.name}, category: ${d.category}, id: ${d.id}, type: ${d.type}`);
  });
  
  await mongoose.disconnect();
}

check().catch(console.error);
