import fs from 'fs';

const content = fs.readFileSync('../frontend/src/pages/Payroll.jsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, i) => {
  if (line.includes('employees') && (line.includes('const') || line.includes('let') || line.includes('var') || line.includes('function'))) {
    console.log(`Line ${i+1}: ${line.trim()}`);
  }
});
