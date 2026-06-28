/**
 * 条件表达式求值器
 * 用于评估流程中的条件表达式
 */

import type { ExpressionEvaluator as IExpressionEvaluator, EvaluationContext } from '../types/engine';

/** 表达式解析错误 */
export class ExpressionParseError extends Error {
  constructor(
    message: string,
    public expression: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ExpressionParseError';
  }
}

/**
 * 条件表达式求值器
 * 支持简单的条件表达式解析和求值
 */
export class ConditionExpressionEvaluator implements IExpressionEvaluator {
  /**
   * 求值表达式
   */
  evaluate(expression: string, context: EvaluationContext): unknown {
    try {
      // 替换变量
      const resolved = this.resolveVariables(expression, context);

      // 尝试解析为布尔值
      if (resolved === 'true') return true;
      if (resolved === 'false') return false;

      // 尝试解析为数字
      const num = Number(resolved);
      if (!isNaN(num)) return num;

      // 尝试解析为 JSON
      if (resolved.startsWith('{') || resolved.startsWith('[')) {
        try {
          return JSON.parse(resolved);
        } catch {
          // 不是 JSON，返回原始字符串
        }
      }

      return resolved;
    } catch (error) {
      throw new ExpressionParseError(
        `表达式求值失败: ${expression}`,
        expression,
        error
      );
    }
  }

  /**
   * 求值布尔表达式
   */
  evaluateBoolean(expression: string, context: EvaluationContext): boolean {
    const result = this.evaluate(expression, context);

    if (typeof result === 'boolean') {
      return result;
    }

    if (typeof result === 'number') {
      return result !== 0;
    }

    if (typeof result === 'string') {
      return result !== '' && result !== 'false' && result !== 'null' && result !== 'undefined';
    }

    return result != null;
  }

  /**
   * 校验表达式语法
   */
  validate(expression: string): { valid: boolean; error?: string } {
    try {
      // 检查括号匹配
      let depth = 0;
      for (const char of expression) {
        if (char === '(') depth++;
        if (char === ')') depth--;
        if (depth < 0) {
          return { valid: false, error: '括号不匹配' };
        }
      }
      if (depth !== 0) {
        return { valid: false, error: '括号不匹配' };
      }

      // 检查变量引用格式
      const varPattern = /\$\{[^}]+\}/g;
      const matches = expression.match(varPattern);
      if (matches) {
        for (const match of matches) {
          const varName = match.slice(2, -1).trim();
          if (!varName) {
            return { valid: false, error: `变量名为空: ${match}` };
          }
        }
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : '表达式语法错误',
      };
    }
  }

  /**
   * 替换变量
   */
  private resolveVariables(expression: string, context: EvaluationContext): string {
    const { variables, formData, operator, initiator } = context;

    // 合并所有变量来源
    const allVariables: Record<string, unknown> = {
      ...variables,
      ...formData,
    };

    // 添加特殊变量
    if (operator) {
      allVariables['$operator'] = operator;
      allVariables['$operator.id'] = operator.id;
      allVariables['$operator.name'] = operator.name;
    }

    if (initiator) {
      allVariables['$initiator'] = initiator;
      allVariables['$initiator.id'] = initiator.id;
      allVariables['$initiator.name'] = initiator.name;
    }

    // 替换 ${variable} 格式的变量
    return expression.replace(/\$\{([^}]+)\}/g, (match, varPath) => {
      const value = this.getNestedValue(allVariables, varPath.trim());
      if (value === undefined) {
        return match; // 保留原始表达式
      }
      return String(value);
    });
  }

  /**
   * 获取嵌套对象的值
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current == null || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }
}

/**
 * 简单条件求值器
 * 支持基本的比较和逻辑运算
 */
export class SimpleConditionEvaluator implements IExpressionEvaluator {
  private readonly evaluator = new ConditionExpressionEvaluator();

  /**
   * 求值表达式
   */
  evaluate(expression: string, context: EvaluationContext): unknown {
    // 先解析变量
    const resolved = this.resolveExpression(expression, context);

    // 尝试求值简单表达式
    return this.evaluateSimple(resolved, context);
  }

  /**
   * 求值布尔表达式
   */
  evaluateBoolean(expression: string, context: EvaluationContext): boolean {
    const result = this.evaluate(expression, context);

    if (typeof result === 'boolean') {
      return result;
    }

    if (typeof result === 'number') {
      return result !== 0;
    }

    if (typeof result === 'string') {
      return result !== '' && result !== 'false' && result !== 'null' && result !== 'undefined';
    }

    return result != null;
  }

  /**
   * 校验表达式语法
   */
  validate(expression: string): { valid: boolean; error?: string } {
    return this.evaluator.validate(expression);
  }

  /**
   * 解析表达式
   */
  private resolveExpression(expression: string, context: EvaluationContext): string {
    const { variables, formData } = context;
    const allVariables = { ...variables, ...formData };

    return expression.replace(/\$\{([^}]+)\}/g, (match, varPath) => {
      const value = this.evaluator.evaluate(varPath.trim(), context);
      return String(value ?? match);
    });
  }

  /**
   * 求值简单表达式
   */
  private evaluateSimple(expression: string, context: EvaluationContext): unknown {
    // 处理常量
    if (expression === 'true') return true;
    if (expression === 'false') return false;
    if (expression === 'null') return null;
    if (expression === 'undefined') return undefined;

    // 处理数字
    const num = Number(expression);
    if (!isNaN(num)) return num;

    // 处理字符串
    if (expression.startsWith('"') && expression.endsWith('"')) {
      return expression.slice(1, -1);
    }
    if (expression.startsWith("'") && expression.endsWith("'")) {
      return expression.slice(1, -1);
    }

    // 处理比较运算
    const comparisonMatch = expression.match(/^(.+?)\s*(==|!=|>=|<=|>|<)\s*(.+)$/);
    if (comparisonMatch) {
      const [, left, op, right] = comparisonMatch;
      const leftValue = this.evaluateSimple(left.trim(), context);
      const rightValue = this.evaluateSimple(right.trim(), context);

      switch (op) {
        case '==': return leftValue == rightValue;
        case '!=': return leftValue != rightValue;
        case '>': return (leftValue as number) > (rightValue as number);
        case '>=': return (leftValue as number) >= (rightValue as number);
        case '<': return (leftValue as number) < (rightValue as number);
        case '<=': return (leftValue as number) <= (rightValue as number);
      }
    }

    // 处理逻辑运算
    const andMatch = expression.match(/^(.+?)\s+and\s+(.+)$/);
    if (andMatch) {
      const [, left, right] = andMatch;
      return this.evaluateBoolean(left.trim(), context) && this.evaluateBoolean(right.trim(), context);
    }

    const orMatch = expression.match(/^(.+?)\s+or\s+(.+)$/);
    if (orMatch) {
      const [, left, right] = orMatch;
      return this.evaluateBoolean(left.trim(), context) || this.evaluateBoolean(right.trim(), context);
    }

    const notMatch = expression.match(/^not\s+(.+)$/);
    if (notMatch) {
      return !this.evaluateBoolean(notMatch[1].trim(), context);
    }

    // 处理函数调用
    const funcMatch = expression.match(/^(\w+)\((.+)\)$/);
    if (funcMatch) {
      const [, funcName, argsStr] = funcMatch;
      return this.evaluateFunction(funcName, argsStr, context);
    }

    // 返回原始表达式
    return expression;
  }

  /**
   * 求值函数
   */
  private evaluateFunction(
    funcName: string,
    argsStr: string,
    context: EvaluationContext
  ): unknown {
    const args = argsStr.split(',').map(arg =>
      this.evaluateSimple(arg.trim(), context)
    );

    switch (funcName) {
      case 'length':
        if (typeof args[0] === 'string' || Array.isArray(args[0])) {
          return args[0].length;
        }
        return 0;

      case 'includes':
        if (typeof args[0] === 'string') {
          return args[0].includes(String(args[1]));
        }
        if (Array.isArray(args[0])) {
          return args[0].includes(args[1]);
        }
        return false;

      case 'startsWith':
        if (typeof args[0] === 'string' && typeof args[1] === 'string') {
          return args[0].startsWith(args[1]);
        }
        return false;

      case 'endsWith':
        if (typeof args[0] === 'string' && typeof args[1] === 'string') {
          return args[0].endsWith(args[1]);
        }
        return false;

      case 'parseInt':
        return parseInt(String(args[0]), 10);

      case 'parseFloat':
        return parseFloat(String(args[0]));

      case 'toString':
        return String(args[0]);

      case 'isEmpty':
        if (args[0] == null) return true;
        if (typeof args[0] === 'string') return args[0] === '';
        if (Array.isArray(args[0])) return args[0].length === 0;
        if (typeof args[0] === 'object') return Object.keys(args[0]).length === 0;
        return false;

      default:
        throw new Error(`未知的函数: ${funcName}`);
    }
  }
}
