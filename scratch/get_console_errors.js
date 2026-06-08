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

  page.on('console', msg => {
    console.log(`BROWSER CONSOLE [${msg.type()}]:`, msg.text());
  });

  page.on('pageerror', err => {
    console.error('BROWSER PAGE ERROR:', err.toString());
  });

  try {
    console.log('Navigating to http://localhost:5173/leaves ...');
    await page.goto('http://localhost:5173/leaves', { waitUntil: 'networkidle0', timeout: 10000 });
    console.log('Page loaded. Waiting for 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));
  } catch (err) {
    console.error('Navigation error:', err);
  } finally {
    await browser.close();
  }
}

run();
