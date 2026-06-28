/**
 * 自动化引擎 — 动作类型定义
 *
 * 定义 5 种动作类型及其配置结构。
 */

import type { AutomationCondition } from './condition';

/** 动作类型 */
export type ActionType =
  | 'trigger_workflow'
  | 'send_notification'
  | 'data_operation'
  | 'api_call'
  | 'webhook';

/** 通知渠道 */
export type NotificationChannel = 'site' | 'email' | 'sms' | 'wecom' | 'dingtalk' | 'feishu';

/** 通知优先级 */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

/** 数据操作类型 */
export type DataOperationType = 'create' | 'update' | 'delete';

/** HTTP 方法 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** 认证类型 */
export type AuthType = 'bearer' | 'basic' | 'api_key';

/** 动作执行状态 */
export type ActionExecutionStatus = 'success' | 'failed' | 'skipped' | 'retrying';

/** 通知接收人类型 */
export type RecipientType = 'user' | 'role' | 'department' | 'variable';

/**
 * 通知接收人
 */
export interface NotificationRecipient {
  /** 接收人类型 */
  type: RecipientType;
  /** 接收人值（用户ID / 角色名 / 部门ID / 变量路径） */
  value: string;
}

/**
 * 重试策略
 */
export interface RetryPolicy {
  /** 最大重试次数 */
  maxRetries: number;
  /** 退避时间数组（毫秒），每次重试的等待时间 */
  backoffMs: number[];
}

/**
 * 触发流程动作配置
 */
export interface TriggerWorkflowConfig {
  /** 流程定义 ID */
  workflowId: string;
  /** 流程变量（支持 {{event.data.xxx}} 插值） */
  variables?: Record<string, unknown>;
  /** 发起人（默认系统用户） */
  initiator?: string;
}

/**
 * 发送通知动作配置
 */
export interface SendNotificationConfig {
  /** 消息模板 ID */
  templateId?: string;
  /** 通知渠道 */
  channels: NotificationChannel[];
  /** 接收人列表 */
  recipients: NotificationRecipient[];
  /** 自定义标题（不使用模板时） */
  title?: string;
  /** 自定义内容（不使用模板时） */
  content?: string;
  /** 通知优先级 */
  priority?: NotificationPriority;
  /** 模板变量 */
  variables?: Record<string, unknown>;
}

/**
 * 数据操作动作配置
 */
export interface DataOperationConfig {
  /** 目标实体编码 */
  entityCode: string;
  /** 操作类型 */
  operation: DataOperationType;
  /** 操作数据（支持变量插值） */
  data?: Record<string, unknown>;
  /** 更新/删除时的过滤条件 */
  filter?: Record<string, unknown>;
}

/**
 * API 调用认证配置
 */
export interface ApiAuthConfig {
  /** 认证类型 */
  type: AuthType;
  /** 认证配置 */
  config: Record<string, string>;
}

/**
 * API 调用动作配置
 */
export interface ApiCallConfig {
  /** HTTP 方法 */
  method: HttpMethod;
  /** 请求 URL（支持变量插值） */
  url: string;
  /** 请求头 */
  headers?: Record<string, string>;
  /** 请求体（支持变量插值） */
  body?: Record<string, unknown>;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 认证配置 */
  auth?: ApiAuthConfig;
}

/**
 * Webhook 动作配置
 */
export interface WebhookConfig {
  /** 已配置的 Webhook ID */
  webhookId: string;
  /** 自定义载荷（支持变量插值） */
  payload?: Record<string, unknown>;
}

/**
 * 自动化动作配置
 *
 * 描述规则执行时的一个动作步骤。
 */
export interface AutomationAction {
  /** 动作类型 */
  type: ActionType;

  /** 动作名称（用于日志展示） */
  name: string;

  /** 是否异步执行（默认 false） */
  async?: boolean;

  /** 失败重试策略 */
  retryPolicy?: RetryPolicy;

  /** 条件执行 — 动作级别条件（可选，满足时才执行此动作） */
  condition?: AutomationCondition;

  /** 触发流程配置 */
  triggerWorkflow?: TriggerWorkflowConfig;

  /** 发送通知配置 */
  sendNotification?: SendNotificationConfig;

  /** 数据操作配置 */
  dataOperation?: DataOperationConfig;

  /** API 调用配置 */
  apiCall?: ApiCallConfig;

  /** Webhook 配置 */
  webhook?: WebhookConfig;
}

/**
 * 动作执行结果
 *
 * 记录单个动作的执行状态和结果。
 */
export interface ActionResult {
  /** 动作类型 */
  actionType: ActionType;

  /** 动作名称 */
  actionName: string;

  /** 执行状态 */
  status: ActionExecutionStatus;

  /** 执行结果 */
  result?: unknown;

  /** 错误信息 */
  error?: string;

  /** 开始时间（ISO 8601） */
  startedAt: string;

  /** 结束时间（ISO 8601） */
  finishedAt: string;

  /** 执行耗时（毫秒） */
  durationMs: number;

  /** 重试次数 */
  retryCount: number;
}
