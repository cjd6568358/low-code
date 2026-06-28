/**
 * 自动化引擎 — 引擎配置和依赖接口定义
 *
 * 定义引擎运行所需的配置和外部服务接口。
 */

import type { AutomationRule } from './rule';
import type { AutomationExecutionLog, ExecutionEventInfo } from './execution';
import type { PlatformEvent } from './trigger';

/**
 * 数据库适配器接口
 *
 * 抽象数据库操作，便于测试和替换实现。
 */
export interface DatabaseAdapter {
  /** 执行 SQL */
  run(sql: string, params?: unknown[]): Promise<{ changes: number; lastID: number }>;
  /** 查询单条 */
  get<T>(sql: string, params?: unknown[]): Promise<T | undefined>;
  /** 查询多条 */
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
  /** 开始事务 */
  beginTransaction(): Promise<void>;
  /** 提交事务 */
  commit(): Promise<void>;
  /** 回滚事务 */
  rollback(): Promise<void>;
}

/**
 * 事件总线接口
 *
 * 支持事件的发布和订阅。
 */
export interface EventBus {
  /** 订阅事件 */
  on(eventType: string, handler: (event: PlatformEvent) => void | Promise<void>): void;
  /** 取消订阅 */
  off(eventType: string, handler: (event: PlatformEvent) => void | Promise<void>): void;
  /** 发布事件 */
  emit(event: PlatformEvent): void;
}

/**
 * 流程引擎服务接口
 *
 * 用于触发流程动作调用流程引擎。
 */
export interface WorkflowService {
  /** 启动流程实例 */
  startWorkflow(params: {
    workflowId: string;
    variables?: Record<string, unknown>;
    startedBy: string;
    startedByName?: string;
    sourceTable?: string;
    sourceId?: string;
  }): Promise<{ instanceId: string }>;
}

/**
 * 通知服务接口
 *
 * 用于发送通知动作。
 */
export interface NotifyService {
  /** 发送通知 */
  send(params: {
    channels: string[];
    recipients: Array<{ type: string; value: string }>;
    title?: string;
    content?: string;
    priority?: string;
    variables?: Record<string, unknown>;
    templateId?: string;
  }): Promise<{ messageIds: string[] }>;
}

/**
 * 数据服务接口
 *
 * 用于数据操作动作。
 */
export interface DataService {
  /** 创建记录 */
  create(entityCode: string, data: Record<string, unknown>): Promise<{ id: string }>;
  /** 更新记录 */
  update(entityCode: string, filter: Record<string, unknown>, data: Record<string, unknown>): Promise<{ changes: number }>;
  /** 删除记录 */
  delete(entityCode: string, filter: Record<string, unknown>): Promise<{ changes: number }>;
  /** 查询记录 */
  query(entityCode: string, filter: Record<string, unknown>): Promise<Record<string, unknown>[]>;
}

/**
 * HTTP 客户端接口
 *
 * 用于 API 调用动作。
 */
export interface HttpClient {
  /** 发送 HTTP 请求 */
  request(params: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
    timeout?: number;
  }): Promise<{
    status: number;
    statusText: string;
    data: unknown;
    headers: Record<string, string>;
  }>;
}

/**
 * Webhook 服务接口
 *
 * 用于 Webhook 动作。
 */
export interface WebhookService {
  /** 推送 Webhook */
  push(webhookId: string, payload: Record<string, unknown>): Promise<{ deliveryId: string }>;
}

/**
 * 规则存储接口
 *
 * 抽象规则的持久化操作。
 */
export interface RuleStore {
  /** 根据 ID 获取规则 */
  getById(ruleId: string): Promise<AutomationRule | undefined>;
  /** 获取应用下所有启用的规则 */
  getEnabledByApp(appId: string): Promise<AutomationRule[]>;
  /** 根据触发器类型获取启用的规则 */
  getEnabledByTriggerType(appId: string, triggerType: string): Promise<AutomationRule[]>;
  /** 保存规则 */
  save(rule: AutomationRule): Promise<void>;
  /** 删除规则 */
  delete(ruleId: string): Promise<void>;
}

/**
 * 日志存储接口
 *
 * 抽象执行日志的持久化操作。
 */
export interface LogStore {
  /** 保存执行日志 */
  save(log: AutomationExecutionLog): Promise<void>;
  /** 查询规则的执行日志 */
  getByRuleId(ruleId: string, options?: { limit?: number; offset?: number }): Promise<AutomationExecutionLog[]>;
  /** 根据 ID 获取日志详情 */
  getById(logId: string): Promise<AutomationExecutionLog | undefined>;
  /** 获取规则最近一次执行时间 */
  getLastExecutionTime(ruleId: string): Promise<string | undefined>;
  /** 获取规则今日执行次数 */
  getTodayExecutionCount(ruleId: string): Promise<number>;
}

/**
 * 自动化引擎配置
 *
 * 创建 AutomationEngine 实例时传入的配置。
 */
export interface AutomationEngineConfig {
  /** 数据库适配器 */
  db: DatabaseAdapter;
  /** 事件总线 */
  eventBus?: EventBus;
  /** 流程引擎服务 */
  workflowService?: WorkflowService;
  /** 通知服务 */
  notifyService?: NotifyService;
  /** 数据服务 */
  dataService?: DataService;
  /** HTTP 客户端 */
  httpClient?: HttpClient;
  /** Webhook 服务 */
  webhookService?: WebhookService;
  /** 规则存储（可选，默认使用数据库实现） */
  ruleStore?: RuleStore;
  /** 日志存储（可选，默认使用数据库实现） */
  logStore?: LogStore;
}
