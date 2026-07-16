import fs from 'fs';

const content = fs.readFileSync('src/modules/chat/chat.socket.js', 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('socket.on')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
