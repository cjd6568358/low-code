/**
 * ConditionRuleEngine 测试用例
 *
 * 验证条件规则引擎的核心功能：规则评估、组件条件求值。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConditionRuleEngine } from '../../core/ConditionRuleEngine.js';

describe('ConditionRuleEngine', () => {
  let engine: ConditionRuleEngine;
  let mockExpressionEngine: any;

  beforeEach(() => {
    mockExpressionEngine = {
      safeEvaluate: vi.fn(),
      safeEvaluateSync: vi.fn(),
      evaluateAsync: vi.fn(),
    };

    engine = new ConditionRuleEngine(mockExpressionEngine);
  });

  describe('init', () => {
    it('应该初始化规则', () => {
      const rules = [
        { id: 'rule1', priority: 1, conditions: [], actions: [] },
        { id: 'rule2', priority: 2, conditions: [], actions: [] },
      ];

      // init 不抛错即成功
      engine.init(rules as any);
    });
  });

  describe('evaluateComponent', () => {
    it('应该返回默认结果当无规则匹配', () => {
      engine.init([]);

      const result = engine.evaluateComponent('comp1', true, {} as any);

      expect(result).toBeDefined();
      expect(result.visible).toBe(true);
      expect(result.disabled).toBe(false);
      expect(result.setValues).toEqual({});
      expect(result.setProps).toEqual({});
    });

    it('应该评估组件可见性规则', () => {
      mockExpressionEngine.safeEvaluateSync.mockReturnValue(false);

      engine.init([
        {
          id: 'rule1',
          priority: 1,
          conditions: [{ field: 'status', operator: 'eq', value: 'disabled' }],
          actions: [{ type: 'setVisible', target: 'comp1', value: false }],
        },
      ] as any);

      const result = engine.evaluateComponent('comp1', true, { status: 'disabled' } as any);

      expect(result).toBeDefined();
    });
  });

  describe('evaluateAll', () => {
    it('应该批量评估多个组件', () => {
      engine.init([]);

      const visibleMap = new Map<string, boolean | string | undefined>();
      visibleMap.set('comp1', true);
      visibleMap.set('comp2', false);

      const results = engine.evaluateAll(['comp1', 'comp2'], visibleMap, {} as any);

      expect(results.size).toBe(2);
      expect(results.has('comp1')).toBe(true);
      expect(results.has('comp2')).toBe(true);
    });

    it('应该返回空 Map 当无组件', () => {
      engine.init([]);

      const results = engine.evaluateAll([], new Map(), {} as any);

      expect(results.size).toBe(0);
    });
  });
});
