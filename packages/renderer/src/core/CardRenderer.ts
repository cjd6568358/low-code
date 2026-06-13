import type {
  CustomCardDefinition,
  ComponentNode,
  PropBinding,
  CardEventDef,
  RenderContext,
  SlotDefinition,
} from '@low-code/shared';
import type { DefaultExpressionEngine } from '@low-code/computation';
import type { DataBindingResolver } from './DataBindingResolver';

/**
 * 插槽暴露上下文 — 注入到消费方的 $slot 作用域
 * 每个插槽对应一个 namespace，消费方通过 $slot.{slotName}.{key} 引用
 */
export interface SlotExposeContext {
  /** 插槽名 → 暴露变量的值（已求值） */
  variables: Map<string, Record<string, any>>;
  /** 插槽名 → 暴露方法的调用器 */
  methods: Map<string, Record<string, (params?: any) => Promise<any>>>;
  /** 插槽名 → 暴露事件的触发器 */
  events: Map<string, Record<string, (data?: any) => void>>;
}

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

  // ========== 插槽系统 ==========

  /**
   * 处理插槽节点
   * 将 type="slot" 的节点替换为消费方传入的 slots 内容
   */
  resolveSlots(
    template: ComponentNode[],
    consumerSlots: Record<string, ComponentNode[]>,
  ): { nodes: ComponentNode[]; slotDefinitions: Map<string, SlotDefinition> } {
    const slotDefinitions = new Map<string, SlotDefinition>();

    const nodes = template.map((node) => {
      if (node.type === 'slot' && node.props?.name) {
        const slotName = node.props.name;

        // 收集插槽定义
        slotDefinitions.set(slotName, {
          name: slotName,
          title: node.props.title || slotName,
          description: node.props.description,
          accept: node.props.accept,
          maxItems: node.props.maxItems,
          expose: {
            variables: this.buildExposeVariablesMap(node.props.exposeVariables),
            methods: node.props.exposeMethods,
            events: node.props.exposeEvents,
          },
        });

        const slotContent = consumerSlots[slotName];
        if (slotContent && slotContent.length > 0) {
          return slotContent.length === 1 ? slotContent[0] : {
            ...node,
            type: 'div',
            children: slotContent.map((_, i) => `${slotName}_child_${i}`),
          };
        }

        return node;
      }
      return node;
    });

    return { nodes, slotDefinitions };
  }

  /**
   * 构建插槽暴露变量映射：变量名 → 表达式
   */
  private buildExposeVariablesMap(
    exposeVariables?: Array<{ name: string; expression: string }>,
  ): Record<string, string> | undefined {
    if (!exposeVariables || exposeVariables.length === 0) return undefined;
    const map: Record<string, string> = {};
    for (const ev of exposeVariables) {
      if (ev.name && ev.expression) {
        map[ev.name] = ev.expression;
      }
    }
    return Object.keys(map).length > 0 ? map : undefined;
  }

  /**
   * 创建插槽暴露上下文
   *
   * 核心方法：将插槽暴露的变量/方法/事件解析为运行时可用的上下文对象。
   * 消费方通过 $slot.{slotName}.{key} 引用。
   *
   * @param definition 卡片定义
   * @param slotDefinitions 插槽定义（从 resolveSlots 获取）
   * @param internalContext 卡片内部运行时上下文（包含内部组件状态）
   * @param internalMethodInvoker 内部组件方法调用器
   */
  createSlotExposeContext(
    definition: CustomCardDefinition,
    slotDefinitions: Map<string, SlotDefinition>,
    internalContext: Record<string, any>,
    internalMethodInvoker: (componentId: string, method: string, params?: any) => Promise<any>,
    internalEventEmitter: (componentId: string, eventName: string, data?: any) => void,
  ): SlotExposeContext {
    const variables = new Map<string, Record<string, any>>();
    const methods = new Map<string, Record<string, (params?: any) => Promise<any>>>();
    const events = new Map<string, Record<string, (data?: any) => void>>();

    for (const [slotName, slotDef] of slotDefinitions) {
      const expose = slotDef.expose;
      if (!expose) continue;

      // 1. 解析暴露变量：表达式 → 运行时值
      if (expose.variables) {
        const resolvedVars: Record<string, any> = {};
        for (const [varName, expression] of Object.entries(expose.variables)) {
          resolvedVars[varName] = this.expressionEngine.safeEvaluate(expression, internalContext);
        }
        variables.set(slotName, resolvedVars);
      }

      // 2. 构建暴露方法调用器：slotName.methodName → 内部组件方法
      if (expose.methods) {
        const methodInvokers: Record<string, (params?: any) => Promise<any>> = {};
        for (const methodDef of expose.methods) {
          // target 格式: "componentId.methodName" 或直接 "componentId"
          const [targetComponent, targetMethod] = methodDef.target.includes('.')
            ? methodDef.target.split('.')
            : [methodDef.target, methodDef.name];

          methodInvokers[methodDef.name] = async (params?: any) => {
            return internalMethodInvoker(targetComponent, targetMethod, params);
          };
        }
        methods.set(slotName, methodInvokers);
      }

      // 3. 构建暴露事件触发器：映射内部组件事件
      if (expose.events) {
        const eventTriggers: Record<string, (data?: any) => void> = {};
        for (const eventDef of expose.events) {
          // source 格式: "componentId.eventName"
          const [sourceComponent, sourceEvent] = eventDef.source.split('.');
          eventTriggers[eventDef.name] = (data?: any) => {
            internalEventEmitter(sourceComponent, sourceEvent, data);
          };
        }
        events.set(slotName, eventTriggers);
      }
    }

    return { variables, methods, events };
  }

  /**
   * 将插槽暴露上下文扁平化为 $slot 对象
   * 供消费方的表达式和动作链引用
   *
   * 结构：
   * $slot = {
   *   header: {
   *     currentRecord: ...,        // 暴露变量
   *     validate: async () => ..., // 暴露方法
   *     onSubmit: (data) => ...,   // 暴露事件触发器
   *   },
   *   footer: { ... }
   * }
   */
  flattenSlotExposeContext(exposeCtx: SlotExposeContext): Record<string, Record<string, any>> {
    const $slot: Record<string, Record<string, any>> = {};

    for (const [slotName, vars] of exposeCtx.variables) {
      if (!$slot[slotName]) $slot[slotName] = {};
      Object.assign($slot[slotName], vars);
    }

    for (const [slotName, methodInvokers] of exposeCtx.methods) {
      if (!$slot[slotName]) $slot[slotName] = {};
      Object.assign($slot[slotName], methodInvokers);
    }

    for (const [slotName, eventTriggers] of exposeCtx.events) {
      if (!$slot[slotName]) $slot[slotName] = {};
      Object.assign($slot[slotName], eventTriggers);
    }

    return $slot;
  }

  /**
   * 获取插槽暴露的方法定义（供设计器展示）
   */
  getSlotExposedMethods(
    definition: CustomCardDefinition,
  ): Array<{ name: string; title: string; description?: string; target: string; params?: any[] }> {
    const methods: Array<{ name: string; title: string; description?: string; target: string; params?: any[] }> = [];

    for (const node of definition.template) {
      if (node.type === 'slot' && node.props?.exposeMethods) {
        for (const method of node.props.exposeMethods) {
          methods.push({
            name: `${node.props.name}.${method.name}`,
            title: `[${node.props.name}] ${method.title}`,
            description: method.description,
            target: method.target,
            params: method.params,
          });
        }
      }
    }

    return methods;
  }

  /**
   * 获取插槽暴露的事件定义（供设计器展示）
   */
  getSlotExposedEvents(
    definition: CustomCardDefinition,
  ): Array<{ name: string; title: string; source: string; payload?: Record<string, string> }> {
    const events: Array<{ name: string; title: string; source: string; payload?: Record<string, string> }> = [];

    for (const node of definition.template) {
      if (node.type === 'slot' && node.props?.exposeEvents) {
        for (const event of node.props.exposeEvents) {
          events.push({
            name: `${node.props.name}.${event.name}`,
            title: `[${node.props.name}] ${event.title}`,
            source: event.source,
            payload: event.payload,
          });
        }
      }
    }

    return events;
  }

  // ========== invokeMethod 路由 ==========

  /**
   * 创建卡片方法处理器（支持插槽方法路由）
   *
   * invokeMethod(instanceId, methodName, params) 路由规则：
   *   - methodName 包含 "." → 插槽方法路由：slotName.methodName
   *     1. 查找 slotDefinitions 中的 expose.methods
   *     2. 找到对应的 target（内部组件.方法）
   *     3. 调用内部组件方法，返回 $result
   *   - methodName 不包含 "." → 卡片级方法：直接查找 interface.methods
   *     1. 找到 MethodDefinition.implementation
   *     2. 在卡片作用域内执行动作链
   *     3. 返回结果
   */
  createMethodInvoker(
    definition: CustomCardDefinition,
    slotDefinitions: Map<string, SlotDefinition>,
    context: Record<string, any>,
    internalMethodInvoker: (componentId: string, method: string, params?: any) => Promise<any>,
    eventCompiler: any,
  ): (methodName: string, params?: any) => Promise<any> {
    return async (methodName: string, params?: any) => {
      // 路由判断：是否为插槽方法（slotName.methodName）
      if (methodName.includes('.')) {
        const [slotName, slotMethodName] = methodName.split('.', 2);
        return this.invokeSlotMethod(
          slotName, slotMethodName, params,
          slotDefinitions, internalMethodInvoker,
        );
      }

      // 卡片级方法
      return this.invokeCardMethod(
        methodName, params,
        definition, context, eventCompiler,
      );
    };
  }

  /**
   * 调用插槽暴露的方法
   *
   * 流程：
   * 1. 从 slotDefinitions 查找 slotName 的 expose.methods
   * 2. 找到匹配 slotMethodName 的方法定义
   * 3. 解析 target（如 "form_01.validate"）
   * 4. 调用内部组件方法
   * 5. 返回结果给消费方（$result）
   */
  private async invokeSlotMethod(
    slotName: string,
    slotMethodName: string,
    params: any,
    slotDefinitions: Map<string, SlotDefinition>,
    internalMethodInvoker: (componentId: string, method: string, params?: any) => Promise<any>,
  ): Promise<any> {
    const slotDef = slotDefinitions.get(slotName);
    if (!slotDef?.expose?.methods) {
      console.warn(`Slot "${slotName}" not found or has no exposed methods`);
      return undefined;
    }

    const methodDef = slotDef.expose.methods.find((m) => m.name === slotMethodName);
    if (!methodDef) {
      console.warn(`Method "${slotMethodName}" not found in slot "${slotName}"`);
      return undefined;
    }

    // 解析 target：componentId.methodName 或 componentId
    const [targetComponent, targetMethod] = methodDef.target.includes('.')
      ? methodDef.target.split('.')
      : [methodDef.target, slotMethodName];

    try {
      const result = await internalMethodInvoker(targetComponent, targetMethod, params);
      return result;
    } catch (e) {
      console.error(`Slot method "${slotName}.${slotMethodName}" execution failed:`, e);
      return undefined;
    }
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
