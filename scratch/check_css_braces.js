const fs = require('fs');
const content = fs.readFileSync('frontend/src/pages/ProjectManagers.css', 'utf8');

let braceCount = 0;
let lines = content.split('\n');
let insideComment = false;

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  
  // Simple comment handling (only block comments)
  if (line.includes('/*') && !line.includes('*/')) {
    insideComment = true;
    continue;
  }
  if (line.includes('*/') && insideComment) {
    insideComment = false;
    continue;
  }
  if (insideComment) continue;

  // Clean comments from line
  let cleanLine = line.replace(/\/\*.*?\*\//g, '');

  for (let char of cleanLine) {
    if (char === '{') {
      braceCount++;
    } else if (char === '}') {
      braceCount--;
      if (braceCount < 0) {
        console.log(`Extra closing brace found at line ${i + 1}: ${line}`);
      }
    }
  }
}

console.log(`Finished checking. Final brace count: ${braceCount}`);
