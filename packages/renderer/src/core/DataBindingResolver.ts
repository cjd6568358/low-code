/**
 * DataBindingResolver — 属性解析器
 *
 * 解析组件 props 中的三种值形式：
 * - 字面量：直接返回
 * - 变量引用（type: 'var'）：同步解析
 * - 表达式（type: 'express'）：异步执行
 *
 * 支持依赖收集和变更传播
 */

import type { RenderContext } from '@low-code/shared';
import type { PropValue, VariableBinding, ExpressionBinding } from '@low-code/shared';
import { dependencyGraph, extractDependencies } from './DependencyGraph';

/** 解析后的属性 */
export interface ResolvedProps {
  /** 解析后的属性值 */
  props: Record<string, any>;
  /** 需要异步解析的表达式列表 */
  asyncExpressions: Array<{
    key: string;
    value: ExpressionBinding;
    dependencies: string[];
  }>;
}

/**
 * 属性解析器
 */
export class DataBindingResolver {
  /**
   * 解析单个属性值
   *
   * @param value 属性值
   * @param context 运行时上下文
   * @returns 解析后的值（字面量和变量引用同步返回，表达式返回 undefined）
   */
  resolveValue(value: PropValue, context: RenderContext): any {
    // 1. 字面量
    if (!this.isBinding(value)) {
      return value;
    }

    // 2. 变量引用
    if (this.isVariableBinding(value)) {
      return this.resolveVariable(value.value, context);
    }

    // 3. 表达式（返回 undefined，需要异步解析）
    return undefined;
  }

  /**
   * 解析所有属性（同步部分）
   *
   * @param props 组件属性
   * @param context 运行时上下文
   * @returns 解析结果（包含同步结果和需要异步解析的表达式列表）
   */
  resolveProps(props: Record<string, PropValue>, context: RenderContext): ResolvedProps {
    const resolved: Record<string, any> = {};
    const asyncExpressions: ResolvedProps['asyncExpressions'] = [];

    for (const [key, value] of Object.entries(props)) {
      // 字面量
      if (!this.isBinding(value)) {
        resolved[key] = value;
        continue;
      }

      // 变量引用（同步）
      if (this.isVariableBinding(value)) {
        resolved[key] = this.resolveVariable(value.value, context);
        continue;
      }

      // 表达式（异步）
      if (this.isExpressionBinding(value)) {
        const dependencies = extractDependencies(value.value);
        asyncExpressions.push({ key, value, dependencies });
        // 占位值，异步解析后会更新
        resolved[key] = undefined;
        continue;
      }

      // 未知类型，当作字面量
      resolved[key] = value;
    }

    return { props: resolved, asyncExpressions };
  }

  /**
   * 批量解析所有属性（异步版本，支持表达式）
   *
   * @param props 组件属性
   * @param context 运行时上下文
   * @returns 解析后的属性值
   */
  async resolvePropsAsync(
    props: Record<string, PropValue>,
    context: RenderContext,
    expressionExecutor?: (code: string, context: RenderContext) => Promise<any>,
  ): Promise<Record<string, any>> {
    const { props: resolved, asyncExpressions } = this.resolveProps(props, context);

    // 如果有表达式需要解析
    if (asyncExpressions.length > 0 && expressionExecutor) {
      for (const { key, value } of asyncExpressions) {
        try {
          resolved[key] = await expressionExecutor(value.value, context);
        } catch (error) {
          console.error(`[DataBindingResolver] Expression execution failed for ${key}:`, error);
          resolved[key] = undefined;
        }
      }
    }

    return resolved;
  }

  /**
   * 注册表达式的依赖
   *
   * @param componentId 组件 ID
   * @param props 组件属性
   */
  registerDependencies(componentId: string, props: Record<string, PropValue>): void {
    for (const [key, value] of Object.entries(props)) {
      if (this.isExpressionBinding(value)) {
        const expressionKey = `${componentId}.${key}`;
        const dependencies = extractDependencies(value.value);
        dependencyGraph.register(expressionKey, dependencies);
      }
    }
  }

  /**
   * 判断是否为绑定类型（变量引用或表达式）
   */
  private isBinding(value: PropValue): value is VariableBinding | ExpressionBinding {
    return (
      value != null &&
      typeof value === 'object' &&
      'type' in value &&
      'value' in value &&
      (value.type === 'variable' || value.type === 'expression')
    );
  }

  /**
   * 判断是否为变量引用
   */
  private isVariableBinding(value: PropValue): value is VariableBinding {
    return this.isBinding(value) && value.type === 'variable';
  }

  /**
   * 判断是否为表达式
   */
  private isExpressionBinding(value: PropValue): value is ExpressionBinding {
    return this.isBinding(value) && value.type === 'expression';
  }

  /**
   * 解析变量引用（同步）
   *
   * @param path 变量路径（如 "$platform.web"、"$user.name"）
   * @param context 运行时上下文
   * @returns 解析后的值
   */
  private resolveVariable(path: string, context: RenderContext): any {
    if (!path || typeof path !== 'string') return undefined;

    // 确保以 $ 开头
    const cleanPath = path.startsWith('$') ? path : `$${path}`;
    const segments = cleanPath.split('.');

    if (segments.length < 2) return undefined;

    const rootKey = segments[0]; // 保留 $ 前缀，如 "$component"
    const rootKeyNoDollar = rootKey.slice(1); // 去掉 $，如 "component"
    const restPath = segments.slice(1).join('.');

    // 优先查找 $ 前缀 key（ReactiveEnvContext 格式），再查找无前缀 key（RenderContext 格式）
    const root = (context as any)[rootKey] ?? (context as any)[rootKeyNoDollar];
    if (root == null) return undefined;

    // 按路径逐级取值
    return this.getNestedValue(root, restPath);
  }

  /**
   * 按路径获取嵌套值
   */
  private getNestedValue(obj: any, path: string): any {
    const segments = path.split('.');
    let current = obj;

    for (const segment of segments) {
      if (current == null) return undefined;

      // 处理数组索引
      const arrayMatch = segment.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, key, index] = arrayMatch;
        current = current[key]?.[parseInt(index, 10)];
      } else {
        current = current[segment];
      }
    }

    return current;
  }
}
