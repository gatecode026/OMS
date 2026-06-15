import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const companySchema = new mongoose.Schema({
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
  subdomain: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true
  },
  companyCode: {
    type: String,
    unique: true,
    sparse: true,
    uppercase: true,
    trim: true,
    index: true
  },
  status: {
    type: String,
    enum: ['Active', 'Suspended', 'Pending'],
    default: 'Active',
    index: true
  },
  plan: {
    type: String,
    enum: ['Basic', 'Premium', 'Enterprise'],
    default: 'Basic'
  },
  trialEndsAt: {
    type: Date,
    required: true
  },
  subscriptionExpiresAt: {
    type: Date,
    default: null
  },
  databaseType: {
    type: String,
    enum: ['shared', 'dedicated'],
    default: 'shared',
    index: true
  },
  databaseName: {
    type: String,
    default: ''
  },
  databaseClusterKey: {
    type: String,
    default: 'cluster_1'
  },
  tenantStatus: {
    type: String,
    enum: ['provisioning', 'active', 'failed', 'suspended'],
    default: 'provisioning',
    index: true
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
    index: true
  },
  password: {
    type: String,
    select: false
  },
  settings: {
    logoUrl: {
      type: String,
      default: ''
    },
    dbUri: {
      type: String,
      default: ''
    },
    primaryColor: {
      type: String,
      default: '#3b82f6'
    },
    secondaryColor: {
      type: String,
      default: '#1d4ed8'
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    },
    companyEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    companyPhone: {
      type: String,
      default: ''
    },
    address: {
      type: String,
      default: ''
    }
  }
}, {
  timestamps: true,
  collection: 'companies'
});

// Pre-save password hashing
companySchema.pre('save', async function(next) {
  if (!this.password) return next();
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

companySchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

const Company = mongoose.model('Company', companySchema);
export default Company;
