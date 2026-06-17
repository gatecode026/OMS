import dns, { setServers } from 'dns';
setServers(['1.1.1.1']);

import mongoose from 'mongoose';
import env from '../config/env.js';
import Company from '../modules/companies/company.model.js';
import securityModel from '../modules/security/security.model.js';
const { IpBlocklist, SecurityAlert, UserSession } = securityModel;
import { getTenantConnection } from '../utils/multidbConnection.js';

async function main() {
  await mongoose.connect(env.dbUri);
  console.log('Connected to master DB');

  const companies = await Company.find({}).lean();
  console.log(`Found ${companies.length} companies`);

  let totalBlocklist = 0;
  let totalAlerts = 0;
  let totalSessions = 0;

  for (const company of companies) {
    try {
      const conn = await getTenantConnection(company.id);
      
      const IpBlocklistModel = conn.models['IpBlocklist'] || conn.model('IpBlocklist', IpBlocklist.schema);
      const SecurityAlertModel = conn.models['SecurityAlert'] || conn.model('SecurityAlert', SecurityAlert.schema);
      const UserSessionModel = conn.models['UserSession'] || conn.model('UserSession', UserSession.schema);

      const blockCount = await IpBlocklistModel.countDocuments({});
      const alertCount = await SecurityAlertModel.countDocuments({});
      const sessionCount = await UserSessionModel.countDocuments({});

      console.log(`Company: ${company.name} (${company.id}) | Blocklist: ${blockCount} | Alerts: ${alertCount} | Sessions: ${sessionCount}`);
      
      totalBlocklist += blockCount;
      totalAlerts += alertCount;
      totalSessions += sessionCount;
    } catch (err) {
      console.error(`Error for company ${company.id}:`, err.message);
    }
  }

  console.log(`\nTotals: Blocklist: ${totalBlocklist} | Alerts: ${totalAlerts} | Sessions: ${totalSessions}`);
  await mongoose.disconnect();
}

main().catch(console.error);
