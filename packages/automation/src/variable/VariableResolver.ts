/**
 * 变量插值解析器
 *
 * 支持 {{expression}} 语法引用事件数据和上下文变量。
 *
 * 变量路径：
 * - {{event.type}} — 事件类型
 * - {{event.data.entityCode}} — 实体编码
 * - {{event.data.recordId}} — 记录 ID
 * - {{event.data.record.fieldName}} — 记录字段值
 * - {{event.data.changes.fieldName}} — 字段变更值
 * - {{event.data.operatorId}} — 操作人 ID
 * - {{rule.id}} — 规则 ID
 * - {{rule.name}} — 规则名称
 * - {{now}} — 当前时间
 */

import type { ExecutionEventInfo } from '../types/execution';

/** 模板变量正则 {{path}} */
const TEMPLATE_VAR_REGEX = /\{\{([^}]+)\}\}/g;

/**
 * 变量解析上下文
 */
export interface VariableContext {
  /** 事件信息 */
  event?: ExecutionEventInfo;
  /** 规则信息 */
  rule?: {
    id: string;
    name: string;
  };
  /** 额外变量 */
  variables?: Record<string, unknown>;
}

/**
 * 变量插值解析器
 *
 * 解析模板字符串中的 {{expression}} 变量，替换为实际值。
 */
export class VariableResolver {
  /**
   * 解析模板字符串中的变量
   *
   * @param template - 包含 {{variable}} 的模板字符串
   * @param context - 变量上下文
   * @returns 解析后的字符串
   */
  resolve(template: string, context: VariableContext): string {
    if (!template) return '';

    return template.replace(TEMPLATE_VAR_REGEX, (_match, path: string) => {
      const trimmedPath = path.trim();
      const value = this.resolveVariable(trimmedPath, context);
      return value != null ? String(value) : '';
    });
  }

  /**
   * 解析对象中所有字符串值的变量
   *
   * 递归处理嵌套对象和数组。
   *
   * @param obj - 包含变量的对象
   * @param context - 变量上下文
   * @returns 解析后的对象
   */
  resolveObject<T>(obj: T, context: VariableContext): T {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === 'string') {
      return this.resolve(obj, context) as unknown as T;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.resolveObject(item, context)) as unknown as T;
    }

    if (typeof obj === 'object') {
      const resolved: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        resolved[key] = this.resolveObject(value, context);
      }
      return resolved as T;
    }

    return obj;
  }

  /**
   * 按路径解析变量值
   *
   * @param path - 变量路径（如 "event.data.record.amount"）
   * @param context - 变量上下文
   * @returns 变量值
   */
  private resolveVariable(path: string, context: VariableContext): unknown {
    // 特殊变量：当前时间
    if (path === 'now') {
      return new Date().toISOString();
    }

    // 按路径前缀分发
    const parts = path.split('.');
    const prefix = parts[0];

    switch (prefix) {
      case 'event':
        return this.resolveEventPath(parts.slice(1), context.event);
      case 'rule':
        return this.resolveRulePath(parts.slice(1), context.rule);
      default:
        // 尝试从 variables 中查找
        return this.resolveFromObject(path, context.variables);
    }
  }

  /**
   * 解析事件相关变量
   */
  private resolveEventPath(parts: string[], event?: ExecutionEventInfo): unknown {
    if (!event) return undefined;

    if (parts.length === 0) return event.type;

    const [first, ...rest] = parts;

    switch (first) {
      case 'type':
        return event.type;
      case 'source':
        return event.source;
      case 'timestamp':
        return event.timestamp;
      case 'data':
        return rest.length > 0
          ? this.resolveFromObject(rest.join('.'), event.data)
          : event.data;
      default:
        return undefined;
    }
  }

  /**
   * 解析规则相关变量
   */
  private resolveRulePath(parts: string[], rule?: { id: string; name: string }): unknown {
    if (!rule) return undefined;

    const [first] = parts;

    switch (first) {
      case 'id':
        return rule.id;
      case 'name':
        return rule.name;
      default:
        return undefined;
    }
  }

  /**
   * 从对象中按路径取值
   *
   * @param path - 点分路径（如 "record.amount"）
   * @param obj - 数据对象
   * @returns 路径对应的值
   */
  private resolveFromObject(path: string, obj?: Record<string, unknown>): unknown {
    if (!obj) return undefined;

    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      if (typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }
}

/**
 * 默认变量解析器实例
 */
export const variableResolver = new VariableResolver();
