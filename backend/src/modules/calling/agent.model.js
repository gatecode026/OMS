import mongoose from 'mongoose';
import { tenantPlugin } from '../../utils/tenantPlugin.js';

const enterpriseAgentSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  companyId: { type: String, required: true, index: true },
  agentName: { type: String, required: true },
  agentType: {
    type: String,
    enum: ['meeting', 'hr', 'payroll', 'project', 'executive'],
    default: 'meeting'
  },
  systemPrompt: { type: String, required: true },
  tools: [{ type: String }],
  humanApprovalRequired: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true,
  collection: 'enterprise_agents'
});

const agentExecutionLogSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  companyId: { type: String, required: true, index: true },
  agentId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  userQuery: { type: String, required: true },
  response: { type: String, required: true },
  toolInvocations: [{
    toolName: { type: String },
    input: { type: mongoose.Schema.Types.Mixed },
    output: { type: mongoose.Schema.Types.Mixed }
  }],
  executionTimeMs: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['completed', 'awaiting_approval', 'failed'],
    default: 'completed'
  }
}, {
  timestamps: true,
  collection: 'agent_execution_logs'
});

enterpriseAgentSchema.plugin(tenantPlugin);
agentExecutionLogSchema.plugin(tenantPlugin);

export const EnterpriseAgent = mongoose.model('EnterpriseAgent', enterpriseAgentSchema);
export const AgentExecutionLog = mongoose.model('AgentExecutionLog', agentExecutionLogSchema);
