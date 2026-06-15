import dns from 'dns';
dns.setServers(['1.1.1.1']);
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Company from '../modules/companies/company.model.js';
import { getOverview } from '../modules/admin/admin.controller.js';

const DB_URI = process.env.DB_URI || 'mongodb://localhost:27017/office_management_db';

async function run() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(DB_URI);
    console.log('Database connected successfully.\n');

    console.log('--- STARTING OVERVIEW CONTROLLER EXECUTION ---');
    const mockReq = {};
    const mockRes = {
      status(code) {
        return this;
      },
      json(data) {
        console.log('\n--- CONTROLLER RESPONSE RECEIVED ---');
        console.log(JSON.stringify(data, null, 2));
        return this;
      }
    };
    const next = (err) => {
      if (err) {
        console.error('Controller next() error:', err);
      }
    };

    await getOverview(mockReq, mockRes, next);
    
    // Give enough time for the aggregation promises to resolve and output logs
    await new Promise(resolve => setTimeout(resolve, 4000));

  } catch (err) {
    console.error('Error during execution:', err);
  } finally {
    await mongoose.disconnect();
    console.log('\nDatabase disconnected.');
  }
}

run();
