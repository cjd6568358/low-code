/**
 * 执行日志记录器
 *
 * 负责将自动化规则的执行结果记录到数据库。
 */

import type {
  AutomationExecutionLog,
  ExecutionEventInfo,
  ExecutionLogStatus,
} from '../types/execution';
import type { ConditionEvaluationResult } from '../types/condition';
import type { ActionResult } from '../types/action';
import type { DatabaseAdapter } from '../types/engine';

/**
 * 执行日志记录器
 *
 * 将规则执行的完整过程记录到 automation_execution_logs 表。
 */
export class ExecutionLogger {
  private readonly db: DatabaseAdapter;

  constructor(db: DatabaseAdapter) {
    this.db = db;
  }

  /**
   * 记录执行日志
   *
   * @param params - 日志参数
   * @returns 创建的日志记录
   */
  async log(params: {
    ruleId: string;
    ruleName: string;
    tenantId: string;
    event: ExecutionEventInfo;
    conditionResult: ConditionEvaluationResult;
    actionResults: ActionResult[];
    status: ExecutionLogStatus;
    totalDurationMs: number;
  }): Promise<AutomationExecutionLog> {
    const id = this.generateId();
    const now = new Date().toISOString();

    const log: AutomationExecutionLog = {
      id,
      tenantId: params.tenantId,
      ruleId: params.ruleId,
      ruleName: params.ruleName,
      event: params.event,
      conditionResult: params.conditionResult,
      actionResults: params.actionResults,
      status: params.status,
      totalDurationMs: params.totalDurationMs,
      createdAt: now,
    };

    await this.db.run(
      `INSERT INTO automation_execution_logs (
        id, rule_id, rule_name, event_type, event_source,
        event_data, condition_result, action_results,
        status, total_duration_ms, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        log.id,
        log.ruleId,
        log.ruleName,
        log.event.type,
        log.event.source,
        JSON.stringify(log.event.data),
        JSON.stringify(log.conditionResult),
        JSON.stringify(log.actionResults),
        log.status,
        log.totalDurationMs,
        log.createdAt,
      ]
    );

    return log;
  }

  /**
   * 查询规则的执行日志
   *
   * @param ruleId - 规则 ID
   * @param options - 查询选项
   * @returns 日志列表
   */
  async getByRuleId(
    ruleId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<AutomationExecutionLog[]> {
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    const rows = await this.db.all<{
      id: string;
      rule_id: string;
      rule_name: string;
      event_type: string;
      event_source: string;
      event_data: string;
      condition_result: string;
      action_results: string;
      status: string;
      total_duration_ms: number;
      created_at: string;
    }>(
      `SELECT * FROM automation_execution_logs
       WHERE rule_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [ruleId, limit, offset]
    );

    return rows.map(row => this.mapRowToLog(row));
  }

  /**
   * 根据 ID 获取日志详情
   *
   * @param logId - 日志 ID
   * @returns 日志记录
   */
  async getById(logId: string): Promise<AutomationExecutionLog | undefined> {
    const row = await this.db.get<{
      id: string;
      rule_id: string;
      rule_name: string;
      event_type: string;
      event_source: string;
      event_data: string;
      condition_result: string;
      action_results: string;
      status: string;
      total_duration_ms: number;
      created_at: string;
    }>(
      'SELECT * FROM automation_execution_logs WHERE id = ?',
      [logId]
    );

    return row ? this.mapRowToLog(row) : undefined;
  }

  /**
   * 获取规则最近一次执行时间
   *
   * @param ruleId - 规则 ID
   * @returns 最近执行时间（ISO 8601）
   */
  async getLastExecutionTime(ruleId: string): Promise<string | undefined> {
    const row = await this.db.get<{ created_at: string }>(
      `SELECT created_at FROM automation_execution_logs
       WHERE rule_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [ruleId]
    );

    return row?.created_at;
  }

  /**
   * 获取规则今日执行次数
   *
   * @param ruleId - 规则 ID
   * @returns 执行次数
   */
  async getTodayExecutionCount(ruleId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    const row = await this.db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM automation_execution_logs
       WHERE rule_id = ? AND created_at >= ?`,
      [ruleId, todayStr]
    );

    return row?.count || 0;
  }

  /**
   * 将数据库行映射为日志对象
   */
  private mapRowToLog(row: {
    id: string;
    rule_id: string;
    rule_name: string;
    event_type: string;
    event_source: string;
    event_data: string;
    condition_result: string;
    action_results: string;
    status: string;
    total_duration_ms: number;
    created_at: string;
  }): AutomationExecutionLog {
    return {
      id: row.id,
      tenantId: '', // 从上下文获取
      ruleId: row.rule_id,
      ruleName: row.rule_name,
      event: {
        type: row.event_type,
        source: row.event_source,
        data: JSON.parse(row.event_data),
        timestamp: row.created_at,
      },
      conditionResult: JSON.parse(row.condition_result),
      actionResults: JSON.parse(row.action_results),
      status: row.status as ExecutionLogStatus,
      totalDurationMs: row.total_duration_ms,
      createdAt: row.created_at,
    };
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `log_${result}`;
  }
}
