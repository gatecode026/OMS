import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const DB_URI = process.env.DB_URI || 'mongodb://localhost:27017/office_management_db';

const targetCollections = [
  'rbac_roles',
  'permission_modules',
  'user_overrides',
  'emergency_alerts',
  'payroll_configs',
  'payroll_grades',
  'payroll_reimbursements',
  'payroll_loan_advances',
  'payroll_bonuses',
  'payroll_payments',
  'announcements',
  'announcement_tracking_logs',
  'announcement_audit_logs'
];

async function run() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(DB_URI);
    console.log('Connected!');

    const db = mongoose.connection.db;

    for (const colName of targetCollections) {
      console.log(`Checking index for collection: ${colName}...`);
      try {
        // Drop global id_1 index (or key_1 for permission_modules)
        const indexName = colName === 'permission_modules' ? 'key_1' : 'id_1';
        await db.collection(colName).dropIndex(indexName);
        console.log(`Successfully dropped ${indexName} from ${colName}`);
      } catch (e) {
        console.log(`Index lookup status for ${colName}:`, e.message);
      }
    }

    console.log('All targeted database indexes processed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error running script:', err);
    process.exit(1);
  }
}

run();
