/**
 * @file src/modules/teams/teams.model.js
 * @description Mongoose schema definition for Teams module.
 */

import mongoose from 'mongoose';
import { tenantPlugin } from '../../utils/tenantPlugin.js';

const memberSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  id: {
    type: String,
    required: true,
    trim: true
  },
  designation: {
    type: String,
    default: ''
  },
  date: {
    type: String,
    default: () => new Date().toISOString().split('T')[0]
  },
  attendance: {
    type: Number,
    default: 100
  },
  productivity: {
    type: Number,
    default: 90
  }
}, { _id: false });

const teamSchema = new mongoose.Schema({
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
  teamCode: {
    type: String,
    sparse: true,
    trim: true,
    index: true
  },
  leader: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  branch: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    default: 'Active'
  },
  createdDate: {
    type: String,
    default: () => new Date().toISOString().split('T')[0]
  },
  activeProjects: {
    type: Number,
    default: 0
  },
  completedTasks: {
    type: Number,
    default: 0
  },
  productivity: {
    type: Number,
    default: 90
  },
  attendance: {
    type: Number,
    default: 95
  },
  membersList: {
    type: [memberSchema],
    default: []
  }
}, {
  timestamps: true,
  collection: 'teams'
});

teamSchema.plugin(tenantPlugin);
teamSchema.index({ companyId: 1, teamCode: 1 }, { unique: true, sparse: true });

teamSchema.pre('save', async function(next) {
  if (this.isNew && !this.teamCode) {
    try {
      const { generateCompanyUniqueId } = await import('../../utils/idGenerator.js');
      this.teamCode = await generateCompanyUniqueId(this.companyId, 'teams');
    } catch (err) {
      return next(err);
    }
  }
  next();
});

const Team = mongoose.model('Team', teamSchema);

export default Team;
