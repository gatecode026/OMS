import dns from 'dns';
dns.setServers(['8.8.8.8']);

async function run() {
  console.log('Logging in Geeta...');
  const loginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'geeta@gmail.com', password: 'password' })
  });

  const loginData = await loginRes.json();
  const { token } = loginData.data;

  console.log('Fetching messages for GATECO-CONV-006...');
  const msgRes = await fetch('http://localhost:5000/api/v1/chat/conversations/GATECO-CONV-006/messages?limit=20', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const msgData = await msgRes.json();
  const messages = msgData.data.messages;

  console.log('Returned messages order:');
  console.log(messages.map(m => ({ id: m.id, senderName: m.senderName, content: m.content, createdAt: m.createdAt })));

  process.exit(0);
}

run().catch(console.error);
