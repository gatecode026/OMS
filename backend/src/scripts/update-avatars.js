import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { uploadToImageKit } from '../utils/imagekit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const DB_URI = process.env.DB_URI || 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management';

async function run() {
  await mongoose.connect(DB_URI);
  console.log('Connected to MongoDB');

  const workspaceRoot = path.join(__dirname, '../../../');
  const db = mongoose.connection.db;

  const employeesToUpdate = [
    { id: 'GATECO-EMP-001', name: 'Animesh Jain', file: 'animesh.png' },
    { id: 'GATECO-EMP-002', name: 'Balram Suman', file: 'balram.png' },
    { id: 'GATECO-EMP-003', name: 'RATIWALRAHUL', file: 'ratiwalrahul.png' },
    { id: 'GATECO-EMP-004', name: 'vikash kumawat', file: 'vikash.png' },
    { id: 'GATECO-EMP-005', name: 'Geeta', file: 'geeta.png' }
  ];

  for (const emp of employeesToUpdate) {
    const localPath = path.join(workspaceRoot, 'frontend/public/assets/avatars', emp.file);
    if (!fs.existsSync(localPath)) {
      console.warn(`File not found for ${emp.name}: ${localPath}`);
      continue;
    }

    console.log(`Reading local avatar file for ${emp.name}...`);
    const fileData = fs.readFileSync(localPath);
    const base64Data = `data:image/png;base64,${fileData.toString('base64')}`;

    console.log(`Uploading ${emp.name} avatar to ImageKit...`);
    const imageUrl = await uploadToImageKit(base64Data, `avatar_${emp.id}.png`);
    console.log(`${emp.name} ImageKit URL:`, imageUrl);

    const res = await db.collection('employees').updateOne(
      { id: emp.id },
      { $set: { avatar: imageUrl, photoUrl: imageUrl } }
    );
    console.log(`${emp.name} database update result:`, res);
  }

  await mongoose.connection.close();
  console.log('Database connection closed');
  process.exit(0);
}

run().catch(err => {
  console.error('Update script failed:', err);
  process.exit(1);
});
