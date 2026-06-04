const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function run() {
  const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`
  ];
  
  let executablePath = '';
  for (const path of chromePaths) {
    if (fs.existsSync(path)) {
      executablePath = path;
      break;
    }
  }
  
  const browser = await puppeteer.launch({ executablePath, headless: true });
  const page = await browser.newPage();
  
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('saas_role', 'super_admin');
    localStorage.setItem('saas_token', 'mock-token');
    localStorage.setItem('saas_user_id', 'EMP-201');
  });
  
  await page.goto('http://localhost:5173/project-managers', { waitUntil: 'networkidle2' });
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const structure = await page.evaluate(() => {
    const card = document.querySelector('.pm-dir-card');
    if (!card) return 'No card found';
    
    const elements = [];
    const traverse = (el, depth = 0) => {
      const computed = window.getComputedStyle(el);
      elements.push({
        depth,
        tagName: el.tagName,
        className: el.className,
        id: el.id,
        height: computed.height,
        display: computed.display,
        overflow: computed.overflow,
        position: computed.position,
        text: el.innerText ? el.innerText.substring(0, 50) : ''
      });
      Array.from(el.children).forEach(child => traverse(child, depth + 1));
    };
    
    traverse(card);
    return elements;
  });
  
  console.log('\n--- DETAILED CARD STRUCTURE ---');
  console.log(JSON.stringify(structure, null, 2));
  
  await browser.close();
}

run().catch(console.error);
