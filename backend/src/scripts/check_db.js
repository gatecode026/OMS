import mongoose from 'mongoose';

const dbUri = 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management';

async function check() {
  try {
    await mongoose.connect(dbUri);
    console.log('Connected to Atlas DB!');
    
    const Leave = mongoose.model('Leave', new mongoose.Schema({}, { strict: false }), 'leaves');
    const leavesCount = await Leave.countDocuments();
    console.log('Leaves count:', leavesCount);
    
    const leaves = await Leave.find().limit(20);
    console.log('Sample Leaves:', JSON.stringify(leaves.map(l => ({ id: l.id, employeeId: l.employeeId, employeeName: l.employeeName, type: l.type, fromDate: l.fromDate, toDate: l.toDate, status: l.status })), null, 2));
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

check();
