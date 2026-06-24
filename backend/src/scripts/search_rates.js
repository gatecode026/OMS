import fs from 'fs';

const content = fs.readFileSync('c:/Users/anime/OneDrive/Desktop/Desktop/GateCode(All Folders)/OMS/frontend/src/pages/Managers.jsx', 'utf8');
const lines = content.split('\n');

console.log('Searching for successRate in Managers.jsx...');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('successRate')) {
    console.log(`Line ${i + 1}: ${lines[i].trim()}`);
  }
}
