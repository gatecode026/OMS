import dotenv from 'dotenv';
dotenv.config();
import { setServers } from 'dns';
setServers(['1.1.1.1']);

async function test() {
  console.log('Logging in to backend as Geeta...');
  const loginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'geeta@gmail.com',
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
  const employees = (await empRes.json()).data;

  // Fetch payroll payments
  const payRes = await fetch('http://localhost:5000/api/v1/payroll/all', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const resData = await payRes.json();
  const payrollPayments = resData.data.payments;
  
  console.log('--- Resolution check ---');
  payrollPayments.forEach(p => {
    const emp = employees.find(e => e.id === p.employeeId);
    console.log(`Payment ID: ${p.id} | empId: ${p.employeeId} | empName: ${p.employeeName}`);
    console.log(`  - p.branch: "${p.branch}" | p.department: "${p.department}"`);
    console.log(`  - emp found: ${!!emp} | emp.name: "${emp?.name}" | emp.branch: "${emp?.branch}" | emp.department: "${emp?.department}"`);
    console.log(`  - Resolved branch: "${emp?.branch || p.branch || '-'}"`);
  });
}

test().catch(console.error);
