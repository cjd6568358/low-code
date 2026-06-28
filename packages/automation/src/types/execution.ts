/**
 * 自动化引擎 — 执行日志类型定义
 *
 * 定义执行日志的完整结构，记录每次规则触发的详细信息。
 */

import type { ConditionEvaluationResult } from './condition';
import type { ActionResult } from './action';

/** 执行日志状态 */
export type ExecutionLogStatus = 'success' | 'partial_success' | 'failed';

/**
 * 触发事件信息
 *
 * 记录触发规则执行的事件详情。
 */
export interface ExecutionEventInfo {
  /** 事件类型 */
  type: string;
  /** 事件来源 */
  source: string;
  /** 事件数据 */
  data: Record<string, unknown>;
  /** 事件时间戳（ISO 8601） */
  timestamp: string;
}

/**
 * 自动化执行日志
 *
 * 记录一次完整的规则执行过程，包括事件、条件求值、动作执行结果。
 */
export interface AutomationExecutionLog {
  /** 日志 ID */
  id: string;

  /** 租户 ID */
  tenantId: string;

  /** 规则 ID */
  ruleId: string;

  /** 规则名称 */
  ruleName: string;

  /** 触发事件信息 */
  event: ExecutionEventInfo;

  /** 条件求值结果 */
  conditionResult: ConditionEvaluationResult;

  /** 动作执行结果列表 */
  actionResults: ActionResult[];

  /** 整体状态 */
  status: ExecutionLogStatus;

  /** 执行耗时（毫秒） */
  totalDurationMs: number;

  /** 创建时间（ISO 8601） */
  createdAt: string;
}

/**
 * 执行上下文
 *
 * 规则执行时的内部上下文，不持久化。
 */
export interface ExecutionContext {
  /** 规则 ID */
  ruleId: string;
  /** 规则名称 */
  ruleName: string;
  /** 租户 ID */
  tenantId: string;
  /** 应用 ID */
  appId: string;
  /** 触发事件 */
  event: ExecutionEventInfo;
  /** 变量上下文（用于变量插值） */
  variables: Record<string, unknown>;
}
