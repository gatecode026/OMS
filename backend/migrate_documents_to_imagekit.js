import mongoose from 'mongoose';
import dns, { setServers } from 'dns';
import dotenv from 'dotenv';
dotenv.config();
setServers(['1.1.1.1']);

const DB_URI = process.env.DB_URI || 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management';

import './src/modules/documents/document.model.js';
import { uploadToImageKit } from './src/utils/imagekit.js';

async function main() {
  try {
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    if (!privateKey || privateKey.includes('***')) {
      console.error('ERROR: IMAGEKIT_PRIVATE_KEY is not configured in environment variables.');
      process.exit(1);
    }

    await mongoose.connect(DB_URI);
    console.log('Connected to DB. Scanning for documents with base64 fileUrls...');

    const Document = mongoose.model('Document');
    const docs = await Document.find({});

    console.log(`Found ${docs.length} total documents.`);

    let migratedCount = 0;

    for (const doc of docs) {
      if (doc.fileUrl && doc.fileUrl.startsWith('data:')) {
        console.log(`Migrating document "${doc.name}" (${doc.id}) of type ${doc.type} to ImageKit...`);
        
        const fileExt = doc.type ? doc.type.toLowerCase() : 'bin';
        const fileName = `${doc.name.replace(/\s+/g, '_')}_${Date.now()}.${fileExt}`;
        
        try {
          const cdnUrl = await uploadToImageKit(doc.fileUrl, fileName);
          if (cdnUrl && cdnUrl.startsWith('http')) {
            doc.fileUrl = cdnUrl;
            await doc.save();
            console.log(`-> Successfully uploaded. New URL: ${cdnUrl}`);
            migratedCount++;
          } else {
            console.warn(`-> Upload failed or returned non-URL for document: ${doc.name}`);
          }
        } catch (uploadError) {
          console.error(`-> Failed to upload document "${doc.name}":`, uploadError);
        }
      }
    }

    console.log(`\nMigration completed. Total documents updated: ${migratedCount}`);
    await mongoose.disconnect();
  } catch (e) {
    console.error('Migration failed:', e);
  }
}
main();
