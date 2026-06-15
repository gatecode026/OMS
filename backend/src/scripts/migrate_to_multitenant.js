import mongoose from 'mongoose';
import dns from 'dns';
dns.setServers(['1.1.1.1']); // Set stable DNS servers for Atlas resolution
import env from '../config/env.js';
import Company from '../modules/companies/company.model.js';

async function migrate() {
  try {
    console.log(`Connecting to database: ${env.dbUri.replace(/:([^:@]+)@/, ':****@')}`);
    await mongoose.connect(env.dbUri);
    console.log('Database connected successfully!');

    // 1. Seed/Upsert the default tenant
    const defaultTenantId = 'COMP-DEFAULT';
    const defaultCompany = await Company.findOneAndUpdate(
      { id: defaultTenantId },
      {
        $setOnInsert: {
          id: defaultTenantId,
          name: 'Default Company',
          status: 'Active',
          plan: 'Enterprise',
          settings: {
            timezone: 'Asia/Kolkata'
          }
        }
      },
      { upsert: true, new: true }
    );
    console.log(`Seeded/verified default company: ${defaultCompany.name} (${defaultCompany.id})`);

    // 2. Query collections dynamically
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    // System and static collections that shouldn't be tenant-scoped
    const excludedCollections = ['companies', 'admins', 'system.indexes', 'sessions'];

    console.log('\n--- STARTING TENANT MIGRATION ON COLLECTIONS ---');
    for (const col of collections) {
      const name = col.name;
      if (excludedCollections.includes(name) || name.startsWith('system.')) {
        console.log(`Skipping collection: ${name} (Global/Excluded)`);
        continue;
      }

      // Perform bulk update setting companyId for all documents that don't have it
      const result = await db.collection(name).updateMany(
        { companyId: { $exists: false } },
        { $set: { companyId: defaultTenantId } }
      );

      console.log(`Collection: ${name} | Updated ${result.modifiedCount} documents with companyId="${defaultTenantId}"`);
    }

    console.log('\nMigration completed successfully!');
    await mongoose.disconnect();
    console.log('Database disconnected.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
