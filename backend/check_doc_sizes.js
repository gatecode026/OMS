import mongoose from 'mongoose';
import dns, { setServers } from 'dns';
setServers(['1.1.1.1']);

const DB_URI = 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management';

async function main() {
  try {
    await mongoose.connect(DB_URI);
    console.log('Connected to DB');

    const db = mongoose.connection.db;
    const employees = await db.collection('employees').find({}).toArray();

    for (const emp of employees) {
      console.log(`\nEmployee: ${emp.name} (ID: ${emp.id})`);
      const totalSize = JSON.stringify(emp).length;
      console.log(`Approx JSON size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
      
      // Print field sizes
      for (const [key, val] of Object.entries(emp)) {
        const size = JSON.stringify(val)?.length || 0;
        if (size > 5000) {
          console.log(` - Field '${key}' size: ${(size / 1024).toFixed(2)} KB`);
          if (Array.isArray(val)) {
            console.log(`   - Array length: ${val.length}`);
            if (val.length > 0) {
              console.log(`   - Sample item size: ${JSON.stringify(val[0]).length} bytes`);
            }
          }
        }
      }
    }

    await mongoose.disconnect();
  } catch (e) {
    console.error(e);
  }
}
main();
