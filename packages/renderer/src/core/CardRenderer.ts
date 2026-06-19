import type {
  CustomCardDefinition,
  PropBinding,
  CardEventDef,
  RenderContext,
} from '@low-code/shared';
import type { DefaultExpressionEngine } from '@low-code/computation';
import type { DataBindingResolver } from './DataBindingResolver';

/**
 * 自定义卡片渲染器
 * 处理 type="card:cardId" 的组件节点
 */
export class CardRenderer {
  constructor(
    private expressionEngine: DefaultExpressionEngine,
    private bindingResolver: DataBindingResolver,
  ) {}

  /**
   * 解析卡片暴露属性 → 内部组件属性映射
   */
  resolveBindings(
    definition: CustomCardDefinition,
    consumerProps: Record<string, any>,
    context: RenderContext,
  ): Map<string, Record<string, any>> {
    const resolvedMap = new Map<string, Record<string, any>>();

    const cardScope = {
      ...context,
      $props: consumerProps,
    };

    for (const [propName, binding] of Object.entries(definition.bindings)) {
      const value = this.resolveBinding(binding, cardScope);

      const dotIndex = binding.target.indexOf('.');
      if (dotIndex === -1) continue;

      const componentId = binding.target.substring(0, dotIndex);
      const propPath = binding.target.substring(dotIndex + 1);

      if (!resolvedMap.has(componentId)) {
        resolvedMap.set(componentId, {});
      }
      resolvedMap.get(componentId)![propPath] = value;
    }

    return resolvedMap;
  }

  private resolveBinding(binding: PropBinding, scope: Record<string, any>): any {
    if (!binding.expression) {
      const propName = binding.target.split('.')[1];
      return scope.$props?.[propName];
    }
    return this.expressionEngine.safeEvaluate(binding.expression, scope);
  }

  /**
   * 解析卡片事件映射
   */
  resolveEventMappings(
    definition: CustomCardDefinition,
    consumerProps: Record<string, any>,
    emitEvent: (eventName: string, data: any) => void,
  ): Map<string, (event: any) => void> {
    const eventMap = new Map<string, (event: any) => void>();
    if (!definition.events) return eventMap;

    for (const eventDef of definition.events) {
      const handler = (event: any) => {
        let data = event;
        if (eventDef.transform) {
          const scope = { $this: event, $props: consumerProps };
          data = this.expressionEngine.safeEvaluate(eventDef.transform, scope);
        }
        emitEvent(eventDef.emit, data);
      };
      eventMap.set(eventDef.source, handler);
    }

    return eventMap;
  }

  // ========== invokeMethod ==========

  /**
   * 创建卡片方法处理器
   *
   * invokeMethod(instanceId, methodName, params) 路由规则：
   *   - methodName 不包含 "." → 卡片级方法：直接查找 interface.methods
   *     1. 找到 MethodDefinition.implementation
   *     2. 在卡片作用域内执行动作链
   *     3. 返回结果
   */
  createMethodInvoker(
    definition: CustomCardDefinition,
    context: Record<string, any>,
    eventCompiler: any,
  ): (methodName: string, params?: any) => Promise<any> {
    return async (methodName: string, params?: any) => {
      return this.invokeCardMethod(
        methodName, params,
        definition, context, eventCompiler,
      );
    };
  }

  /**
   * 调用卡片级方法（interface.methods 中定义的方法）
   */
  private async invokeCardMethod(
    methodName: string,
    params: any,
    definition: CustomCardDefinition,
    context: Record<string, any>,
    eventCompiler: any,
  ): Promise<any> {
    const method = definition.interface.methods?.find((m) => m.name === methodName);
    if (!method) {
      console.warn(`Method "${methodName}" not found on card "${definition.id}"`);
      return undefined;
    }

    const methodContext: Record<string, any> = {
      ...context,
      $params: params || {},
      $return: undefined,
    };

    if (method.params && params) {
      for (const paramDef of method.params) {
        if (params[paramDef.name] !== undefined) {
          methodContext[`$param_${paramDef.name}`] = params[paramDef.name];
        }
      }
    }

    const handler = eventCompiler.compileChain(method.implementation, {
      renderContext: methodContext,
      ...methodContext,
    });

    try {
      return await handler(null, methodContext);
    } catch (e) {
      console.error(`Method "${methodName}" execution failed:`, e);
      return undefined;
    }
  }
}
