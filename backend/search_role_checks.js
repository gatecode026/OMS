import fs from 'fs';
const content = fs.readFileSync('c:/Users/anime/OneDrive/Desktop/Desktop/GateCode(All Folders)/OMS/frontend/src/pages/Payroll.jsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes("currentUserRole === 'employee'") || line.includes("currentUserRole !== 'employee'") || line.includes("perspective") || line.includes("isEmployeeView")) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
process.exit(0);
