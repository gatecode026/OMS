import fs from 'fs';

const content = fs.readFileSync('c:/Users/anime/OneDrive/Desktop/Desktop/GateCode(All Folders)/OMS/frontend/src/pages/Branches.jsx', 'utf8');
const lines = content.split('\n');

console.log('Printing lines 201 to 400 of Branches.jsx...');
for (let i = 200; i < 400; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
