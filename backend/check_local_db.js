import mongoose from 'mongoose';

const LOCAL_URI = 'mongodb://localhost:27017/office-management';

import './src/modules/documents/document.model.js';

async function main() {
  try {
    await mongoose.connect(LOCAL_URI);
    console.log('Connected to Local DB.');

    const Document = mongoose.model('Document');
    const count = await Document.countDocuments({});
    console.log(`Local DB Document count: ${count}`);

    const docs = await Document.find({});
    for (const doc of docs) {
      console.log(`- ${doc.name} (${doc.id}): fileUrl="${doc.fileUrl}"`);
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Failed to connect to local DB:', err.message);
  }
}
main();
