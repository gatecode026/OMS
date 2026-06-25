import dotenv from 'dotenv';
dotenv.config();
import { setServers } from 'dns';
setServers(['1.1.1.1']);
import mongoose from 'mongoose';
import { getTenantConnection } from '../utils/multidbConnection.js';

const dbUri = process.env.DB_URI;

const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

async function check() {
  await mongoose.connect(dbUri);
  const connection = await getTenantConnection('COMP-001');
  const Employee = connection.models['Employee'] || connection.model('Employee', new mongoose.Schema({}, { strict: false }));
  const Attendance = connection.models['Attendance'] || connection.model('Attendance', new mongoose.Schema({}, { strict: false }));
  
  const employees = await Employee.find({}).lean();
  const attendance = await Attendance.find({}).lean();
  
  const getTodayAttendance = (empId) => {
    if (!attendance || attendance.length === 0) return null;
    const todayStr = getLocalDateString();
    return attendance.find(a => a.employeeId === empId && a.date === todayStr);
  };

  const getTodayStatus = (row) => {
    const att = getTodayAttendance(row.id);
    if (att) return att.status;
    
    // Simulating frontend AppContext normalization
    const est = (row.status === 'Active' || row.status === 'Disabled' || row.status === 'Suspended')
      ? row.status
      : (row.accountStatus || row.employmentStatus || 'Active');
    
    const rowStatus = est;
    
    const rawPunch = row.todayPunchStatus || 'Not Punched';
    let attStatus = rawPunch;
    if (rawPunch === 'Not Punched' && row.attendanceStatus && !['Active', 'Disabled', 'Suspended'].includes(row.attendanceStatus)) {
      if (row.attendanceStatus !== 'Present') {
        attStatus = row.attendanceStatus;
      }
    }
    
    if (rowStatus === 'Active') {
      return attStatus || 'Present';
    }
    return 'Absent';
  };

  employees.forEach(e => {
    console.log(`Name: ${e.name} | Resolved status: "${getTodayStatus(e)}"`);
  });
  
  await mongoose.disconnect();
}

check().catch(console.error);
