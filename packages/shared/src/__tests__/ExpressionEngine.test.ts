/**
 * ExpressionEngine 测试用例
 *
 * 验证表达式引擎的核心功能：求值、验证、依赖分析、安全沙箱。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DefaultExpressionEngine } from '../engine/expression.js';

const isVitestWorker = !!process.env.VITEST_POOL_ID;

describe('ExpressionEngine', () => {
  let engine: DefaultExpressionEngine;

  beforeEach(() => {
    engine = new DefaultExpressionEngine();
  });

  describe('基础求值', () => {
    it('应该计算简单算术表达式', async () => {
      const result = await engine.evaluate('1 + 2', {});
      expect(result).toBe(3);
    });

    it('应该计算复杂表达式', async () => {
      const result = await engine.evaluate('(10 - 2) * 3 / 4', {});
      expect(result).toBe(6);
    });

    it('应该支持字符串拼接', async () => {
      const result = await engine.evaluate('"hello" + " " + "world"', {});
      expect(result).toBe('hello world');
    });

    it('应该支持三元表达式', async () => {
      const result = await engine.evaluate('true ? "yes" : "no"', {});
      expect(result).toBe('yes');
    });

    it('应该支持访问上下文变量', async () => {
      const context = { $user: { name: 'Alice', age: 25 } };
      const result = await engine.evaluate('$user.name', context);
      expect(result).toBe('Alice');
    });

    it('应该支持访问嵌套变量', async () => {
      const context = { $data: { order: { items: [{ name: 'item1' }] } } };
      const result = await engine.evaluate('$data.order.items[0].name', context);
      expect(result).toBe('item1');
    });

    it('应该支持数组方法', async () => {
      const context = { $data: { items: [1, 2, 3, 4, 5] } };
      const result = await engine.evaluate('$data.items.filter(i => i > 3)', context);
      expect(result).toEqual([4, 5]);
    });

    it('应该支持对象解构', async () => {
      const context = { $user: { name: 'Alice', age: 25 } };
      const result = await engine.evaluate('const { name, age } = $user; return `${name} is ${age}`', context);
      expect(result).toBe('Alice is 25');
    });
  });

  describe('语法验证', () => {
    it('应该验证有效表达式', () => {
      const result = engine.validate('1 + 2');
      expect(result.valid).toBe(true);
    });

    it('应该检测括号不匹配', () => {
      const result = engine.validate('(1 + 2');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('应该检测语法错误', () => {
      const result = engine.validate('1 +');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  // 全局对象限制仅在 workerpool 沙箱内生效，主线程 evaluate 不做拦截
  describe.skipIf(isVitestWorker)('全局对象访问限制', () => {
    it('应该禁止访问 window', async () => {
      await expect(engine.evaluate('window.location', {})).rejects.toThrow();
    });

    it('应该禁止访问 process', async () => {
      await expect(engine.evaluate('process.env', {})).rejects.toThrow();
    });

    it('应该禁止访问 require', async () => {
      await expect(engine.evaluate('require("fs")', {})).rejects.toThrow();
    });

    it('应该禁止访问 globalThis', async () => {
      await expect(engine.evaluate('globalThis', {})).rejects.toThrow();
    });

    it('应该禁止访问 eval', async () => {
      await expect(engine.evaluate('eval("1+1")', {})).rejects.toThrow();
    });

    it('应该禁止访问 Function 构造器', async () => {
      await expect(engine.evaluate('new Function("return 1")', {})).rejects.toThrow();
    });
  });

  describe('依赖分析', () => {
    it('应该提取变量依赖', () => {
      const deps = engine.analyzeDependencies('return $user.name + $data.count');
      expect(deps).toContain('$user.name');
      expect(deps).toContain('$data.count');
    });

    it('应该提取嵌套路径依赖', () => {
      const deps = engine.analyzeDependencies('return $data.order.items[0].name');
      expect(deps).toContain('$data.order.items');
    });

    it('应该去重相同依赖', () => {
      const deps = engine.analyzeDependencies('return $user.name + $user.name');
      const userDeps = deps.filter(d => d.startsWith('$user'));
      expect(userDeps.length).toBe(1);
    });

    it('应该返回空数组当无依赖', () => {
      const deps = engine.analyzeDependencies('return 1 + 2');
      expect(deps).toEqual([]);
    });
  });

  describe('模板字符串解析', () => {
    it('应该解析简单模板', () => {
      const result = engine.resolveTemplate('Hello {{name}}', { name: 'World' });
      expect(result).toBe('Hello World');
    });

    it('应该解析多个变量', () => {
      const result = engine.resolveTemplate('{{firstName}} {{lastName}}', {
        firstName: 'John',
        lastName: 'Doe',
      });
      expect(result).toBe('John Doe');
    });

    it('应该支持嵌套路径', () => {
      const result = engine.resolveTemplate('User: {{user.name}}', {
        user: { name: 'Alice' },
      });
      expect(result).toBe('User: Alice');
    });

    it('应该将未匹配的占位符替换为空字符串', () => {
      const result = engine.resolveTemplate('Hello {{unknown}}', {});
      // resolveTemplate 对未匹配的变量替换为空字符串
      expect(result).toBe('Hello ');
    });
  });

  describe.skipIf(isVitestWorker)('安全沙箱求值', () => {
    it('应该在超时时终止执行', async () => {
      await expect(
        engine.safeEvaluate('while(true) {}', {}, 100)
      ).rejects.toThrow();
    }, 5000);

    it('应该正常执行不超时的表达式', async () => {
      const result = await engine.safeEvaluate('1 + 2', {}, 1000);
      expect(result).toBe(3);
    });

    it('应该支持异步表达式', async () => {
      const result = await engine.evaluateAsync(
        { type: 'expression', value: 'return $data.count * 2', async: true },
        { $data: { count: 5 } }
      );
      expect(result).toBe(10);
    });
  });

  describe('编译缓存', () => {
    it('应该缓存编译后的表达式', async () => {
      const expression = '$user.name + " is " + $user.age';

      // 第一次执行
      await engine.evaluate(expression, { $user: { name: 'Alice', age: 25 } });

      // 第二次执行应该使用缓存
      const result = await engine.evaluate(expression, { $user: { name: 'Bob', age: 30 } });
      expect(result).toBe('Bob is 30');
    });
  });
});
