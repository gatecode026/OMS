import fs from 'fs';
const content = fs.readFileSync('c:/Users/anime/OneDrive/Desktop/Desktop/GateCode(All Folders)/OMS/frontend/src/pages/Attendance.jsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('isEmployeeView') || line.includes('isCompanyView') || line.includes('activeSection')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
process.exit(0);
