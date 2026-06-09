import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import env from '../config/env.js';
import Admin from '../modules/admin/admin.model.js';

dotenv.config();

const getArgValue = (flag) => {
  const arg = process.argv.find(a => a.startsWith(`${flag}=`));
  return arg ? arg.split('=')[1] : null;
};

const run = async () => {
  const email = getArgValue('--email');
  const password = getArgValue('--password');
  const name = getArgValue('--name') || 'Super Admin';
  const phone = getArgValue('--phone') || '+91 98765 43210';

  if (!email || !password) {
    console.error('Error: --email and --password arguments are required.');
    console.log('Usage: node src/scripts/create-super-admin.js --email=admin@example.com --password=securepassword [--name="Super Admin"] [--phone="+123456789"]');
    process.exit(1);
  }

  try {
    console.log('Connecting to database...');
    await mongoose.connect(env.dbUri);
    console.log('Database connected successfully.');

    // Check if admin already exists
    const existing = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      console.error(`Error: Admin with email ${email} already exists.`);
      process.exit(1);
    }

    // Generate unique EMP ID
    const count = await Admin.countDocuments();
    const adminId = `EMP-2026-${String(count + 1).padStart(3, '0')}`;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newAdmin = await Admin.create({
      id: adminId,
      name,
      email: email.toLowerCase().trim(),
      phone,
      role: 'Super Admin',
      roleId: 'super_admin',
      status: 'Active',
      password: hashedPassword
    });

    console.log('----------------------------------------');
    console.log('Super Admin created successfully!');
    console.log(`ID:       ${newAdmin.id}`);
    console.log(`Name:     ${newAdmin.name}`);
    console.log(`Email:    ${newAdmin.email}`);
    console.log(`Role:     ${newAdmin.role}`);
    console.log('----------------------------------------');

    process.exit(0);
  } catch (error) {
    console.error('Failed to create super admin:', error);
    process.exit(1);
  }
};

run();
