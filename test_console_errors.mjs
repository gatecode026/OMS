import puppeteer from 'puppeteer-core';

async function run() {
  console.log('Launching Chrome...');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors'],
    ignoreHTTPSErrors: true
  });

  try {
    const page = await browser.newPage();

    // Catch page errors (uncaught exceptions)
    page.on('pageerror', err => {
      console.error('\n>>> PAGE ERROR DETECTED <<<');
      console.error(err.stack || err.message || err);
    });

    // Catch console messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`[Browser Console Error] ${msg.text()}`);
      } else {
        console.log(`[Browser Console] ${msg.text()}`);
      }
    });

    console.log('Navigating to login page...');
    await page.goto('https://localhost:5173/login', { waitUntil: 'networkidle2' });

    console.log('Filling login form...');
    // Type email
    await page.type('input[type="email"]', 'geeta@gmail.com');
    // Type password
    await page.type('input[type="password"]', 'password');

    console.log('Clicking Sign In...');
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {})
    ]);

    console.log('Navigated to:', page.url());

    console.log('Navigating explicitly to /chat...');
    await page.goto('https://localhost:5173/chat', { waitUntil: 'networkidle2' });

    console.log('Current URL:', page.url());
    
    // Wait for the conversations list to load
    await page.waitForSelector('.conv-item', { timeout: 10000 });
    console.log('Conversations list loaded!');

    // Click on the first chat item
    await page.click('.conv-item');
    console.log('Clicked first conversation!');

    // Wait for chat window header and the call button
    await page.waitForSelector('.chat-win-action-btn', { timeout: 10000 });
    console.log('Call buttons are visible in header!');

    // Click the voice call button
    console.log('Clicking Voice Call button...');
    await page.click('.chat-win-action-btn[title="Voice Call"]');

    // Wait for a few seconds to let any error manifest
    console.log('Waiting 5 seconds for errors to register...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('Done testing.');

  } catch (err) {
    console.error('Test execution failed:', err);
  } finally {
    await browser.close();
  }
}

run();
