import fs from 'fs';
import path from 'path';

const logPath = 'c:/Users/Shubh/Desktop/OMS/backend/error_trace.log';
if (fs.existsSync(logPath)) {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  console.log(lines.slice(-40).join('\n'));
} else {
  console.log('error_trace.log not found at ' + logPath);
}
