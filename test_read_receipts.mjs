import puppeteer from 'puppeteer-core';

async function run() {
  console.log('=== Phase 5 Read Receipts Integration Test ===');
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

    // Catch page errors and logs
    pageA.on('pageerror', err => {
      console.error('[Browser A Error]', err);
    });
    pageA.on('console', msg => {
      console.log('[Browser A Console]', msg.text());
    });
    pageB.on('pageerror', err => {
      console.error('[Browser B Error]', err);
    });
    pageB.on('console', msg => {
      console.log('[Browser B Console]', msg.text());
    });

    // Login A (Geeta)
    console.log('[Geeta] Logging in...');
    await pageA.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    await pageA.type('input[type="email"]', 'geeta@gmail.com');
    await pageA.type('input[type="password"]', 'password123');
    await Promise.all([
      pageA.click('button[type="submit"]'),
      pageA.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {})
    ]);
    console.log('[Geeta] Navigating to chat...');
    await pageA.goto('http://localhost:5173/chat', { waitUntil: 'networkidle2' });

    // Login B (Rahul)
    console.log('[Rahul] Logging in...');
    await pageB.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    await pageB.type('input[type="email"]', 'rahul@gatexpay.co.in');
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
    const geetaClicked = await pageA.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.conv-item'));
      const target = items.find(item => item.textContent.toLowerCase().includes('rahul'));
      if (target) {
        target.click();
        return true;
      }
      return false;
    });
    console.log(`[Geeta] Clicked conversation: ${geetaClicked}`);

    console.log('[Rahul] Opening chat with Geeta...');
    const rahulClicked = await pageB.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.conv-item'));
      const target = items.find(item => item.textContent.toLowerCase().includes('geeta'));
      if (target) {
        target.click();
        return true;
      }
      return false;
    });
    console.log(`[Rahul] Clicked conversation: ${rahulClicked}`);

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Send a message from Geeta
    const timestamp = Date.now();
    const testMessage = `Receipts Test ${timestamp}`;
    console.log(`[Geeta] Sending message: "${testMessage}"`);

    await pageA.waitForSelector('.msg-input-textarea', { timeout: 10000 });
    await pageA.focus('.msg-input-textarea');
    await pageA.type('.msg-input-textarea', testMessage);
    
    // Verify textarea content
    const typedText = await pageA.evaluate(() => {
      const ta = document.querySelector('.msg-input-textarea');
      return ta ? ta.value : '';
    });
    console.log(`[Geeta Textarea Content] typed text in textarea: "${typedText}"`);

    // Press Enter to send
    await pageA.keyboard.press('Enter');
    console.log('[Geeta] Pressed Enter key to send');

    // Wait for message bubble on Geeta's screen and check status
    console.log('[Geeta] Waiting for message bubble to render...');
    await pageA.waitForSelector('.msg-row-other .msg-bubble', { timeout: 10000 }); // msg-row-other means own message for flex-direction: row-reverse

    // Let's check status transitions on Geeta's screen
    console.log('[Geeta] Checking status ticks...');
    let statusText = '';
    for (let i = 0; i < 20; i++) {
      statusText = await pageA.evaluate((msgText) => {
        const bubbles = Array.from(document.querySelectorAll('.msg-row-other'));
        console.log(`[Eval] Found ${bubbles.length} own messages (msg-row-other)`);
        bubbles.forEach((b, idx) => {
          console.log(`[Eval] msg[${idx}]: "${b.textContent.trim().replace(/\s+/g, ' ')}"`);
        });
        const bubble = bubbles.find(b => b.textContent.includes(msgText));
        if (!bubble) return 'not_found';
        const statusEl = bubble.querySelector('.msg-status-container');
        return statusEl ? statusEl.textContent.trim() : 'no_status';
      }, testMessage);

      console.log(`[Geeta Screen Status] Current: "${statusText}"`);
      if (statusText === 'Seen') {
        console.log('SUCCESS: Tick status transitioned to Seen (blue double tick) successfully!');
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (statusText !== 'Seen') {
      console.error(`FAILURE: Did not transition to Seen. Last status was: "${statusText}"`);
      throw new Error('Read receipt verification failed');
    }

    console.log('=== Test Passed Successfully ===');
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
