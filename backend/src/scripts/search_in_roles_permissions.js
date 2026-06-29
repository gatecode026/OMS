import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = 'c:\\Users\\anime\\OneDrive\\Desktop\\Desktop\\GateCode(All Folders)\\OMS\\frontend\\src\\pages\\RolesPermissions.jsx';

const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('--- Occurrences of modulesList ---');
lines.forEach((line, idx) => {
  if (line.includes('modulesList')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});

console.log('\n--- Occurrences of isRowAllChecked ---');
lines.forEach((line, idx) => {
  if (line.includes('isRowAllChecked')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
