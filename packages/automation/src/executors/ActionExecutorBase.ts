/**
 * 动作执行器基类
 *
 * 提供动作执行的通用逻辑：
 * - 重试策略
 * - 超时控制
 * - 执行日志记录
 * - 条件判断
 */

import type { AutomationAction, ActionResult, ActionExecutionStatus } from '../types/action';
import type { AutomationCondition, ConditionEvaluationResult } from '../types/condition';
import type { PlatformEvent } from '../types/trigger';
import type { ExecutionContext } from '../types/execution';
import { ConditionEvaluator } from '../engine/ConditionEvaluator';
import { VariableResolver, type VariableContext } from '../variable/VariableResolver';

/**
 * 动作执行结果
 */
export interface ActionExecuteResult {
  /** 执行状态 */
  status: ActionExecutionStatus;
  /** 执行结果 */
  result?: unknown;
  /** 错误信息 */
  error?: string;
  /** 重试次数 */
  retryCount: number;
}

/**
 * 动作执行器基类
 *
 * 所有动作执行器必须继承此基类并实现 executeAction 方法。
 */
export abstract class ActionExecutorBase {
  protected readonly conditionEvaluator: ConditionEvaluator;
  protected readonly variableResolver: VariableResolver;

  constructor() {
    this.conditionEvaluator = new ConditionEvaluator();
    this.variableResolver = new VariableResolver();
  }

  /**
   * 执行动作（带重试和条件判断）
   *
   * @param action - 动作配置
   * @param context - 执行上下文
   * @returns 执行结果
   */
  async execute(action: AutomationAction, context: ExecutionContext): Promise<ActionResult> {
    const startTime = Date.now();
    const startedAt = new Date().toISOString();

    // 检查动作级别条件
    if (action.condition) {
      const conditionResult = this.conditionEvaluator.evaluate(
        action.condition,
        this.createPlatformEvent(context),
        context.variables,
      );

      if (!conditionResult.matched) {
        return {
          actionType: action.type,
          actionName: action.name,
          status: 'skipped',
          result: '动作条件不满足',
          startedAt,
          finishedAt: new Date().toISOString(),
          durationMs: Date.now() - startTime,
          retryCount: 0,
        };
      }
    }

    // 准备变量上下文
    const variableContext: VariableContext = {
      event: context.event,
      rule: {
        id: context.ruleId,
        name: context.ruleName,
      },
      variables: context.variables,
    };

    // 执行重试逻辑
    const maxRetries = action.retryPolicy?.maxRetries || 0;
    const backoffMs = action.retryPolicy?.backoffMs || [];
    let lastError: string | undefined;
    let retryCount = 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // 执行动作
        const result = await this.executeAction(action, context, variableContext);

        return {
          actionType: action.type,
          actionName: action.name,
          status: 'success',
          result,
          startedAt,
          finishedAt: new Date().toISOString(),
          durationMs: Date.now() - startTime,
          retryCount: attempt,
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        retryCount = attempt;

        // 如果还有重试机会，等待退避时间
        if (attempt < maxRetries) {
          const waitMs = backoffMs[attempt] || 1000;
          await this.sleep(waitMs);
        }
      }
    }

    // 所有重试都失败
    return {
      actionType: action.type,
      actionName: action.name,
      status: 'failed',
      error: lastError,
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      retryCount,
    };
  }

  /**
   * 执行具体动作（子类必须实现）
   *
   * @param action - 动作配置
   * @param context - 执行上下文
   * @param variableContext - 变量上下文
   * @returns 执行结果
   */
  protected abstract executeAction(
    action: AutomationAction,
    context: ExecutionContext,
    variableContext: VariableContext,
  ): Promise<unknown>;

  /**
   * 解析动作配置中的变量
   *
   * @param config - 动作配置
   * @param variableContext - 变量上下文
   * @returns 解析后的配置
   */
  protected resolveConfig<T>(config: T, variableContext: VariableContext): T {
    return this.variableResolver.resolveObject(config, variableContext);
  }

  /**
   * 创建平台事件对象
   */
  private createPlatformEvent(context: ExecutionContext): PlatformEvent {
    return {
      type: context.event.type,
      source: context.event.source,
      data: context.event.data,
      timestamp: context.event.timestamp,
      tenantId: context.tenantId,
      appId: context.appId,
    };
  }

  /**
   * 等待指定毫秒
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
