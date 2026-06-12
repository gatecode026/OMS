import mongoose from 'mongoose';
import dns, { setServers } from 'dns';
setServers(['1.1.1.1']);

const DB_URI = 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management';

async function main() {
  try {
    await mongoose.connect(DB_URI);
    console.log('Connected to DB');

    const db = mongoose.connection.db;

    const pipeline = [
      {
        $project: {
          name: 1,
          id: 1,
          attendanceHistory_len: { $cond: { if: { $isArray: "$attendanceHistory" }, then: { $size: "$attendanceHistory" }, else: -1 } },
          overtimeHistory_len: { $cond: { if: { $isArray: "$overtimeHistory" }, then: { $size: "$overtimeHistory" }, else: -1 } },
          leaveHistory_len: { $cond: { if: { $isArray: "$leaveHistory" }, then: { $size: "$leaveHistory" }, else: -1 } },
          taskHistory_len: { $cond: { if: { $isArray: "$taskHistory" }, then: { $size: "$taskHistory" }, else: -1 } },
          activityLog_len: { $cond: { if: { $isArray: "$activityLog" }, then: { $size: "$activityLog" }, else: -1 } },
          documents_len: { $cond: { if: { $isArray: "$documents" }, then: { $size: "$documents" }, else: -1 } },
          avatar_len: { $strLenCP: { $ifNull: [ "$avatar", "" ] } }
        }
      }
    ];

    const results = await db.collection('employees').aggregate(pipeline).toArray();
    console.log('--- FAST SIZE ANALYSIS ---');
    console.log(JSON.stringify(results, null, 2));

    await mongoose.disconnect();
  } catch (e) {
    console.error(e);
  }
}
main();
