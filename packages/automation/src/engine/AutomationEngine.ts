/**
 * 自动化引擎主类
 *
 * 基于 ECA (Event-Condition-Action) 模型的自动化规则引擎。
 * 负责事件分发、规则匹配、条件求值、动作执行和日志记录。
 */

import type {
  AutomationEngineConfig,
  DatabaseAdapter,
  EventBus,
  WorkflowService,
  NotifyService,
  DataService,
  HttpClient,
  WebhookService,
  RuleStore,
  LogStore,
} from '../types/engine';
import type { PlatformEvent, AutomationTrigger } from '../types/trigger';
import type { AutomationRule, AutomationRuleStatus } from '../types/rule';
import type { AutomationAction, ActionResult } from '../types/action';
import type {
  AutomationExecutionLog,
  ExecutionContext,
  ExecutionEventInfo,
  ExecutionLogStatus,
} from '../types/execution';
import type { ConditionEvaluationResult } from '../types/condition';
import { TriggerMatcher } from './TriggerMatcher';
import { ConditionEvaluator } from './ConditionEvaluator';
import { Throttler } from './Throttler';
import { EffectiveTimeChecker } from './EffectiveTimeChecker';
import { ExecutionLogger } from '../logger/ExecutionLogger';
import { ActionExecutorBase } from '../executors/ActionExecutorBase';
import { TriggerWorkflowExecutor } from '../executors/TriggerWorkflowExecutor';
import { SendNotificationExecutor } from '../executors/SendNotificationExecutor';
import { DataOperationExecutor } from '../executors/DataOperationExecutor';
import { ApiCallExecutor } from '../executors/ApiCallExecutor';
import { WebhookExecutor } from '../executors/WebhookExecutor';

/** 自动化引擎错误码 */
export type AutomationErrorCode =
  | 'RULE_NOT_FOUND'
  | 'INVALID_RULE'
  | 'TRIGGER_MISMATCH'
  | 'CONDITION_NOT_MET'
  | 'THROTTLED'
  | 'NOT_EFFECTIVE'
  | 'ACTION_FAILED'
  | 'WORKFLOW_SERVICE_NOT_CONFIGURED'
  | 'NOTIFY_SERVICE_NOT_CONFIGURED'
  | 'DATA_SERVICE_NOT_CONFIGURED'
  | 'HTTP_CLIENT_NOT_CONFIGURED'
  | 'WEBHOOK_SERVICE_NOT_CONFIGURED';

/** 自动化引擎错误 */
export class AutomationError extends Error {
  constructor(
    public code: AutomationErrorCode,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AutomationError';
  }
}

/**
 * 内置事件总线实现
 *
 * 支持事件的发布和订阅，支持通配符匹配。
 */
class InternalEventBus implements EventBus {
  private readonly handlers = new Map<string, Set<(event: PlatformEvent) => void | Promise<void>>>();

  on(eventType: string, handler: (event: PlatformEvent) => void | Promise<void>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
  }

  off(eventType: string, handler: (event: PlatformEvent) => void | Promise<void>): void {
    this.handlers.get(eventType)?.delete(handler);
  }

  emit(event: PlatformEvent): void {
    // 精确匹配
    const exactHandlers = this.handlers.get(event.type);
    if (exactHandlers) {
      for (const handler of exactHandlers) {
        try {
          handler(event);
        } catch (error) {
          console.error(`[EventBus] Handler error for ${event.type}:`, error);
        }
      }
    }

    // 通配符匹配（如 "entity.*" 匹配 "entity.created"）
    const parts = event.type.split('.');
    for (let i = parts.length - 1; i > 0; i--) {
      const wildcard = parts.slice(0, i).join('.') + '.*';
      const wildcardHandlers = this.handlers.get(wildcard);
      if (wildcardHandlers) {
        for (const handler of wildcardHandlers) {
          try {
            handler(event);
          } catch (error) {
            console.error(`[EventBus] Handler error for ${wildcard}:`, error);
          }
        }
      }
    }
  }
}

/**
 * 自动化引擎
 *
 * 核心入口类，负责：
 * 1. 事件总线管理
 * 2. 规则匹配和执行编排
 * 3. 动作执行器管理
 * 4. 执行日志记录
 */
export class AutomationEngine {
  private readonly db: DatabaseAdapter;
  private readonly eventBus: EventBus;
  private readonly triggerMatcher: TriggerMatcher;
  private readonly conditionEvaluator: ConditionEvaluator;
  private readonly throttler: Throttler;
  private readonly effectiveTimeChecker: EffectiveTimeChecker;
  private readonly executionLogger: ExecutionLogger;
  private readonly actionExecutors = new Map<string, ActionExecutorBase>();
  private readonly ruleStore: RuleStore;
  private readonly logStore: LogStore;

  constructor(config: AutomationEngineConfig) {
    this.db = config.db;
    this.eventBus = config.eventBus || new InternalEventBus();
    this.triggerMatcher = new TriggerMatcher();
    this.conditionEvaluator = new ConditionEvaluator();
    this.effectiveTimeChecker = new EffectiveTimeChecker();
    this.executionLogger = new ExecutionLogger(config.db);

    // 初始化存储（使用默认实现或注入的实现）
    this.ruleStore = config.ruleStore || this.createDefaultRuleStore();
    this.logStore = config.logStore || this.createDefaultLogStore();
    this.throttler = new Throttler(this.logStore);

    // 注册动作执行器
    this.registerActionExecutors(config);
  }

  /**
   * 处理事件（快捷入口）
   *
   * 外部模块可以直接调用此方法触发自动化规则。
   *
   * @param event - 平台事件
   * @returns 执行结果
   */
  async handleEvent(event: PlatformEvent): Promise<AutomationExecutionLog[]> {
    // 通过事件总线分发
    this.eventBus.emit(event);

    // 直接处理
    return this.processEvent(event);
  }

  /**
   * 处理事件（内部方法）
   *
   * @param event - 平台事件
   * @returns 执行结果列表
   */
  private async processEvent(event: PlatformEvent): Promise<AutomationExecutionLog[]> {
    const results: AutomationExecutionLog[] = [];

    // 1. 获取匹配的规则
    const rules = await this.getMatchingRules(event);
    if (rules.length === 0) {
      return results;
    }

    // 2. 逐个执行规则
    for (const rule of rules) {
      try {
        const result = await this.executeRule(rule, event);
        if (result) {
          results.push(result);
        }
      } catch (error) {
        console.error(`[AutomationEngine] Rule execution failed: ${rule.id}`, error);
      }
    }

    return results;
  }

  /**
   * 获取匹配的规则
   */
  private async getMatchingRules(event: PlatformEvent): Promise<AutomationRule[]> {
    // 根据事件类型确定触发器类型
    const triggerType = this.inferTriggerType(event.type);

    // 获取应用下所有启用的规则
    const appId = event.appId;
    if (!appId) {
      console.warn('[AutomationEngine] Event missing appId, skipping');
      return [];
    }

    const rules = await this.ruleStore.getEnabledByTriggerType(appId, triggerType);

    // 使用触发器匹配器过滤
    return this.triggerMatcher.matchAll(event, rules);
  }

  /**
   * 推断触发器类型
   */
  private inferTriggerType(eventType: string): string {
    if (eventType.startsWith('entity.')) return 'data_change';
    if (eventType === 'schedule.tick') return 'schedule';
    if (eventType.startsWith('form.')) return 'form_event';
    if (eventType.startsWith('workflow.')) return 'workflow_event';
    return 'custom_event';
  }

  /**
   * 执行单个规则
   */
  private async executeRule(
    rule: AutomationRule,
    event: PlatformEvent,
  ): Promise<AutomationExecutionLog | undefined> {
    const startTime = Date.now();

    // 1. 限流检查
    const throttleResult = await this.throttler.check(rule);
    if (!throttleResult.allowed) {
      console.log(`[AutomationEngine] Rule throttled: ${rule.id} - ${throttleResult.reason}`);
      return undefined;
    }

    // 2. 生效时间检查
    const effectiveResult = this.effectiveTimeChecker.check(rule);
    if (!effectiveResult.effective) {
      console.log(`[AutomationEngine] Rule not effective: ${rule.id} - ${effectiveResult.reason}`);
      return undefined;
    }

    // 3. 条件求值
    const conditionResult = this.conditionEvaluator.evaluate(
      rule.condition,
      event,
      {},
    );

    // 4. 构建执行上下文
    const context: ExecutionContext = {
      ruleId: rule.id,
      ruleName: rule.name,
      tenantId: rule.tenantId,
      appId: rule.appId,
      event: {
        type: event.type,
        source: event.source,
        data: event.data,
        timestamp: event.timestamp,
      },
      variables: {},
    };

    // 5. 执行动作（根据条件结果决定）
    let actionResults: ActionResult[] = [];
    let status: ExecutionLogStatus = 'success';

    if (conditionResult.matched) {
      actionResults = await this.executeActions(rule.actions, context);

      // 确定整体状态
      const hasFailure = actionResults.some(r => r.status === 'failed');
      const hasSuccess = actionResults.some(r => r.status === 'success');

      if (hasFailure && hasSuccess) {
        status = 'partial_success';
      } else if (hasFailure) {
        status = 'failed';
      }
    }

    // 6. 记录限流触发
    this.throttler.recordTrigger(rule.id);

    // 7. 记录执行日志
    const totalDurationMs = Date.now() - startTime;
    const log = await this.executionLogger.log({
      ruleId: rule.id,
      ruleName: rule.name,
      tenantId: rule.tenantId,
      event: context.event,
      conditionResult,
      actionResults,
      status: conditionResult.matched ? status : 'success',
      totalDurationMs,
    });

    return log;
  }

  /**
   * 执行动作列表
   */
  private async executeActions(
    actions: AutomationAction[],
    context: ExecutionContext,
  ): Promise<ActionResult[]> {
    const results: ActionResult[] = [];

    for (const action of actions) {
      const executor = this.actionExecutors.get(action.type);
      if (!executor) {
        results.push({
          actionType: action.type,
          actionName: action.name,
          status: 'failed',
          error: `没有找到动作执行器: ${action.type}`,
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: 0,
          retryCount: 0,
        });
        continue;
      }

      if (action.async) {
        // 异步执行，不等待结果
        executor.execute(action, context).catch(error => {
          console.error(`[AutomationEngine] Async action failed: ${action.name}`, error);
        });
        results.push({
          actionType: action.type,
          actionName: action.name,
          status: 'success',
          result: '异步执行已启动',
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: 0,
          retryCount: 0,
        });
      } else {
        // 同步执行，等待结果
        const result = await executor.execute(action, context);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * 注册动作执行器
   */
  private registerActionExecutors(config: AutomationEngineConfig): void {
    if (config.workflowService) {
      this.actionExecutors.set('trigger_workflow', new TriggerWorkflowExecutor(config.workflowService));
    }
    if (config.notifyService) {
      this.actionExecutors.set('send_notification', new SendNotificationExecutor(config.notifyService));
    }
    if (config.dataService) {
      this.actionExecutors.set('data_operation', new DataOperationExecutor(config.dataService));
    }
    if (config.httpClient) {
      this.actionExecutors.set('api_call', new ApiCallExecutor(config.httpClient));
    }
    if (config.webhookService) {
      this.actionExecutors.set('webhook', new WebhookExecutor(config.webhookService));
    }
  }

  /**
   * 获取事件总线
   */
  getEventBus(): EventBus {
    return this.eventBus;
  }

  /**
   * 注册自定义动作执行器
   */
  registerActionExecutor(actionType: string, executor: ActionExecutorBase): void {
    this.actionExecutors.set(actionType, executor);
  }

  /**
   * 创建默认规则存储
   */
  private createDefaultRuleStore(): RuleStore {
    return {
      getById: async (ruleId: string) => {
        const row = await this.db.get<{
          id: string;
          app_id: string;
          name: string;
          description: string | null;
          status: string;
          trigger_config: string;
          condition_config: string | null;
          actions_config: string;
          throttle_config: string | null;
          effective_time: string | null;
          created_by: string;
          created_at: string;
          updated_by: string;
          updated_at: string;
        }>(
          'SELECT * FROM automation_rules WHERE id = ?',
          [ruleId]
        );
        return row ? this.mapRowToRule(row) : undefined;
      },

      getEnabledByApp: async (appId: string) => {
        const rows = await this.db.all<{
          id: string;
          app_id: string;
          name: string;
          description: string | null;
          status: string;
          trigger_config: string;
          condition_config: string | null;
          actions_config: string;
          throttle_config: string | null;
          effective_time: string | null;
          created_by: string;
          created_at: string;
          updated_by: string;
          updated_at: string;
        }>(
          `SELECT * FROM automation_rules
           WHERE app_id = ? AND status = 'enabled'`,
          [appId]
        );
        return rows.map(row => this.mapRowToRule(row));
      },

      getEnabledByTriggerType: async (appId: string, triggerType: string) => {
        const rows = await this.db.all<{
          id: string;
          app_id: string;
          name: string;
          description: string | null;
          status: string;
          trigger_config: string;
          condition_config: string | null;
          actions_config: string;
          throttle_config: string | null;
          effective_time: string | null;
          created_by: string;
          created_at: string;
          updated_by: string;
          updated_at: string;
        }>(
          `SELECT * FROM automation_rules
           WHERE app_id = ? AND status = 'enabled'
           AND json_extract(trigger_config, '$.type') = ?`,
          [appId, triggerType]
        );
        return rows.map(row => this.mapRowToRule(row));
      },

      save: async (rule: AutomationRule) => {
        await this.db.run(
          `INSERT OR REPLACE INTO automation_rules (
            id, app_id, name, description, status,
            trigger_config, condition_config, actions_config,
            throttle_config, effective_time,
            created_by, created_at, updated_by, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            rule.id,
            rule.appId,
            rule.name,
            rule.description || null,
            rule.status,
            JSON.stringify(rule.trigger),
            rule.condition ? JSON.stringify(rule.condition) : null,
            JSON.stringify(rule.actions),
            rule.throttle ? JSON.stringify(rule.throttle) : null,
            rule.effectiveTime ? JSON.stringify(rule.effectiveTime) : null,
            rule.createdBy,
            rule.createdAt,
            rule.updatedBy,
            rule.updatedAt,
          ]
        );
      },

      delete: async (ruleId: string) => {
        await this.db.run('DELETE FROM automation_rules WHERE id = ?', [ruleId]);
      },
    };
  }

  /**
   * 创建默认日志存储
   */
  private createDefaultLogStore(): LogStore {
    return {
      save: async (log: AutomationExecutionLog) => {
        await this.executionLogger.log({
          ruleId: log.ruleId,
          ruleName: log.ruleName,
          tenantId: log.tenantId,
          event: log.event,
          conditionResult: log.conditionResult,
          actionResults: log.actionResults,
          status: log.status,
          totalDurationMs: log.totalDurationMs,
        });
      },

      getByRuleId: async (ruleId: string, options) => {
        return this.executionLogger.getByRuleId(ruleId, options);
      },

      getById: async (logId: string) => {
        return this.executionLogger.getById(logId);
      },

      getLastExecutionTime: async (ruleId: string) => {
        return this.executionLogger.getLastExecutionTime(ruleId);
      },

      getTodayExecutionCount: async (ruleId: string) => {
        return this.executionLogger.getTodayExecutionCount(ruleId);
      },
    };
  }

  /**
   * 将数据库行映射为规则对象
   */
  private mapRowToRule(row: {
    id: string;
    app_id: string;
    name: string;
    description: string | null;
    status: string;
    trigger_config: string;
    condition_config: string | null;
    actions_config: string;
    throttle_config: string | null;
    effective_time: string | null;
    created_by: string;
    created_at: string;
    updated_by: string;
    updated_at: string;
  }): AutomationRule {
    return {
      id: row.id,
      tenantId: '', // 从上下文获取
      appId: row.app_id,
      name: row.name,
      description: row.description || undefined,
      status: row.status as AutomationRuleStatus,
      trigger: JSON.parse(row.trigger_config),
      condition: row.condition_config ? JSON.parse(row.condition_config) : undefined,
      actions: JSON.parse(row.actions_config),
      throttle: row.throttle_config ? JSON.parse(row.throttle_config) : undefined,
      effectiveTime: row.effective_time ? JSON.parse(row.effective_time) : undefined,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedBy: row.updated_by,
      updatedAt: row.updated_at,
    };
  }
}
