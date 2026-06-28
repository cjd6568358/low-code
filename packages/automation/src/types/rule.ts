/**
 * 自动化引擎 — 规则类型定义
 *
 * 定义自动化规则的完整结构，包括限流和生效时间配置。
 */

import type { AutomationTrigger } from './trigger';
import type { AutomationCondition } from './condition';
import type { AutomationAction } from './action';

/** 规则状态 */
export type AutomationRuleStatus = 'enabled' | 'disabled' | 'draft';

/**
 * 时间范围
 *
 * 描述一周中的生效时段。
 */
export interface TimeRange {
  /** 星期几（0=周日, 1=周一 ... 6=周六） */
  daysOfWeek: number[];
  /** 开始时间（HH:mm） */
  startTime: string;
  /** 结束时间（HH:mm） */
  endTime: string;
}

/**
 * 限流配置
 *
 * 控制规则的触发频率，防止过度执行。
 */
export interface ThrottleConfig {
  /** 同一规则的最小触发间隔（秒） */
  cooldownSeconds: number;
  /** 每日最大触发次数 */
  maxDailyTriggers?: number;
}

/**
 * 生效时间配置
 *
 * 控制规则在什么时间范围内生效。
 */
export interface EffectiveTimeConfig {
  /** 生效开始时间（ISO 8601） */
  start?: string;
  /** 生效结束时间（ISO 8601） */
  end?: string;
  /** 生效时段（如仅工作时间触发） */
  timeRanges?: TimeRange[];
}

/**
 * 自动化规则
 *
 * 完整的自动化规则定义，包含触发器、条件、动作和执行控制。
 */
export interface AutomationRule {
  /** 规则 ID */
  id: string;

  /** 租户 ID */
  tenantId: string;

  /** 应用 ID */
  appId: string;

  /** 规则名称 */
  name: string;

  /** 规则描述 */
  description?: string;

  /** 规则状态 */
  status: AutomationRuleStatus;

  /** 触发器 */
  trigger: AutomationTrigger;

  /** 条件（可选，为空则始终执行） */
  condition?: AutomationCondition;

  /** 动作列表（按顺序执行） */
  actions: AutomationAction[];

  /** 执行限制 */
  throttle?: ThrottleConfig;

  /** 生效时间范围 */
  effectiveTime?: EffectiveTimeConfig;

  /** 创建人 ID */
  createdBy: string;

  /** 创建时间（ISO 8601） */
  createdAt: string;

  /** 更新人 ID */
  updatedBy: string;

  /** 更新时间（ISO 8601） */
  updatedAt: string;
}
