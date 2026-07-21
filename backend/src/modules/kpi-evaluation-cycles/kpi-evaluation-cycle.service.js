/**
 * @file src/modules/kpi-evaluation-cycles/kpi-evaluation-cycle.service.js
 * @description Service business logic for KPI Evaluation Cycles.
 */

import repository from './kpi-evaluation-cycle.repository.js';
import KpiTemplate from '../kpi-templates/kpi-template.model.js';
import KpiEmployeeEvaluation from '../kpi-employee-evaluations/kpi-employee-evaluation.model.js';
import Employee from '../employees/employees.model.js';
import kpiScoringService from '../kpi-scoring/kpi-scoring.service.js';
import logger from '../../config/logger.js';
import { emitEntitySync } from '../../services/sync.service.js';
import activityLogRepository from '../activity-logs/activity-logs.repository.js';
import { generateCompanyUniqueId } from '../../utils/idGenerator.js';
import { createNotification } from '../notifications/notifications.service.js';

export const findAllCycles = async (query) => {
  logger.info('Executing KpiEvaluationCycleService::findAllCycles');
  return repository.find(query);
};

export const findCycleById = async (id) => {
  logger.info(`Executing KpiEvaluationCycleService::findCycleById: ${id}`);
  return repository.findOne(id);
};

// Main function to calculate an employee's total score and rating based on template ratingConfig
export const calculateTotalAndRating = (attributeScores, ratingConfig) => {
  if (!attributeScores || !Array.isArray(attributeScores)) {
    return { totalScore: 0, rating: '' };
  }

  // Final KPI score is sum of weighted scores:
  // weighted_score = (finalScore / maxScore) * weight
  let totalScore = 0;
  attributeScores.forEach(attr => {
    const finalScore = attr.finalScore != null ? Number(attr.finalScore) : 0;
    const maxScore = attr.maxScore > 0 ? Number(attr.maxScore) : 10;
    const weight = Number(attr.weight) || 0;
    
    const normalized = finalScore / maxScore;
    totalScore += (normalized * weight);
  });

  totalScore = Math.max(0, Math.min(100, Math.round(totalScore * 100) / 100));

  // Determine rating label
  let rating = '';
  if (ratingConfig && Array.isArray(ratingConfig)) {
    // Find matching range
    const matched = ratingConfig.find(r => totalScore >= r.minScore && totalScore <= r.maxScore);
    if (matched) {
      rating = matched.rating;
    }
  }

  return { totalScore, rating };
};

export const createCycle = async (data, currentUser) => {
  logger.info('Executing KpiEvaluationCycleService::createCycle');

  const { templateId, periodLabel, periodStart, periodEnd } = data;
  if (!templateId || !periodLabel || !periodStart || !periodEnd) {
    throw new Error('Template ID, period label, period start date, and period end date are required.');
  }

  // 1. Fetch and validate template
  const template = await KpiTemplate.findOne({ id: templateId });
  if (!template) {
    throw new Error('KPI Template not found.');
  }

  if (template.status !== 'Published') {
    throw new Error('Evaluation cycles can only be started for Published templates.');
  }

  // 2. Check for duplicate/overlapping cycle
  const existingCycle = await repository.find({
    templateId,
    periodStart: new Date(periodStart),
    periodEnd: new Date(periodEnd)
  });
  if (existingCycle.length > 0) {
    throw new Error(`An evaluation cycle already exists for template "${template.name}" in this period.`);
  }

  // 3. Fetch active employees in the selected department
  const activeEmployees = await Employee.find({
    department: template.departmentName,
    status: 'Active'
  }).lean();

  if (activeEmployees.length === 0) {
    throw new Error(`No active employees found in department "${template.departmentName}".`);
  }

  // 4. Generate cycle ID
  const cycleId = await generateCompanyUniqueId(currentUser.companyId, 'kpievaluationcycles');

  // 5. Create Employee Evaluation Documents
  const evaluationsList = [];
  const pStart = new Date(periodStart);
  const pEnd = new Date(periodEnd);

  for (const emp of activeEmployees) {
    // Calculate initial automatic scores
    const attributeScores = [];
    
    for (const attr of template.attributes) {
      let autoScore = null;
      let finalScore = null;
      let metadata = {};

      if (attr.scoreType === 'Automatic' || attr.scoreType === 'Hybrid') {
        const res = await kpiScoringService.calculateAutoScore(
          attr.dataSource,
          emp.id,
          pStart,
          pEnd,
          attr.maxScore,
          attr.calculationConfig
        );
        autoScore = res.score;
        finalScore = autoScore;
        metadata = res.metadata;
      }

      attributeScores.push({
        attributeId: attr.id,
        attributeName: attr.name,
        description: attr.description,
        scoreType: attr.scoreType,
        dataSource: attr.dataSource,
        weight: attr.weight,
        maxScore: attr.maxScore,
        autoScore,
        manualScore: null,
        finalScore,
        originalAutoScore: autoScore,
        isOverridden: false,
        overrideReason: '',
        managerComment: '',
        calculationMetadata: metadata
      });
    }

    const { totalScore, rating } = calculateTotalAndRating(attributeScores, template.ratingConfig);

    const empEvalId = await generateCompanyUniqueId(currentUser.companyId, 'kpiemployeeevaluations');
    evaluationsList.push({
      id: empEvalId,
      cycleId,
      templateId: template.id,
      templateVersion: template.version,
      templateSnapshot: template.toObject(),
      departmentId: template.departmentId,
      departmentName: template.departmentName,
      employeeId: emp.id,
      employeeName: emp.name,
      employeeCode: emp.employeeCode || '',
      designation: emp.designation || '',
      evaluatorId: currentUser.id,
      periodLabel,
      periodStart: pStart,
      periodEnd: pEnd,
      attributeScores,
      totalScore,
      rating,
      status: 'Draft',
      companyId: currentUser.companyId
    });
  }

  // Insert evaluations in batch
  await KpiEmployeeEvaluation.insertMany(evaluationsList);

  // 6. Create the Cycle document
  const cycleData = {
    id: cycleId,
    templateId: template.id,
    templateVersion: template.version,
    templateName: template.name,
    departmentId: template.departmentId,
    departmentName: template.departmentName,
    periodLabel,
    periodStart: pStart,
    periodEnd: pEnd,
    status: 'In Progress', // default to In Progress since employees are populated
    employeeCount: activeEmployees.length,
    startedBy: currentUser.id,
    companyId: currentUser.companyId
  };

  const cycle = await repository.save(cycleData);

  // Activity Log
  try {
    const logId = await generateCompanyUniqueId(currentUser.companyId, 'activitylogs');
    await activityLogRepository.save({
      id: logId,
      timestamp: new Date().toISOString(),
      actor: currentUser.name || currentUser.email,
      actionType: 'KPI Cycle Started',
      fieldChanged: 'Status',
      oldValue: '—',
      newValue: 'In Progress',
      companyId: currentUser.companyId
    });
  } catch (err) {
    logger.error('Failed to write activity log for cycle start: ' + err.message);
  }

  // Socket notification
  if (cycle && currentUser.companyId) {
    emitEntitySync(currentUser.companyId, {
      module: 'kpi_evaluation_cycles',
      action: 'create',
      data: cycle
    });
  }

  return cycle;
};

// Recalculates auto scores and syncs cycle counts
export const syncCycleSummary = async (cycleId) => {
  const evaluations = await KpiEmployeeEvaluation.find({ cycleId }).lean();
  if (evaluations.length === 0) return null;

  const employeeCount = evaluations.length;
  const completedCount = evaluations.filter(e => ['Completed', 'Submitted', 'Approved', 'Locked'].includes(e.status)).length;
  const submittedCount = evaluations.filter(e => ['Submitted', 'Approved', 'Locked'].includes(e.status)).length;
  const approvedCount = evaluations.filter(e => ['Approved', 'Locked'].includes(e.status)).length;

  const totalScoreSum = evaluations.reduce((sum, e) => sum + (e.totalScore || 0), 0);
  const averageScore = employeeCount > 0 ? Math.round((totalScoreSum / employeeCount) * 100) / 100 : 0;

  // Auto-transition cycle status based on employee states
  let status = 'In Progress';
  if (approvedCount === employeeCount) {
    status = 'Approved';
  } else if (submittedCount === employeeCount) {
    status = 'Submitted';
  } else if (evaluations.some(e => e.status === 'Returned')) {
    status = 'Returned';
  }

  return repository.update(cycleId, {
    employeeCount,
    completedCount,
    submittedCount,
    approvedCount,
    averageScore,
    status
  });
};

export const submitCycle = async (id, currentUser) => {
  logger.info(`Executing KpiEvaluationCycleService::submitCycle: ${id}`);
  const cycle = await repository.findOne(id);
  if (!cycle) throw new Error('Cycle not found.');

  // Validate all employee evaluations are completed
  const unfinished = await KpiEmployeeEvaluation.countDocuments({
    cycleId: id,
    status: { $in: ['Draft', 'Returned'] }
  });
  if (unfinished > 0) {
    throw new Error(`Cannot submit cycle: ${unfinished} employee evaluations are still in Draft or Returned status.`);
  }

  // Update employee evaluations status to Submitted
  await KpiEmployeeEvaluation.updateMany(
    { cycleId: id, status: 'Completed' },
    { status: 'Submitted', submittedBy: currentUser.id, submittedAt: new Date() }
  );

  const updated = await repository.update(id, {
    status: 'Submitted',
    submittedBy: currentUser.id,
    submittedAt: new Date()
  });

  // Sync summary counts
  await syncCycleSummary(id);

  // Notify Department Heads / Admins
  try {
    const recipients = await Employee.find({
      roleId: { $in: ['company_admin', 'hr'] },
      status: 'Active'
    }).select('id').lean();

    for (const r of recipients) {
      await createNotification(r.id, currentUser.companyId, {
        type: 'task',
        title: 'KPI Cycle Submitted',
        message: `KPI Cycle for ${cycle.departmentName} (${cycle.periodLabel}) has been submitted for approval.`,
        data: { cycleId: cycle.id }
      });
    }
  } catch (err) {
    logger.error('Failed to notify for cycle submission: ' + err.message);
  }

  if (updated && currentUser.companyId) {
    emitEntitySync(currentUser.companyId, {
      module: 'kpi_evaluation_cycles',
      action: 'update',
      data: updated
    });
  }

  return updated;
};

export const approveCycle = async (id, currentUser) => {
  logger.info(`Executing KpiEvaluationCycleService::approveCycle: ${id}`);
  const cycle = await repository.findOne(id);
  if (!cycle) throw new Error('Cycle not found.');

  // Approve all employee evaluations
  await KpiEmployeeEvaluation.updateMany(
    { cycleId: id, status: 'Submitted' },
    { status: 'Approved', approvedBy: currentUser.id, approvedAt: new Date() }
  );

  const updated = await repository.update(id, {
    status: 'Approved',
    approvedBy: currentUser.id,
    approvedAt: new Date()
  });

  await syncCycleSummary(id);

  // Notify managers and employees
  try {
    const evals = await KpiEmployeeEvaluation.find({ cycleId: id }).lean();
    for (const ev of evals) {
      await createNotification(ev.employeeId, currentUser.companyId, {
        type: 'task',
        title: 'KPI Evaluation Approved',
        message: `Your KPI evaluation for ${ev.periodLabel} has been approved with rating "${ev.rating}".`,
        data: { evaluationId: ev.id }
      });
    }
  } catch (err) {
    logger.error('Failed to notify employees for cycle approval: ' + err.message);
  }

  if (updated && currentUser.companyId) {
    emitEntitySync(currentUser.companyId, {
      module: 'kpi_evaluation_cycles',
      action: 'update',
      data: updated
    });
  }

  return updated;
};

export const lockCycle = async (id, currentUser) => {
  logger.info(`Executing KpiEvaluationCycleService::lockCycle: ${id}`);
  const cycle = await repository.findOne(id);
  if (!cycle) throw new Error('Cycle not found.');

  if (cycle.status !== 'Approved') {
    throw new Error('Only Approved cycles can be locked.');
  }

  // Lock all evaluations
  await KpiEmployeeEvaluation.updateMany(
    { cycleId: id },
    { status: 'Locked', lockedBy: currentUser.id, lockedAt: new Date() }
  );

  const updated = await repository.update(id, {
    status: 'Locked',
    lockedBy: currentUser.id,
    lockedAt: new Date()
  });

  await syncCycleSummary(id);

  if (updated && currentUser.companyId) {
    emitEntitySync(currentUser.companyId, {
      module: 'kpi_evaluation_cycles',
      action: 'update',
      data: updated
    });
  }

  return updated;
};

export default {
  findAllCycles,
  findCycleById,
  createCycle,
  submitCycle,
  approveCycle,
  lockCycle,
  syncCycleSummary,
  calculateTotalAndRating
};
