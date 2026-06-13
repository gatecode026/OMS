import mongoose from 'mongoose';

const dbUri = 'mongodb://localhost:27017/office_management_db';

async function check() {
  try {
    await mongoose.connect(dbUri);
    console.log('Connected to DB!');
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    const Notification = mongoose.model('Notification', new mongoose.Schema({}, { strict: false }), 'notifications');
    const Employee = mongoose.model('Employee', new mongoose.Schema({}, { strict: false }), 'employees');
    
    const notificationsCount = await Notification.countDocuments();
    console.log('Notifications count:', notificationsCount);
    
    const employeesCount = await Employee.countDocuments();
    console.log('Employees count:', employeesCount);

    const notifications = await Notification.find().limit(5);
    console.log('Sample Notifications:', JSON.stringify(notifications, null, 2));

    const employees = await Employee.find().limit(5);
    console.log('Sample Employees:', JSON.stringify(employees.map(e => ({ id: e.id, name: e.name, roleId: e.roleId })), null, 2));
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

check();
