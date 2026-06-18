import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const dbUri = process.env.DB_URI;

async function run() {
  try {
    await mongoose.connect(dbUri);
    console.log("Connected to MongoDB!");

    const db = mongoose.connection.db;
    const rawProjects = await db.collection('projects').find({}).toArray();
    console.log("Raw Projects count:", rawProjects.length);
    console.log("Raw Projects:", JSON.stringify(rawProjects, null, 2));

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
