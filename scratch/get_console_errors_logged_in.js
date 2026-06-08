const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  `C:\\Users\\${process.env.USERNAME || 'dell'}\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe`
];

async function run() {
  let executablePath = '';
  for (const p of chromePaths) {
    if (fs.existsSync(p)) {
      executablePath = p;
      break;
    }
  }

  if (!executablePath) {
    console.error('Chrome executable not found. Please check paths.');
    process.exit(1);
  }

  console.log(`Launching Chrome from: ${executablePath}`);
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE - ${msg.type().toUpperCase()}]:`, msg.text());
  });

  page.on('pageerror', err => {
    console.error('[BROWSER PAGE EXCEPTION]:', err.stack || err.toString());
  });

  try {
    console.log('Navigating to login page...');
    await page.goto('http://localhost:5173/login');
    
    console.log('Entering credentials...');
    await page.waitForSelector('#email');
    await page.type('#email', 'superadmin@saas.com');
    await page.type('#password', 'password');
    
    console.log('Submitting login form...');
    await page.click('button[type="submit"]');
    
    console.log('Waiting for AppShell to load...');
    await page.waitForSelector('.app-shell-layout', { timeout: 10000 });
    console.log(`Successfully logged in.`);

    // 1. Screenshot leaves as super admin
    console.log('Navigating to /leaves (as super_admin)...');
    await page.goto('http://localhost:5173/leaves');
    await new Promise(resolve => setTimeout(resolve, 4000));
    console.log('Taking screenshot of leaves (super_admin)...');
    await page.screenshot({ path: 'scratch/leaves_superadmin.png' });

    // 2. Screenshot attendance as super admin
    console.log('Navigating to /attendance (as super_admin)...');
    await page.goto('http://localhost:5173/attendance');
    await new Promise(resolve => setTimeout(resolve, 4000));
    console.log('Taking screenshot of attendance (super_admin)...');
    await page.screenshot({ path: 'scratch/attendance_superadmin.png' });

    // 3. Override role to employee
    console.log('Overriding active role to "employee" in localStorage...');
    await page.evaluate(() => {
      localStorage.setItem('saas_role', 'employee');
    });

    // 4. Screenshot leaves as employee
    console.log('Navigating to /leaves (as employee)...');
    await page.goto('http://localhost:5173/leaves');
    await new Promise(resolve => setTimeout(resolve, 4000));
    console.log('Taking screenshot of leaves (employee)...');
    await page.screenshot({ path: 'scratch/leaves_employee.png' });

    // 5. Screenshot attendance as employee
    console.log('Navigating to /attendance (as employee)...');
    await page.goto('http://localhost:5173/attendance');
    await new Promise(resolve => setTimeout(resolve, 4000));
    console.log('Taking screenshot of attendance (employee)...');
    await page.screenshot({ path: 'scratch/attendance_employee.png' });

    // Reset role to super_admin
    await page.evaluate(() => {
      localStorage.setItem('saas_role', 'super_admin');
    });

  } catch (err) {
    console.error('An error occurred during execution:', err);
  } finally {
    await browser.close();
  }
}

run();
