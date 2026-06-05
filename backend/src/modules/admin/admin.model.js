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
  status: {
    type: String,
    default: 'Active',
    enum: ['Active', 'Suspended', 'Disabled']
  },
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
