/**
 * @file src/modules/holidays/holidays.model.js
 * @description Mongoose schema definition for Holidays module.
 */

import mongoose from 'mongoose';

const holidaySchema = new mongoose.Schema({
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
  date: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['National', 'Regional', 'Company', 'Optional'],
    default: 'National'
  },
  description: {
    type: String,
    default: ''
  }
}, {
  timestamps: true,
  collection: 'holidays'
});

const Holiday = mongoose.model('Holiday', holidaySchema);

export default Holiday;
