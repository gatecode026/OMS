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
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream'
    ],
    ignoreHTTPSErrors: true
  };

  const browserA = await puppeteer.launch(launchOptions);
  const browserB = await puppeteer.launch(launchOptions);

  try {
    const pageA = await browserA.newPage();
    const pageB = await browserB.newPage();

    // Catch page errors
    pageA.on('pageerror', err => {
      console.error('\n>>> BROWSER A PAGE ERROR <<<');
      console.error(err.stack || err.message || err);
    });

    pageB.on('pageerror', err => {
      console.error('\n>>> BROWSER B PAGE ERROR <<<');
      console.error(err.stack || err.message || err);
    });

    // Capture console messages for debug
    pageA.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`[A Error] ${msg.text()}`);
      }
    });
    pageB.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`[B Error] ${msg.text()}`);
      }
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

    // Verify mic button on Geeta's page
    console.log('[Geeta] Waiting for Mic button to appear...');
    await pageA.waitForSelector('.msg-input-mic-btn', { timeout: 10000 });

    // Trigger recording
    console.log('[Geeta] Clicking Mic button to start recording...');
    await pageA.click('.msg-input-mic-btn');

    // Wait for VoiceRecorder stage to show up
    await pageA.waitForSelector('.voice-recorder', { timeout: 5000 });
    console.log('[Geeta] Voice recorder opened and recording starts.');

    // Wait and verify if "Geeta is recording audio" appears on Rahul's screen
    console.log('[Rahul] Verifying if voice recording status is shown...');
    let recordingStatusVisible = false;
    for (let i = 0; i < 15; i++) {
      recordingStatusVisible = await pageB.evaluate(() => {
        const indicatorText = document.querySelector('.typing-indicator-text');
        if (indicatorText) {
          console.log(`[Rahul Indicator Text] ${indicatorText.textContent}`);
          return indicatorText.textContent.toLowerCase().includes('geeta') &&
                 indicatorText.textContent.toLowerCase().includes('recording audio');
        }
        return false;
      });
      if (recordingStatusVisible) break;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (recordingStatusVisible) {
      console.log('✅ SUCCESS: Rahul is seeing that Geeta is recording audio!');
    } else {
      console.error('❌ FAILURE: Rahul is NOT seeing that Geeta is recording audio within 15 seconds.');
      throw new Error('Recording status verification failed');
    }

    // Geeta cancels the voice recording
    console.log('[Geeta] Canceling the voice recording...');
    await pageA.click('.vr-btn-cancel');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify the recording status disappears on Rahul's page
    console.log('[Rahul] Verifying that recording status has cleared...');
    let recordingStatusCleared = false;
    for (let i = 0; i < 10; i++) {
      const isGone = await pageB.evaluate(() => {
        const indicatorText = document.querySelector('.typing-indicator-text');
        if (!indicatorText) return true;
        return !indicatorText.textContent.toLowerCase().includes('recording audio');
      });
      if (isGone) {
        recordingStatusCleared = true;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (recordingStatusCleared) {
      console.log('✅ SUCCESS: Recording status cleared successfully on Rahul\'s page!');
    } else {
      console.error('❌ FAILURE: Recording status did NOT clear on Rahul\'s page after cancellation.');
      throw new Error('Recording status cleanup verification failed');
    }

    console.log('🎉 All voice recording status tests passed successfully!');
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  } finally {
    await browserA.close();
    await browserB.close();
  }
}

run();
