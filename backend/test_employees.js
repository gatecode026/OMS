async function run() {
  try {
    // 1. Login
    const loginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'superadmin@saas.com', password: 'password' })
    });
    const loginData = await loginRes.json();
    if (loginData.status !== 'success') {
      console.error('Login failed:', loginData);
      return;
    }
    const token = loginData.data.token;

    // 2. Fetch attendance
    const res = await fetch('http://localhost:5000/api/v1/attendance', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const result = await res.json();
    console.log('Attendance records count:', result.data?.length);
    if (result.data && result.data.length > 0) {
      console.log('Sample Attendance Records:');
      console.log(JSON.stringify(result.data.slice(0, 5), null, 2));
    }
  } catch (err) {
    console.error('Error:', err);
  }
}
run();
