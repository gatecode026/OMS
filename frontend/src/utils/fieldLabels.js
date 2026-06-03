// Centralized form input field labels from Add Employee Wizard
// Used dynamically in the forms and in table headers to keep them 100% in sync.

export const FIELD_LABELS = {
  // Step 1: Personal Details
  name: 'Full Name',
  dob: 'Date of Birth',
  gender: 'Gender',
  phone: 'Contact Number',
  alternatePhone: 'Alternate Contact Number',
  email: 'Email Address',
  personalEmail: 'Personal Email',
  bloodGroup: 'Blood Group',
  maritalStatus: 'Marital Status',
  experience: 'Experience (Years)',
  currentAddress: 'Current Address',
  city: 'City',
  state: 'State',
  country: 'Country',
  zipCode: 'ZIP Code',
  permanentAddress: 'Permanent Address',
  emergencyContactName: 'Contact Name',
  emergencyContactPhone: 'Phone Number',
  emergencyContactPhoneAlt: 'Alt Phone',
  emergencyContactRelation: 'Relation',

  // Step 2: Professional Details
  id: 'Employee ID',
  companyName: 'Company Name',
  designation: 'Designation',
  department: 'Department',
  branch: 'Branch/Agency',
  branchAddress: 'Branch Address',
  teamLeader: 'Team Leader',
  projectManager: 'Project Manager',
  joinDate: 'Joining Date',
  shiftTiming: 'Shift Timing',
  workLocation: 'Work Location',
  employeeType: 'Employee Type',
  employmentStatus: 'Employment Status',
  probationEndDate: 'Probation End Date',
  contractEndDate: 'Contract End Date',
  bankName: 'Bank Name',
  bankAccountNumber: 'Account Number',
  bankIfscCode: 'IFSC Code',
  bankUpiId: 'UPI ID',

  // Step 3: Login & Role Access
  username: 'Username',
  officialEmail: 'Official Company Email',
  password: 'Password',
  confirmPassword: 'Confirm Password',
  roleId: 'Role Assignment',

  // Step 4: Attendance & Shift Setup
  shiftType: 'Shift Type',
  attendanceRule: 'Attendance Rule',
  punchInTime: 'Punch In Time',
  punchOutTime: 'Punch Out Time',

  // Derived or status labels that align with the form's terminology
  workingHours: 'Working Hours',
  attendanceStatus: 'Attendance Status',
  leaveStatus: 'Leave Status'
};
