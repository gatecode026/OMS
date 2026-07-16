import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { io } from 'socket.io-client';

const DB_URI = 'mongodb+srv://gatecode026:tBNyNzO68BNn3Zkn@cluster0.1meot8l.mongodb.net/office-management';
const JWT_SECRET = 'super_secret_jwt_sign_key_office_management_2026';
const SOCKET_URL = 'http://192.168.1.14:5000';

async function main() {
  console.log('Connecting to database...');
  await mongoose.connect(DB_URI);
  console.log('Connected to database.');

  // Find another employee in the DB
  const Employee = mongoose.model('Employee', new mongoose.Schema({}, { strict: false }), 'employees');
  const employee = await Employee.findOne({ email: { $ne: 'balram@saas.com' } });
  
  if (!employee) {
    console.error('No other employees found in database!');
    process.exit(1);
  }

  const empData = employee.toObject();
  console.log(`Simulating online presence for: ${empData.name} (${empData.email})`);

  // Sign token
  const token = jwt.sign(
    {
      id: empData.id,
      email: empData.email,
      role: empData.roleId || 'employee',
      roleId: empData.roleId || 'employee',
      companyId: empData.companyId || 'company_1',
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  console.log('Connecting to socket server at:', SOCKET_URL);
  const socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log('Successfully connected to Socket.IO as:', empData.name);
    console.log('Emitting get_online_users...');
    socket.emit('get_online_users');
  });

  socket.on('online_users_list', (users) => {
    console.log('Current online users count:', users.length);
    console.log('Users list:', users.map(u => ({ id: u.userId, name: u.name })));
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err);
  });

  socket.on('new_message', (msg) => {
    console.log(`[Simulator] Received message from ${msg.senderName}: "${msg.content || '(Media)'}"`);
    console.log(`[Simulator] Emitting message:delivered for messageId: ${msg.id}`);
    socket.emit('message:delivered', { messageId: msg.id, conversationId: msg.conversationId });

    // Simulate reading the message after 1.5 seconds
    setTimeout(() => {
      console.log(`[Simulator] Emitting conversation:read for messageId: ${msg.id}`);
      socket.emit('conversation:read', { conversationId: msg.conversationId, lastReadMessageId: msg.id });
    }, 1500);
  });

  socket.on('message:new', (msg) => {
    console.log(`[Simulator] Received message:new from ${msg.senderName}: "${msg.content || '(Media)'}"`);
    console.log(`[Simulator] Emitting message:delivered for messageId: ${msg.id}`);
    socket.emit('message:delivered', { messageId: msg.id, conversationId: msg.conversationId });

    setTimeout(() => {
      console.log(`[Simulator] Emitting conversation:read for messageId: ${msg.id}`);
      socket.emit('conversation:read', { conversationId: msg.conversationId, lastReadMessageId: msg.id });
    }, 1500);
  });

  // Keep script running
  setInterval(() => {
    console.log('Keep-alive pinging... User', empData.name, 'is still online.');
  }, 10000);
}

main().catch(err => {
  console.error('Error running simulation script:', err);
});
