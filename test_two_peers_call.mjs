import puppeteer from 'puppeteer-core';

async function run() {
  console.log('Launching Chrome instances...');
  
  const launchOptions = {
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--ignore-certificate-errors',
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream'
    ],
    ignoreHTTPSErrors: true
  };

  const browserA = await puppeteer.launch(launchOptions);
  const browserB = await puppeteer.launch(launchOptions);

  try {
    const pageA = await browserA.newPage();
    const pageB = await browserB.newPage();

    // Track errors and logs for Browser A (Caller, Geeta)
    pageA.on('pageerror', err => {
      console.error('\n>>> BROWSER A PAGE ERROR <<<');
      console.error(err.stack || err.message || err);
    });

    pageA.on('console', msg => {
      const text = msg.text();
      if (text.includes('===') || text.includes('[Local Stream]') || text.includes('[Remote Stream]') || text.includes('[Peer Connection]') || text.includes('[Stats')) {
        console.log(`[Caller Log] ${text}`);
      } else {
        console.log(`[A] ${text}`);
      }
    });

    // Track errors and logs for Browser B (Callee, Rahul)
    pageB.on('pageerror', err => {
      console.error('\n>>> BROWSER B PAGE ERROR <<<');
      console.error(err.stack || err.message || err);
    });

    pageB.on('console', msg => {
      const text = msg.text();
      if (text.includes('===') || text.includes('[Local Stream]') || text.includes('[Remote Stream]') || text.includes('[Peer Connection]') || text.includes('[Stats')) {
        console.log(`[Callee Log] ${text}`);
      } else {
        console.log(`[B] ${text}`);
      }
    });

    // Login A
    console.log('[Caller] Logging in as Geeta...');
    await pageA.goto('https://localhost:5173/login', { waitUntil: 'networkidle2' });
    await pageA.type('input[type="email"]', 'geeta@gmail.com');
    await pageA.type('input[type="password"]', 'password');
    await Promise.all([
      pageA.click('button[type="submit"]'),
      pageA.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {})
    ]);
    console.log('[Caller] Navigating to /chat...');
    await pageA.goto('https://localhost:5173/chat', { waitUntil: 'networkidle2' });

    // Login B
    console.log('[Callee] Logging in as Rahul...');
    await pageB.goto('https://localhost:5173/login', { waitUntil: 'networkidle2' });
    await pageB.type('input[type="email"]', 'rahul@gatexpay.co.in');
    await pageB.type('input[type="password"]', 'password');
    await Promise.all([
      pageB.click('button[type="submit"]'),
      pageB.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {})
    ]);
    console.log('[Callee] Navigating to /chat...');
    await pageB.goto('https://localhost:5173/chat', { waitUntil: 'networkidle2' });

    // Wait for the conversation items to load
    console.log('Waiting for chat rosters...');
    await pageA.waitForSelector('.conv-item', { timeout: 15000 });
    await pageB.waitForSelector('.conv-item', { timeout: 15000 });

    // In A, find and click the conversation containing "RATIWALRAHUL" or "rahul"
    console.log('[Caller] Finding Rahul in conversation list...');
    const clickedA = await pageA.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.conv-item'));
      const target = items.find(item => item.textContent.toLowerCase().includes('rahul'));
      if (target) {
        target.click();
        return true;
      }
      return false;
    });

    if (clickedA) {
      console.log('[Caller] Clicked conversation with Rahul.');
    } else {
      console.log('[Caller] Rahul not found in conversation list. Clicking first item as fallback.');
      await pageA.click('.conv-item');
    }

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Caller clicks Voice Call
    console.log('[Caller] Clicking Voice Call button...');
    await pageA.waitForSelector('.chat-win-action-btn[title="Voice Call"]', { timeout: 10000 });
    await pageA.click('.chat-win-action-btn[title="Voice Call"]');

    // Callee waits for incoming call screen and clicks Accept
    console.log('[Callee] Waiting for Incoming Call screen...');
    await pageB.waitForSelector('button[title="Accept"]', { timeout: 15000 });
    console.log('[Callee] Clicking Accept...');
    await pageB.click('button[title="Accept"]');

    // Wait 15 seconds to collect WebRTC Audio Diagnostics
    console.log('Call connected. Collecting active call telemetry logs for 15 seconds...');
    await new Promise(resolve => setTimeout(resolve, 15000));

    console.log('Done testing.');

  } catch (err) {
    console.error('Test run failed:', err);
  } finally {
    await browserA.close();
    await browserB.close();
  }
}

run();
