/**
 * Condition Operators 测试用例
 *
 * 验证条件操作符的正确性：比较、逻辑、集合、字符串等操作。
 */

import { describe, it, expect } from 'vitest';
import { evaluateCondition, getSupportedOperators } from '../operators.js';

describe('Condition Operators', () => {

  describe('比较操作符', () => {
    it('eq - 相等比较（数字）', () => {
      expect(evaluateCondition('eq', 1, 1)).toBe(true);
      expect(evaluateCondition('eq', 1, 2)).toBe(false);
    });

    it('eq - 相等比较（字符串）', () => {
      expect(evaluateCondition('eq', 'hello', 'hello')).toBe(true);
      expect(evaluateCondition('eq', 'hello', 'world')).toBe(false);
    });

    it('neq - 不等比较', () => {
      expect(evaluateCondition('neq', 1, 2)).toBe(true);
      expect(evaluateCondition('neq', 1, 1)).toBe(false);
    });

    it('gt - 大于比较', () => {
      expect(evaluateCondition('gt', 2, 1)).toBe(true);
      expect(evaluateCondition('gt', 1, 1)).toBe(false);
      expect(evaluateCondition('gt', 1, 2)).toBe(false);
    });

    it('gte - 大于等于比较', () => {
      expect(evaluateCondition('gte', 2, 1)).toBe(true);
      expect(evaluateCondition('gte', 1, 1)).toBe(true);
      expect(evaluateCondition('gte', 1, 2)).toBe(false);
    });

    it('lt - 小于比较', () => {
      expect(evaluateCondition('lt', 1, 2)).toBe(true);
      expect(evaluateCondition('lt', 1, 1)).toBe(false);
      expect(evaluateCondition('lt', 2, 1)).toBe(false);
    });

    it('lte - 小于等于比较', () => {
      expect(evaluateCondition('lte', 1, 2)).toBe(true);
      expect(evaluateCondition('lte', 1, 1)).toBe(true);
      expect(evaluateCondition('lte', 2, 1)).toBe(false);
    });
  });

  describe('字符串操作符', () => {
    it('contains - 包含子串', () => {
      expect(evaluateCondition('contains', 'hello world', 'world')).toBe(true);
      expect(evaluateCondition('contains', 'hello world', 'xyz')).toBe(false);
    });

    it('not_contains - 不包含子串', () => {
      expect(evaluateCondition('not_contains', 'hello world', 'xyz')).toBe(true);
      expect(evaluateCondition('not_contains', 'hello world', 'world')).toBe(false);
    });

    it('starts_with - 以...开头', () => {
      expect(evaluateCondition('starts_with', 'hello', 'hel')).toBe(true);
      expect(evaluateCondition('starts_with', 'hello', 'world')).toBe(false);
    });

    it('ends_with - 以...结尾', () => {
      expect(evaluateCondition('ends_with', 'hello', 'llo')).toBe(true);
      expect(evaluateCondition('ends_with', 'hello', 'world')).toBe(false);
    });
  });

  describe('集合操作符', () => {
    it('in - 在列表中', () => {
      expect(evaluateCondition('in', 'a', ['a', 'b', 'c'])).toBe(true);
      expect(evaluateCondition('in', 'd', ['a', 'b', 'c'])).toBe(false);
    });

    it('not_in - 不在列表中', () => {
      expect(evaluateCondition('not_in', 'd', ['a', 'b', 'c'])).toBe(true);
      expect(evaluateCondition('not_in', 'a', ['a', 'b', 'c'])).toBe(false);
    });

    it('between - 在范围内（数字）', () => {
      expect(evaluateCondition('between', 5, [1, 10])).toBe(true);
      expect(evaluateCondition('between', 1, [1, 10])).toBe(true);
      expect(evaluateCondition('between', 10, [1, 10])).toBe(true);
      expect(evaluateCondition('between', 0, [1, 10])).toBe(false);
      expect(evaluateCondition('between', 11, [1, 10])).toBe(false);
    });

    it('between - 在范围内（日期）', () => {
      expect(evaluateCondition('between', '2024-06-15', ['2024-01-01', '2024-12-31'])).toBe(true);
      expect(evaluateCondition('between', '2023-06-15', ['2024-01-01', '2024-12-31'])).toBe(false);
    });
  });

  describe('空值操作符', () => {
    it('is_empty - 为空（null）', () => {
      expect(evaluateCondition('is_empty', null, null)).toBe(true);
    });

    it('is_empty - 为空（undefined）', () => {
      expect(evaluateCondition('is_empty', undefined, null)).toBe(true);
    });

    it('is_empty - 为空（空字符串）', () => {
      expect(evaluateCondition('is_empty', '', null)).toBe(true);
    });

    it('is_empty - 为空（空数组）', () => {
      expect(evaluateCondition('is_empty', [], null)).toBe(true);
    });

    it('is_empty - 不为空', () => {
      expect(evaluateCondition('is_empty', 'hello', null)).toBe(false);
      expect(evaluateCondition('is_empty', [1], null)).toBe(false);
      expect(evaluateCondition('is_empty', 0, null)).toBe(false);
    });

    it('is_not_empty - 不为空', () => {
      expect(evaluateCondition('is_not_empty', 'hello', null)).toBe(true);
      expect(evaluateCondition('is_not_empty', null, null)).toBe(false);
    });
  });

  describe('正则表达式操作符', () => {
    it('regex - 匹配正则表达式', () => {
      expect(evaluateCondition('regex', 'test123', /^test\d+$/)).toBe(true);
      expect(evaluateCondition('regex', 'hello', /^test\d+$/)).toBe(false);
    });

    it('regex - 匹配字符串正则', () => {
      expect(evaluateCondition('regex', 'test123', '^\\w+\\d+$')).toBe(true);
    });
  });

  describe('边界情况', () => {
    it('应该处理 null 值比较', () => {
      expect(evaluateCondition('eq', null, null)).toBe(true);
      expect(evaluateCondition('eq', null, 'value')).toBe(false);
    });

    it('应该处理 undefined 值比较', () => {
      expect(evaluateCondition('eq', undefined, undefined)).toBe(true);
      expect(evaluateCondition('eq', undefined, null)).toBe(false);
    });

    it('应该处理数字与字符串比较', () => {
      expect(evaluateCondition('eq', 1, '1')).toBe(false); // 严格相等
    });

    it('应该处理大小写敏感的字符串比较', () => {
      expect(evaluateCondition('eq', 'Hello', 'hello')).toBe(false);
      expect(evaluateCondition('contains', 'Hello World', 'hello')).toBe(false);
    });
  });

  describe('getSupportedOperators', () => {
    it('应该返回所有支持的操作符', () => {
      const operators = getSupportedOperators();
      expect(operators).toContain('eq');
      expect(operators).toContain('neq');
      expect(operators).toContain('gt');
      expect(operators).toContain('gte');
      expect(operators).toContain('lt');
      expect(operators).toContain('lte');
      expect(operators).toContain('contains');
      expect(operators).toContain('not_contains');
      expect(operators).toContain('starts_with');
      expect(operators).toContain('ends_with');
      expect(operators).toContain('in');
      expect(operators).toContain('not_in');
      expect(operators).toContain('is_empty');
      expect(operators).toContain('is_not_empty');
      expect(operators).toContain('between');
      expect(operators).toContain('regex');
    });
  });
});
