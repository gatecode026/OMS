/**
 * @file src/scripts/test-provisioning-mock.js
 * @description Mock-based verification script for dedicated tenant database provisioning and routing logic.
 */

import mongoose from 'mongoose';
import Company from '../modules/companies/company.model.js';
import companyService from '../modules/companies/company.service.js';
import { TenantRegistry } from '../utils/tenantRegistry.js';
import connectionManager from '../database/connectionManager.js';
import Employee from '../modules/employees/employees.model.js';
import SystemSettings from '../modules/settings/settings.model.js';

const runMockTest = async () => {
  console.log('--- Initiating Mock Database Environment ---');

  // Set mock env URI
  process.env.CLUSTER_1_URI = 'mongodb://mock-cluster-uri:27017/office_master';

  // 1. Mock Mongoose Main Connection / DB Operations
  const companyMockDatabase = [];
  const registryMockDatabase = [];
  let companyCount = 0;

  Company.countDocuments = async () => companyMockDatabase.length;
  
  Company.findOne = (query) => {
    const exec = async () => {
      // If we are looking for the latest COMP ID in mock
      if (query.id && query.id.toString().includes('COMP-')) {
        // Return the latest COMP ID from mock DB
        const compCompanies = companyMockDatabase.filter(c => c.id && c.id.startsWith('COMP-'));
        if (compCompanies.length === 0) return null;
        // Sort by id descending
        compCompanies.sort((a, b) => b.id.localeCompare(a.id));
        return compCompanies[0];
      }
      return companyMockDatabase.find(c => {
        if (query.subdomain) return c.subdomain === query.subdomain;
        if (query.id) return c.id === query.id;
        if (query.databaseName) return c.databaseName === query.databaseName;
        return false;
      }) || null;
    };
    
    const queryObj = {
      sort: () => queryObj,
      then: (resolve, reject) => exec().then(resolve, reject),
      catch: (reject) => exec().catch(reject)
    };
    return queryObj;
  };

  Company.create = async (data) => {
    const doc = {
      ...data,
      save: async function() {
        Object.assign(this, this);
        return this;
      },
      toObject: function() { return this; }
    };
    companyMockDatabase.push(doc);
    return doc;
  };

  Company.deleteOne = async (query) => {
    const index = companyMockDatabase.findIndex(c => c.id === query.id);
    if (index !== -1) {
      companyMockDatabase.splice(index, 1);
    }
    return { deletedCount: 1 };
  };

  TenantRegistry.findOne = async (query) => {
    return registryMockDatabase.find(r => r.email === query.email) || null;
  };

  TenantRegistry.findOneAndUpdate = async (query, update, options) => {
    let entry = registryMockDatabase.find(r => r.email === query.email);
    if (!entry) {
      entry = { email: query.email };
      registryMockDatabase.push(entry);
    }
    Object.assign(entry, update);
    return entry;
  };

  TenantRegistry.deleteOne = async (query) => {
    const index = registryMockDatabase.findIndex(r => r.email === query.email);
    if (index !== -1) {
      registryMockDatabase.splice(index, 1);
    }
    return { deletedCount: 1 };
  };

  // Mock SystemSettings creation in shared mode
  SystemSettings.create = async (data) => {
    console.log('[MOCK DB] SystemSettings.create called with:', data.companyProfile.companyName);
    return data;
  };

  SystemSettings.deleteMany = (query) => {
    console.log('[MOCK DB] SystemSettings.deleteMany called with:', query);
    const exec = async () => ({ deletedCount: 0 });
    const queryObj = {
      setOptions: () => queryObj,
      then: (resolve, reject) => exec().then(resolve, reject),
      catch: (reject) => exec().catch(reject)
    };
    return queryObj;
  };

  // 2. Mock connectionManager testConnection
  connectionManager.testConnection = async (uri) => {
    console.log('[MOCK DB] testConnection validation passed for:', uri);
    return true;
  };

  // 3. Mock Mongoose createConnection
  let createdConnections = [];
  mongoose.createConnection = (uri, options) => {
    console.log('[MOCK DB] mongoose.createConnection called for:', uri);
    
    const mockConnection = {
      models: {},
      db: {
        dropCollection: async (name) => console.log(`[MOCK DB] [Tenant] dropped collection: ${name}`)
      },
      model: function(name, schema) {
        if (!this.models[name]) {
          this.models[name] = {
            createCollection: async () => console.log(`[MOCK DB] [Tenant] createCollection executed for model: ${name}`),
            ensureIndexes: async () => console.log(`[MOCK DB] [Tenant] ensureIndexes executed for model: ${name}`),
            create: async (data) => {
              console.log(`[MOCK DB] [Tenant] Record created in model ${name}:`, data.email || data.id || data.key);
              return data;
            },
            insertMany: async (arr) => {
              console.log(`[MOCK DB] [Tenant] insertMany executed for model ${name} with ${arr.length} records`);
              return arr;
            },
            deleteOne: async () => console.log(`[MOCK DB] [Tenant] Record deleted in model ${name}`)
          };
        }
        return this.models[name];
      },
      asPromise: async () => {
        return mockConnection;
      },
      close: async () => {
        console.log('[MOCK DB] [Tenant] Connection closed.');
      }
    };
    createdConnections.push(mockConnection);
    return mockConnection;
  };

  try {
    // ===============================================
    // TEST CASE 1: Shared Database Creation (Empty dbUri)
    // ===============================================
    console.log('\n--- [Test Case 1] Provisioning Shared Tenant ---');
    const sharedCompany = await companyService.createCompany({
      name: 'Shared Corp',
      subdomain: 'sharedcorp',
      adminEmail: 'admin@sharedcorp.com',
      adminPassword: 'password123'
    });

    console.log('Company ID:', sharedCompany.id);
    console.log('Database Type:', sharedCompany.databaseType);
    console.log('Tenant Status:', sharedCompany.tenantStatus);
    
    if (sharedCompany.databaseType !== 'shared') {
      throw new Error('FAIL: Company databaseType should be "shared"');
    }
    
    const registryEntryShared = registryMockDatabase.find(r => r.email === 'admin@sharedcorp.com');
    if (!registryEntryShared || registryEntryShared.companyId !== sharedCompany.id) {
      throw new Error('FAIL: Shared admin not in registry');
    }
    console.log('[Test Case 1] PASS');


    // ===============================================
    // TEST CASE 2: Dedicated Database Provisioning
    // ===============================================
    console.log('\n--- [Test Case 2] Provisioning Dedicated Tenant ---');
    const dedicatedCompany = await companyService.createCompany({
      name: 'Dedicated Corp',
      subdomain: 'dedicatedcorp',
      adminEmail: 'admin@dedicatedcorp.com',
      adminPassword: 'password123',
      mongoUri: 'mongodb://dedicated-cluster-ip:27017',
      databaseClusterKey: 'cluster_1'
    });

    console.log('Company ID:', dedicatedCompany.id);
    console.log('Database Type:', dedicatedCompany.databaseType);
    console.log('Database Name:', dedicatedCompany.databaseName);
    console.log('Tenant Status:', dedicatedCompany.tenantStatus);

    if (dedicatedCompany.databaseType !== 'dedicated') {
      throw new Error('FAIL: Company databaseType should be "dedicated"');
    }
    if (dedicatedCompany.databaseName !== 'office_dedicated_corp') {
      throw new Error(`FAIL: Unexpected database name: ${dedicatedCompany.databaseName}`);
    }

    const registryEntryDedicated = registryMockDatabase.find(r => r.email === 'admin@dedicatedcorp.com');
    if (!registryEntryDedicated || registryEntryDedicated.companyId !== dedicatedCompany.id) {
      throw new Error('FAIL: Dedicated admin not in registry');
    }
    console.log('[Test Case 2] PASS');


    // ===============================================
    // TEST CASE 3: Provisioning Rollback on Failure
    // ===============================================
    console.log('\n--- [Test Case 3] Provisioning Rollback on Failure ---');
    
    // Force provisioning failure by stubbing mongoose.createConnection to throw an error
    mongoose.createConnection = () => {
      throw new Error('Target database server is unreachable (simulated connection error)');
    };

    try {
      await companyService.createCompany({
        name: 'Failure Corp',
        subdomain: 'failurecorp',
        adminEmail: 'admin@failurecorp.com',
        adminPassword: 'password123',
        mongoUri: 'mongodb://unreachable-ip:27017',
        databaseClusterKey: 'cluster_1'
      });
      throw new Error('FAIL: Provisioning succeeded even with unreachable DB connection.');
    } catch (err) {
      console.log(`Provisioning failed with expected error: "${err.message}"`);
      // Verify rollback
      const foundInMock = companyMockDatabase.find(c => c.subdomain === 'failurecorp');
      console.log('Company document cleaned up from master DB:', foundInMock ? 'NO' : 'YES');
      if (foundInMock) {
        throw new Error('FAIL: Company document was not removed during rollback');
      }
      console.log('[Test Case 3] PASS');
    }

    console.log('\n=============================================');
    console.log('ALL MOCK-BASED TENANT PROVISIONING TESTS PASSED!');
    console.log('=============================================');

  } catch (error) {
    console.error('\nTESTING ENCOUNTERED FAILURE:', error);
    process.exit(1);
  }
};

runMockTest();
