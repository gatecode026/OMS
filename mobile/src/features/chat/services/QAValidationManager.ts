/**
 * @file QAValidationManager.ts
 * @description Runtime self-validation facade for DEV-mode smoke testing.
 *              Executes assertions against all critical chat sub-systems and
 *              returns a pass/fail certification report.
 */

import { PerformanceCacheManager } from './PerformanceCacheManager';
import { ConflictResolver } from './ConflictResolver';
import { SecurityManager } from './SecurityManager';
import { ObservabilityManager } from './ObservabilityManager';
import { PerformanceLogger } from './PerformanceLogger';

export interface QAValidationResult {
  module: string;
  passed: boolean;
  detail: string;
}

export interface QACertificationReport {
  timestamp: string;
  overallPassed: boolean;
  results: QAValidationResult[];
  totalPassed: number;
  totalFailed: number;
}

export class QAValidationManagerClass {
  /**
   * Run all smoke-test validations and return certification report
   */
  runValidation(): QACertificationReport {
    const results: QAValidationResult[] = [
      this.validatePerformanceCacheManager(),
      this.validateConflictResolver(),
      this.validateSecurityManager(),
      this.validateObservabilityManager(),
      this.validatePerformanceLogger(),
    ];

    const totalPassed = results.filter((r) => r.passed).length;
    const totalFailed = results.filter((r) => !r.passed).length;

    const report: QACertificationReport = {
      timestamp: new Date().toISOString(),
      overallPassed: totalFailed === 0,
      results,
      totalPassed,
      totalFailed,
    };

    if (report.overallPassed) {
      console.log(`[QAValidationManager] ✅ CERTIFIED — All ${totalPassed} modules passed.`);
    } else {
      console.error(`[QAValidationManager] ❌ ${totalFailed} module(s) FAILED. Review results.`);
    }

    return report;
  }

  private validatePerformanceCacheManager(): QAValidationResult {
    try {
      PerformanceCacheManager.clear();
      PerformanceCacheManager.set('test_key', 'test_value', 60000);
      const value = PerformanceCacheManager.get<string>('test_key');
      PerformanceCacheManager.clear();
      if (value !== 'test_value') throw new Error('Cache get/set mismatch');
      return { module: 'PerformanceCacheManager', passed: true, detail: 'LRU get/set/clear OK' };
    } catch (err: any) {
      return { module: 'PerformanceCacheManager', passed: false, detail: err.message };
    }
  }

  private validateConflictResolver(): QAValidationResult {
    try {
      const local = { id: '1', conversationId: 'c1', content: 'local', createdAt: '2024-01-01T10:00:00Z', updatedAt: '2024-01-01T10:00:00Z', isDeleted: false } as any;
      const server = { ...local, content: 'server', updatedAt: '2024-01-01T11:00:00Z' };
      const resolved = ConflictResolver.resolveMessageConflict(local, server);
      if (resolved.content !== 'server') throw new Error('Server-wins policy failed');
      return { module: 'ConflictResolver', passed: true, detail: 'Server-wins conflict resolution OK' };
    } catch (err: any) {
      return { module: 'ConflictResolver', passed: false, detail: err.message };
    }
  }

  private validateSecurityManager(): QAValidationResult {
    try {
      let threw = false;
      try {
        SecurityManager.validateTenantIsolation('tenant_A', 'tenant_B');
      } catch {
        threw = true;
      }
      if (!threw) throw new Error('Cross-tenant access was not blocked');
      const hasDeleteAny = SecurityManager.validateRBAC('Company Admin', 'delete_any');
      if (!hasDeleteAny) throw new Error('Company Admin should have delete_any');
      const employeeBlocked = SecurityManager.validateRBAC('Employee', 'delete_any');
      if (employeeBlocked) throw new Error('Employee should not have delete_any');
      return { module: 'SecurityManager', passed: true, detail: 'Tenant isolation + RBAC OK' };
    } catch (err: any) {
      return { module: 'SecurityManager', passed: false, detail: err.message };
    }
  }

  private validateObservabilityManager(): QAValidationResult {
    try {
      ObservabilityManager.reset();
      ObservabilityManager.record('api_call_test', 150);
      ObservabilityManager.recordCacheHit();
      ObservabilityManager.recordCacheHit();
      ObservabilityManager.recordCacheMiss();
      const summary = ObservabilityManager.getMetricsSummary();
      if (summary.recordedMetricsCount !== 1) throw new Error('Metric count mismatch');
      if (Math.abs(summary.cacheHitRate - 2 / 3) > 0.01) throw new Error('Cache hit rate mismatch');
      return { module: 'ObservabilityManager', passed: true, detail: 'Metrics + cache hit rate OK' };
    } catch (err: any) {
      return { module: 'ObservabilityManager', passed: false, detail: err.message };
    }
  }

  private validatePerformanceLogger(): QAValidationResult {
    try {
      PerformanceLogger.startTrace('qa_test_trace');
      const duration = PerformanceLogger.endTrace('qa_test_trace');
      if (duration < 0) throw new Error('Trace duration was negative');
      const missingTrace = PerformanceLogger.endTrace('non_existent_trace');
      if (missingTrace !== -1) throw new Error('Missing trace should return -1');
      return { module: 'PerformanceLogger', passed: true, detail: `Trace timing OK (${duration}ms)` };
    } catch (err: any) {
      return { module: 'PerformanceLogger', passed: false, detail: err.message };
    }
  }
}

export const QAValidationManager = new QAValidationManagerClass();
export default QAValidationManager;
