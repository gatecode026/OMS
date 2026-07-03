import fs from 'fs';
import path from 'path';

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        searchDir(filePath);
      }
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('permissionModules')) {
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (line.includes('permissionModules')) {
            console.log(`${filePath}:${index + 1}: ${line.trim()}`);
          }
        });
      }
    }
  }
}

searchDir('c:/Users/anime/OneDrive/Desktop/Desktop/GateCode(All Folders)/OMS/frontend/src');
process.exit(0);
