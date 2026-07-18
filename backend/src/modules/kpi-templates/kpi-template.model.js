/**
 * @file src/modules/kpi-templates/kpi-template.model.js
 * @description Mongoose schema definition for KPI Templates.
 */

import mongoose from 'mongoose';
import { tenantPlugin } from '../../utils/tenantPlugin.js';

const kpiTemplateSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
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
    description: {
      type: String,
      default: ''
    },
    frequency: {
      type: String,
      enum: [
        'Weekly',
        '15 Days',
        'Monthly',
        'Quarterly',
        'Semi-Annually',
        'Annually',
        'Custom'
      ],
      default: 'Monthly'
    },
    effectiveDate: {
      type: Date,
      required: true
    },
    expiryDate: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['Draft', 'Published', 'Archived'],
      default: 'Draft',
      index: true
    },
    version: {
      type: Number,
      default: 1
    },
    parentTemplateId: {
      type: String,
      default: null
    },
    attributes: [
      {
        id: {
          type: String,
          required: true
        },
        name: {
          type: String,
          required: true
        },
        description: {
          type: String,
          default: ''
        },
        weight: {
          type: Number,
          required: true,
          min: 0,
          max: 100
        },
        maxScore: {
          type: Number,
          required: true,
          default: 10
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
        calculationConfig: {
          type: mongoose.Schema.Types.Mixed,
          default: {}
        },
        allowOverride: {
          type: Boolean,
          default: false
        },
        commentRequired: {
          type: Boolean,
          default: false
        },
        order: {
          type: Number,
          default: 0
        }
      }
    ],
    ratingConfig: [
      {
        rating: {
          type: String,
          required: true
        },
        minScore: {
          type: Number,
          required: true
        },
        maxScore: {
          type: Number,
          required: true
        }
      }
    ],
    createdBy: {
      type: String,
      required: true
    },
    updatedBy: {
      type: String,
      default: null
    },
    publishedBy: {
      type: String,
      default: null
    },
    publishedAt: {
      type: Date,
      default: null
    },
    archivedBy: {
      type: String,
      default: null
    },
    archivedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    collection: 'kpi_templates'
  }
);

kpiTemplateSchema.index({ companyId: 1, id: 1 }, { unique: true });
kpiTemplateSchema.plugin(tenantPlugin);

const KpiTemplate = mongoose.model('KpiTemplate', kpiTemplateSchema);

export default KpiTemplate;
