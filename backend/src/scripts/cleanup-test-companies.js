import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Company from '../modules/companies/company.model.js';
import { TenantRegistry } from '../utils/tenantRegistry.js';
import env from '../config/env.js';

dotenv.config();

const clean = async () => {
  try {
    console.log('Connecting to master database...');
    await mongoose.connect(env.dbUri);
    console.log('Connected.');

    const subdomainsToClean = ['abc', 'xyz'];
    
    for (const sub of subdomainsToClean) {
      const company = await Company.findOne({ subdomain: sub });
      if (company) {
        console.log(`Found company with subdomain "${sub}", deleting...`);
        await Company.deleteOne({ id: company.id });
        await TenantRegistry.deleteMany({ companyId: company.id });
        console.log(`Deleted company "${company.name}" and its tenant registry entries.`);
      } else {
        console.log(`No company found with subdomain "${sub}".`);
      }
    }

    console.log('Disconnecting...');
    await mongoose.disconnect();
    console.log('Finished.');
  } catch (err) {
    console.error('Error during cleanup:', err);
  }
};

clean();
