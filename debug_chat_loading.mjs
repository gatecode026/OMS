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
      console.log(`[Console ${msg.type()}] ${msg.text()}`);
    });

    // Catch network requests and responses
    page.on('requestfailed', request => {
      console.log(`[Request Failed] URL: ${request.url()} | Text: ${request.failure()?.errorText}`);
    });

    page.on('response', async response => {
      const status = response.status();
      if (status >= 400) {
        console.log(`[HTTP Error ${status}] URL: ${response.url()}`);
        try {
          const body = await response.text();
          console.log(`[HTTP Error Body] ${body.substring(0, 300)}`);
        } catch (e) {
          console.log(`[HTTP Error Body Read Failed] ${e.message}`);
        }
      }
    });

    console.log('Navigating to login page...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });

    console.log('Filling login form for Geeta...');
    await page.type('input[type="email"]', 'geeta@gmail.com');
    await page.type('input[type="password"]', 'password123');

    console.log('Clicking Sign In...');
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {})
    ]);

    console.log('Navigated to:', page.url());

    console.log('Navigating explicitly to /chat...');
    await page.goto('http://localhost:5173/chat', { waitUntil: 'networkidle2' });

    console.log('Current URL:', page.url());
    
    // Wait for the conversations list to load
    await page.waitForSelector('.conv-item', { timeout: 10000 });
    console.log('Conversations list loaded!');

    // Click on the conversation with Rahul
    console.log('Finding and clicking chat with Rahul...');
    const clicked = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.conv-item'));
      const target = items.find(item => item.textContent.toLowerCase().includes('ratiw') || item.textContent.toLowerCase().includes('rahul'));
      if (target) {
        target.click();
        return true;
      }
      return false;
    });

    if (clicked) {
      console.log('Successfully clicked Rahul chat item!');
    } else {
      console.log('Failed to find Rahul chat item, clicking first conversation instead.');
      await page.click('.conv-item');
    }

    // Wait 5 seconds to see any errors or responses
    console.log('Waiting 5 seconds for messages to load...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const result = await page.evaluate(() => {
      const bubbles = Array.from(document.querySelectorAll('.msg-bubble'));
      return {
        count: bubbles.length,
        texts: bubbles.map(b => b.textContent.trim())
      };
    });

    console.log(`Rendered message bubbles count: ${result.count}`);
    console.log('Rendered message bubble contents:', result.texts);

    console.log('Done diagnostic.');

  } catch (err) {
    console.error('Test execution failed:', err);
  } finally {
    await browser.close();
  }
}

run();
