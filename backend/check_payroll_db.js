import { setServers } from 'dns';
setServers(['1.1.1.1']);
import mongoose from "mongoose";
await mongoose.connect("mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management");
const PayrollPayments = mongoose.connection.db.collection("payrollpayments");
const payments = await PayrollPayments.find({}).toArray();
console.log("Payroll payments in DB:", JSON.stringify(payments, null, 2));
process.exit(0);
