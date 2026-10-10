/**
 * ValidationEngine 跨字段校验测试用例
 *
 * 覆盖 Level 3 的三条执行路径：内置校验器、自定义表达式、注册表校验器，
 * 以及错误挂载字段与 Level 4 服务端校验。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ValidationEngine, BUILTIN_CROSS_FIELD_VALIDATORS } from '../../core/ValidationEngine.js';
import type { CrossFieldRule } from '@low-code/shared';
import { createExpressionEngine } from '@low-code/shared';

/** 构造跨字段规则 */
function makeRule(partial: Partial<CrossFieldRule>): CrossFieldRule {
  return {
    id: 'rule_1',
    name: '测试规则',
    message: '校验未通过',
    fields: [],
    ...partial,
  };
}

describe('ValidationEngine 跨字段校验（Level 3）', () => {
  let engine: ValidationEngine;

  beforeEach(() => {
    // 用真实表达式引擎（safeEvaluateSync 为同步实现，适合表达式型规则）
    engine = new ValidationEngine(undefined, createExpressionEngine());
  });

  describe('内置校验器注册', () => {
    it('应该暴露完整的内置类型清单', () => {
      const types = BUILTIN_CROSS_FIELD_VALIDATORS.map(v => v.type);
      expect(types).toContain('dateRange');
      expect(types).toContain('numberRange');
      expect(types).toContain('sumEquals');
      expect(types).toContain('notEqual');
      expect(types).toContain('requiredAll');
      expect(types).toContain('requiredAny');
      expect(types).toContain('expression');
    });

    it('registerFormValidators 应该注册内置校验器到注册表', () => {
      engine.registerFormValidators();
      expect(engine.getRegistry().resolve('cross_dateRange')).not.toBeNull();
      expect(engine.getRegistry().resolve('cross_sumEquals')).not.toBeNull();
      // expression 由引擎直接求值，不注册到注册表
      expect(engine.getRegistry().resolve('cross_expression')).toBeNull();
    });

    it('重复调用 registerFormValidators 应幂等', () => {
      engine.registerFormValidators();
      engine.registerFormValidators();
      expect(engine.getRegistry().resolve('cross_dateRange')).not.toBeNull();
    });
  });

  describe('dateRange', () => {
    it('结束早于开始时应报错', () => {
      const result = engine.validateLevel3(
        { start: '2024-01-10', end: '2024-01-01' },
        [makeRule({ validator: 'dateRange', fields: ['start', 'end'], message: '结束不能早于开始' })],
      );

      expect(result.valid).toBe(false);
      // 错误缺省挂到首个字段
      expect(result.errors.start).toEqual(['结束不能早于开始']);
    });

    it('结束晚于开始时应通过', () => {
      const result = engine.validateLevel3(
        { start: '2024-01-01', end: '2024-01-10' },
        [makeRule({ validator: 'dateRange', fields: ['start', 'end'] })],
      );
      expect(result.valid).toBe(true);
    });

    it('相等应通过（区间含端点）', () => {
      const result = engine.validateLevel3(
        { start: '2024-01-01', end: '2024-01-01' },
        [makeRule({ validator: 'dateRange', fields: ['start', 'end'] })],
      );
      expect(result.valid).toBe(true);
    });

    it('任一为空时应跳过（空值交给 required 处理）', () => {
      const result = engine.validateLevel3(
        { start: '2024-01-10', end: '' },
        [makeRule({ validator: 'dateRange', fields: ['start', 'end'] })],
      );
      expect(result.valid).toBe(true);
    });

    it('targetField 应覆盖错误挂载位置', () => {
      const result = engine.validateLevel3(
        { start: '2024-01-10', end: '2024-01-01' },
        [makeRule({ validator: 'dateRange', fields: ['start', 'end'], targetField: 'end' })],
      );
      expect(result.errors.end).toBeDefined();
      expect(result.errors.start).toBeUndefined();
    });
  });

  describe('numberRange', () => {
    it('右值小于左值时报错', () => {
      const result = engine.validateLevel3(
        { min: 100, max: 50 },
        [makeRule({ validator: 'numberRange', fields: ['min', 'max'], message: '上限不能小于下限' })],
      );
      expect(result.valid).toBe(false);
      expect(result.errors.min).toEqual(['上限不能小于下限']);
    });

    it('无法解析为数字时给出明确错误', () => {
      const result = engine.validateLevel3(
        { min: 'abc', max: 50 },
        [makeRule({ validator: 'numberRange', fields: ['min', 'max'] })],
      );
      expect(result.valid).toBe(false);
      expect(result.errors.min?.[0]).toContain('格式无法比较');
    });
  });

  describe('sumEquals', () => {
    it('明细合计等于目标值应通过', () => {
      const result = engine.validateLevel3(
        {
          items: [{ amount: 10 }, { amount: 20.5 }, { amount: 5 }],
          total: 35.5,
        },
        [makeRule({
          validator: 'sumEquals',
          fields: ['items', 'total'],
          params: { sumField: 'items', itemField: 'amount', totalField: 'total' },
        })],
      );
      expect(result.valid).toBe(true);
    });

    it('合计不一致时报错并展示实际值', () => {
      const result = engine.validateLevel3(
        { items: [{ amount: 10 }, { amount: 20 }], total: 100 },
        [makeRule({
          validator: 'sumEquals',
          fields: ['items', 'total'],
          message: '明细合计与总金额不一致',
          params: { sumField: 'items', itemField: 'amount', totalField: 'total' },
        })],
      );

      expect(result.valid).toBe(false);
      expect(result.errors.items).toEqual(['明细合计与总金额不一致']);
    });

    it('容差范围内应通过（浮点求和）', () => {
      const result = engine.validateLevel3(
        { items: [{ amount: 0.1 }, { amount: 0.2 }], total: 0.3 },
        [makeRule({
          validator: 'sumEquals',
          fields: ['items', 'total'],
          params: { sumField: 'items', itemField: 'amount', totalField: 'total' },
        })],
      );
      expect(result.valid).toBe(true);
    });

    it('缺少参数时应报配置错误', () => {
      const result = engine.validateLevel3(
        { items: [], total: 0 },
        [makeRule({ validator: 'sumEquals', fields: ['items', 'total'], params: {} })],
      );
      expect(result.errors.items?.[0]).toContain('缺少参数配置');
    });

    it('合计字段为空时应跳过校验', () => {
      const result = engine.validateLevel3(
        { items: [{ amount: 10 }], total: null },
        [makeRule({
          validator: 'sumEquals',
          fields: ['items', 'total'],
          params: { sumField: 'items', itemField: 'amount', totalField: 'total' },
        })],
      );
      expect(result.valid).toBe(true);
    });
  });

  describe('notEqual', () => {
    it('存在重复值时应报错', () => {
      const result = engine.validateLevel3(
        { a: 'x', b: 'y', c: 'x' },
        [makeRule({ validator: 'notEqual', fields: ['a', 'b', 'c'], message: '字段值不能重复' })],
      );
      expect(result.valid).toBe(false);
    });

    it('全不相同应通过', () => {
      const result = engine.validateLevel3(
        { a: 'x', b: 'y', c: 'z' },
        [makeRule({ validator: 'notEqual', fields: ['a', 'b', 'c'] })],
      );
      expect(result.valid).toBe(true);
    });

    it('多个空值不算重复', () => {
      const result = engine.validateLevel3(
        { a: '', b: null, c: 'z' },
        [makeRule({ validator: 'notEqual', fields: ['a', 'b', 'c'] })],
      );
      expect(result.valid).toBe(true);
    });
  });

  describe('requiredAll / requiredAny', () => {
    it('requiredAll：部分填写应报错', () => {
      const result = engine.validateLevel3(
        { a: 'x', b: '' },
        [makeRule({ validator: 'requiredAll', fields: ['a', 'b'] })],
      );
      expect(result.valid).toBe(false);
    });

    it('requiredAll：全填或全空均通过', () => {
      const allFilled = engine.validateLevel3(
        { a: 'x', b: 'y' },
        [makeRule({ validator: 'requiredAll', fields: ['a', 'b'] })],
      );
      const allEmpty = engine.validateLevel3(
        { a: '', b: null },
        [makeRule({ validator: 'requiredAll', fields: ['a', 'b'] })],
      );
      expect(allFilled.valid).toBe(true);
      expect(allEmpty.valid).toBe(true);
    });

    it('requiredAny：全空应报错', () => {
      const result = engine.validateLevel3(
        { a: '', b: undefined, c: [] },
        [makeRule({ validator: 'requiredAny', fields: ['a', 'b', 'c'] })],
      );
      expect(result.valid).toBe(false);
    });

    it('requiredAny：任一有值即通过', () => {
      const result = engine.validateLevel3(
        { a: '', b: 'y' },
        [makeRule({ validator: 'requiredAny', fields: ['a', 'b'] })],
      );
      expect(result.valid).toBe(true);
    });
  });

  describe('expression', () => {
    it('表达式返回 truthy 时通过', () => {
      const result = engine.validateLevel3(
        { startDate: '2024-01-01', endDate: '2024-01-10' },
        [makeRule({
          validator: 'expression',
          fields: ['startDate', 'endDate'],
          expression: 'new Date(endDate) >= new Date(startDate)',
        })],
      );
      expect(result.valid).toBe(true);
    });

    it('表达式返回 falsy 时报错', () => {
      const result = engine.validateLevel3(
        { startDate: '2024-01-10', endDate: '2024-01-01' },
        [makeRule({
          validator: 'expression',
          fields: ['startDate', 'endDate'],
          expression: 'new Date(endDate) >= new Date(startDate)',
          message: '结束日期不能早于开始日期',
        })],
      );
      expect(result.valid).toBe(false);
      expect(result.errors.startDate).toEqual(['结束日期不能早于开始日期']);
    });

    it('表达式可通过 fields 数组访问参与字段', () => {
      const result = engine.validateLevel3(
        { a: 1, b: 2 },
        [makeRule({
          validator: 'expression',
          fields: ['a', 'b'],
          expression: 'fields[1] > fields[0]',
        })],
      );
      expect(result.valid).toBe(true);
    });

    it('字段名含非法标识符时不应导致编译崩溃', () => {
      // 中文/短横线字段名无法作为函数形参，引擎会过滤掉，但不影响 fields 路径
      const result = engine.validateLevel3(
        { '订单-金额': 10, '订单-上限': 5 },
        [makeRule({
          validator: 'expression',
          fields: ['订单-金额', '订单-上限'],
          expression: 'fields[1] >= fields[0]',
        })],
      );
      expect(result.valid).toBe(false);
    });

    it('表达式求值异常时应报错而不是静默通过', () => {
      const result = engine.validateLevel3(
        { a: 1 },
        [makeRule({
          validator: 'expression',
          fields: ['a'],
          expression: 'nonexistentFn(a)',
        })],
      );
      expect(result.valid).toBe(false);
      expect(result.errors.a?.[0]).toContain('表达式求值失败');
    });

    it('缺少表达式时应报错', () => {
      const result = engine.validateLevel3(
        { a: 1 },
        [makeRule({ validator: 'expression', fields: ['a'] })],
      );
      expect(result.errors.a?.[0]).toContain('缺少校验表达式');
    });

    it('未注入表达式引擎时应明确报错', () => {
      const bare = new ValidationEngine();
      const result = bare.validateLevel3(
        { a: 1 },
        [makeRule({ validator: 'expression', fields: ['a'], expression: 'a > 0' })],
      );
      expect(result.errors.a?.[0]).toContain('未注入表达式引擎');
    });
  });

  describe('规则组合', () => {
    it('多条规则应汇总各自错误', () => {
      const result = engine.validateLevel3(
        { start: '2024-01-10', end: '2024-01-01', min: 100, max: 50 },
        [
          makeRule({
            id: 'r1',
            validator: 'dateRange',
            fields: ['start', 'end'],
            message: '日期区间错误',
          }),
          makeRule({
            id: 'r2',
            validator: 'numberRange',
            fields: ['min', 'max'],
            targetField: 'max',
            message: '数值区间错误',
          }),
        ],
      );

      expect(result.valid).toBe(false);
      expect(result.errors.start).toEqual(['日期区间错误']);
      expect(result.errors.max).toEqual(['数值区间错误']);
    });

    it('空规则列表应直接通过', () => {
      const result = engine.validateLevel3({ a: 1 }, []);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('未注册的校验器应给出明确错误', () => {
      const result = engine.validateLevel3(
        { a: 1 },
        [makeRule({ validator: 'expression' as never, fields: ['a'], expression: undefined })],
      );
      expect(result.errors.a?.[0]).toContain('缺少校验表达式');
    });
  });
});

describe('ValidationEngine 服务端校验（Level 4）', () => {
  let engine: ValidationEngine;

  beforeEach(() => {
    engine = new ValidationEngine(undefined, createExpressionEngine());
  });

  it('应解析 data.errors 为字段级错误', async () => {
    const apiRequest = vi.fn().mockResolvedValue({
      data: { errors: { email: ['该邮箱已被使用'], name: '名称不合法' } },
    });

    const errors = await engine.validateLevel4(apiRequest, '/api/validate', { email: 'a@b.com' });

    expect(errors.email).toEqual(['该邮箱已被使用']);
    expect(errors.name).toEqual(['名称不合法']);
  });

  it('应兼容顶层 errors 结构', async () => {
    const apiRequest = vi.fn().mockResolvedValue({
      errors: { code: ['编码重复'] },
    });

    const errors = await engine.validateLevel4(apiRequest, '/api/validate', { code: 'X' });
    expect(errors.code).toEqual(['编码重复']);
  });

  it('请求失败时应返回空错误而非抛出', async () => {
    const apiRequest = vi.fn().mockRejectedValue(new Error('network down'));
    const errors = await engine.validateLevel4(apiRequest, '/api/validate', {});
    expect(errors).toEqual({});
  });

  it('完整校验应合并 L1 + L3 + L4 错误', async () => {
    const apiRequest = vi.fn().mockResolvedValue({
      data: { errors: { code: ['服务端拒绝'] } },
    });

    const result = await engine.validate(
      [{ field: 'name', schema: { required: true } }],
      { name: '', start: '2024-01-10', end: '2024-01-01', code: 'X' },
      {
        crossFieldRules: [
          { id: 'r1', name: 'r1', validator: 'dateRange', fields: ['start', 'end'], message: '日期错误' },
        ],
        validationApi: '/api/validate',
        apiRequest,
      },
    );

    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeDefined();      // Level 1
    expect(result.errors.start).toEqual(['日期错误']); // Level 3
    expect(result.errors.code).toEqual(['服务端拒绝']); // Level 4
    expect(result.level).toBe(4);
  });
});
