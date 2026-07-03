import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { setServers } from 'dns';
setServers(['1.1.1.1']);
import { getTenantConnection } from '../database/connectionManager.js';
import { runWithTenant } from '../utils/tenantContext.js';
import { Announcement, AnnouncementTrackingLog, AnnouncementAuditLog } from '../modules/announcements/announcement.model.js';

async function run() {
  try {
    console.log('Connecting to main database...');
    await mongoose.connect(process.env.DB_URI);
    console.log('Connected to main DB!');

    // Resolve connection for office_one
    const companyId = 'COMP-001';
    console.log(`Resolving connection for Company ID: ${companyId}...`);
    const connection = await getTenantConnection(companyId);
    await connection.asPromise();
    console.log(`Connected to dedicated DB: ${connection.db.databaseName}`);

    // Run query inside tenant context
    await new Promise((resolve) => {
      runWithTenant(companyId, async () => {
        try {
          const count = await Announcement.countDocuments({});
          console.log(`Announcements count (Mongoose): ${count}`);

          const trkCount = await AnnouncementTrackingLog.countDocuments({});
          console.log(`Tracking logs count (Mongoose): ${trkCount}`);

          const audCount = await AnnouncementAuditLog.countDocuments({});
          console.log(`Audit logs count (Mongoose): ${audCount}`);

          // Let's also check the raw collection names and counts in connection.db
          console.log('\n--- Raw collections in DB ---');
          const collections = await connection.db.listCollections().toArray();
          for (const col of collections) {
            const cnt = await connection.db.collection(col.name).countDocuments({});
            console.log(`- ${col.name}: ${cnt} documents`);
          }

          resolve();
        } catch (e) {
          console.error('Query error:', e);
          resolve();
        }
      });
    });

    await connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
