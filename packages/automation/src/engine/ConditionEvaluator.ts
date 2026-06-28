/**
 * 条件求值器
 *
 * 负责求值自动化规则的条件配置。
 * 支持 15 种运算符和嵌套 AND/OR 逻辑组合。
 *
 * 运算符：eq / ne / gt / gte / lt / lte / in / not_in / contains / not_contains
 *         is_empty / is_not_empty / between / changed_to / changed_from
 */

import type {
  AutomationCondition,
  ConditionRule,
  ConditionOperator,
  ConditionEvaluationResult,
  ConditionRuleResult,
  ConditionValueType,
} from '../types/condition';
import type { PlatformEvent } from '../types/trigger';
import { VariableResolver, type VariableContext } from '../variable/VariableResolver';

/**
 * 条件求值器
 *
 * 对条件配置进行求值，返回是否匹配及详细结果。
 */
export class ConditionEvaluator {
  private readonly resolver: VariableResolver;

  constructor() {
    this.resolver = new VariableResolver();
  }

  /**
   * 求值条件配置
   *
   * @param condition - 条件配置
   * @param event - 触发事件
   * @param variables - 额外变量
   * @returns 求值结果
   */
  evaluate(
    condition: AutomationCondition | undefined,
    event: PlatformEvent,
    variables?: Record<string, unknown>,
  ): ConditionEvaluationResult {
    const startTime = Date.now();
    const details: ConditionRuleResult[] = [];

    // 没有条件则默认匹配
    if (!condition) {
      return {
        matched: true,
        details: [],
        evaluatedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      };
    }

    const context: VariableContext = {
      event: {
        type: event.type,
        source: event.source,
        data: event.data,
        timestamp: event.timestamp,
      },
      variables,
    };

    const matched = this.evaluateCondition(condition, context, details);

    return {
      matched,
      details,
      evaluatedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * 求值条件组（递归）
   */
  private evaluateCondition(
    condition: AutomationCondition,
    context: VariableContext,
    details: ConditionRuleResult[],
  ): boolean {
    const results: boolean[] = [];

    // 求值当前层级的规则
    for (const rule of condition.rules) {
      const ruleResult = this.evaluateRule(rule, context);
      details.push(ruleResult);
      results.push(ruleResult.matched);
    }

    // 求值嵌套条件组
    if (condition.groups) {
      for (const group of condition.groups) {
        const groupResult = this.evaluateCondition(group, context, details);
        results.push(groupResult);
      }
    }

    // 根据逻辑组合结果
    if (condition.logic === 'and') {
      return results.every(r => r);
    } else {
      return results.some(r => r);
    }
  }

  /**
   * 求值单条规则
   */
  private evaluateRule(rule: ConditionRule, context: VariableContext): ConditionRuleResult {
    // 解析字段值
    const actual = this.resolveFieldValue(rule.field, context);

    // 解析比较值
    const expected = this.resolveCompareValue(rule.value, rule.valueType, context);

    // 执行比较
    const matched = this.compare(actual, rule.operator, expected, context);

    return {
      rule: `${rule.field} ${rule.operator} ${JSON.stringify(expected)}`,
      field: rule.field,
      operator: rule.operator,
      expected,
      actual,
      matched,
    };
  }

  /**
   * 解析字段值
   */
  private resolveFieldValue(field: string, context: VariableContext): unknown {
    // 支持 {{variable}} 语法
    if (field.includes('{{')) {
      return this.resolver.resolve(field, context);
    }

    // 按路径从上下文中取值
    const parts = field.split('.');

    // 特殊前缀处理
    if (parts[0] === 'event' || parts[0] === 'rule') {
      return this.resolver.resolve(`{{${field}}}`, context);
    }

    // 从变量中取值
    return this.getNestedValue(context.variables, field);
  }

  /**
   * 解析比较值
   */
  private resolveCompareValue(
    value: unknown,
    valueType: ConditionValueType | undefined,
    context: VariableContext,
  ): unknown {
    if (value === undefined || value === null) return value;

    switch (valueType) {
      case 'expression':
        // 表达式求值（简化实现，直接返回值）
        return value;
      case 'variable':
        // 变量引用
        if (typeof value === 'string') {
          return this.resolver.resolve(`{{${value}}}`, context);
        }
        return value;
      case 'literal':
      default:
        // 字面量，但支持字符串中的变量插值
        if (typeof value === 'string' && value.includes('{{')) {
          return this.resolver.resolve(value, context);
        }
        return value;
    }
  }

  /**
   * 执行比较操作
   */
  private compare(
    actual: unknown,
    operator: ConditionOperator,
    expected: unknown,
    context: VariableContext,
  ): boolean {
    switch (operator) {
      case 'eq':
        return this.isEqual(actual, expected);
      case 'ne':
        return !this.isEqual(actual, expected);
      case 'gt':
        return this.isGreaterThan(actual, expected);
      case 'gte':
        return this.isGreaterThanOrEqual(actual, expected);
      case 'lt':
        return this.isLessThan(actual, expected);
      case 'lte':
        return this.isLessThanOrEqual(actual, expected);
      case 'in':
        return this.isIn(actual, expected);
      case 'not_in':
        return !this.isIn(actual, expected);
      case 'contains':
        return this.doesContain(actual, expected);
      case 'not_contains':
        return !this.doesContain(actual, expected);
      case 'is_empty':
        return this.isEmpty(actual);
      case 'is_not_empty':
        return !this.isEmpty(actual);
      case 'between':
        return this.isBetween(actual, expected);
      case 'changed_to':
        return this.isChangedTo(actual, expected, context);
      case 'changed_from':
        return this.isChangedFrom(actual, expected, context);
      default:
        return false;
    }
  }

  /**
   * 相等比较
   */
  private isEqual(actual: unknown, expected: unknown): boolean {
    if (actual === expected) return true;
    if (actual == null && expected == null) return true;
    // 类型转换比较
    return String(actual) === String(expected);
  }

  /**
   * 大于比较
   */
  private isGreaterThan(actual: unknown, expected: unknown): boolean {
    const numActual = Number(actual);
    const numExpected = Number(expected);
    if (isNaN(numActual) || isNaN(numExpected)) return false;
    return numActual > numExpected;
  }

  /**
   * 大于等于比较
   */
  private isGreaterThanOrEqual(actual: unknown, expected: unknown): boolean {
    const numActual = Number(actual);
    const numExpected = Number(expected);
    if (isNaN(numActual) || isNaN(numExpected)) return false;
    return numActual >= numExpected;
  }

  /**
   * 小于比较
   */
  private isLessThan(actual: unknown, expected: unknown): boolean {
    const numActual = Number(actual);
    const numExpected = Number(expected);
    if (isNaN(numActual) || isNaN(numExpected)) return false;
    return numActual < numExpected;
  }

  /**
   * 小于等于比较
   */
  private isLessThanOrEqual(actual: unknown, expected: unknown): boolean {
    const numActual = Number(actual);
    const numExpected = Number(expected);
    if (isNaN(numActual) || isNaN(numExpected)) return false;
    return numActual <= numExpected;
  }

  /**
   * 包含在列表中
   */
  private isIn(actual: unknown, expected: unknown): boolean {
    if (!Array.isArray(expected)) return false;
    return expected.some(item => this.isEqual(actual, item));
  }

  /**
   * 字符串包含
   */
  private doesContain(actual: unknown, expected: unknown): boolean {
    if (typeof actual !== 'string' || typeof expected !== 'string') return false;
    return actual.includes(expected);
  }

  /**
   * 判断是否为空
   */
  private isEmpty(actual: unknown): boolean {
    if (actual === null || actual === undefined) return true;
    if (typeof actual === 'string') return actual.trim() === '';
    if (Array.isArray(actual)) return actual.length === 0;
    if (typeof actual === 'object') return Object.keys(actual).length === 0;
    return false;
  }

  /**
   * 范围判断
   */
  private isBetween(actual: unknown, expected: unknown): boolean {
    if (!Array.isArray(expected) || expected.length !== 2) return false;
    const numActual = Number(actual);
    const numMin = Number(expected[0]);
    const numMax = Number(expected[1]);
    if (isNaN(numActual) || isNaN(numMin) || isNaN(numMax)) return false;
    return numActual >= numMin && numActual <= numMax;
  }

  /**
   * 变更为指定值
   *
   * 检查事件数据中字段是否变更为期望值。
   */
  private isChangedTo(actual: unknown, expected: unknown, context: VariableContext): boolean {
    // 从事件数据中获取变更信息
    const changes = context.event?.data?.changes as Record<string, unknown> | undefined;
    if (!changes) return false;

    // 从字段路径中提取字段名
    const fieldName = this.extractFieldName(context.event?.data, actual);
    if (!fieldName) return false;

    const changeValue = changes[fieldName];
    return this.isEqual(changeValue, expected);
  }

  /**
   * 从指定值变更为其他值
   *
   * 检查事件数据中字段是否从期望值变更。
   */
  private isChangedFrom(actual: unknown, expected: unknown, context: VariableContext): boolean {
    const changes = context.event?.data?.changes as Record<string, unknown> | undefined;
    if (!changes) return false;

    const fieldName = this.extractFieldName(context.event?.data, actual);
    if (!fieldName) return false;

    const change = changes[fieldName] as { from?: unknown } | undefined;
    if (!change || !('from' in change)) return false;

    return this.isEqual(change.from, expected);
  }

  /**
   * 从事件数据中提取字段名
   */
  private extractFieldName(eventData: Record<string, unknown> | undefined, path: unknown): string | undefined {
    if (typeof path === 'string') {
      // 如果是 "record.fieldName" 格式，提取 fieldName
      const parts = path.split('.');
      return parts[parts.length - 1];
    }
    return undefined;
  }

  /**
   * 从嵌套对象中按路径取值
   */
  private getNestedValue(obj: unknown, path: string): unknown {
    if (!obj || typeof obj !== 'object') return undefined;

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
