/**
 * @file src/modules/counters/counter.model.js
 * @description Mongoose model for tracking sequences for company-wise unique code generation.
 */

import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  companyId: {
    type: String,
    required: true,
    index: true
  },
  module: {
    type: String,
    required: true,
    index: true
  },
  sequence: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  collection: 'counters'
});

// Enforce unique sequences per company and module
counterSchema.index({ companyId: 1, module: 1 }, { unique: true });

const Counter = mongoose.model('Counter', counterSchema);

export default Counter;
