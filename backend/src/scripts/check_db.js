import dotenv from 'dotenv';
dotenv.config();
import { setServers } from 'dns';
setServers(['1.1.1.1']);
import mongoose from 'mongoose';
import Company from '../modules/companies/company.model.js';
import Employee from '../modules/employees/employees.model.js';
import Project from '../modules/projects/projects.model.js';
import ActivityLog from '../modules/activity-logs/activity-log.model.js';
import { SecurityAlert } from '../modules/security/security.model.js';
import { getTenantConnection } from '../utils/multidbConnection.js';

const dbUri = process.env.DB_URI;

async function check() {
  await mongoose.connect(dbUri);
  console.log('Connected to Main DB');
  
  const companies = await Company.find({}).lean();
  console.log(`Found ${companies.length} companies:`);
  
  for (const company of companies) {
    console.log(`\n-------------------------------------`);
    console.log(`Company ID: ${company.id} | Name: ${company.name} | Type: ${company.databaseType}`);
    try {
      const connection = await getTenantConnection(company.id);
      
      const EmployeeModel = connection.models['Employee'] || connection.model('Employee', Employee.schema);
      const ProjectModel = connection.models['Project'] || connection.model('Project', Project.schema);
      const ActivityLogModel = connection.models['ActivityLog'] || connection.model('ActivityLog', ActivityLog.schema);
      const SecurityAlertModel = connection.models['SecurityAlert'] || connection.model('SecurityAlert', SecurityAlert.schema);
      
      const isCustomDb = company.databaseType === 'dedicated' || !!company.settings?.dbUri;
      const empFilter = isCustomDb ? {} : { companyId: company.id };
      
      const empCount = await EmployeeModel.countDocuments(empFilter);
      const projCount = await ProjectModel.countDocuments(empFilter);
      const logCount = await ActivityLogModel.countDocuments(empFilter);
      const alertCount = await SecurityAlertModel.countDocuments(empFilter);
      
      console.log(`- Employees: ${empCount}`);
      console.log(`- Projects: ${projCount}`);
      console.log(`- ActivityLogs: ${logCount}`);
      console.log(`- SecurityAlerts: ${alertCount}`);
      
      if (logCount > 0) {
        const logs = await ActivityLogModel.find(empFilter).sort({ createdAt: -1 }).limit(3).lean();
        console.log(`  Sample logs:`, logs.map(l => ({ actor: l.actor, action: l.actionType, time: l.createdAt })));
      }
      
      if (alertCount > 0) {
        const alerts = await SecurityAlertModel.find(empFilter).sort({ createdAt: -1 }).limit(3).lean();
        console.log(`  Sample alerts:`, alerts.map(a => ({ type: a.alertType, severity: a.severity, desc: a.description })));
      }
      
    } catch (err) {
      console.error(`Error connecting or querying for ${company.id}:`, err.message);
    }
  }
  
  await mongoose.disconnect();
}

check().catch(console.error);
