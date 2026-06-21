/**
 * VariableBindingEngine — 变量绑定引擎
 *
 * 负责变量引用和表达式的执行，包括：
 * - 依赖收集：解析变量引用/表达式，提取依赖路径
 * - 依赖注册：将组件/字段与变量路径的依赖关系注册到依赖图
 * - 值解析：将变量引用/表达式解析为实际值
 * - 变更传播：变量值变化时，触发依赖组件重新计算
 * - 缓存管理：表达式执行结果缓存
 */

import type { EnvironmentContext } from '@low-code/shared';
import { environmentRegistry, dependencyGraph } from './EnvironmentRegistry';

/** 变量模式 */
type VariableMode = 'variable' | 'expression';

/** 组件属性绑定信息 */
interface ComponentBinding {
  componentId: string;
  propName: string;
  value: string;
  mode: VariableMode;
}

/** 表达式缓存项 */
interface CacheEntry {
  /** 缓存的值 */
  value: any;
  /** 依赖的变量路径 */
  dependencies: string[];
  /** 依赖变量的快照（用于检测变更） */
  snapshot: Map<string, any>;
  /** 最后更新时间 */
  updatedAt: number;
}

/**
 * 变量绑定引擎实现
 */
export class VariableBindingEngineImpl {
  /** 组件属性绑定注册表 */
  private bindings = new Map<string, ComponentBinding>();

  /** 表达式缓存 */
  private expressionCache = new Map<string, CacheEntry>();

  /** 缓存有效期（毫秒） */
  private cacheTTL = 5000;

  /** 延迟更新定时器 */
  private updateTimer: ReturnType<typeof setTimeout> | null = null;

  /** 待更新的组件列表 */
  private pendingUpdates = new Set<string>();

  /** 上下文变更回调 */
  private onContextChange?: (context: EnvironmentContext) => void;

  /**
   * 注册组件属性绑定
   */
  registerBinding(
    componentId: string,
    propName: string,
    value: string,
    mode: VariableMode,
  ): void {
    const key = `${componentId}.${propName}`;

    // 注册绑定信息
    this.bindings.set(key, {
      componentId,
      propName,
      value,
      mode,
    });

    // 收集依赖
    const dependencies = this.collectDependencies(value, mode);

    // 注册到依赖图
    dependencyGraph.register(key, dependencies);
  }

  /**
   * 注销组件属性绑定
   */
  unregisterBinding(componentId: string, propName: string): void {
    const key = `${componentId}.${propName}`;
    this.bindings.delete(key);
    this.expressionCache.delete(key);
  }

  /**
   * 注销组件的所有绑定
   */
  unregisterComponent(componentId: string): void {
    for (const [key, binding] of this.bindings) {
      if (binding.componentId === componentId) {
        this.bindings.delete(key);
        this.expressionCache.delete(key);
      }
    }
  }

  /**
   * 收集依赖
   */
  private collectDependencies(value: string, mode: VariableMode): string[] {
    return environmentRegistry.collectDependencies(value, mode);
  }

  /**
   * 解析变量值
   *
   * @param value 变量引用或表达式的值
   * @param mode 模式
   * @param context 运行时上下文
   * @returns 解析后的实际值
   */
  async resolveValue(
    value: string,
    mode: VariableMode,
    context: EnvironmentContext,
  ): Promise<any> {
    if (!value || typeof value !== 'string') {
      return value;
    }

    if (mode === 'variable') {
      return this.resolveVariable(value, context);
    }

    return this.resolveExpression(value, context);
  }

  /**
   * 解析变量引用（同步）
   */
  private resolveVariable(path: string, context: EnvironmentContext): any {
    if (!path.startsWith('$')) {
      return path;
    }

    // 移除 $ 前缀，按 . 分割
    const parts = path.replace(/^\$/, '').split('.');
    const varName = `$${parts[0]}`;
    const restParts = parts.slice(1);

    // 获取顶级变量值
    const topLevelKey = parts[0] as keyof EnvironmentContext;
    let current: any = context[topLevelKey];

    if (current === undefined) {
      console.warn(`[VariableBinding] Variable not found: ${varName}`);
      return undefined;
    }

    // 按路径逐级取值
    for (const part of restParts) {
      if (current === null || current === undefined) {
        return undefined;
      }

      // 处理数组索引
      const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, arrayName, index] = arrayMatch;
        current = current[arrayName]?.[parseInt(index, 10)];
      } else {
        current = current[part];
      }
    }

    return current;
  }

  /**
   * 解析表达式（异步，带缓存）
   */
  private async resolveExpression(
    expression: string,
    context: EnvironmentContext,
  ): Promise<any> {
    // 检查缓存
    const cached = this.getFromCache(expression, context);
    if (cached !== undefined) {
      return cached;
    }

    // 提取表达式中的变量引用
    const variables = this.extractVariables(expression);

    // 构建执行上下文
    const execContext: Record<string, any> = {};
    for (const varPath of variables) {
      const value = this.resolveVariable(varPath, context);
      this.setNestedValue(execContext, varPath, value);
    }

    // 执行表达式
    try {
      const result = await this.executeExpression(expression, execContext);

      // 缓存结果
      this.setCache(expression, result, variables, context);

      return result;
    } catch (error) {
      console.error(`[VariableBinding] Expression execution failed: ${expression}`, error);
      return undefined;
    }
  }

  /**
   * 提取表达式中的变量引用
   */
  private extractVariables(expression: string): string[] {
    const regex = /\$[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*(?:\[\d+\])?)*/g;
    const matches = expression.match(regex);
    return matches ? [...new Set(matches)] : [];
  }

  /**
   * 执行表达式
   */
  private async executeExpression(
    expression: string,
    context: Record<string, any>,
  ): Promise<any> {
    // 替换 $variable 为实际变量名
    let processedExpr = expression;

    // 将 $xxx.yyy 替换为 __var__xxx_yyy
    const varMap = new Map<string, string>();
    const regex = /\$([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*(?:\[\d+\])?)*)/g;
    let match;

    while ((match = regex.exec(expression)) !== null) {
      const fullMatch = match[0];
      const varPath = match[1];
      const safeName = `__var__${varPath.replace(/\./g, '_').replace(/\[/g, '_').replace(/\]/g, '')}`;

      if (!varMap.has(fullMatch)) {
        varMap.set(fullMatch, safeName);
        processedExpr = processedExpr.replace(new RegExp(escapeRegExp(fullMatch), 'g'), safeName);
      }
    }

    // 构建函数参数
    const paramNames = Array.from(varMap.values());
    const paramValues = paramNames.map((name) => {
      // 从 context 中获取值
      const originalPath = Array.from(varMap.entries()).find(([, v]) => v === name)?.[0];
      if (originalPath) {
        return this.getNestedValue(context, originalPath);
      }
      return undefined;
    });

    // 使用 Function 构造器执行（生产环境应使用更安全的沙箱）
    try {
      const fn = new Function(...paramNames, `"use strict"; return (${processedExpr})`);
      const result = fn(...paramValues);
      // 如果返回的是 Promise，await 获取结果
      if (result instanceof Promise) {
        return await result;
      }
      return result;
    } catch (error) {
      throw new Error(`Expression execution error: ${error}`);
    }
  }

  /**
   * 从缓存获取值
   */
  private getFromCache(expression: string, context: EnvironmentContext): any | undefined {
    const cached = this.expressionCache.get(expression);
    if (!cached) return undefined;

    // 检查是否过期
    if (Date.now() - cached.updatedAt > this.cacheTTL) {
      this.expressionCache.delete(expression);
      return undefined;
    }

    // 检查依赖是否变更
    for (const [depPath, oldSnapshot] of cached.snapshot) {
      const currentValue = this.resolveVariable(depPath, context);
      if (currentValue !== oldSnapshot) {
        this.expressionCache.delete(expression);
        return undefined;
      }
    }

    return cached.value;
  }

  /**
   * 设置缓存
   */
  private setCache(
    expression: string,
    value: any,
    dependencies: string[],
    context: EnvironmentContext,
  ): void {
    const snapshot = new Map<string, any>();
    for (const dep of dependencies) {
      snapshot.set(dep, this.resolveVariable(dep, context));
    }

    this.expressionCache.set(expression, {
      value,
      dependencies,
      snapshot,
      updatedAt: Date.now(),
    });
  }

  /**
   * 设置嵌套值
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const parts = path.replace(/^\$/, '').split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }

    current[parts[parts.length - 1]] = value;
  }

  /**
   * 获取嵌套值
   */
  private getNestedValue(obj: any, path: string): any {
    const parts = path.replace(/^\$/, '').split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }

      // 处理数组索引
      const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, arrayName, index] = arrayMatch;
        current = current[arrayName]?.[parseInt(index, 10)];
      } else {
        current = current[part];
      }
    }

    return current;
  }

  /**
   * 触发变量变更
   *
   * 变量值变化时调用，触发依赖组件重新计算
   */
  onVariableChange(
    variablePath: string,
    newValue: any,
    context: EnvironmentContext,
  ): void {
    // 获取依赖该变量的所有组件/字段
    const dependents = dependencyGraph.getDependents(variablePath);

    // 清除相关缓存
    for (const key of dependents) {
      this.expressionCache.delete(key);
    }

    // 添加到待更新列表
    for (const key of dependents) {
      this.pendingUpdates.add(key);
    }

    // 延迟批量更新
    this.scheduleUpdate(context);
  }

  /**
   * 调度延迟更新
   */
  private scheduleUpdate(context: EnvironmentContext): void {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }

    this.updateTimer = setTimeout(() => {
      this.flushUpdates(context);
      this.updateTimer = null;
    }, 16); // 约一帧的时间
  }

  /**
   * 执行批量更新
   */
  private async flushUpdates(context: EnvironmentContext): Promise<void> {
    if (this.pendingUpdates.size === 0) return;

    // 按拓扑排序
    const sortedKeys = dependencyGraph.topologicalSort(
      Array.from(this.pendingUpdates),
    );

    this.pendingUpdates.clear();

    // 按顺序解析并更新
    for (const key of sortedKeys) {
      const binding = this.bindings.get(key);
      if (!binding) continue;

      const resolvedValue = await this.resolveValue(
        binding.value,
        binding.mode,
        context,
      );

      // 通知上下文变更
      this.onContextChange?.(context);
    }
  }

  /**
   * 设置上下文变更回调
   */
  setOnContextChange(callback: (context: EnvironmentContext) => void): void {
    this.onContextChange = callback;
  }

  /**
   * 清除所有绑定和缓存
   */
  clear(): void {
    this.bindings.clear();
    this.expressionCache.clear();
    dependencyGraph.clear();

    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }

    this.pendingUpdates.clear();
  }

  /**
   * 批量解析组件 props
   */
  async resolveComponentProps(
    props: Record<string, any>,
    bindings: Record<string, VariableMode>,
    context: EnvironmentContext,
  ): Promise<Record<string, any>> {
    const resolved: Record<string, any> = {};

    for (const [key, value] of Object.entries(props)) {
      const mode = bindings[key];
      if (mode) {
        resolved[key] = await this.resolveValue(
          typeof value === 'string' ? value : String(value),
          mode,
          context,
        );
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  /**
   * 检测循环依赖
   *
   * @returns 循环依赖的路径列表，如果没有循环则返回空数组
   */
  detectCycles(): string[][] {
    return dependencyGraph.detectCycles();
  }
}

/**
 * 转义正则表达式特殊字符
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 变量绑定引擎单例 */
export const variableBindingEngine = new VariableBindingEngineImpl();
