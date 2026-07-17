/**
 * LinkageEngine 测试用例
 *
 * 验证联动执行引擎的核心功能：值联动、选项联动、显隐联动、属性联动。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LinkageEngine } from '../../core/LinkageEngine.js';
import type { LinkageRule } from '@low-code/shared';

describe('LinkageEngine', () => {
  let engine: LinkageEngine;
  let mockExpressionEngine: any;

  beforeEach(() => {
    mockExpressionEngine = {
      safeEvaluateSync: vi.fn(),
      safeEvaluate: vi.fn(),
      evaluateAsync: vi.fn(),
    };

    engine = new LinkageEngine(mockExpressionEngine);
  });

  function makeRule(overrides: Partial<LinkageRule> & { rule: LinkageRule['rule'] }): LinkageRule {
    return {
      id: overrides.id ?? 'rule_1',
      triggerField: overrides.triggerField ?? 'trigger',
      targetField: overrides.targetField ?? 'target',
      type: overrides.type ?? 'value',
      rule: overrides.rule,
    };
  }

  describe('init', () => {
    it('应该初始化联动规则', () => {
      const rules: LinkageRule[] = [
        makeRule({
          triggerField: 'province',
          targetField: 'city',
          type: 'value',
          rule: { mode: 'map', map: { guangdong: ['guangzhou', 'shenzhen'] } },
        }),
      ];

      engine.init(rules);

      // 验证规则已注册（通过触发验证）
      const result = engine.onFieldChange('province', 'guangdong', { province: 'guangdong' });
      expect(result.valueUpdates['city']).toEqual(['guangzhou', 'shenzhen']);
    });
  });

  describe('值联动', () => {
    it('应该执行静态映射', () => {
      engine.init([
        makeRule({
          id: 'rule_map',
          triggerField: 'province',
          targetField: 'city',
          type: 'value',
          rule: {
            mode: 'map',
            map: {
              guangdong: ['guangzhou', 'shenzhen'],
              zhejiang: ['hangzhou', 'ningbo'],
            },
          },
        }),
      ]);

      const result = engine.onFieldChange('province', 'guangdong', { province: 'guangdong' });

      expect(result.valueUpdates['city']).toEqual(['guangzhou', 'shenzhen']);
    });

    it('应该执行表达式计算', () => {
      engine.init([
        makeRule({
          id: 'rule_expr',
          triggerField: 'price',
          targetField: 'total',
          type: 'value',
          rule: { mode: 'expression', expression: 'return $price * $quantity' },
        }),
      ]);

      mockExpressionEngine.safeEvaluateSync.mockReturnValue(300);

      const result = engine.onFieldChange('price', 100, { price: 100, quantity: 3 });

      expect(result.valueUpdates['total']).toBe(300);
    });

    it('应该执行条件分支赋值', () => {
      engine.init([
        makeRule({
          id: 'rule_cond',
          triggerField: 'vipLevel',
          targetField: 'discount',
          type: 'value',
          rule: {
            mode: 'conditional',
            branches: [
              { condition: '$vipLevel >= 3', value: 0.8 },
              { condition: '$vipLevel >= 1', value: 0.9 },
            ],
            default: 1,
          },
        }),
      ]);

      mockExpressionEngine.safeEvaluateSync
        .mockReturnValueOnce(true)   // vipLevel >= 3
        .mockReturnValueOnce(false); // vipLevel >= 1

      const result = engine.onFieldChange('vipLevel', 3, { vipLevel: 3 });

      expect(result.valueUpdates['discount']).toBe(0.8);
    });
  });

  describe('显隐联动', () => {
    it('应该执行显隐联动', () => {
      engine.init([
        makeRule({
          id: 'rule_visible',
          triggerField: 'employmentStatus',
          targetField: 'company',
          type: 'visible',
          rule: { condition: 'return $employmentStatus === "employed"' },
        }),
      ]);

      mockExpressionEngine.safeEvaluateSync.mockReturnValue(true);

      const result = engine.onFieldChange('employmentStatus', 'employed', { employmentStatus: 'employed' });

      expect(result.stateUpdates['company']?.visible).toBe(true);
    });

    it('应该隐藏字段当条件不满足', () => {
      engine.init([
        makeRule({
          id: 'rule_visible',
          triggerField: 'employmentStatus',
          targetField: 'company',
          type: 'visible',
          rule: { condition: 'return $employmentStatus === "employed"' },
        }),
      ]);

      mockExpressionEngine.safeEvaluateSync.mockReturnValue(false);

      const result = engine.onFieldChange('employmentStatus', 'unemployed', { employmentStatus: 'unemployed' });

      expect(result.stateUpdates['company']?.visible).toBe(false);
    });
  });

  describe('属性联动', () => {
    it('应该动态计算 disabled 属性', () => {
      engine.init([
        makeRule({
          id: 'rule_disabled',
          triggerField: 'status',
          targetField: 'amount',
          type: 'disabled',
          rule: { condition: 'return $status === "completed"' },
        }),
      ]);

      mockExpressionEngine.safeEvaluateSync.mockReturnValue(true);

      const result = engine.onFieldChange('status', 'completed', { status: 'completed' });

      expect(result.stateUpdates['amount']?.disabled).toBe(true);
    });

    it('应该动态计算 required 属性', () => {
      engine.init([
        makeRule({
          id: 'rule_required',
          triggerField: 'contactMethod',
          targetField: 'email',
          type: 'required',
          rule: { condition: 'return $contactMethod === "email"' },
        }),
      ]);

      mockExpressionEngine.safeEvaluateSync.mockReturnValue(true);

      const result = engine.onFieldChange('contactMethod', 'email', { contactMethod: 'email' });

      expect(result.stateUpdates['email']?.required).toBe(true);
    });
  });

  describe('选项联动', () => {
    it('应该执行静态选项联动', () => {
      engine.init([
        makeRule({
          id: 'rule_options',
          triggerField: 'province',
          targetField: 'city',
          type: 'options',
          rule: {
            source: 'static',
            staticOptions: [
              { label: '广州', value: 'gz', dependsOn: 'guangdong' },
              { label: '深圳', value: 'sz', dependsOn: 'guangdong' },
              { label: '杭州', value: 'hz', dependsOn: 'zhejiang' },
            ],
          },
        }),
      ]);

      const result = engine.onFieldChange('province', 'guangdong', { province: 'guangdong' });

      // dependent 模式：按 dependsOn 过滤
      const options = result.optionsUpdates['city'];
      expect(options).toBeDefined();
      const guangdongOptions = options.filter((o: any) => o.dependsOn === 'guangdong');
      expect(guangdongOptions).toHaveLength(2);
    });
  });

  describe('批量更新', () => {
    it('应该合并多个更新', () => {
      engine.init([
        makeRule({
          id: 'rule1',
          triggerField: 'source',
          targetField: 'field1',
          type: 'value',
          rule: { mode: 'expression', expression: 'return $source + "_1"' },
        }),
        makeRule({
          id: 'rule2',
          triggerField: 'source',
          targetField: 'field2',
          type: 'value',
          rule: { mode: 'expression', expression: 'return $source + "_2"' },
        }),
      ]);

      mockExpressionEngine.safeEvaluateSync
        .mockReturnValueOnce('value_1')
        .mockReturnValueOnce('value_2');

      const result = engine.onFieldChange('source', 'test', { source: 'test' });

      expect(result.valueUpdates['field1']).toBe('value_1');
      expect(result.valueUpdates['field2']).toBe('value_2');
    });
  });

  describe('getAffectedFields', () => {
    it('应该返回受影响的字段', () => {
      engine.init([
        makeRule({
          id: 'rule1',
          triggerField: 'province',
          targetField: 'city',
          type: 'value',
          rule: { mode: 'map', map: {} },
        }),
      ]);

      const affected = engine.getAffectedFields('province');
      expect(affected).toContain('city');
    });

    it('应该返回空数组当无受影响字段', () => {
      const affected = engine.getAffectedFields('nonexistent');
      expect(affected).toEqual([]);
    });
  });

  describe('无触发规则时返回空结果', () => {
    it('应该返回空 LinkageResult', () => {
      engine.init([]);

      const result = engine.onFieldChange('unknown', 'value', {});

      expect(result.valueUpdates).toEqual({});
      expect(result.stateUpdates).toEqual({});
      expect(result.optionsUpdates).toEqual({});
      expect(result.attributeUpdates).toEqual({});
    });
  });
});
