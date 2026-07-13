/**
 * 自动化引擎 — 触发器类型定义
 *
 * 定义 2 种触发器类型及其配置结构。
 */

/** 触发器类型 */
export type TriggerType =
  | 'data_change'
  | 'schedule';

/** 数据变更操作类型 */
export type DataChangeOperation = 'create' | 'update' | 'delete';

/** 数据变更触发器配置 */
export interface DataChangeTriggerConfig {
  /** 监听的实体编码 */
  entityCode: string;
  /** 监听的操作类型 */
  operations: DataChangeOperation[];
  /** 仅监听指定字段变更（为空则监听全部） */
  watchFields?: string[];
}

/** 定时触发器配置 */
export interface ScheduleTriggerConfig {
  /** Cron 表达式 */
  cron: string;
  /** 时区（默认租户时区） */
  timezone?: string;
  /** 生效开始时间（ISO 8601） */
  startDate?: string;
  /** 生效结束时间（ISO 8601） */
  endDate?: string;
}

/**
 * 自动化触发器配置
 *
 * 描述规则的触发条件，支持 2 种触发器类型。
 */
export interface AutomationTrigger {
  /** 触发器类型 */
  type: TriggerType;

  /** 数据变更触发器配置 */
  dataChange?: DataChangeTriggerConfig;

  /** 定时触发器配置 */
  schedule?: ScheduleTriggerConfig;
}

/**
 * 平台事件
 *
 * 自动化引擎接收的事件对象结构。
 */
export interface PlatformEvent {
  /** 事件类型（如 "entity.created", "workflow.approved"） */
  type: string;
  /** 事件来源 */
  source: string;
  /** 事件数据 */
  data: Record<string, unknown>;
  /** 事件时间戳（ISO 8601） */
  timestamp: string;
  /** 租户 ID */
  tenantId: string;
  /** 应用 ID */
  appId?: string;
}
