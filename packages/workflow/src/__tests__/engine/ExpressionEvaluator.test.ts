/**
 * ExpressionEvaluator 测试用例
 *
 * 验证条件表达式求值器的变量替换和布尔求值功能。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConditionExpressionEvaluator } from '../../engine/ExpressionEvaluator.js';

describe('ExpressionEvaluator', () => {
  let evaluator: ConditionExpressionEvaluator;

  beforeEach(() => {
    evaluator = new ConditionExpressionEvaluator();
  });

  describe('变量替换', () => {
    it('应该替换简单变量', () => {
      const result = evaluator.evaluate('${name}', { variables: { name: 'Alice' }, formData: {} });
      expect(result).toBe('Alice');
    });

    it('应该替换嵌套变量', () => {
      const result = evaluator.evaluate('${user.name}', { variables: { user: { name: 'Alice' } }, formData: {} });
      expect(result).toBe('Alice');
    });

    it('应该替换多个变量', () => {
      const result = evaluator.evaluate('${firstName} ${lastName}', {
        variables: { firstName: 'John', lastName: 'Doe' },
        formData: {},
      });
      expect(result).toBe('John Doe');
    });

    it('应该保留未匹配的占位符', () => {
      const result = evaluator.evaluate('${unknown}', { variables: {}, formData: {} });
      expect(result).toBe('${unknown}');
    });
  });

  describe('布尔求值', () => {
    it('应该求值布尔字面量', () => {
      expect(evaluator.evaluateBoolean('true', { variables: {}, formData: {} })).toBe(true);
      expect(evaluator.evaluateBoolean('false', { variables: {}, formData: {} })).toBe(false);
    });

    it('应该求值比较表达式', () => {
      const result = evaluator.evaluateBoolean('${amount} > 100', {
        variables: { amount: 200 },
        formData: {},
      });
      expect(result).toBe(true);
    });

    it('应该求值等于表达式', () => {
      const result = evaluator.evaluateBoolean('${status} == "active"', {
        variables: { status: 'active' },
        formData: {},
      });
      expect(result).toBe(true);
    });

    it('应该求值不等于表达式', () => {
      const result = evaluator.evaluateBoolean('${status} != "inactive"', {
        variables: { status: 'active' },
        formData: {},
      });
      expect(result).toBe(true);
    });
  });

  describe('语法校验', () => {
    it('应该校验有效表达式', () => {
      const result = evaluator.validate('${amount} > 100');
      expect(result.valid).toBe(true);
    });

    it('应该检测括号不匹配', () => {
      const result = evaluator.validate('(${amount} > 100');
      expect(result.valid).toBe(false);
    });
  });

  describe('函数调用', () => {
    it('应该支持 isEmpty 函数', () => {
      expect(evaluator.evaluateBoolean('isEmpty(${name})', { variables: { name: '' }, formData: {} })).toBe(true);
      expect(evaluator.evaluateBoolean('isEmpty(${name})', { variables: { name: 'Alice' }, formData: {} })).toBe(false);
    });
  });

  describe('边界情况', () => {
    it('应该处理 null 值', () => {
      const result = evaluator.evaluate('${name}', { variables: { name: null }, formData: {} });
      expect(result).toBe('null');
    });

    it('应该处理数字与字符串比较', () => {
      const result = evaluator.evaluateBoolean('${amount} > 50', {
        variables: { amount: 100 },
        formData: {},
      });
      expect(result).toBe(true);
    });
  });
});
