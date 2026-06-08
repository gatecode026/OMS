/**
 * @file src/modules/appraisal-reviews/appraisal-reviews.model.js
 * @description Mongoose schema definition for Appraisal Reviews module.
 */

import mongoose from 'mongoose';

const appraisalReviewSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  employeeId: {
    type: String,
    required: true
  },
  employeeName: {
    type: String,
    required: true
  },
  reviewer: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'Quarterly'
  },
  period: {
    type: String,
    required: true
  },
  rating: {
    type: String,
    required: true
  },
  notes: {
    type: String,
    required: true
  },
  feedback: {
    type: String,
    default: ''
  },
  recommendations: {
    type: String,
    default: ''
  },
  date: {
    type: String,
    required: true
  }
}, {
  timestamps: true,
  collection: 'appraisal_reviews'
});

const AppraisalReview = mongoose.model('AppraisalReview', appraisalReviewSchema);

export default AppraisalReview;
