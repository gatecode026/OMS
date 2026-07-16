import { setServers } from 'dns';
setServers(['1.1.1.1']);
import mongoose from "mongoose";
await mongoose.connect("mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management");
const Attendance = mongoose.connection.db.collection("attendance");
const records = await Attendance.find({}).toArray();
console.log("Attendance records in DB:", JSON.stringify(records, null, 2));
process.exit(0);
