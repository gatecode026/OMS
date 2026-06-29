import dns from 'dns';
dns.setServers(['1.1.1.1']);

const BASE_URL = 'http://localhost:5000/api/v1';

async function login(email, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Login failed for ${email}: ${res.status} - ${text}`);
  }

  const json = await res.json();
  return json.data.token;
}

async function request(url, method, token, body = null) {
  const headers = {
    'Authorization': `Bearer ${token}`
  };
  if (body) {
    headers['Content-Type'] = 'application/json';
  }
  
  const options = {
    method,
    headers,
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${BASE_URL}${url}`, options);
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = text;
  }
  return { status: res.status, ok: res.ok, data };
}

async function run() {
  console.log('=== STARTING BRANCH SCOPING VERIFICATION ===\n');

  try {
    // 1. Log in as Jaipur Branch Manager (Geeta)
    console.log('Logging in as Jaipur Branch Manager (Geeta)...');
    const geetaToken = await login('geeta@gmail.com', 'password123');
    console.log('Geeta logged in successfully.\n');

    // 2. Log in as Hyderabad Branch Manager (Udit Agrawal)
    console.log('Logging in as Hyderabad Branch Manager (Udit)...');
    const uditToken = await login('udit@gmail.com', 'password');
    console.log('Udit logged in successfully.\n');

    // 3. Log in as Super Admin
    console.log('Logging in as Super Admin...');
    const adminToken = await login('superadmin@saas.com', 'password');
    console.log('Super Admin logged in successfully.\n');

    // TEST 1: Check Employees List Scoping
    console.log('--- TEST 1: Employees List Scoping ---');
    
    // Geeta (Jaipur Branch)
    const geetaEmpList = await request('/employees', 'GET', geetaToken);
    console.log(`Geeta saw ${geetaEmpList.data.data?.length || 0} employees. Status: ${geetaEmpList.status}`);
    const nonJaipurGeeta = geetaEmpList.data.data?.filter(emp => emp.branch !== 'Jaipur Branch');
    console.log(`Employees not in Jaipur Branch seen by Geeta: ${nonJaipurGeeta?.length || 0}`);
    if (nonJaipurGeeta?.length > 0) {
      console.error('FAIL: Geeta saw employees outside Jaipur Branch!', nonJaipurGeeta);
    } else {
      console.log('PASS: Geeta only saw Jaipur Branch employees.');
    }

    // Udit (Hyderabad)
    const uditEmpList = await request('/employees', 'GET', uditToken);
    console.log(`Udit saw ${uditEmpList.data.data?.length || 0} employees. Status: ${uditEmpList.status}`);
    const nonHydUdit = uditEmpList.data.data?.filter(emp => emp.branch !== 'Hyderabad');
    console.log(`Employees not in Hyderabad branch seen by Udit: ${nonHydUdit?.length || 0}`);
    if (nonHydUdit?.length > 0) {
      console.error('FAIL: Udit saw employees outside Hyderabad branch!', nonHydUdit);
    } else {
      console.log('PASS: Udit only saw Hyderabad branch employees.');
    }

    // Super Admin (No scoping)
    const adminEmpList = await request('/employees?companyId=COMP-001', 'GET', adminToken);
    console.log(`Super Admin saw ${adminEmpList.data.data?.length || 0} employees. Status: ${adminEmpList.status}`);
    if (adminEmpList.status === 200) {
      console.log('PASS: Super Admin list returned employees.');
    } else {
      console.error('FAIL: Super Admin failed to list employees:', adminEmpList.data);
    }


    // TEST 2: Single Employee Access Boundaries
    console.log('\n--- TEST 2: Single Employee Detail Access ---');
    // Geeta trying to access Geeta (Jaipur) -> Should succeed
    const geetaSelf = await request('/employees/GATECO-EMP-005', 'GET', geetaToken);
    console.log(`Geeta accessing Geeta: Status ${geetaSelf.status}, Data:`, geetaSelf.data);
    
    // Geeta trying to access Udit (Hyderabad) -> Should be 403 Forbidden
    const geetaUdit = await request('/employees/GATECO-EMP-006', 'GET', geetaToken);
    console.log(`Geeta accessing Udit (Hyderabad): Status ${geetaUdit.status}. Expected: 403, Data:`, geetaUdit.data);
    if (geetaUdit.status === 403) {
      console.log('PASS: Geeta was blocked from accessing Hyderabad employee.');
    } else {
      console.error('FAIL: Geeta was NOT blocked from accessing Hyderabad employee!');
    }

    // Udit trying to access Udit (Hyderabad) -> Should succeed
    const uditSelf = await request('/employees/GATECO-EMP-006', 'GET', uditToken);
    console.log(`Udit accessing Udit: Status ${uditSelf.status}, Data:`, uditSelf.data);

    // Udit trying to access Geeta (Jaipur) -> Should be 403 Forbidden
    const uditGeeta = await request('/employees/GATECO-EMP-005', 'GET', uditToken);
    console.log(`Udit accessing Geeta (Jaipur): Status ${uditGeeta.status}. Expected: 403, Data:`, uditGeeta.data);
    if (uditGeeta.status === 403) {
      console.log('PASS: Udit was blocked from accessing Jaipur employee.');
    } else {
      console.error('FAIL: Udit was NOT blocked from accessing Jaipur employee!');
    }

    // Super Admin accessing Udit -> Should succeed (with companyId query param)
    const adminUdit = await request('/employees/GATECO-EMP-006?companyId=COMP-001', 'GET', adminToken);
    console.log(`Super Admin accessing Udit: Status ${adminUdit.status}. Expected: 200, Data:`, adminUdit.data);
    if (adminUdit.status === 200) {
      console.log('PASS: Super Admin successfully bypassed scoping and accessed employee.\n');
    } else {
      console.error('FAIL: Super Admin failed to access employee!\n');
    }


    // TEST 3: Branches Scoping
    console.log('--- TEST 3: Branches Scoping ---');
    // Geeta should only see "Jaipur Branch" in listings
    const geetaBranchList = await request('/branches', 'GET', geetaToken);
    console.log(`Geeta saw ${geetaBranchList.data.data?.length || 0} branches:`, geetaBranchList.data.data?.map(b => b.name));
    const nonJaipurBranches = geetaBranchList.data.data?.filter(b => b.name !== 'Jaipur Branch');
    if (nonJaipurBranches?.length > 0) {
      console.error('FAIL: Geeta saw other branches in list!', nonJaipurBranches);
    } else {
      console.log('PASS: Geeta only saw Jaipur Branch in list.');
    }

    // Geeta accessing Hyderabad branch details -> Should be 403
    const geetaHydBranch = await request('/branches/BR-4504', 'GET', geetaToken);
    console.log(`Geeta accessing Hyderabad branch detail: Status ${geetaHydBranch.status}. Expected: 403`);
    if (geetaHydBranch.status === 403) {
      console.log('PASS: Geeta was blocked from accessing Hyderabad branch detail.');
    } else {
      console.error('FAIL: Geeta was NOT blocked from accessing Hyderabad branch detail!');
    }


    // TEST 4: Payroll Master Data Scoping
    console.log('--- TEST 4: Payroll Master Data Scoping ---');
    // Geeta fetching payroll master data
    const geetaPayroll = await request('/payroll/all', 'GET', geetaToken);
    if (geetaPayroll.ok) {
      const gradesCount = geetaPayroll.data.data?.grades?.length || 0;
      const advancesCount = geetaPayroll.data.data?.loansAdvances?.length || 0;
      const paymentsCount = geetaPayroll.data.data?.payments?.length || 0;
      console.log(`Geeta payroll master: ${gradesCount} grades, ${advancesCount} advances, ${paymentsCount} payments.`);
      
      // Let's verify that advances/payments are only for employees in Jaipur Branch (using branch employee IDs)
      const jaipurEmpIds = geetaEmpList.data.data?.map(e => e.id) || [];
      const nonJaipurAdvances = geetaPayroll.data.data?.loansAdvances?.filter(a => !jaipurEmpIds.includes(a.employeeId));
      const nonJaipurPayments = geetaPayroll.data.data?.payments?.filter(p => !jaipurEmpIds.includes(p.employeeId));
      
      console.log(`Non-Jaipur advances seen by Geeta: ${nonJaipurAdvances?.length || 0}`);
      console.log(`Non-Jaipur payments seen by Geeta: ${nonJaipurPayments?.length || 0}`);
      
      if (nonJaipurAdvances?.length > 0 || nonJaipurPayments?.length > 0) {
        console.error('FAIL: Geeta saw payroll data for non-Jaipur employees!');
      } else {
        console.log('PASS: Geeta only saw payroll data for Jaipur employees.');
      }
    } else {
      console.error('FAIL: Geeta failed to load payroll master data:', geetaPayroll.status, geetaPayroll.data);
    }

    // TEST 5: Write boundaries (Creating a Team / Department for Manager forces their own branch)
    console.log('\n--- TEST 5: Enforced Branch on Write ---');
    const newTeamPayload = {
      id: 'TEAM-TEST-SCOPE',
      name: 'Scoped Test Team',
      description: 'Test branch force on write',
      branch: 'Hyderabad', // Trying to create for Hyderabad
      status: 'Active',
      leader: 'Balram Suman',
      department: 'IT'
    };
    
    // Geeta creating a team specifying 'Hyderabad'
    console.log('Geeta creating a team with branch specified as "Hyderabad"...');
    const geetaCreateTeam = await request('/teams', 'POST', geetaToken, newTeamPayload);
    if (geetaCreateTeam.ok) {
      const createdBranch = geetaCreateTeam.data.data?.branch;
      console.log(`Created team branch: "${createdBranch}". Expected: "Jaipur Branch"`);
      if (createdBranch === 'Jaipur Branch') {
        console.log('PASS: Geeta was forced to create team in "Jaipur Branch", overriding Hyderabad.');
        // Clean up the team
        await request(`/teams/${geetaCreateTeam.data.data.id}`, 'DELETE', geetaToken);
      } else {
        console.error('FAIL: Team created in Hyderabad branch by Jaipur manager!');
      }
    } else {
      console.error('FAIL: Geeta failed to create team:', geetaCreateTeam.status, geetaCreateTeam.data);
    }

  } catch (err) {
    console.error('Test Execution Error:', err);
  }
}

run();
