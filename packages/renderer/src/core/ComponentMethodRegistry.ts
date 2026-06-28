/**
 * ComponentMethodRegistry — 组件方法注册表
 *
 * 管理页面内所有组件暴露的可调用方法。
 * 组件 mount 时 register，unmount 时 unregister。
 * invokeMethod 动作通过此注册表查找并执行方法。
 *
 * 每个 PageRenderer 实例拥有独立的注册表，不跨页面共享。
 */

/** 方法处理器（接收参数，返回结果） */
export type MethodHandler = (params?: any) => Promise<any> | any;

/** 方法元数据 */
export interface MethodMeta {
  /** 显示标签 */
  label: string;
  /** 方法描述 */
  description?: string;
}

/** 已注册方法的完整信息 */
export interface RegisteredMethod {
  /** 组件实例 ID */
  componentId: string;
  /** 组件类型 */
  componentType: string;
  /** 方法名 */
  methodName: string;
  /** 显示标签 */
  label: string;
  /** 方法描述 */
  description?: string;
  /** 方法处理器 */
  handler: MethodHandler;
}

/**
 * 组件方法注册表
 *
 * 组件 mount 时注册方法，unmount 时注销。
 * 通过 invoke(componentId, methodName, params) 调用。
 */
export class ComponentMethodRegistry {
  /** componentId → methodName → handler */
  private handlers = new Map<string, Map<string, MethodHandler>>();
  /** componentId → methodName → metadata */
  private metadata = new Map<string, Map<string, MethodMeta>>();
  /** componentId → componentType（用于 listAll 返回） */
  private componentTypes = new Map<string, string>();

  /**
   * 注册组件方法
   *
   * @param componentId - 组件实例 ID
   * @param componentType - 组件类型标识
   * @param methods - 方法名 → 处理器映射
   * @param meta - 方法名 → 元数据映射（可选）
   */
  register(
    componentId: string,
    componentType: string,
    methods: Record<string, MethodHandler>,
    meta?: Record<string, MethodMeta>,
  ): void {
    const handlerMap = new Map<string, MethodHandler>();
    const metaMap = new Map<string, MethodMeta>();

    for (const [name, handler] of Object.entries(methods)) {
      handlerMap.set(name, handler);
    }
    if (meta) {
      for (const [name, m] of Object.entries(meta)) {
        metaMap.set(name, m);
      }
    }

    this.handlers.set(componentId, handlerMap);
    this.metadata.set(componentId, metaMap);
    this.componentTypes.set(componentId, componentType);
  }

  /**
   * 注销组件的所有方法
   *
   * @param componentId - 组件实例 ID
   */
  unregister(componentId: string): void {
    this.handlers.delete(componentId);
    this.metadata.delete(componentId);
    this.componentTypes.delete(componentId);
  }

  /**
   * 调用组件方法
   *
   * @param componentId - 目标组件 ID
   * @param methodName - 方法名
   * @param params - 方法参数
   * @returns 方法返回值
   */
  async invoke(componentId: string, methodName: string, params?: any): Promise<any> {
    const handlerMap = this.handlers.get(componentId);
    if (!handlerMap) {
      console.warn(`[ComponentMethodRegistry] 组件 "${componentId}" 未注册任何方法`);
      return undefined;
    }

    const handler = handlerMap.get(methodName);
    if (!handler) {
      console.warn(`[ComponentMethodRegistry] 组件 "${componentId}" 没有方法 "${methodName}"`);
      return undefined;
    }

    try {
      return await handler(params);
    } catch (e) {
      console.error(`[ComponentMethodRegistry] 调用 ${componentId}.${methodName} 失败:`, e);
      return undefined;
    }
  }

  /**
   * 获取所有已注册方法（设计时用）
   */
  listAll(): RegisteredMethod[] {
    const result: RegisteredMethod[] = [];
    for (const [componentId, handlerMap] of this.handlers) {
      const componentType = this.componentTypes.get(componentId) ?? 'unknown';
      const metaMap = this.metadata.get(componentId);
      for (const [methodName, handler] of handlerMap) {
        const meta = metaMap?.get(methodName);
        result.push({
          componentId,
          componentType,
          methodName,
          label: meta?.label ?? methodName,
          description: meta?.description,
          handler,
        });
      }
    }
    return result;
  }

  /**
   * 获取指定组件的方法列表
   */
  listByComponent(componentId: string): RegisteredMethod[] {
    const handlerMap = this.handlers.get(componentId);
    if (!handlerMap) return [];

    const componentType = this.componentTypes.get(componentId) ?? 'unknown';
    const metaMap = this.metadata.get(componentId);
    const result: RegisteredMethod[] = [];

    for (const [methodName, handler] of handlerMap) {
      const meta = metaMap?.get(methodName);
      result.push({
        componentId,
        componentType,
        methodName,
        label: meta?.label ?? methodName,
        description: meta?.description,
        handler,
      });
    }
    return result;
  }

  /**
   * 检查组件是否已注册
   */
  hasComponent(componentId: string): boolean {
    return this.handlers.has(componentId);
  }

  /**
   * 清空所有注册
   */
  clear(): void {
    this.handlers.clear();
    this.metadata.clear();
    this.componentTypes.clear();
  }
}
