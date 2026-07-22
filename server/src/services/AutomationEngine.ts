/**
 * 自动化引擎
 *
 * 负责执行自动化规则，支持：
 * - 定时触发（Cron 调度）
 * - 触发流程（调用工作流引擎）
 * - 执行表达式（使用公共表达式引擎）
 *
 * 执行流程：
 * 1. 读取启用的自动化规则
 * 2. 根据触发器类型注册到调度器
 * 3. 触发时执行条件检查（复用 @low-code/automation 的 ConditionEvaluator）
 * 4. 条件满足时执行动作
 * 5. 记录执行日志
 */

import path from 'path';
import { watch, type FSWatcher } from 'fs';
import { CronScheduler, validateCronExpression } from './CronScheduler.js';
import { createExpressionEngine, interpolateTemplate, type ExpressionEngine } from '@low-code/shared';
import { TENANTS_DIR } from '../config/index.js';
import { getDbManager } from '../config/db.js';
import { generateHexId } from '@low-code/shared';
import { insertRecord, updateRecord, softDeleteRecord } from '@low-code/data';
import {
  ConditionEvaluator,
  type AutomationCondition,
  type PlatformEvent,
  type ConditionEvaluationResult,
} from '@low-code/automation';
import type {
  AutomationRuleStatus,
  TriggerType,
  ActionType,
  NotificationChannel,
  NotificationPriority,
  DataOperationType,
} from '@low-code/automation';
import { existsAsync, readFile, readdir } from '../utils/fs-utils.js';
import { AutomationLogService, type ExecutionLog } from './AutomationLogService.js';

/** 自动化规则状态 */
type AutomationStatus = AutomationRuleStatus;

/** 自动化规则 */
interface AutomationRule {
  id: string;
  appId: string;
  name: string;
  description?: string;
  status: AutomationStatus;
  trigger: TriggerConfig;
  condition?: ConditionStorage;
  actions: ActionConfig[];
  throttle?: ThrottleConfig;
  effectiveTime?: EffectiveTimeConfig;
  schemaVersion?: number;
  version?: number;
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
}

/** 触发器配置 */
interface TriggerConfig {
  type: TriggerType;
  schedule?: {
    cron: string;
    timezone?: string;
    startDate?: string;
    endDate?: string;
  };
  dataChange?: {
    entityCode: string;
    operations: string[];
    watchFields?: string[];
  };
}

/**
 * 条件配置（JSON 存储格式）
 *
 * JSON 文件中的平铺格式，运行时通过 convertCondition 转换为 AutomationCondition。
 */
interface ConditionStorage {
  logic: 'and' | 'or';
  conditions: Array<{
    field: string;
    operator: string;
    value: unknown;
  }>;
}

/** 操作符别名 → 标准运算符映射 */
const OPERATOR_ALIASES: Record<string, string> = {
  '=': 'eq',
  '==': 'eq',
  '!=': 'ne',
  '>': 'gt',
  '>=': 'gte',
  '<': 'lt',
  '<=': 'lte',
};

/**
 * 将存储格式的条件转换为 @low-code/automation 的 AutomationCondition
 */
function convertCondition(storage: ConditionStorage): AutomationCondition {
  return {
    logic: storage.logic,
    rules: storage.conditions.map(c => ({
      field: c.field,
      operator: (OPERATOR_ALIASES[c.operator] ?? c.operator) as AutomationCondition['rules'][0]['operator'],
      value: c.value,
    })),
  };
}

/** 动作配置 */
interface ActionConfig {
  type: ActionType;
  name: string;
  async?: boolean;
  retryPolicy?: {
    maxRetries: number;
    backoffMs: number[];
  };
  triggerWorkflow?: {
    workflowId: string;
    variables?: Record<string, unknown>;
    initiator?: string;
  };
  executeExpression?: {
    script: string;
    context?: Record<string, unknown>;
  };
  sendNotification?: {
    templateId?: string;
    channels: NotificationChannel[];
    recipients: Array<{ type: string; value: string }>;
    title?: string;
    content?: string;
    priority?: NotificationPriority;
    variables?: Record<string, unknown>;
  };
  dataOperation?: {
    entityCode: string;
    operation: DataOperationType;
    data?: Record<string, unknown>;
    filter?: Record<string, unknown>;
  };
}

/** 限流配置 */
interface ThrottleConfig {
  enabled: boolean;
  maxExecutions: number;
  timeWindowMs: number;
}

/** 生效时间配置 */
interface EffectiveTimeConfig {
  startTime?: string;
  endTime?: string;
  timezone?: string;
}

/** 执行上下文 */
interface ExecutionContext {
  /** 租户 ID */
  tenantId: string;
  /** 应用 ID */
  appId: string;
  /** 规则 ID */
  ruleId: string;
  /** 触发事件数据 */
  eventData?: Record<string, unknown>;
  /** 执行时间 */
  executedAt: Date;
}

/** 执行结果 */
interface ExecutionResult {
  /** 执行 ID */
  executionId: string;
  /** 规则 ID */
  ruleId: string;
  /** 规则名称 */
  ruleName: string;
  /** 事件类型 */
  eventType: string;
  /** 事件来源 */
  eventSource: string;
  /** 事件数据 */
  eventData: Record<string, unknown>;
  /** 条件结果 */
  conditionResult?: ConditionEvaluationResult;
  /** 动作结果 */
  actionResults: Array<{
    actionType: string;
    actionName: string;
    status: 'success' | 'failed' | 'skipped' | 'retrying';
    result?: unknown;
    error?: string;
    startedAt: string;
    finishedAt: string;
    durationMs: number;
    retryCount: number;
  }>;
  /** 执行状态 */
  status: 'success' | 'partial_success' | 'failed';
  /** 总耗时（毫秒） */
  totalDurationMs: number;
  /** 执行时间 */
  createdAt: string;
}

/** 自动化引擎配置 */
export interface AutomationEngineConfig {
  /** 租户 ID */
  tenantId: string;
  /** Cron 调度器 */
  scheduler: CronScheduler;
  /** 表达式引擎 */
  expressionEngine: ExpressionEngine;
  /** 工作流执行器 */
  workflowExecutor?: WorkflowExecutor;
  /** 日志服务 */
  logService?: AutomationLogService;
}

/** 工作流执行器接口 */
export interface WorkflowExecutor {
  /** 启动流程实例 */
  startWorkflow(workflowId: string, variables?: Record<string, unknown>, initiator?: string): Promise<string>;
}

/**
 * 自动化规则缓存
 *
 * 启动时一次性加载所有规则到内存，通过 fs.watch 监听文件变更增量更新，
 * 避免每次事件触发时重复读取磁盘。
 */
class RuleCache {
  /** appId -> 规则列表 */
  private rulesByApp: Map<string, AutomationRule[]> = new Map();
  /** 全量规则快照（供 loadAllRules 使用） */
  private allRules: AutomationRule[] = [];
  /** 文件系统 watcher 列表 */
  private watchers: FSWatcher[] = [];
  /** debounce 定时器（appId -> timer） */
  private pendingReloads: Map<string, ReturnType<typeof setTimeout>> = new Map();
  /** debounce 延迟（毫秒） */
  private static readonly DEBOUNCE_MS = 300;

  constructor(private tenantId: string) {}

  /**
   * 首次加载全部规则并启动文件监听
   */
  async loadAll(): Promise<void> {
    const appsDir = path.join(TENANTS_DIR, this.tenantId, 'apps');

    if (!await existsAsync(appsDir)) {
      return;
    }

    const appDirs = (await readdir(appsDir, { withFileTypes: true }))
      .filter(d => d.isDirectory() && d.name.startsWith('app_'));

    for (const appDir of appDirs) {
      const appId = appDir.name.replace('app_', '');
      await this.reloadApp(appId);
      this.watchApp(appId);
    }

    this.rebuildAllRules();
  }

  /**
   * 获取指定应用的规则（从缓存）
   */
  getByApp(appId: string): AutomationRule[] {
    return this.rulesByApp.get(appId) ?? [];
  }

  /**
   * 获取全部规则（从缓存）
   */
  getAll(): AutomationRule[] {
    return this.allRules;
  }

  /**
   * 重新加载单个应用的规则并更新缓存
   */
  private async reloadApp(appId: string): Promise<void> {
    const automationsDir = path.join(
      TENANTS_DIR, this.tenantId, 'apps', `app_${appId}`, 'automations',
    );

    if (!await existsAsync(automationsDir)) {
      this.rulesByApp.set(appId, []);
      this.rebuildAllRules();
      return;
    }

    const entries = await readdir(automationsDir, { withFileTypes: true });
    const rules: AutomationRule[] = [];

    for (const e of entries) {
      if (e.isFile() && e.name.endsWith('.json')) {
        try {
          const content = await readFile(path.join(automationsDir, e.name), 'utf-8');
          const rule = JSON.parse(content) as AutomationRule;
          if (rule !== null && !rule._deleted) {
            rules.push(rule);
          }
        } catch {
          // 跳过损坏的规则文件
        }
      }
    }

    this.rulesByApp.set(appId, rules);
    this.rebuildAllRules();
  }

  /**
   * 监听单个应用的 automations 目录
   */
  private watchApp(appId: string): void {
    const automationsDir = path.join(
      TENANTS_DIR, this.tenantId, 'apps', `app_${appId}`, 'automations',
    );

    try {
      const watcher = watch(automationsDir, { persistent: false }, (_event, filename) => {
        if (!filename?.endsWith('.json')) return;

        // debounce：批量保存时只重载一次
        const existing = this.pendingReloads.get(appId);
        if (existing) clearTimeout(existing);

        this.pendingReloads.set(appId, setTimeout(() => {
          this.pendingReloads.delete(appId);
          this.reloadApp(appId).catch(err => {
            console.error(`[RuleCache] 重载规则失败 (${appId}):`, err);
          });
        }, RuleCache.DEBOUNCE_MS));
      });

      this.watchers.push(watcher);
    } catch {
      // 目录不存在等情况，静默忽略
    }
  }

  /**
   * 重建全量规则快照
   */
  private rebuildAllRules(): void {
    this.allRules = Array.from(this.rulesByApp.values()).flat();
  }

  /**
   * 清理所有 watcher
   */
  dispose(): void {
    for (const w of this.watchers) {
      w.close();
    }
    this.watchers = [];
    for (const timer of this.pendingReloads.values()) {
      clearTimeout(timer);
    }
    this.pendingReloads.clear();
  }
}

/**
 * 自动化引擎
 */
export class AutomationEngine {
  private config: AutomationEngineConfig;
  private registeredJobs: Map<string, string> = new Map(); // ruleId -> jobId
  private executionLogs: Map<string, ExecutionResult[]> = new Map(); // ruleId -> logs
  private cache: RuleCache | null = null;
  private readonly conditionEvaluator = new ConditionEvaluator();

  constructor(config: AutomationEngineConfig) {
    this.config = config;
  }

  /**
   * 初始化执行引擎
   *
   * 加载所有启用的规则并注册到调度器
   */
  async initialize(): Promise<void> {
    const { tenantId } = this.config;

    // 初始化规则缓存（加载全部规则 + 启动文件监听）
    this.cache = new RuleCache(tenantId);
    await this.cache.loadAll();

    let registeredCount = 0;

    for (const rule of this.cache.getAll()) {
      if (rule.status === 'enabled' && rule.trigger.type === 'schedule') {
        await this.registerScheduledRule(rule);
        registeredCount++;
      }
    }

    console.log(`[AutomationEngine] 初始化完成，已注册 ${registeredCount} 个定时任务`);
  }

  /**
   * 注册定时规则到调度器
   */
  async registerScheduledRule(rule: AutomationRule): Promise<void> {
    const { scheduler } = this.config;
    const schedule = rule.trigger.schedule;

    if (!schedule?.cron) {
      console.warn(`[AutomationEngine] 规则 ${rule.id} 缺少 cron 表达式`);
      return;
    }

    // 校验 cron 表达式
    const validation = validateCronExpression(schedule.cron);
    if (!validation.valid) {
      console.error(`[AutomationEngine] 规则 ${rule.id} cron 表达式无效: ${validation.error}`);
      return;
    }

    // 检查生效时间
    if (!this.isRuleEffective(rule)) {
      console.log(`[AutomationEngine] 规则 ${rule.id} 不在生效时间内`);
      return;
    }

    // 移除已存在的任务
    const existingJobId = this.registeredJobs.get(rule.id);
    if (existingJobId) {
      scheduler.removeJob(existingJobId);
    }

    // 注册新任务
    const jobId = `automation_${rule.id}`;
    scheduler.addJob({
      id: jobId,
      name: rule.name,
      expression: schedule.cron,
      timezone: schedule.timezone,
      callback: async () => {
        await this.executeRule(rule, {
          tenantId: this.config.tenantId,
          appId: rule.appId,
          ruleId: rule.id,
          eventData: { triggerType: 'schedule', timestamp: new Date().toISOString() },
          executedAt: new Date(),
        });
      },
    });

    this.registeredJobs.set(rule.id, jobId);
    console.log(`[AutomationEngine] 注册定时任务: ${rule.name} (${schedule.cron})`);
  }

  /**
   * 注销规则
   */
  unregisterRule(ruleId: string): void {
    const { scheduler } = this.config;
    const jobId = this.registeredJobs.get(ruleId);

    if (jobId) {
      scheduler.removeJob(jobId);
      this.registeredJobs.delete(ruleId);
      console.log(`[AutomationEngine] 注销任务: ${ruleId}`);
    }
  }

  /**
   * 触发事件
   *
   * @param eventType 事件类型
   * @param eventData 事件数据
   * @param appId 应用 ID
   */
  async triggerEvent(
    eventType: string,
    eventData: Record<string, unknown>,
    appId?: string
  ): Promise<ExecutionResult[]> {
    const { tenantId } = this.config;
    const results: ExecutionResult[] = [];

    // 从缓存获取规则
    const rules = appId
      ? this.cache?.getByApp(appId) ?? []
      : this.cache?.getAll() ?? [];

    const matchedRules = rules.filter(rule => {
      if (rule.status !== 'enabled') return false;
      if (rule.trigger.type === 'schedule') return false; // 定时任务不响应事件触发
      return this.matchesTrigger(rule.trigger, eventType, eventData);
    });

    for (const rule of matchedRules) {
      const context: ExecutionContext = {
        tenantId,
        appId: rule.appId,
        ruleId: rule.id,
        eventData,
        executedAt: new Date(),
      };

      const result = await this.executeRule(rule, context);
      results.push(result);
    }

    return results;
  }

  /**
   * 执行规则
   */
  private async executeRule(rule: AutomationRule, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const executionId = generateHexId();

    console.log(`[AutomationEngine] 执行规则: ${rule.name} (${rule.id})`);

    const result: ExecutionResult = {
      executionId,
      ruleId: rule.id,
      ruleName: rule.name,
      eventType: context.eventData?.triggerType as string || 'unknown',
      eventSource: `${context.appId}`,
      eventData: context.eventData || {},
      actionResults: [],
      status: 'success',
      totalDurationMs: 0,
      createdAt: new Date().toISOString(),
    };

    try {
      // 1. 检查条件（复用 @low-code/automation 的 ConditionEvaluator）
      if (rule.condition) {
        const condition = convertCondition(rule.condition);
        const event = this.buildPlatformEvent(context);
        const conditionResult = this.conditionEvaluator.evaluate(condition, event);
        result.conditionResult = conditionResult;

        if (!conditionResult.matched) {
          console.log(`[AutomationEngine] 条件不满足，跳过执行`);
          result.status = 'success';
          result.totalDurationMs = Date.now() - startTime;
          await this.saveExecutionLog(context.tenantId, result);
          return result;
        }
      }

      // 2. 执行动作
      for (const action of rule.actions) {
        const actionResult = await this.executeAction(action, context);
        result.actionResults.push(actionResult);

        if (actionResult.status === 'failed') {
          result.status = result.actionResults.some(r => r.status === 'success')
            ? 'partial_success'
            : 'failed';
        }
      }
    } catch (error) {
      result.status = 'failed';
      console.error(`[AutomationEngine] 规则执行失败:`, error);
    }

    result.totalDurationMs = Date.now() - startTime;

    // 保存执行日志
    await this.saveExecutionLog(context.tenantId, result);

    return result;
  }

  /**
   * 执行单个动作
   */
  private async executeAction(
    action: ActionConfig,
    context: ExecutionContext
  ): Promise<ExecutionResult['actionResults'][0]> {
    const startTime = Date.now();
    let retryCount = 0;
    const maxRetries = action.retryPolicy?.maxRetries || 0;

    const baseResult = {
      actionType: action.type,
      actionName: action.name,
      startedAt: new Date().toISOString(),
      finishedAt: '',
      durationMs: 0,
      retryCount: 0,
    };

    while (retryCount <= maxRetries) {
      try {
        let result: unknown;

        switch (action.type) {
          case 'trigger_workflow':
            result = await this.executeTriggerWorkflow(action, context);
            break;
          case 'execute_expression':
            result = await this.executeExpression(action, context);
            break;
          case 'send_notification':
            result = await this.executeSendNotification(action, context);
            break;
          case 'data_operation':
            result = await this.executeDataOperation(action, context);
            break;
          default:
            throw new Error(`不支持的动作类型: ${action.type}`);
        }

        return {
          ...baseResult,
          status: 'success',
          result,
          finishedAt: new Date().toISOString(),
          durationMs: Date.now() - startTime,
          retryCount,
        };
      } catch (error) {
        retryCount++;

        if (retryCount > maxRetries) {
          return {
            ...baseResult,
            status: 'failed',
            error: (error as Error).message,
            finishedAt: new Date().toISOString(),
            durationMs: Date.now() - startTime,
            retryCount: retryCount - 1,
          };
        }

        // 等待退避时间
        const backoffMs = action.retryPolicy?.backoffMs?.[retryCount - 1] || 1000;
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }

    // 不应该到达这里
    return {
      ...baseResult,
      status: 'failed',
      error: 'Unknown error',
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      retryCount,
    };
  }

  /**
   * 执行触发流程动作
   */
  private async executeTriggerWorkflow(
    action: ActionConfig,
    context: ExecutionContext
  ): Promise<unknown> {
    const { workflowExecutor } = this.config;
    if (!workflowExecutor) {
      throw new Error('工作流执行器未配置');
    }

    const config = action.triggerWorkflow;
    if (!config?.workflowId) {
      throw new Error('未指定工作流 ID');
    }

    // 处理变量插值
    const variables = config.variables
      ? this.interpolateVariables(config.variables, context)
      : undefined;

    const instanceId = await workflowExecutor.startWorkflow(
      config.workflowId,
      variables,
      config.initiator
    );

    return { workflowInstanceId: instanceId };
  }

  /**
   * 执行表达式动作
   *
   * 复用公共表达式引擎执行自定义表达式。
   */
  private async executeExpression(
    action: ActionConfig,
    context: ExecutionContext
  ): Promise<unknown> {
    const { expressionEngine } = this.config;
    const config = action.executeExpression;

    if (!config?.script) {
      throw new Error('未指定表达式内容');
    }

    // 构建执行上下文
    const scriptContext: Record<string, unknown> = {
      $event: context.eventData,
      $rule: {
        id: context.ruleId,
        appId: context.appId,
      },
      $tenant: {
        id: context.tenantId,
      },
      $now: new Date().toISOString(),
      ...(config.context || {}),
    };

    // 使用公共表达式引擎执行
    const result = await expressionEngine.evaluate(config.script, scriptContext);

    return result;
  }

  /**
   * 执行发送通知动作
   *
   * 将消息写入租户 SQLite 的 messages 表。
   */
  private async executeSendNotification(
    action: ActionConfig,
    context: ExecutionContext
  ): Promise<unknown> {
    const config = action.sendNotification;
    if (!config) {
      throw new Error('通知配置缺失');
    }

    // 处理模板插值
    const title = config.title
      ? interpolateTemplate(config.title, context.eventData || {})
      : '自动化通知';
    const content = config.content
      ? interpolateTemplate(config.content, context.eventData || {})
      : '';
    const priority = config.priority || 'normal';
    const messageIds: string[] = [];

    const manager = getDbManager();
    const db = manager.getTenantDb(context.tenantId);

    // 每个 recipient × channel 组合生成一条消息
    for (const recipient of config.recipients) {
      for (const channel of config.channels) {
        const result = db.prepare(
          `INSERT INTO messages (recipient_id, category, title, content, channel, status, priority, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          recipient.value,
          'automation',
          title,
          content,
          channel,
          'sent',
          priority,
          new Date().toISOString(),
        );
        messageIds.push(String(result.lastInsertRowid));
      }
    }

    return { messageIds, channels: config.channels, recipientCount: config.recipients.length };
  }

  /**
   * 执行数据操作动作
   *
   * 调用 @low-code/data 的 CRUD 函数操作实体记录。
   */
  private async executeDataOperation(
    action: ActionConfig,
    context: ExecutionContext
  ): Promise<unknown> {
    const config = action.dataOperation;
    if (!config) {
      throw new Error('数据操作配置缺失');
    }

    // 处理变量插值
    const data = config.data
      ? this.interpolateVariables(config.data, context)
      : undefined;
    const filter = config.filter
      ? this.interpolateVariables(config.filter, context)
      : undefined;

    const manager = getDbManager();
    const db = manager.getTenantDb(context.tenantId);
    const tableId = config.entityCode;

    switch (config.operation) {
      case 'create': {
        if (!data) throw new Error('创建操作缺少 data');
        const result = insertRecord(db, tableId, data);
        return { operation: 'create', entityCode: config.entityCode, id: result.id };
      }
      case 'update': {
        if (!data) throw new Error('更新操作缺少 data');
        if (!filter?.id) throw new Error('更新操作缺少 filter.id');
        const changes = updateRecord(db, tableId, filter.id as string, data);
        return { operation: 'update', entityCode: config.entityCode, changes };
      }
      case 'delete': {
        if (!filter?.id) throw new Error('删除操作缺少 filter.id');
        softDeleteRecord(db, tableId, filter.id as string);
        return { operation: 'delete', entityCode: config.entityCode, changes: 1 };
      }
      default:
        throw new Error(`不支持的数据操作: ${config.operation}`);
    }
  }

  /**
   * 检查触发器是否匹配事件
   */
  private matchesTrigger(
    trigger: TriggerConfig,
    eventType: string,
    eventData: Record<string, unknown>
  ): boolean {
    switch (trigger.type) {
      case 'data_change':
        return this.matchesDataChangeTrigger(trigger.dataChange!, eventType, eventData);
      default:
        return false;
    }
  }

  /**
   * 匹配数据变更触发器
   */
  private matchesDataChangeTrigger(
    config: NonNullable<TriggerConfig['dataChange']>,
    eventType: string,
    eventData: Record<string, unknown>
  ): boolean {
    if (!eventType.startsWith('entity.')) return false;

    const operation = eventType.split('.')[1]; // entity.create -> create
    if (!config.operations.includes(operation)) return false;

    if (config.entityCode && eventData.entityCode !== config.entityCode) return false;

    return true;
  }

  /**
   * 构建 PlatformEvent 供 ConditionEvaluator 使用
   */
  private buildPlatformEvent(context: ExecutionContext): PlatformEvent {
    return {
      type: context.eventData?.triggerType as string || 'unknown',
      source: context.appId,
      data: context.eventData || {},
      timestamp: context.executedAt.toISOString(),
      tenantId: context.tenantId,
      appId: context.appId,
    };
  }

  /**
   * 检查规则是否在生效时间内
   */
  private isRuleEffective(rule: AutomationRule): boolean {
    const effectiveTime = rule.effectiveTime;
    if (!effectiveTime) return true;

    const now = new Date();

    if (effectiveTime.startTime) {
      const startTime = new Date(effectiveTime.startTime);
      if (now < startTime) return false;
    }

    if (effectiveTime.endTime) {
      const endTime = new Date(effectiveTime.endTime);
      if (now > endTime) return false;
    }

    return true;
  }

  /**
   * 插值变量
   */
  private interpolateVariables(
    obj: Record<string, unknown>,
    context: ExecutionContext
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        result[key] = interpolateTemplate(value, context.eventData || {});
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.interpolateVariables(value as Record<string, unknown>, context);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * 保存执行日志
   */
  private async saveExecutionLog(tenantId: string, result: ExecutionResult): Promise<void> {
    try {
      const logService = this.config.logService;
      if (!logService) {
        console.warn('[AutomationEngine] 未配置日志服务，跳过保存日志');
        return;
      }

      const log: ExecutionLog = {
        executionId: result.executionId,
        ruleId: result.ruleId,
        ruleName: result.ruleName,
        eventType: result.eventType,
        eventSource: result.eventSource,
        eventData: result.eventData,
        conditionResult: result.conditionResult as Record<string, unknown> | undefined,
        actionResults: result.actionResults as Array<Record<string, unknown>>,
        status: result.status,
        totalDurationMs: result.totalDurationMs,
        createdAt: result.createdAt,
      };

      await logService.saveLog(tenantId, log);
      console.log(`[AutomationEngine] 保存执行日志: ${result.executionId}`);
    } catch (error) {
      console.error('[AutomationEngine] 保存执行日志失败:', error);
    }
  }

  /**
   * 获取规则的执行日志
   */
  async getExecutionLogs(
    tenantId: string,
    ruleId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ logs: ExecutionResult[]; total: number }> {
    try {
      const logService = this.config.logService;
      if (!logService) {
        console.warn('[AutomationEngine] 未配置日志服务');
        return { logs: [], total: 0 };
      }

      const result = await logService.getLogs(tenantId, ruleId, limit, offset);

      return {
        logs: result.logs.map(log => ({
          executionId: log.executionId,
          ruleId: log.ruleId,
          ruleName: log.ruleName,
          eventType: log.eventType,
          eventSource: log.eventSource,
          eventData: log.eventData,
          conditionResult: log.conditionResult as ConditionEvaluationResult | undefined,
          actionResults: log.actionResults as ExecutionResult['actionResults'],
          status: log.status,
          totalDurationMs: log.totalDurationMs,
          createdAt: log.createdAt,
        })),
        total: result.total,
      };
    } catch (error) {
      console.error('[AutomationEngine] 获取执行日志失败:', error);
      return { logs: [], total: 0 };
    }
  }

  /**
   * 获取规则的执行统计
   */
  async getExecutionStats(tenantId: string, ruleId: string): Promise<{
    total: number;
    success: number;
    failed: number;
    partialSuccess: number;
    avgDurationMs: number;
  }> {
    try {
      const logService = this.config.logService;
      if (!logService) {
        console.warn('[AutomationEngine] 未配置日志服务');
        return { total: 0, success: 0, failed: 0, partialSuccess: 0, avgDurationMs: 0 };
      }

      return await logService.getStats(tenantId, ruleId);
    } catch (error) {
      console.error('[AutomationEngine] 获取执行统计失败:', error);
      return { total: 0, success: 0, failed: 0, partialSuccess: 0, avgDurationMs: 0 };
    }
  }
}

/**
 * 创建自动化引擎实例
 */
export function createAutomationEngine(config: AutomationEngineConfig): AutomationEngine {
  return new AutomationEngine(config);
}
