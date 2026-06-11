import dns from 'dns';
dns.setServers(['1.1.1.1']);

import mongoose from 'mongoose';

const DB_URI = "mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management";

async function run() {
  try {
    const mongooseOpts = {
      autoIndex: true,
      serverSelectionTimeoutMS: 15000
    };
    await mongoose.connect(DB_URI, mongooseOpts);
    const db = mongoose.connection.db;
    
    const branches = await db.collection('branches').find({}).toArray();
    console.log('=== BRANCHES ===');
    branches.forEach(b => {
      console.log(`- ID: ${b.id} | Name: ${b.name}`);
    });
    
    const depts = await db.collection('departments').find({}).toArray();
    console.log('=== DEPARTMENTS ===');
    depts.forEach(d => {
      console.log(`- ID: ${d.id} | Name: ${d.name} | Branch: ${d.branch}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

run();
