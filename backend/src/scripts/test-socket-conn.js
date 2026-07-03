import { io } from 'socket.io-client';

async function run() {
  console.log('Logging in as Geeta...');
  const loginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'geeta@gmail.com', password: 'password123' })
  });

  if (!loginRes.ok) {
    const text = await loginRes.text();
    console.error('Login failed:', loginRes.status, text);
    return;
  }

  const loginData = await loginRes.json();
  const token = loginData.data.token;
  console.log('Login successful. Token acquired.');

  console.log('Connecting to Socket.io...');
  const socket = io('http://localhost:5000', {
    transports: ['websocket', 'polling'],
    auth: {
      token,
      tenantId: 'COMP-001'
    }
  });

  socket.on('connect', () => {
    console.log('SUCCESS: Connected to socket server! ID:', socket.id);
    socket.disconnect();
    process.exit(0);
  });

  socket.on('connect_error', (err) => {
    console.error('ERROR: Connection error:', err.message);
    socket.disconnect();
    process.exit(1);
  });

  setTimeout(() => {
    console.error('TIMEOUT: Connection took too long.');
    socket.disconnect();
    process.exit(1);
  }, 10000);
}

run().catch(console.error);
