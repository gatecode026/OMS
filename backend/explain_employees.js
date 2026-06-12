import mongoose from 'mongoose';
import dns, { setServers } from 'dns';
setServers(['1.1.1.1']);

const DB_URI = 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management';

async function main() {
  try {
    await mongoose.connect(DB_URI);
    console.log('Connected to DB');

    const db = mongoose.connection.db;

    // 1. Stats
    console.log('--- COLLECTION STATS ---');
    const stats = await db.command({ collStats: 'employees' });
    console.log(`Count: ${stats.count}`);
    console.log(`Avg Obj Size (bytes): ${stats.avgObjSize}`);
    console.log(`Storage Size (bytes): ${stats.storageSize}`);
    console.log(`Total Index Size (bytes): ${stats.totalIndexSize}`);

    // 2. Explain
    console.log('\n--- EXPLAIN FIND ---');
    const explainResult = await db.collection('employees').find({}).explain('executionStats');
    console.log('Query: {}');
    console.log(`Stage: ${explainResult.queryPlanner?.winningPlan?.stage}`);
    console.log(`Total Docs Examined: ${explainResult.executionStats?.totalDocsExamined}`);
    console.log(`nReturned: ${explainResult.executionStats?.nReturned}`);
    console.log(`Execution Time (ms): ${explainResult.executionStats?.executionTimeMillis}`);
    console.log('Winning Plan details:', JSON.stringify(explainResult.queryPlanner?.winningPlan, null, 2));

    await mongoose.disconnect();
  } catch (e) {
    console.error(e);
  }
}
main();
