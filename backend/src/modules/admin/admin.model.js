/**
 * @file src/modules/admin/admin.model.js
 * @description Mongoose model representing the Super Admin only, encapsulated in a separate admin module.
 */


import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';


const adminSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  phone: String,
  role: {
    type: String,
    default: 'Super Admin'
  },
  roleId: {
    type: String,
    default: 'super_admin'
  },
  companyId: {
    type: String,
    default: null
  },
  status: {
    type: String,
    default: 'Active',
    enum: ['Active', 'Suspended', 'Disabled']
  },
  avatar: {
    type: String,
    default: ''
  },
  photoUrl: {
    type: String,
    default: ''
  },
  dob: String,
  gender: String,
  alternatePhone: String,
  personalEmail: String,
  workEmail: String,
  bloodGroup: String,
  maritalStatus: String,
  experience: String,
  nationality: String,
  username: String,

  // Address details
  currentAddress: String,
  permanentAddress: String,
  city: String,
  state: String,
  zipCode: String,
  country: String,

  // Emergency contact details
  emergencyContactName: String,
  emergencyContactPhone: String,
  emergencyContactPhoneAlt: String,
  emergencyContactRelation: String,

  // Bank details
  bankName: String,
  bankAccountNumber: String,
  bankIfscCode: String,
  bankUpiId: String,

  // Identity documents
  panNumber: String,
  aadhaarNumber: String,
  documents: [{
    category: String,
    fileName: String,
    uploadDate: String,
    fileType: String,
    downloadUrl: String
  }],
  password: {
    type: String,
    required: true,
    select: false
  }
}, {
  timestamps: true,
  collection: 'admins' // Dedicated collection for Super Admins
});

// Pre-save password hashing
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  // Safeguard against double-hashing if already a bcrypt string
  if (/^\$2[ab]\$/.test(this.password)) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});


adminSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};


const Admin = mongoose.model('Admin', adminSchema);
export default Admin;
