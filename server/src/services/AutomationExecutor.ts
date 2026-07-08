/**
 * 自动化执行引擎
 *
 * 负责执行自动化规则，支持：
 * - 定时触发（Cron 调度）
 * - 触发流程（调用工作流引擎）
 * - 执行脚本（使用表达式引擎）
 *
 * 执行流程：
 * 1. 读取启用的自动化规则
 * 2. 根据触发器类型注册到调度器
 * 3. 触发时执行条件检查
 * 4. 条件满足时执行动作
 * 5. 记录执行日志
 */

import fs from 'fs';
import path from 'path';
import { CronScheduler, validateCronExpression } from './CronScheduler.js';
import { createExpressionEngine, interpolateTemplate, type ExpressionEngine } from '@low-code/shared';
import { TENANTS_DIR } from '../config/index.js';
import { getDbManager } from '../config/db.js';
import { generateHexId } from '@low-code/shared';

/** 自动化规则状态 */
type AutomationStatus = 'draft' | 'enabled' | 'disabled';

/** 触发器类型 */
type TriggerType = 'schedule' | 'data_change' | 'form_event' | 'workflow_event' | 'custom_event';

/** 动作类型 */
type ActionType = 'trigger_workflow' | 'execute_script' | 'send_notification' | 'data_operation' | 'api_call' | 'webhook';

/** 自动化规则 */
interface AutomationRule {
  id: string;
  appId: string;
  name: string;
  description?: string;
  status: AutomationStatus;
  trigger: TriggerConfig;
  condition?: ConditionConfig;
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
  formEvent?: {
    pageId: string;
    events: string[];
    fieldCode?: string;
  };
  workflowEvent?: {
    workflowId?: string;
    events: string[];
    nodeCode?: string;
  };
  customEvent?: {
    eventType: string;
    source?: string;
  };
}

/** 条件配置 */
interface ConditionConfig {
  logic: 'and' | 'or';
  conditions: Array<{
    field: string;
    operator: string;
    value: unknown;
  }>;
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
  executeScript?: {
    script: string;
    context?: Record<string, unknown>;
  };
  sendNotification?: {
    templateId?: string;
    channels: string[];
    recipients: Array<{ type: string; value: string }>;
    title?: string;
    content?: string;
    priority?: string;
    variables?: Record<string, unknown>;
  };
  dataOperation?: {
    entityCode: string;
    operation: string;
    data?: Record<string, unknown>;
    filter?: Record<string, unknown>;
  };
  apiCall?: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: Record<string, unknown>;
    timeout?: number;
  };
  webhook?: {
    webhookId: string;
    payload?: Record<string, unknown>;
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
  conditionResult?: {
    matched: boolean;
    details: Array<{
      rule: string;
      field: string;
      operator: string;
      expected: unknown;
      actual: unknown;
      matched: boolean;
    }>;
    evaluatedAt: string;
    durationMs: number;
  };
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

/** 自动化执行引擎配置 */
export interface AutomationExecutorConfig {
  /** 租户 ID */
  tenantId: string;
  /** Cron 调度器 */
  scheduler: CronScheduler;
  /** 表达式引擎 */
  expressionEngine: ExpressionEngine;
  /** 工作流执行器 */
  workflowExecutor?: WorkflowExecutor;
}

/** 工作流执行器接口 */
export interface WorkflowExecutor {
  /** 启动流程实例 */
  startWorkflow(workflowId: string, variables?: Record<string, unknown>, initiator?: string): Promise<string>;
}

/**
 * 自动化执行引擎
 */
export class AutomationExecutor {
  private config: AutomationExecutorConfig;
  private registeredJobs: Map<string, string> = new Map(); // ruleId -> jobId
  private executionLogs: Map<string, ExecutionResult[]> = new Map(); // ruleId -> logs

  constructor(config: AutomationExecutorConfig) {
    this.config = config;
  }

  /**
   * 初始化执行引擎
   *
   * 加载所有启用的规则并注册到调度器
   */
  async initialize(): Promise<void> {
    const { tenantId } = this.config;

    // 扫描所有应用的自动化规则
    const appsDir = path.join(TENANTS_DIR, tenantId, 'apps');
    if (!fs.existsSync(appsDir)) {
      console.log('[AutomationExecutor] 应用目录不存在');
      return;
    }

    const appDirs = fs.readdirSync(appsDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && d.name.startsWith('app_'));

    let registeredCount = 0;

    for (const appDir of appDirs) {
      const appId = appDir.name.replace('app_', '');
      const rules = this.loadRules(tenantId, appId);

      for (const rule of rules) {
        if (rule.status === 'enabled' && rule.trigger.type === 'schedule') {
          await this.registerScheduledRule(rule);
          registeredCount++;
        }
      }
    }

    console.log(`[AutomationExecutor] 初始化完成，已注册 ${registeredCount} 个定时任务`);
  }

  /**
   * 注册定时规则到调度器
   */
  async registerScheduledRule(rule: AutomationRule): Promise<void> {
    const { scheduler } = this.config;
    const schedule = rule.trigger.schedule;

    if (!schedule?.cron) {
      console.warn(`[AutomationExecutor] 规则 ${rule.id} 缺少 cron 表达式`);
      return;
    }

    // 校验 cron 表达式
    const validation = validateCronExpression(schedule.cron);
    if (!validation.valid) {
      console.error(`[AutomationExecutor] 规则 ${rule.id} cron 表达式无效: ${validation.error}`);
      return;
    }

    // 检查生效时间
    if (!this.isRuleEffective(rule)) {
      console.log(`[AutomationExecutor] 规则 ${rule.id} 不在生效时间内`);
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
    console.log(`[AutomationExecutor] 注册定时任务: ${rule.name} (${schedule.cron})`);
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
      console.log(`[AutomationExecutor] 注销任务: ${ruleId}`);
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

    // 获取所有匹配的规则
    const rules = appId
      ? this.loadRules(tenantId, appId)
      : this.loadAllRules(tenantId);

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

    console.log(`[AutomationExecutor] 执行规则: ${rule.name} (${rule.id})`);

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
      // 1. 检查条件
      if (rule.condition) {
        const conditionStart = Date.now();
        const conditionResult = this.evaluateCondition(rule.condition, context);
        result.conditionResult = {
          ...conditionResult,
          evaluatedAt: new Date().toISOString(),
          durationMs: Date.now() - conditionStart,
        };

        if (!conditionResult.matched) {
          console.log(`[AutomationExecutor] 条件不满足，跳过执行`);
          result.status = 'success';
          result.totalDurationMs = Date.now() - startTime;
          this.saveExecutionLog(context.tenantId, context.ruleId, result);
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
      console.error(`[AutomationExecutor] 规则执行失败:`, error);
    }

    result.totalDurationMs = Date.now() - startTime;

    // 保存执行日志
    this.saveExecutionLog(context.tenantId, context.ruleId, result);

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
          case 'execute_script':
            result = await this.executeScript(action, context);
            break;
          case 'send_notification':
            result = await this.executeSendNotification(action, context);
            break;
          case 'data_operation':
            result = await this.executeDataOperation(action, context);
            break;
          case 'api_call':
            result = await this.executeApiCall(action, context);
            break;
          case 'webhook':
            result = await this.executeWebhook(action, context);
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
   * 执行脚本动作
   */
  private async executeScript(
    action: ActionConfig,
    context: ExecutionContext
  ): Promise<unknown> {
    const { expressionEngine } = this.config;
    const config = action.executeScript;

    if (!config?.script) {
      throw new Error('未指定脚本内容');
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

    // 使用表达式引擎执行脚本
    const result = expressionEngine.evaluate(config.script, scriptContext);

    return result;
  }

  /**
   * 执行发送通知动作
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
      : undefined;
    const content = config.content
      ? interpolateTemplate(config.content, context.eventData || {})
      : undefined;

    // TODO: 调用通知服务发送消息
    console.log(`[AutomationExecutor] 发送通知: ${title || '无标题'}`);

    return {
      channels: config.channels,
      recipients: config.recipients.length,
      title,
      content,
    };
  }

  /**
   * 执行数据操作动作
   */
  private async executeDataOperation(
    action: ActionConfig,
    context: ExecutionContext
  ): Promise<unknown> {
    const config = action.dataOperation;
    if (!config) {
      throw new Error('数据操作配置缺失');
    }

    // TODO: 调用数据服务执行操作
    console.log(`[AutomationExecutor] 数据操作: ${config.operation} ${config.entityCode}`);

    return {
      entityCode: config.entityCode,
      operation: config.operation,
    };
  }

  /**
   * 执行 API 调用动作
   */
  private async executeApiCall(
    action: ActionConfig,
    context: ExecutionContext
  ): Promise<unknown> {
    const config = action.apiCall;
    if (!config) {
      throw new Error('API 调用配置缺失');
    }

    // 处理 URL 插值
    const url = interpolateTemplate(config.url, context.eventData || {});
    const timeout = config.timeout || 30000;

    // 处理请求体插值
    const body = config.body
      ? this.interpolateVariables(config.body, context)
      : undefined;

    // 发起 HTTP 请求
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: config.method,
        headers: config.headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json().catch(() => null);

      return {
        status: response.status,
        statusText: response.statusText,
        data,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * 执行 Webhook 动作
   */
  private async executeWebhook(
    action: ActionConfig,
    context: ExecutionContext
  ): Promise<unknown> {
    const config = action.webhook;
    if (!config?.webhookId) {
      throw new Error('未指定 Webhook ID');
    }

    // TODO: 查找 Webhook 配置并调用
    console.log(`[AutomationExecutor] 触发 Webhook: ${config.webhookId}`);

    return {
      webhookId: config.webhookId,
    };
  }

  /**
   * 评估条件
   */
  private evaluateCondition(
    condition: ConditionConfig,
    context: ExecutionContext
  ): { matched: boolean; details: ExecutionResult['conditionResult']['details'] } {
    const details: ExecutionResult['conditionResult']['details'] = [];
    const eventData = context.eventData || {};

    for (const cond of condition.conditions) {
      const actual = this.getNestedValue(eventData, cond.field);
      const matched = this.evaluateOperator(actual, cond.operator, cond.value);

      details.push({
        rule: `${cond.field} ${cond.operator} ${JSON.stringify(cond.value)}`,
        field: cond.field,
        operator: cond.operator,
        expected: cond.value,
        actual,
        matched,
      });
    }

    const matched = condition.logic === 'and'
      ? details.every(d => d.matched)
      : details.some(d => d.matched);

    return { matched, details };
  }

  /**
   * 评估操作符
   */
  private evaluateOperator(actual: unknown, operator: string, expected: unknown): boolean {
    switch (operator) {
      case 'eq':
      case '=':
      case '==':
        return actual === expected;
      case 'ne':
      case '!=':
        return actual !== expected;
      case 'gt':
      case '>':
        return (actual as number) > (expected as number);
      case 'gte':
      case '>=':
        return (actual as number) >= (expected as number);
      case 'lt':
      case '<':
        return (actual as number) < (expected as number);
      case 'lte':
      case '<=':
        return (actual as number) <= (expected as number);
      case 'in':
        return Array.isArray(expected) && expected.includes(actual);
      case 'not_in':
        return Array.isArray(expected) && !expected.includes(actual);
      case 'contains':
        return typeof actual === 'string' && actual.includes(expected as string);
      case 'not_contains':
        return typeof actual === 'string' && !actual.includes(expected as string);
      case 'starts_with':
        return typeof actual === 'string' && actual.startsWith(expected as string);
      case 'ends_with':
        return typeof actual === 'string' && actual.endsWith(expected as string);
      case 'is_empty':
        return actual === null || actual === undefined || actual === '';
      case 'is_not_empty':
        return actual !== null && actual !== undefined && actual !== '';
      default:
        return false;
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
      case 'form_event':
        return this.matchesFormEventTrigger(trigger.formEvent!, eventType, eventData);
      case 'workflow_event':
        return this.matchesWorkflowEventTrigger(trigger.workflowEvent!, eventType, eventData);
      case 'custom_event':
        return this.matchesCustomEventTrigger(trigger.customEvent!, eventType);
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
   * 匹配表单事件触发器
   */
  private matchesFormEventTrigger(
    config: NonNullable<TriggerConfig['formEvent']>,
    eventType: string,
    eventData: Record<string, unknown>
  ): boolean {
    if (!eventType.startsWith('form.')) return false;

    const event = eventType.split('.')[1]; // form.submitted -> submitted
    if (!config.events.includes(event)) return false;

    if (config.pageId && eventData.pageId !== config.pageId) return false;

    return true;
  }

  /**
   * 匹配审批事件触发器
   */
  private matchesWorkflowEventTrigger(
    config: NonNullable<TriggerConfig['workflowEvent']>,
    eventType: string,
    eventData: Record<string, unknown>
  ): boolean {
    if (!eventType.startsWith('workflow.')) return false;

    const event = eventType.split('.')[1]; // workflow.approved -> approved
    if (!config.events.includes(event)) return false;

    if (config.workflowId && eventData.workflowId !== config.workflowId) return false;

    return true;
  }

  /**
   * 匹配自定义事件触发器
   */
  private matchesCustomEventTrigger(
    config: NonNullable<TriggerConfig['customEvent']>,
    eventType: string
  ): boolean {
    return config.eventType === eventType;
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
   * 获取嵌套对象值
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  /**
   * 加载规则
   */
  private loadRules(tenantId: string, appId: string): AutomationRule[] {
    const automationsDir = path.join(TENANTS_DIR, tenantId, 'apps', `app_${appId}`, 'automations');

    if (!fs.existsSync(automationsDir)) {
      return [];
    }

    const entries = fs.readdirSync(automationsDir, { withFileTypes: true });

    return entries
      .filter(e => e.isFile() && e.name.endsWith('.json'))
      .map(e => {
        try {
          const content = fs.readFileSync(path.join(automationsDir, e.name), 'utf-8');
          return JSON.parse(content) as AutomationRule;
        } catch {
          return null;
        }
      })
      .filter((rule): rule is AutomationRule => rule !== null && !rule._deleted);
  }

  /**
   * 加载所有规则
   */
  private loadAllRules(tenantId: string): AutomationRule[] {
    const appsDir = path.join(TENANTS_DIR, tenantId, 'apps');

    if (!fs.existsSync(appsDir)) {
      return [];
    }

    const appDirs = fs.readdirSync(appsDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && d.name.startsWith('app_'));

    const rules: AutomationRule[] = [];

    for (const appDir of appDirs) {
      const appId = appDir.name.replace('app_', '');
      rules.push(...this.loadRules(tenantId, appId));
    }

    return rules;
  }

  /**
   * 保存执行日志
   */
  private saveExecutionLog(tenantId: string, ruleId: string, result: ExecutionResult): void {
    try {
      const manager = getDbManager();
      const db = manager.getTenantDb(tenantId);

      db.run(
        `INSERT INTO automation_execution_logs (
          id, rule_id, rule_name, event_type, event_source, event_data,
          condition_result, action_results, status, total_duration_ms, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          result.executionId,
          result.ruleId,
          result.ruleName,
          result.eventType,
          result.eventSource,
          JSON.stringify(result.eventData),
          result.conditionResult ? JSON.stringify(result.conditionResult) : null,
          JSON.stringify(result.actionResults),
          result.status,
          result.totalDurationMs,
          result.createdAt,
        ]
      );

      console.log(`[AutomationExecutor] 保存执行日志: ${result.executionId}`);
    } catch (error) {
      console.error('[AutomationExecutor] 保存执行日志失败:', error);
    }
  }

  /**
   * 获取规则的执行日志
   */
  getExecutionLogs(
    tenantId: string,
    ruleId: string,
    limit: number = 20,
    offset: number = 0
  ): { logs: ExecutionResult[]; total: number } {
    try {
      const manager = getDbManager();
      const db = manager.getTenantDb(tenantId);

      const logs = db.all(
        `SELECT * FROM automation_execution_logs
         WHERE rule_id = ?
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [ruleId, limit, offset]
      );

      const total = db.get(
        'SELECT COUNT(*) as count FROM automation_execution_logs WHERE rule_id = ?',
        [ruleId]
      );

      return {
        logs: (logs as any[]).map(log => ({
          ...log,
          eventData: JSON.parse(log.event_data || '{}'),
          conditionResult: log.condition_result ? JSON.parse(log.condition_result) : undefined,
          actionResults: JSON.parse(log.action_results || '[]'),
        })),
        total: (total as any)?.count || 0,
      };
    } catch (error) {
      console.error('[AutomationExecutor] 获取执行日志失败:', error);
      return { logs: [], total: 0 };
    }
  }

  /**
   * 获取规则的执行统计
   */
  getExecutionStats(tenantId: string, ruleId: string): {
    total: number;
    success: number;
    failed: number;
    partialSuccess: number;
    avgDurationMs: number;
  } {
    try {
      const manager = getDbManager();
      const db = manager.getTenantDb(tenantId);

      const stats = db.get(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN status = 'partial_success' THEN 1 ELSE 0 END) as partial_success,
          AVG(total_duration_ms) as avg_duration
        FROM automation_execution_logs
        WHERE rule_id = ?`,
        [ruleId]
      );

      return {
        total: (stats as any)?.total || 0,
        success: (stats as any)?.success || 0,
        failed: (stats as any)?.failed || 0,
        partialSuccess: (stats as any)?.partial_success || 0,
        avgDurationMs: Math.round((stats as any)?.avg_duration || 0),
      };
    } catch (error) {
      console.error('[AutomationExecutor] 获取执行统计失败:', error);
      return { total: 0, success: 0, failed: 0, partialSuccess: 0, avgDurationMs: 0 };
    }
  }
}

/**
 * 创建自动化执行引擎实例
 */
export function createAutomationExecutor(config: AutomationExecutorConfig): AutomationExecutor {
  return new AutomationExecutor(config);
}
