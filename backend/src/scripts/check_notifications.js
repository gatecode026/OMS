import dotenv from 'dotenv';
dotenv.config();
import { setServers } from 'dns';
setServers(['1.1.1.1']);
import mongoose from 'mongoose';
import Notification from '../modules/notifications/notification.model.js';
import { getTenantConnection } from '../utils/multidbConnection.js';

const dbUri = process.env.DB_URI;

async function check() {
  await mongoose.connect(dbUri);
  console.log('Connected to Main DB');
  
  const tenantId = 'COMP-001';
  const connection = await getTenantConnection(tenantId);
  const NotificationModel = connection.models['Notification'] || connection.model('Notification', Notification.schema);
  
  const count = await NotificationModel.countDocuments({});
  console.log(`Notification Count for ${tenantId}: ${count}`);
  
  const notifications = await NotificationModel.find({}).lean();
  console.log('Notifications in Database:', JSON.stringify(notifications, null, 2));
  
  await mongoose.disconnect();
}

check().catch(console.error);
