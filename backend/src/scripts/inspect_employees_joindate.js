import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { setServers } from 'dns';
setServers(['1.1.1.1']);

import { getTenantConnection } from '../database/connectionManager.js';
import { runWithTenant } from '../utils/tenantContext.js';
import Employee from '../modules/employees/employees.model.js';

async function run() {
  try {
    await mongoose.connect(process.env.DB_URI);
    const companyId = 'COMP-001';
    const connection = await getTenantConnection(companyId);
    await connection.asPromise();

    await new Promise((resolve) => {
      runWithTenant(companyId, async () => {
        const EmployeeModel = connection.model('Employee');
        const emps = await EmployeeModel.find({});
        console.log(emps.map(e => ({ id: e.id, name: e.name, joinDate: e.joinDate, status: e.status })));
        resolve();
      });
    });

    await connection.close();
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
