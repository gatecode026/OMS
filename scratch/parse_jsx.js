const fs = require('fs');

const code = fs.readFileSync('frontend/src/pages/ProjectManagers.jsx', 'utf8');
const lines = code.split('\n');

const stack = [];
const matches = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Find tags in the line
  // Note: This is a simple regex that finds opening/closing divs and custom tags, ignoring comments
  let cleanLine = line.replace(/\{\/\*.*?\*\/\}/g, '').replace(/\/\/.*$/, '');
  
  // A simple tokenizer for JSX tags on this line
  const tagRegex = /(<\/?[a-zA-Z0-9.-]+(\s+[a-zA-Z0-9.-]+(=("[^"]*"|'[^']*'|{.*?}))*)*\s*\/?>)/g;
  let match;
  while ((match = tagRegex.exec(cleanLine)) !== null) {
    const tagStr = match[0];
    if (tagStr.startsWith('<!--') || tagStr.endsWith('-->')) continue;
    
    const isClose = tagStr.startsWith('</');
    const isSelfClosing = tagStr.endsWith('/>') || tagStr.startsWith('<img') || tagStr.startsWith('<input') || tagStr.startsWith('<br') || tagStr.startsWith('<hr');
    
    // Extract tag name
    const nameMatch = tagStr.match(/<\/?([a-zA-Z0-9.-]+)/);
    const tagName = nameMatch ? nameMatch[1] : '';
    
    if (!tagName) continue;
    
    if (isSelfClosing) {
      // Self closing, do nothing
    } else if (isClose) {
      // Find matching open tag
      let found = false;
      for (let j = stack.length - 1; j >= 0; j--) {
        if (stack[j].name === tagName && !stack[j].closed) {
          stack[j].closed = true;
          matches.push({ openLine: stack[j].line, closeLine: i + 1, name: tagName });
          stack.splice(j, 1);
          found = true;
          break;
        }
      }
      if (!found) {
        console.log(`Unmatched closing tag </${tagName}> on line ${i + 1}`);
      }
    } else {
      // Opening tag
      stack.push({ name: tagName, line: i + 1, closed: false });
    }
  }
}

console.log('Open tags remaining at end of file:', stack.map(s => `${s.name} (line ${s.line})`));

// Let's find what closed lines 810 to 820
console.log('\nMatches for lines around 810-820:');
matches.filter(m => m.closeLine >= 810 && m.closeLine <= 820).forEach(m => {
  console.log(`Line ${m.closeLine} (</${m.name}>) matches Line ${m.openLine} (<${m.name}>)`);
});
