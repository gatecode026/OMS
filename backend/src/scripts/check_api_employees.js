import dotenv from 'dotenv';
dotenv.config();
import { setServers } from 'dns';
setServers(['1.1.1.1']);

async function test() {
  console.log('Logging in to backend as Employee (Animesh)...');
  const loginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'animeshj720@gmail.com',
      password: 'password123'
    })
  });
  
  if (!loginRes.ok) {
    throw new Error(`Login failed: ${loginRes.status}`);
  }
  
  const loginData = await loginRes.json();
  const token = loginData.data.token;
  console.log('Token retrieved successfully!');

  // Fetch employees
  const empRes = await fetch('http://localhost:5000/api/v1/employees', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const emps = (await empRes.json()).data;
  console.log('--- API Employees returned keys ---');
  if (emps && emps.length > 0) {
    console.log(JSON.stringify(emps[0], null, 2));
    console.log('\nAll employees branch/dept:');
    emps.forEach(e => {
      console.log(`ID: ${e.id} | Name: ${e.name} | Branch: "${e.branch}" | Dept: "${e.department}"`);
    });
  } else {
    console.log('No employees returned');
  }
}

test().catch(console.error);
