import dotenv from 'dotenv';
dotenv.config();
import { setServers } from 'dns';
setServers(['1.1.1.1']);

async function test() {
  // 1. Log in to get token
  console.log('Logging in as superadmin...');
  const loginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'superadmin@saas.com',
      password: 'password123'
    })
  });
  
  if (!loginRes.ok) {
    const errorText = await loginRes.text();
    throw new Error(`Login failed: ${loginRes.status} - ${errorText}`);
  }
  
  const loginData = await loginRes.json();
  const token = loginData.data.token;
  console.log('Login successful! Token retrieved.');

  // 2. Fetch overview analytics
  console.log('Fetching super admin overview analytics...');
  const analyticsRes = await fetch('http://localhost:5000/api/admin/overview/analytics', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!analyticsRes.ok) {
    const errorText = await analyticsRes.text();
    throw new Error(`Fetch analytics failed: ${analyticsRes.status} - ${errorText}`);
  }

  const analyticsData = await analyticsRes.json();
  console.log('Overview Analytics Result:');
  console.log(JSON.stringify(analyticsData.data, null, 2));
}

test().catch(console.error);
