import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const filePath = 'c:\\Users\\anime\\OneDrive\\Desktop\\Desktop\\GateCode(All Folders)\\OMS\\frontend\\src\\pages\\Overview.jsx';

const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('--- useApp lines in Overview.jsx ---');
lines.forEach((line, idx) => {
  if (line.includes('useApp') || line.includes('const {') || line.includes('Overview = ()')) {
    if (line.length < 250) {
      console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
  }
});
