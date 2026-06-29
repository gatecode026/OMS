import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
dns.setServers(['1.1.1.1']);
dotenv.config();

const dbUri = process.env.DB_URI || 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management';

import Role from '../modules/roles/roles.model.js';

const run = async () => {
  try {
    await mongoose.connect(dbUri);
    console.log('Connected to DB');

    // 1. Fetch current manager permissions
    let role = await Role.findOne({ id: 'manager' });
    console.log('Initial manager dashboard read permission:', role.permissions.get('dashboard'));

    // 2. Toggle dashboard read permission
    const currentVal = role.permissions.get('dashboard')?.read || false;
    const newVal = !currentVal;
    console.log(`Toggling dashboard read from ${currentVal} to ${newVal}`);

    const updatedPermissions = Object.fromEntries(role.permissions);
    updatedPermissions.dashboard = {
      read: newVal,
      create: newVal,
      update: newVal,
      delete: newVal,
      approve: newVal,
      export: newVal
    };

    console.log('Updating via findOneAndUpdate...');
    await Role.findOneAndUpdate(
      { id: 'manager' },
      { permissions: updatedPermissions },
      { new: true }
    );

    // 3. Disconnect and Reconnect to bypass any local Mongoose cache
    await mongoose.disconnect();
    console.log('Disconnected');
    
    await mongoose.connect(dbUri);
    console.log('Reconnected to DB');

    // 4. Fetch again and check
    role = await Role.findOne({ id: 'manager' });
    console.log('Final manager dashboard read permission:', role.permissions.get('dashboard'));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
};

run();
