import mongoose from 'mongoose';

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

const Company = mongoose.model('Company', companySchema);
export default Company;
