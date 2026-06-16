import dotenv from 'dotenv';
dotenv.config();
import { setServers } from 'dns';
setServers(['1.1.1.1']);
import mongoose from 'mongoose';
import Company from '../modules/companies/company.model.js';
import Employee from '../modules/employees/employees.model.js';
import Notification from '../modules/notifications/notification.model.js';
import { getTenantConnection } from '../utils/multidbConnection.js';

const dbUri = process.env.DB_URI;

async function run() {
  await mongoose.connect(dbUri);
  console.log('Connected to Main DB');
  
  const companies = await Company.find({}).lean();
  console.log(`Found ${companies.length} companies to process`);
  
  for (const company of companies) {
    try {
      const connection = await getTenantConnection(company.id);
      
      const EmployeeModel = connection.models['Employee'] || connection.model('Employee', Employee.schema);
      const NotificationModel = connection.models['Notification'] || connection.model('Notification', Notification.schema);
      
      const empCount = await EmployeeModel.countDocuments({});
      console.log(`Company ${company.id} has ${empCount} employees`);
      
      const result = await NotificationModel.updateMany(
        { recipientType: { $ne: 'Individual' } },
        { 
          $set: { 
            recipients: empCount,
            delivered: empCount
          } 
        }
      );
      
      console.log(`Updated notifications for ${company.id}:`, result);
    } catch (err) {
      console.error(`Error processing company ${company.id}:`, err.message);
    }
  }
  
  await mongoose.disconnect();
  console.log('Done!');
}

run().catch(console.error);
