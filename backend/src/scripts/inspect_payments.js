import dotenv from 'dotenv';
dotenv.config();
import { setServers } from 'dns';
setServers(['1.1.1.1']);
import mongoose from 'mongoose';
import { getTenantConnection } from '../utils/multidbConnection.js';

const dbUri = process.env.DB_URI;

async function check() {
  await mongoose.connect(dbUri);
  const connection = await getTenantConnection('COMP-001');
  const Employee = connection.models['Employee'] || connection.model('Employee', new mongoose.Schema({}, { strict: false }));
  const Attendance = connection.models['Attendance'] || connection.model('Attendance', new mongoose.Schema({}, { strict: false, collection: 'attendance' }));
  const PayrollPayment = connection.models['PayrollPayment'] || connection.model('PayrollPayment', new mongoose.Schema({}, { strict: false }));
  
  const employees = await Employee.find({ status: { $ne: 'Inactive' } }).lean();
  const attendance = await Attendance.find({}).lean();
  const payrollState = await PayrollPayment.find({ month: 'June', year: '2026' }).lean();
  
  const month = 'June';
  const year = '2026';
  
  const monthMap = {
    January: '01',
    February: '02',
    March: '03',
    April: '04',
    May: '05',
    June: '06',
    July: '07',
    August: '08',
    September: '09',
    October: '10',
    November: '11',
    December: '12'
  };

  const attendanceConfigs = { lateArrivalPenalty: 300, overtimeHourlyRate: 500 };

  console.log(`Employees count: ${employees.length}`);
  
  let totalCost = 0;
  
  employees.forEach(emp => {
    const empId = emp.id;
    const empBasicSalary = Number(emp.salaryAmount) || 0;
    const struct = {
      basic: empBasicSalary,
      hra: empBasicSalary > 0 ? Math.round(empBasicSalary * 0.4) : 0,
      travel: empBasicSalary > 0 ? 3000 : 0,
      medical: empBasicSalary > 0 ? 2000 : 0,
      special: empBasicSalary > 0 ? 1000 : 0,
      pf: empBasicSalary > 0 ? Math.round(empBasicSalary * 0.12) : 0,
      esi: 0,
      pt: empBasicSalary > 0 ? 200 : 0,
      tds: empBasicSalary > 0 ? Math.round(empBasicSalary * 0.1) : 0
    };
    
    const monthStr = monthMap[month];
    const prefix = `${year}-${monthStr}`;
    const empRecords = attendance.filter(a => a.employeeId === empId && a.date && a.date.startsWith(prefix));
    
    let presentCount = 0;
    let absentCount = 0;
    let halfDaysCount = 0;
    let paidLeavesCount = 0;
    let lateArrivalsCount = 0;
    let overtimeHoursCount = 0;

    if (empRecords.length > 0) {
      presentCount = empRecords.filter(a => ['Present', 'Work From Home', 'WFH', 'Overtime'].includes(a.status)).length;
      absentCount = empRecords.filter(a => a.status === 'Absent').length;
      halfDaysCount = empRecords.filter(a => ['Half Day', 'Half-Day'].includes(a.status)).length;
      paidLeavesCount = empRecords.filter(a => ['On Leave', 'Leave'].includes(a.status) || (a.status && a.status.includes('Leave'))).length;
      lateArrivalsCount = empRecords.filter(a => a.status === 'Late').length;
      overtimeHoursCount = empRecords.reduce((sum, a) => {
        const hrs = parseFloat(a.overtime) || (a.status === 'Overtime' ? 2 : 0);
        return sum + hrs;
      }, 0);
    }
    
    const totalAllowances = (struct.hra || 0) + (struct.travel || 0) + (struct.medical || 0) + (struct.special || 0);
    const leaveDeduction = absentCount * Math.round((struct.basic || empBasicSalary) / 24);
    const lateDeduction = lateArrivalsCount * attendanceConfigs.lateArrivalPenalty;
    const statutoryDeductions = (struct.pf || 0) + (struct.esi || 0) + (struct.pt || 0) + (struct.tds || 0);
    const totalDeductions = statutoryDeductions + leaveDeduction + lateDeduction;
    const grossSalary = (struct.basic || empBasicSalary) + totalAllowances + (overtimeHoursCount * attendanceConfigs.overtimeHourlyRate);
    const netSalary = grossSalary - totalDeductions;
    
    totalCost += netSalary;
    
    console.log(`EmpID: ${empId} | Name: ${emp.name} | Dept: ${emp.department} | Basic: ${empBasicSalary} | LateArrivals: ${lateArrivalsCount} | Absent: ${absentCount} | Gross: ${grossSalary} | Deduct: ${totalDeductions} | Net: ${netSalary}`);
  });
  
  console.log(`Total Calculated Cost: ${totalCost}`);
  
  await mongoose.disconnect();
}

check().catch(console.error);
