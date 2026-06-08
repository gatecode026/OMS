/**
 * @file src/modules/teams/teams.model.js
 * @description Mongoose schema definition for Teams module.
 */

import mongoose from 'mongoose';

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

const Team = mongoose.model('Team', teamSchema);

export default Team;
