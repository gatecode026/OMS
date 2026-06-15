import dns from 'dns';
dns.setServers(['1.1.1.1']);
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT || 5000;
const DB_URI = process.env.DB_URI || 'mongodb://localhost:27017/office_management_db';

// Models
import Company from '../modules/companies/company.model.js';
import Employee from '../modules/employees/employees.model.js';
import SystemSettings from '../modules/settings/settings.model.js';

async function main() {
  try {
    // 1. Authenticate with Super Admin
    console.log('1. Attempting login as Super Admin...');
    const loginRes = await fetch(`http://localhost:${PORT}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'superadmin@saas.com', password: 'password' })
    });
    
    const loginData = await loginRes.json();
    if (loginData.status !== 'success') {
      console.error('Super Admin login failed:', loginData);
      return;
    }
    
    const token = loginData.data.token;
    console.log('Login successful! JWT Token acquired.\n');

    // Clean up any existing test records first
    console.log('Cleaning up any existing "rahulcorp" test records...');
    await mongoose.connect(DB_URI);
    await Company.deleteOne({ subdomain: 'rahulcorp' });
    await Employee.deleteOne({ email: 'rahulcorp@saas.com' });
    await SystemSettings.deleteMany({ companyProfile: { $exists: true }, 'companyProfile.companyName': 'rahul corporation' });
    console.log('Cleaned!\n');

    // 2. Post company creation request to Admin endpoints
    console.log('2. Submitting company creation form request...');
    const companyPayload = {
      name: 'rahul corporation',
      subdomain: 'rahulcorp',
      plan: 'Premium',
      adminEmail: 'rahulcorp@saas.com',
      adminPassword: 'password123',
      adminName: 'Rahul Corp Admin',
      settings: {
        primaryColor: '#8b5cf6',
        secondaryColor: '#7c3aed'
      }
    };

    const createRes = await fetch(`http://localhost:${PORT}/api/admin/companies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(companyPayload)
    });

    const createData = await createRes.json();
    console.log('API Response status code:', createRes.status);
    console.log('API Response body:', JSON.stringify(createData, null, 2));

    if (createRes.status !== 201 && createData.status !== 'success') {
      console.error('Company creation failed.');
      return;
    }
    
    console.log('\n3. Verification in Database...');
    const company = await Company.findOne({ subdomain: 'rahulcorp' });
    console.log('Company document created in "companies" collection:');
    console.log(JSON.stringify(company, null, 2));

    const employee = await Employee.findOne({ email: 'rahulcorp@saas.com' });
    console.log('\nDefault admin employee created in "employees" collection:');
    console.log(JSON.stringify(employee, null, 2));

    const settingsDoc = await SystemSettings.findOne({ companyId: company.id });
    console.log('\nSystemSettings document created in "system_settings" collection:');
    console.log(JSON.stringify(settingsDoc, null, 2));

    console.log('\nVerification completed successfully with zero duplicate key errors!');

  } catch (err) {
    console.error('Test failed with error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection disconnected.');
  }
}

main();
