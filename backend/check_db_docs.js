import mongoose from 'mongoose';
import dns from 'dns';
dns.setServers(['1.1.1.1']);

const DB_URI = 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management';

import './src/modules/documents/document.model.js';

async function main() {
  await mongoose.connect(DB_URI);
  console.log('Connected to DB.');

  const Document = mongoose.model('Document');
  const docs = await Document.find({}).sort({ createdAt: -1 }).limit(5);
  
  console.log('Last 5 Documents:');
  for (const doc of docs) {
    console.log(`Document: ${doc.name} (${doc.id})`);
    console.log(`  fileUrl: ${doc.fileUrl || 'EMPTY'}`);
    console.log(`  size: ${doc.size}`);
    console.log(`  type: ${doc.type}`);
    console.log(`  category: ${doc.category}`);
    console.log(`  uploadedBy: ${doc.uploadedBy}`);
    console.log('---');
  }

  await mongoose.disconnect();
}
main();
