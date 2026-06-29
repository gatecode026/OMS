import dns from 'dns';
dns.setServers(['1.1.1.1']);

const run = async () => {
  try {
    // Login as team leader
    const loginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'balram@gmail.com',
        password: 'password'
      })
    });

    if (!loginRes.ok) {
      const txt = await loginRes.text();
      console.log('Login failed:', loginRes.status, txt);
      return;
    }

    const { data: { token } } = await loginRes.json();
    console.log('Logged in successfully, token:', token ? 'exists' : 'missing');

    // Get roles
    const getRes = await fetch('http://localhost:5000/api/v1/roles', {
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });
    const rolesData = await getRes.json();
    console.log('Roles list data:', rolesData);
    const managerRole = rolesData.data.find(r => r.id === 'manager');
    console.log('Manager permissions in GET response:', managerRole.permissions);

    // Let's toggle dashboard.read to true
    const updatedPermissions = { ...managerRole.permissions };
    if (!updatedPermissions.dashboard) {
      updatedPermissions.dashboard = {};
    }
    updatedPermissions.dashboard.read = !updatedPermissions.dashboard.read;

    console.log('Toggling dashboard.read to:', updatedPermissions.dashboard.read);

    // Put updated permissions
    const putRes = await fetch('http://localhost:5000/api/v1/roles/manager', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ permissions: updatedPermissions })
    });

    const putData = await putRes.json();
    console.log('PUT Response status:', putRes.status);
    console.log('PUT Response data:', putData);

    // Fetch again to verify persistence
    const verifyRes = await fetch('http://localhost:5000/api/v1/roles', {
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });
    const verifyData = await verifyRes.json();
    const verifiedManager = verifyData.data.find(r => r.id === 'manager');
    console.log('Manager permissions in subsequent GET response:', verifiedManager?.permissions);

  } catch (err) {
    console.error('Error:', err);
  }
};

run();
