async function main() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    console.log('Sending login request to backend...');
    const loginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'superadmin@saas.com', password: 'password' }),
      signal: controller.signal
    });
    
    const loginData = await loginRes.json();
    clearTimeout(timeoutId);

    if (loginData.status !== 'success') {
      console.error('Login failed:', loginData);
      return;
    }
    const token = loginData.data.token;
    console.log('Logged in successfully. Token length:', token.length);

    const controller2 = new AbortController();
    const timeoutId2 = setTimeout(() => controller2.abort(), 5000);

    console.log('Sending GET request to /api/v1/employees...');
    const empRes = await fetch('http://localhost:5000/api/v1/employees', {
      headers: { 'Authorization': `Bearer ${token}` },
      signal: controller2.signal
    });
    
    const empData = await empRes.json();
    clearTimeout(timeoutId2);

    if (empData.status !== 'success') {
      console.error('Fetch employees failed:', empData);
      return;
    }

    console.log(`Fetched ${empData.data.length} employees.`);
    const soniya = empData.data.find(e => e.name.toLowerCase().includes('soniya'));
    if (soniya) {
      console.log('Soniya Mathur record from API:');
      console.log('id:', soniya.id);
      console.log('name:', soniya.name);
      console.log('avatar exists:', !!soniya.avatar);
      if (soniya.avatar) {
        console.log('avatar length:', soniya.avatar.length);
        console.log('avatar start:', soniya.avatar.substring(0, 50));
      }
    } else {
      console.log('Soniya Mathur not found in API response.');
    }
  } catch (err) {
    console.error('Request failed:', err.message);
  }
}

main();
