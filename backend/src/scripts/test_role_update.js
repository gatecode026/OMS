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
    console.log('Connected!');

    // Find the manager role
    const role = await Role.findOne({ id: 'manager' });
    console.log('Current manager permissions mapping:', role.permissions);

    // Let's modify a value
    const updatedPermissions = Object.fromEntries(role.permissions);
    updatedPermissions.dashboard = {
      read: true,
      create: true,
      update: true,
      delete: true,
      approve: true,
      export: true
    };

    console.log('Attempting update with findOneAndUpdate...');
    const result = await Role.findOneAndUpdate(
      { id: 'manager' },
      { permissions: updatedPermissions },
      { new: true }
    );

    console.log('Resulting permissions mapping after findOneAndUpdate:', result.permissions);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
};

run();
