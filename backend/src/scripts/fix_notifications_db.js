import mongoose from 'mongoose';

const dbUri = 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management';

async function migrate() {
  try {
    await mongoose.connect(dbUri);
    console.log('Connected to Atlas DB for migration!');

    const Notification = mongoose.model('Notification', new mongoose.Schema({}, { strict: false }), 'notifications');
    const Leave = mongoose.model('Leave', new mongoose.Schema({}, { strict: false }), 'leaves');

    const unresolvedNotifications = await Notification.find({
      $or: [
        { recipientId: '' },
        { recipientId: null },
        { recipientId: { $exists: false } }
      ],
      recipientType: 'employee'
    });

    console.log(`Found ${unresolvedNotifications.length} personal employee notifications without a recipientId.`);

    let resolvedCount = 0;
    for (const notif of unresolvedNotifications) {
      const msg = notif.message || '';
      // Regex to match type and date range
      // e.g. "Your leave request for CL (2026-06-29 to 2026-06-29) has been pending."
      const leaveRegex = /Your leave request for (.+?) \((.+?) to (.+?)\) has been/i;
      const match = msg.match(leaveRegex);

      let employeeId = null;

      if (match) {
        const leaveType = match[1].trim();
        const fromDate = match[2].trim();
        const toDate = match[3].trim();

        console.log(`Parsing notification ${notif.id}: Type="${leaveType}", From="${fromDate}", To="${toDate}"`);

        // Find corresponding leave request in database
        const matchingLeave = await Leave.findOne({
          fromDate: fromDate,
          toDate: toDate
        });

        if (matchingLeave) {
          employeeId = matchingLeave.employeeId;
          console.log(`  -> Found matching leave request. Employee ID: ${employeeId} (${matchingLeave.employeeName})`);
        } else {
          console.log(`  -> No matching leave request found for dates ${fromDate} to ${toDate}`);
        }
      }

      // If we couldn't match or parse, default to Dheeraj Suman (EMP-2026-100) since all current leaves belong to him
      if (!employeeId) {
        employeeId = 'EMP-2026-100';
        console.log(`  -> Defaulting to EMP-2026-100`);
      }

      await Notification.updateOne(
        { _id: notif._id },
        {
          $set: {
            recipientId: employeeId,
            targetUserId: employeeId,
            forUserId: employeeId
          }
        }
      );
      resolvedCount++;
    }

    console.log(`Migration completed. Successfully resolved and updated ${resolvedCount} notification records.`);

  } catch (err) {
    console.error('Migration Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

migrate();
