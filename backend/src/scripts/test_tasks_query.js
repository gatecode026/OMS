import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { getTenantConnection } from '../utils/multidbConnection.js';
import { runWithTenant } from '../utils/tenantContext.js';
import { resolveSecurityContext } from '../security/scopeEngine.js';
import { find } from '../modules/tasks/tasks.repository.js';

const dbUri = process.env.DB_URI;

async function check() {
  await mongoose.connect(dbUri);
  console.log('Connected to Main DB');
  
  // Set up connection for tenant
  // Run query within tenant context and mock employee security context
  const mockUser = {
    id: 'GATECO-EMP-008',
    roleId: 'employee',
    role: 'employee',
    companyId: 'COMP-001',
    branch: 'Jaipur',
    department: 'IT'
  };

  await runWithTenant('COMP-001', async () => {
    // Query 1: with month and year
    const tasks1 = await find({ month: '7', year: '2026' });
    console.log('Tasks with query { month: 7, year: 2026 }:', tasks1.length);

    // Query 2: without month and year
    const tasks2 = await find({});
    console.log('Tasks with empty query {}:', tasks2.length);
  }, false, mockUser);
  
  await mongoose.disconnect();
}

check().catch(console.error);
