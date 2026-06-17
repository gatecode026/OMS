import mongoose from 'mongoose';
import dns from 'dns';

// Set public DNS to resolve MongoDB Atlas SRV records
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
  console.warn('Failed to set public DNS servers:', e.message);
}

const DB_URI = 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management';

async function main() {
  console.log('Connecting to database...');
  await mongoose.connect(DB_URI);
  console.log('Connected!');

  const db = mongoose.connection.db;

  console.log('\nFetching all departments...');
  const departments = await db.collection('departments').find({}).toArray();
  console.log(`Found ${departments.length} departments.`);

  console.log('\nFetching all projects...');
  const projects = await db.collection('projects').find({}).toArray();
  console.log(`Found ${projects.length} projects.`);

  for (const dept of departments) {
    const deptName = (dept.name || '').trim();
    const companyId = dept.companyId;

    if (!deptName) continue;

    console.log(`\nProcessing department: "${deptName}" (Company: "${companyId}", ID: "${dept.id}")...`);

    // Filter projects matching this department & company (case-insensitive)
    const deptProjects = projects.filter(p => 
      p.companyId === companyId && 
      (p.department || '').trim().toLowerCase() === deptName.toLowerCase()
    );

    const total = deptProjects.length;
    const active = deptProjects.filter(p => ['Active', 'In Progress'].includes(p.status)).length;
    const completed = deptProjects.filter(p => p.status === 'Completed').length;
    const pending = deptProjects.filter(p => ['Pending', 'Planning', 'On Hold'].includes(p.status)).length;
    const delayed = deptProjects.filter(p => p.status === 'Delayed').length;

    let tasksCompleted = 0;
    let tasksInProgress = 0;

    deptProjects.forEach(p => {
      if (p.tasks && Array.isArray(p.tasks)) {
        p.tasks.forEach(t => {
          if (t.completed) {
            tasksCompleted++;
          } else {
            tasksInProgress++;
          }
        });
      }
    });

    console.log(`-> Computed stats: projects=${total}, activeProjects=${active}, completedProjects=${completed}, pendingProjects=${pending}, delayedProjects=${delayed}, tasksCompleted=${tasksCompleted}, tasksInProgress=${tasksInProgress}`);

    // Update the database
    const result = await db.collection('departments').updateOne(
      { _id: dept._id },
      {
        $set: {
          projects: total,
          activeProjects: active,
          completedProjects: completed,
          pendingProjects: pending,
          delayedProjects: delayed,
          tasksCompleted: tasksCompleted,
          tasksInProgress: tasksInProgress
        }
      }
    );

    console.log(`-> Database update status: modifiedCount=${result.modifiedCount}`);
  }

  console.log('\nAll departments successfully synchronized!');
  await mongoose.disconnect();
}

main().catch(console.error);
