import mongoose from 'mongoose';

const dbUri = 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management';

async function listAll() {
  try {
    await mongoose.connect(dbUri);
    console.log('Connected to Atlas DB!');
    
    const Notification = mongoose.model('Notification', new mongoose.Schema({}, { strict: false }), 'notifications');
    
    const notifs = await Notification.find().sort({ createdAt: -1 });
    console.log(`Total notifications in database: ${notifs.length}`);
    
    notifs.forEach((n, idx) => {
      console.log(`[${idx + 1}] ID: ${n.id} | Title: "${n.title}" | RecipientId: "${n.recipientId || ''}" | Message: "${n.message}"`);
    });
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

listAll();
