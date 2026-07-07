import puppeteer from 'puppeteer-core';

async function run() {
  console.log('Launching Chrome instances...');
  
  const launchOptions = {
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--ignore-certificate-errors'
    ],
    ignoreHTTPSErrors: true
  };

  const browser = await puppeteer.launch(launchOptions);

  try {
    const contextA = await browser.createBrowserContext();
    const contextB = await browser.createBrowserContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    // Catch page errors
    pageA.on('pageerror', err => {
      console.error('\n>>> BROWSER A PAGE ERROR <<<');
      console.error(err.stack || err.message || err);
    });

    pageB.on('pageerror', err => {
      console.error('\n>>> BROWSER B PAGE ERROR <<<');
      console.error(err.stack || err.message || err);
    });

    pageA.on('response', async response => {
      const status = response.status();
      if (status >= 400) {
        console.log(`[A Response ${status}] URL: ${response.url()}`);
        try {
          const text = await response.text();
          console.log(`[A Response Body] ${text}`);
        } catch (e) {
          // Response body read failed (e.g. status 401 with no body or preflight)
        }
      }
    });

    pageB.on('response', async response => {
      const status = response.status();
      if (status >= 400) {
        console.log(`[B Response ${status}] URL: ${response.url()}`);
        try {
          const text = await response.text();
          console.log(`[B Response Body] ${text}`);
        } catch (e) {
          // Response body read failed
        }
      }
    });

    // Capture console messages for debug
    pageA.on('console', msg => {
      console.log(`[A Console ${msg.type()}] ${msg.text()}`);
    });
    pageB.on('console', msg => {
      console.log(`[B Console ${msg.type()}] ${msg.text()}`);
    });

    // Login A (Geeta)
    console.log('[Geeta] Logging in...');
    await pageA.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    await pageA.type('input[type="email"]', 'geeta@gmail.com');
    await pageA.type('input[type="password"]', 'password');
    await Promise.all([
      pageA.click('button[type="submit"]'),
      pageA.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {})
    ]);
    console.log('[Geeta] Navigating to chat...');
    await pageA.goto('http://localhost:5173/chat', { waitUntil: 'networkidle2' });
 
    // Login B (Rahul)
    console.log('[Rahul] Logging in...');
    await pageB.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    await pageB.type('input[type="email"]', 'rahul@gmail.com');
    await pageB.type('input[type="password"]', 'password');
    await Promise.all([
      pageB.click('button[type="submit"]'),
      pageB.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {})
    ]);
    console.log('[Rahul] Navigating to chat...');
    await pageB.goto('http://localhost:5173/chat', { waitUntil: 'networkidle2' });

    // Wait for the conversation list to load
    console.log('Waiting for chat rosters...');
    await pageA.waitForSelector('.conv-item', { timeout: 15000 });
    await pageB.waitForSelector('.conv-item', { timeout: 15000 });

    // Open chat on both ends
    console.log('[Geeta] Opening chat with Rahul...');
    const clickedA = await pageA.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.conv-item'));
      const target = items.find(item => item.textContent.toLowerCase().includes('rahul'));
      if (target) {
        target.click();
        return true;
      }
      return false;
    });
    if (!clickedA) {
      console.log('[Geeta] Clicked first conversation instead.');
      await pageA.click('.conv-item');
    }

    console.log('[Rahul] Opening chat with Geeta...');
    const clickedB = await pageB.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.conv-item'));
      const target = items.find(item => item.textContent.toLowerCase().includes('geeta'));
      if (target) {
        target.click();
        return true;
      }
      return false;
    });
    if (!clickedB) {
      console.log('[Rahul] Clicked first conversation instead.');
      await pageB.click('.conv-item');
    }

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Define unique test message
    const timestamp = Date.now();
    const testMessage = `Test Message Standardized Event ${timestamp}`;
    console.log(`[Geeta] Sending test message: "${testMessage}"`);

    // Type and send message
    await pageA.waitForSelector('.msg-input-textarea', { timeout: 10000 });
    await pageA.type('.msg-input-textarea', testMessage);
    
    // Press Enter to send
    console.log('[Geeta] Pressing Enter to send...');
    await pageA.keyboard.press('Enter');
    await new Promise(resolve => setTimeout(resolve, 3000));
    // Wait and check if message appears on Rahul's screen (real-time)
    console.log('[Rahul] Checking if message is received in real-time...');
    let messageReceived = false;
    for (let i = 0; i < 10; i++) {
      messageReceived = await pageB.evaluate((msgText) => {
        const messages = Array.from(document.querySelectorAll('*'));
        return messages.some(el => el.textContent && el.textContent.includes(msgText));
      }, testMessage);

      if (messageReceived) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (messageReceived) {
      console.log('SUCCESS: Message received by Rahul in real-time!');
    } else {
      console.error('FAILURE: Message NOT received by Rahul in real-time within 10 seconds.');
      throw new Error('Real-time delivery verification failed');
    }

    console.log('Done testing successfully!');
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
