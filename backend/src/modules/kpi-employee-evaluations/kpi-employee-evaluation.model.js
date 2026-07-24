/**
 * @file src/modules/kpi-employee-evaluations/kpi-employee-evaluation.model.js
 * @description Mongoose schema definition for KPI Employee Evaluations.
 */

import mongoose from 'mongoose';
import { tenantPlugin } from '../../utils/tenantPlugin.js';

const kpiEmployeeEvaluationSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      index: true
    },
    cycleId: {
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
    templateSnapshot: {
      type: mongoose.Schema.Types.Mixed,
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
    employeeId: {
      type: String,
      required: true,
      index: true
    },
    employeeName: {
      type: String,
      required: true
    },
    employeeCode: {
      type: String,
      default: ''
    },
    designation: {
      type: String,
      default: ''
    },
    evaluatorId: {
      type: String,
      default: null
    },
    periodLabel: {
      type: String,
      required: true
    },
    periodStart: {
      type: Date,
      required: true
    },
    periodEnd: {
      type: Date,
      required: true
    },
    attributeScores: [
      {
        attributeId: {
          type: String,
          required: true
        },
        attributeName: {
          type: String,
          required: true
        },
        description: {
          type: String,
          default: ''
        },
        scoreType: {
          type: String,
          enum: ['Automatic', 'Manual', 'Hybrid'],
          required: true
        },
        dataSource: {
          type: String,
          default: ''
        },
        weight: {
          type: Number,
          required: true
        },
        maxScore: {
          type: Number,
          required: true
        },
        autoScore: {
          type: Number,
          default: null
        },
        manualScore: {
          type: Number,
          default: null
        },
        finalScore: {
          type: Number,
          default: null
        },
        originalAutoScore: {
          type: Number,
          default: null
        },
        isOverridden: {
          type: Boolean,
          default: false
        },
        overrideReason: {
          type: String,
          default: ''
        },
        managerComment: {
          type: String,
          default: ''
        },
        calculationMetadata: {
          type: mongoose.Schema.Types.Mixed,
          default: {}
        }
      }
    ],
    totalScore: {
      type: Number,
      default: 0
    },
    rating: {
      type: String,
      default: ''
    },
    managerComment: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: [
        'Draft',
        'Completed',
        'Submitted',
        'Returned',
        'Approved',
        'Locked',
        'Reopened'
      ],
      default: 'Draft',
      index: true
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
    lockedBy: {
      type: String,
      default: null
    },
    lockedAt: {
      type: Date,
      default: null
    },
    reopenedBy: {
      type: String,
      default: null
    },
    reopenedAt: {
      type: Date,
      default: null
    },
    reopenReason: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true,
    collection: 'kpi_employee_evaluations'
  }
);

kpiEmployeeEvaluationSchema.index({ companyId: 1, id: 1 }, { unique: true });
kpiEmployeeEvaluationSchema.index(
  {
    companyId: 1,
    cycleId: 1,
    employeeId: 1
  },
  {
    unique: true
  }
);
kpiEmployeeEvaluationSchema.index({
  companyId: 1,
  employeeId: 1,
  periodStart: -1
});

kpiEmployeeEvaluationSchema.plugin(tenantPlugin);

const KpiEmployeeEvaluation = mongoose.model('KpiEmployeeEvaluation', kpiEmployeeEvaluationSchema);

export default KpiEmployeeEvaluation;
