const puppeteer = require('puppeteer-core');
const fs = require('fs');

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
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`[BROWSER CONSOLE - ${msg.type().toUpperCase()}]:`, msg.text());
    }
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
    
    console.log('Submitting login...');
    await page.click('button[type="submit"]');
    await page.waitForSelector('.app-shell-layout', { timeout: 10000 });
    console.log('Successfully logged in.');

    const roles = ['super_admin', 'branch_admin', 'dept_admin', 'manager', 'team_leader', 'employee'];

    for (const role of roles) {
      console.log(`\n--- Testing role: ${role} ---`);
      await page.evaluate((r) => {
        localStorage.setItem('saas_role', r);
      }, role);

      console.log(`Navigating to /attendance as ${role}...`);
      await page.goto('http://localhost:5173/attendance');
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log(`Finished checking /attendance for ${role}.`);
    }

  } catch (err) {
    console.error('An error occurred during execution:', err);
  } finally {
    await browser.close();
  }
}

run();
