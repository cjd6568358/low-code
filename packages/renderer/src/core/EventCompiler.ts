import type { ActionChain, ActionStep, ActionContext } from '@low-code/shared';
import type { ActionRegistryImpl } from './ActionRegistry';
import type { DefaultExpressionEngine } from '@low-code/computation';

/** 编译后的事件处理器 */
export type CompiledEventHandler = (
  event: any,
  context: ActionContext,
) => Promise<any>;

/**
 * 事件编译器
 * 将 ActionChain JSON 编译为可执行的异步函数
 */
export class EventCompiler {
  constructor(
    private actionRegistry: ActionRegistryImpl,
    private expressionEngine: DefaultExpressionEngine,
  ) {}

  /**
   * 编译整个事件映射
   * 文档定义 events 为 Record<string, ActionChain[]>，每个事件可有多条动作链
   */
  compileEvents(
    events: Record<string, ActionChain[]>,
    baseContext: ActionContext,
  ): Record<string, CompiledEventHandler> {
    const handlers: Record<string, CompiledEventHandler> = {};
    for (const [eventName, chains] of Object.entries(events)) {
      handlers[eventName] = this.compileChains(chains, baseContext);
    }
    return handlers;
  }

  /**
   * 编译多条动作链（同一事件的多条链按顺序执行）
   */
  compileChains(
    chains: ActionChain[],
    baseContext: ActionContext,
  ): CompiledEventHandler {
    return async (event: any, overrideContext?: Partial<ActionContext>) => {
      const context: ActionContext = {
        ...baseContext,
        ...overrideContext,
        event,
      };

      let $result: any = undefined;

      for (const chain of chains) {
        $result = await this.executeChain(chain, context, $result);
      }

      return $result;
    };
  }

  /**
   * 编译单条动作链（保留用于外部直接调用）
   */
  compileChain(
    chain: ActionChain,
    baseContext: ActionContext,
  ): CompiledEventHandler {
    return async (event: any, overrideContext?: Partial<ActionContext>) => {
      const context: ActionContext = {
        ...baseContext,
        ...overrideContext,
        event,
      };
      return this.executeChain(chain, context);
    };
  }

  /**
   * 执行单条动作链
   */
  private async executeChain(
    chain: ActionChain,
    context: ActionContext,
    initialResult?: any,
  ): Promise<any> {
    let $result: any = initialResult;

    for (const step of chain) {
      try {
        $result = await this.executeStep(step, context, $result);
      } catch (e) {
        console.error(`Action step "${step.action}" failed:`, e);
        if (!step.continueOnError) break;
      }
    }

    return $result;
  }

  /**
   * 执行单个动作步骤
   */
  private async executeStep(
    step: ActionStep,
    context: ActionContext,
    $result: any,
  ): Promise<any> {
    // 0. 跳过禁用的动作
    if (step.disabled) return $result;

    // 1. 条件判断
    if (step.condition) {
      const conditionResult = this.expressionEngine.safeEvaluate(
        step.condition,
        { ...context.renderContext, $result, $event: context.event },
      );
      if (!conditionResult) {
        // 条件不满足，执行 else 分支
        if (step.else) {
          return this.executeSubChain(step.else, context, $result);
        }
        return $result;
      }
    }

    // 2. 条件分支动作（特殊处理）
    if (step.action === 'condition' && step.params) {
      const { condition, then: thenActions, else: elseActions } = step.params;
      const conditionResult = this.expressionEngine.safeEvaluate(
        condition,
        { ...context.renderContext, $result, $event: context.event },
      );
      if (conditionResult && thenActions) {
        return this.executeSubChain(thenActions, context, $result);
      } else if (!conditionResult && elseActions) {
        return this.executeSubChain(elseActions, context, $result);
      }
      return $result;
    }

    // 3. 解析模板变量
    const paramsToResolve = { ...step.params };

    // navigate/redirect 的 queryParams 解析（PropValue 格式）
    if ((step.action === 'navigate' || step.action === 'redirect') && paramsToResolve.queryParams) {
      const qp = paramsToResolve.queryParams;
      const evalCtx = { ...context.renderContext, $result, $event: context.event };
      if (typeof qp === 'object' && 'type' in qp && 'value' in qp) {
        if (qp.type === 'variable') {
          paramsToResolve.queryParams = resolveVariablePath(qp.value, evalCtx);
        } else if (qp.type === 'expression') {
          // 函数体 → safeEvaluate 自动包裹为 IIFE 同步求值
          paramsToResolve.queryParams = this.expressionEngine.safeEvaluate(qp.value, evalCtx);
        }
      }
    }

    // triggerWorkflow 的 inputData 解析（支持变量/表达式格式）
    if (step.action === 'triggerWorkflow' && paramsToResolve.inputData) {
      paramsToResolve.inputData = resolvePropValue(paramsToResolve.inputData, { ...context.renderContext, $result, $event: context.event }, this.expressionEngine);
    }

    // showModal 的 data 解析（支持变量/表达式格式）
    if (step.action === 'showModal' && paramsToResolve.data) {
      paramsToResolve.data = resolvePropValue(paramsToResolve.data, { ...context.renderContext, $result, $event: context.event }, this.expressionEngine);
    }

    const resolvedParams = this.resolveParams(paramsToResolve, {
      ...context.renderContext,
      $result,
      $event: context.event,
    });

    // 4. 执行动作
    const executor = this.actionRegistry.resolve(step.action);
    if (!executor) {
      console.warn(`Unknown action: ${step.action}`);
      return $result;
    }

    return executor.execute(resolvedParams, { ...context, $result });
  }

  /**
   * 执行子动作链
   */
  private async executeSubChain(
    steps: ActionStep[],
    context: ActionContext,
    $result: any,
  ): Promise<any> {
    for (const step of steps) {
      try {
        $result = await this.executeStep(step, context, $result);
      } catch (e) {
        console.error(`Sub-chain action "${step.action}" failed:`, e);
        if (!step.continueOnError) break;
      }
    }
    return $result;
  }

  /**
   * 解析参数中的模板变量 {{path}}
   */
  private resolveParams(
    params: Record<string, any>,
    context: Record<string, any>,
  ): Record<string, any> {
    return this.expressionEngine.resolveTemplateParams(params, context);
  }
}

/** 从 renderContext 按变量路径取值（如 $platform.mobile → true） */
function resolveVariablePath(path: string, renderContext: Record<string, any>): any {
  const parts = path.split('.');
  let current: any = renderContext;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

/**
 * 解析 PropValue（支持单选/多选变量、表达式）
 *
 * - 单选变量：{ type: 'variable', value: '$data.xx' } → 取值
 * - 多选变量：{ type: 'variable', value: { a: '$data.a', b: '$data.b' } } → 逐个取值合并
 * - 表达式：{ type: 'expression', value: '...' } → 求值
 */
function resolvePropValue(
  val: unknown,
  evalCtx: Record<string, any>,
  expressionEngine: InstanceType<typeof import('@low-code/computation').DefaultExpressionEngine>,
): any {
  if (val == null || typeof val !== 'object' || !('type' in val) || !('value' in val)) return val;

  const { type, value } = val as { type: string; value: unknown };

  if (type === 'expression' && typeof value === 'string') {
    return expressionEngine.safeEvaluate(value, evalCtx);
  }

  if (type === 'variable') {
    // 单选：value 是字符串路径
    if (typeof value === 'string') {
      return resolveVariablePath(value, evalCtx);
    }
    // 多选：value 是 { key: path, ... }
    if (typeof value === 'object' && value !== null) {
      const result: Record<string, any> = {};
      for (const [key, path] of Object.entries(value as Record<string, string>)) {
        result[key] = resolveVariablePath(path, evalCtx);
      }
      return result;
    }
  }

  return val;
}
