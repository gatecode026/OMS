import fs from 'fs';

const content = fs.readFileSync('c:/Users/anime/OneDrive/Desktop/Desktop/GateCode(All Folders)/OMS/frontend/src/pages/Branches.jsx', 'utf8');
const lines = content.split('\n');

console.log('Searching for fallback, mock, or hardcoded markers in Branches.jsx...');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('Delhi') || line.includes('Jaipur') || line.includes('Mumbai') || line.includes('dummy') || line.includes('mock') || line.includes('fallback') || line.includes('static')) {
    console.log(`Line ${i + 1}: ${line.trim()}`);
  }
}
