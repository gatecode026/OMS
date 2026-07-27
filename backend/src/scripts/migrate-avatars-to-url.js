/**
 * @file src/scripts/migrate-avatars-to-url.js
 * @description One-time backfill: upload every employee's inline base64 avatar
 *   (and photoUrl) to ImageKit and replace it with the CDN URL. This is the
 *   root-cause fix for the multi-MB conversation payloads (base64 avatars were
 *   hydrated into every chat list response).
 *
 *   SAFE BY DEFAULT — dry run. It only reports what it *would* change.
 *   Pass --apply to actually write. Idempotent: rows already holding a URL
 *   (not a `data:` URI) are skipped, so it can be re-run safely.
 *
 *   Usage:
 *     node src/scripts/migrate-avatars-to-url.js              # dry run (all companies)
 *     node src/scripts/migrate-avatars-to-url.js --apply      # perform migration
 *     node src/scripts/migrate-avatars-to-url.js --company=COMP-001 --apply
 */

import dotenv from 'dotenv';
dotenv.config();
import { setServers } from 'dns';
setServers(['1.1.1.1']);
import mongoose from 'mongoose';
import Company from '../modules/companies/company.model.js';
import Employee from '../modules/employees/employees.model.js';
import { getTenantConnection } from '../utils/multidbConnection.js';
import { uploadToImageKit } from '../utils/imagekit.js';

const APPLY = process.argv.includes('--apply');
const companyArg = (process.argv.find((a) => a.startsWith('--company=')) || '').split('=')[1];

const isBase64Image = (v) =>
  typeof v === 'string' && v.startsWith('data:image') && v.includes(';base64,');

const kb = (s) => Math.round((s?.length || 0) / 1024);

async function run() {
  console.log(`\n=== Avatar base64→URL backfill  [${APPLY ? 'APPLY' : 'DRY RUN'}]${companyArg ? ' company=' + companyArg : ''} ===`);
  await mongoose.connect(process.env.DB_URI);
  console.log('Connected to main DB');

  const companies = companyArg
    ? await Company.find({ id: companyArg }).lean()
    : await Company.find({}).lean();
  console.log(`Processing ${companies.length} company/companies\n`);

  let totalBase64 = 0, totalConverted = 0, totalBytes = 0, totalFailed = 0;

  for (const company of companies) {
    try {
      const conn = await getTenantConnection(company.id);
      const EmployeeModel = conn.models['Employee'] || conn.model('Employee', Employee.schema);

      // Only rows whose avatar OR photoUrl is an inline data URI.
      const rows = await EmployeeModel.find({
        $or: [{ avatar: /^data:image/ }, { photoUrl: /^data:image/ }],
      }).select('id name avatar photoUrl').lean();

      if (rows.length === 0) { console.log(`  ${company.id}: 0 base64 avatars`); continue; }
      console.log(`  ${company.id}: ${rows.length} employee(s) with base64 avatar/photo`);

      for (const emp of rows) {
        totalBase64 += 1;
        const update = {};
        for (const field of ['avatar', 'photoUrl']) {
          if (!isBase64Image(emp[field])) continue;
          totalBytes += emp[field].length;
          if (!APPLY) {
            console.log(`    [dry] ${emp.id} ${field} (${kb(emp[field])} KB) → would upload`);
            continue;
          }
          try {
            const url = await uploadToImageKit(emp[field], `employee_${field}_${emp.id}_${Date.now()}.jpg`);
            if (url && !url.startsWith('data:')) {
              update[field] = url;
              console.log(`    [ok]  ${emp.id} ${field} (${kb(emp[field])} KB) → ${url}`);
            } else {
              totalFailed += 1;
              console.log(`    [skip] ${emp.id} ${field}: upload returned no URL (kept inline)`);
            }
          } catch (e) {
            totalFailed += 1;
            console.log(`    [err] ${emp.id} ${field}: ${e.message}`);
          }
        }
        if (APPLY && Object.keys(update).length) {
          await EmployeeModel.updateOne({ id: emp.id }, { $set: update });
          totalConverted += 1;
        }
      }
    } catch (err) {
      console.error(`  Error processing ${company.id}: ${err.message}`);
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`base64 avatar rows found : ${totalBase64}`);
  console.log(`inline data size scanned : ${Math.round(totalBytes / 1024 / 1024)} MB`);
  if (APPLY) {
    console.log(`rows converted to URL    : ${totalConverted}`);
    console.log(`fields failed/kept inline: ${totalFailed}`);
  } else {
    console.log(`(dry run — no writes. Re-run with --apply to migrate.)`);
  }

  await mongoose.disconnect();
  console.log('Done.\n');
}

run().catch((e) => { console.error(e); process.exit(1); });
