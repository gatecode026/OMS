/**
 * @file src/modules/kpi/kpi-evaluation-cycles/kpi-evaluation-cycle.model.js
 * @description Mongoose schema definition for KPI Evaluation Cycles.
 */

import mongoose from 'mongoose';
import { tenantPlugin } from '../../../utils/tenantPlugin.js';

const kpiEvaluationCycleSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      index: true
    },
    templateId: {
      type: String,
      required: true,
      index: true
    },
    templateVersion: {
      type: Number,
      required: true
    },
    templateName: {
      type: String,
      required: true
    },
    departmentId: {
      type: String,
      required: true,
      index: true
    },
    departmentName: {
      type: String,
      required: true
    },
    periodLabel: {
      type: String,
      required: true
    },
    periodStart: {
      type: Date,
      required: true,
      index: true
    },
    periodEnd: {
      type: Date,
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: [
        'Draft',
        'In Progress',
        'Submitted',
        'Returned',
        'Approved',
        'Locked',
        'Archived'
      ],
      default: 'Draft',
      index: true
    },
    employeeCount: {
      type: Number,
      default: 0
    },
    completedCount: {
      type: Number,
      default: 0
    },
    submittedCount: {
      type: Number,
      default: 0
    },
    approvedCount: {
      type: Number,
      default: 0
    },
    averageScore: {
      type: Number,
      default: 0
    },
    startedBy: {
      type: String,
      required: true
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    submittedBy: {
      type: String,
      default: null
    },
    submittedAt: {
      type: Date,
      default: null
    },
    approvedBy: {
      type: String,
      default: null
    },
    approvedAt: {
      type: Date,
      default: null
    },
    lockedBy: {
      type: String,
      default: null
    },
    lockedAt: {
      type: Date,
      default: null
    },
    returnedBy: {
      type: String,
      default: null
    },
    returnedAt: {
      type: Date,
      default: null
    },
    returnReason: {
      type: String,
      default: ''
    },
    overallComments: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true,
    collection: 'kpi_evaluation_cycles'
  }
);

kpiEvaluationCycleSchema.index({ companyId: 1, id: 1 }, { unique: true });
kpiEvaluationCycleSchema.index(
  {
    companyId: 1,
    departmentId: 1,
    templateId: 1,
    periodStart: 1,
    periodEnd: 1
  },
  {
    unique: true
  }
);

kpiEvaluationCycleSchema.plugin(tenantPlugin);

const KpiEvaluationCycle = mongoose.model('KpiEvaluationCycle', kpiEvaluationCycleSchema);

export default KpiEvaluationCycle;
