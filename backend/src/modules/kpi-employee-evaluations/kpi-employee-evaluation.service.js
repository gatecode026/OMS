/**
 * @file src/modules/kpi-employee-evaluations/kpi-employee-evaluation.service.js
 * @description Service business logic for KPI Employee Evaluations.
 */

import repository from './kpi-employee-evaluation.repository.js';
import KpiEvaluationCycle from '../kpi-evaluation-cycles/kpi-evaluation-cycle.model.js';
import cycleService from '../kpi-evaluation-cycles/kpi-evaluation-cycle.service.js';
import kpiScoringService from '../kpi-scoring/kpi-scoring.service.js';
import logger from '../../config/logger.js';
import { emitEntitySync } from '../../services/sync.service.js';
import activityLogRepository from '../activity-logs/activity-logs.repository.js';
import { generateCompanyUniqueId } from '../../utils/idGenerator.js';
import { createNotification } from '../notifications/notifications.service.js';

export const findAllEvaluations = async (query) => {
  logger.info('Executing KpiEmployeeEvaluationService::findAllEvaluations');
  return repository.find(query);
};

export const findEvaluationById = async (id) => {
  logger.info(`Executing KpiEmployeeEvaluationService::findEvaluationById: ${id}`);
  return repository.findOne(id);
};

export const updateScoresAndComments = async (id, data, currentUser) => {
  logger.info(`Executing KpiEmployeeEvaluationService::updateScoresAndComments: ${id}`);

  const evalDoc = await repository.findOne(id);
  if (!evalDoc) {
    throw new Error('Employee evaluation not found.');
  }

  if (['Approved', 'Locked'].includes(evalDoc.status)) {
    throw new Error(`Cannot modify scores. Evaluation is already in "${evalDoc.status}" status.`);
  }

  const { scores = [], managerComment, status } = data;

  // Process score updates
  scores.forEach(s => {
    const attr = evalDoc.attributeScores.find(a => a.attributeId === s.attributeId);
    if (!attr) return;

    const val = s.value !== undefined && s.value !== null ? Number(s.value) : null;

    if (attr.scoreType === 'Manual') {
      if (val !== null) {
        if (isNaN(val) || val < 0 || val > attr.maxScore) {
          throw new Error(`Manual score for "${attr.attributeName}" must be a number between 0 and ${attr.maxScore}.`);
        }
        attr.manualScore = val;
        attr.finalScore = val;
      }
    } else if (attr.scoreType === 'Hybrid' && s.isOverridden) {
      if (val !== null) {
        if (isNaN(val) || val < 0 || val > attr.maxScore) {
          throw new Error(`Override score for "${attr.attributeName}" must be a number between 0 and ${attr.maxScore}.`);
        }
        if (!s.overrideReason || !s.overrideReason.trim()) {
          throw new Error(`Override reason is required to override hybrid attribute "${attr.attributeName}".`);
        }
        attr.isOverridden = true;
        attr.overrideReason = s.overrideReason;
        attr.finalScore = val;
        
        // Audit log override
        try {
          generateCompanyUniqueId(currentUser.companyId, 'activitylogs').then(logId => {
            activityLogRepository.save({
              id: logId,
              timestamp: new Date().toISOString(),
              actor: currentUser.name || currentUser.email,
              actionType: 'KPI Score Overridden',
              fieldChanged: attr.attributeName,
              oldValue: String(attr.originalAutoScore || 0),
              newValue: String(val),
              companyId: currentUser.companyId
            });
          });
        } catch (err) {
          logger.error('Override logging failed: ' + err.message);
        }
      }
    }
    
    if (s.managerComment !== undefined) {
      attr.managerComment = s.managerComment;
    }
  });

  if (managerComment !== undefined) {
    evalDoc.managerComment = managerComment;
  }

  // Recalculate totals
  const ratingConfig = evalDoc.templateSnapshot?.ratingConfig || [];
  const { totalScore, rating } = cycleService.calculateTotalAndRating(evalDoc.attributeScores, ratingConfig);
  evalDoc.totalScore = totalScore;
  evalDoc.rating = rating;

  // Auto transition to Completed if all manual fields have values
  const hasUnfinishedManual = evalDoc.attributeScores.some(a => a.scoreType === 'Manual' && a.finalScore === null);
  if (!hasUnfinishedManual && evalDoc.status === 'Draft') {
    evalDoc.status = 'Completed';
  } else if (status && ['Draft', 'Completed'].includes(status)) {
    // Explicit transition
    evalDoc.status = status;
  }

  const updated = await evalDoc.save();

  // Sync cycle counts
  await cycleService.syncCycleSummary(evalDoc.cycleId);

  // Activity Log
  try {
    const logId = await generateCompanyUniqueId(currentUser.companyId, 'activitylogs');
    await activityLogRepository.save({
      id: logId,
      timestamp: new Date().toISOString(),
      actor: currentUser.name || currentUser.email,
      actionType: 'KPI Scores Autosaved',
      fieldChanged: 'attributeScores',
      oldValue: 'Draft',
      newValue: evalDoc.status,
      companyId: currentUser.companyId
    });
  } catch (err) {
    logger.error('Failed to write activity log for score save: ' + err.message);
  }

  if (updated && currentUser.companyId) {
    emitEntitySync(currentUser.companyId, {
      module: 'kpi_employee_evaluations',
      action: 'update',
      data: updated
    });
  }

  return updated;
};

export const refreshAutoScores = async (id, currentUser) => {
  logger.info(`Executing KpiEmployeeEvaluationService::refreshAutoScores: ${id}`);

  const evalDoc = await repository.findOne(id);
  if (!evalDoc) throw new Error('Evaluation not found.');

  if (['Approved', 'Locked'].includes(evalDoc.status)) {
    throw new Error('Cannot refresh scores on Approved or Locked evaluations.');
  }

  // Refresh automatic and non-overridden hybrid scores
  for (const attr of evalDoc.attributeScores) {
    if (attr.scoreType === 'Automatic' || (attr.scoreType === 'Hybrid' && !attr.isOverridden)) {
      const res = await kpiScoringService.calculateAutoScore(
        attr.dataSource,
        evalDoc.employeeId,
        evalDoc.periodStart,
        evalDoc.periodEnd,
        attr.maxScore,
        attr.calculationMetadata
      );
      attr.autoScore = res.score;
      attr.finalScore = res.score;
      attr.originalAutoScore = res.score;
      attr.calculationMetadata = res.metadata;
    }
  }

  const ratingConfig = evalDoc.templateSnapshot?.ratingConfig || [];
  const { totalScore, rating } = cycleService.calculateTotalAndRating(evalDoc.attributeScores, ratingConfig);
  evalDoc.totalScore = totalScore;
  evalDoc.rating = rating;

  const updated = await evalDoc.save();

  // Sync cycle counts
  await cycleService.syncCycleSummary(evalDoc.cycleId);

  if (updated && currentUser.companyId) {
    emitEntitySync(currentUser.companyId, {
      module: 'kpi_employee_evaluations',
      action: 'update',
      data: updated
    });
  }

  return updated;
};

export const submitEvaluation = async (id, currentUser) => {
  logger.info(`Executing KpiEmployeeEvaluationService::submitEvaluation: ${id}`);
  const evalDoc = await repository.findOne(id);
  if (!evalDoc) throw new Error('Evaluation not found.');

  // Validate manual fields have values
  const hasUnfinishedManual = evalDoc.attributeScores.some(a => a.scoreType === 'Manual' && a.finalScore === null);
  if (hasUnfinishedManual) {
    throw new Error('All manual score attributes must be populated before submitting.');
  }

  evalDoc.status = 'Submitted';
  evalDoc.submittedBy = currentUser.id;
  evalDoc.submittedAt = new Date();

  const updated = await evalDoc.save();
  await cycleService.syncCycleSummary(evalDoc.cycleId);

  if (updated && currentUser.companyId) {
    emitEntitySync(currentUser.companyId, {
      module: 'kpi_employee_evaluations',
      action: 'update',
      data: updated
    });
  }

  return updated;
};

export const returnEvaluation = async (id, returnReason, currentUser) => {
  logger.info(`Executing KpiEmployeeEvaluationService::returnEvaluation: ${id}`);
  if (!returnReason || !returnReason.trim()) {
    throw new Error('Return reason is required.');
  }

  const evalDoc = await repository.findOne(id);
  if (!evalDoc) throw new Error('Evaluation not found.');

  evalDoc.status = 'Returned';
  evalDoc.returnedBy = currentUser.id;
  evalDoc.returnedAt = new Date();
  evalDoc.returnReason = returnReason;

  const updated = await evalDoc.save();
  await cycleService.syncCycleSummary(evalDoc.cycleId);

  // Notify evaluator / manager
  try {
    if (evalDoc.evaluatorId) {
      await createNotification(evalDoc.evaluatorId, currentUser.companyId, {
        type: 'task',
        title: 'KPI Evaluation Returned',
        message: `KPI evaluation for ${evalDoc.employeeName} has been returned. Reason: "${returnReason}"`,
        data: { evaluationId: evalDoc.id }
      });
    }
  } catch (err) {
    logger.error('Failed to notify manager on evaluation return: ' + err.message);
  }

  if (updated && currentUser.companyId) {
    emitEntitySync(currentUser.companyId, {
      module: 'kpi_employee_evaluations',
      action: 'update',
      data: updated
    });
  }

  return updated;
};

export const approveEvaluation = async (id, currentUser) => {
  logger.info(`Executing KpiEmployeeEvaluationService::approveEvaluation: ${id}`);
  const evalDoc = await repository.findOne(id);
  if (!evalDoc) throw new Error('Evaluation not found.');

  evalDoc.status = 'Approved';
  evalDoc.approvedBy = currentUser.id;
  evalDoc.approvedAt = new Date();

  const updated = await evalDoc.save();
  await cycleService.syncCycleSummary(evalDoc.cycleId);

  // Notify employee
  try {
    await createNotification(evalDoc.employeeId, currentUser.companyId, {
      type: 'task',
      title: 'KPI Approved',
      message: `Your KPI evaluation for ${evalDoc.periodLabel} has been approved with rating "${evalDoc.rating}".`,
      data: { evaluationId: evalDoc.id }
    });
  } catch (err) {
    logger.error('Failed to notify employee on evaluation approval: ' + err.message);
  }

  if (updated && currentUser.companyId) {
    emitEntitySync(currentUser.companyId, {
      module: 'kpi_employee_evaluations',
      action: 'update',
      data: updated
    });
  }

  return updated;
};

export const lockEvaluation = async (id, currentUser) => {
  logger.info(`Executing KpiEmployeeEvaluationService::lockEvaluation: ${id}`);
  const evalDoc = await repository.findOne(id);
  if (!evalDoc) throw new Error('Evaluation not found.');

  evalDoc.status = 'Locked';
  evalDoc.lockedBy = currentUser.id;
  evalDoc.lockedAt = new Date();

  const updated = await evalDoc.save();
  await cycleService.syncCycleSummary(evalDoc.cycleId);

  if (updated && currentUser.companyId) {
    emitEntitySync(currentUser.companyId, {
      module: 'kpi_employee_evaluations',
      action: 'update',
      data: updated
    });
  }

  return updated;
};

export const reopenEvaluation = async (id, reopenReason, currentUser) => {
  logger.info(`Executing KpiEmployeeEvaluationService::reopenEvaluation: ${id}`);
  if (!reopenReason || !reopenReason.trim()) {
    throw new Error('Reopen reason is required.');
  }

  const evalDoc = await repository.findOne(id);
  if (!evalDoc) throw new Error('Evaluation not found.');

  evalDoc.status = 'Draft';
  evalDoc.reopenedBy = currentUser.id;
  evalDoc.reopenedAt = new Date();
  evalDoc.reopenReason = reopenReason;

  const updated = await evalDoc.save();
  await cycleService.syncCycleSummary(evalDoc.cycleId);

  // Activity Log
  try {
    const logId = await generateCompanyUniqueId(currentUser.companyId, 'activitylogs');
    await activityLogRepository.save({
      id: logId,
      timestamp: new Date().toISOString(),
      actor: currentUser.name || currentUser.email,
      actionType: 'KPI Evaluation Reopened',
      fieldChanged: 'Status',
      oldValue: 'Locked',
      newValue: 'Draft',
      companyId: currentUser.companyId
    });
  } catch (err) {
    logger.error('Failed to write activity log for reopen: ' + err.message);
  }

  if (updated && currentUser.companyId) {
    emitEntitySync(currentUser.companyId, {
      module: 'kpi_employee_evaluations',
      action: 'update',
      data: updated
    });
  }

  return updated;
};

export default {
  findAllEvaluations,
  findEvaluationById,
  updateScoresAndComments,
  refreshAutoScores,
  submitEvaluation,
  returnEvaluation,
  approveEvaluation,
  lockEvaluation,
  reopenEvaluation
};
