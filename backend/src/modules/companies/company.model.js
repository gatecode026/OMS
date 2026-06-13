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
  settings: {
    logoUrl: String,
    primaryColor: String,
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    }
  }
}, {
  timestamps: true,
  collection: 'companies'
});

const Company = mongoose.model('Company', companySchema);
export default Company;
