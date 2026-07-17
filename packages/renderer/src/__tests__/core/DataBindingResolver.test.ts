/**
 * DataBindingResolver 测试用例
 *
 * 验证数据绑定解析器的核心功能：字面量、变量引用、表达式解析。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DataBindingResolver } from '../../core/DataBindingResolver.js';
import { dependencyGraph } from '../../core/DependencyGraph.js';

describe('DataBindingResolver', () => {
  let resolver: DataBindingResolver;
  let mockContext: any;

  beforeEach(() => {
    // 清理依赖图
    dependencyGraph.clear();

    mockContext = {
      $user: { name: 'Alice', age: 25, role: 'admin' },
      $data: {
        order: { id: 'order001', amount: 1000, items: [{ name: '商品1', price: 100 }] },
        list: [1, 2, 3, 4, 5],
      },
      $component: {
        input1: { value: '输入值' },
        table1: { selectedRows: [{ id: 1 }] },
      },
      $route: { params: { id: 'page001' } },
    };

    resolver = new DataBindingResolver();
  });

  describe('resolveValue', () => {
    it('应该返回字面量值', () => {
      const result = resolver.resolveValue(42, mockContext);
      expect(result).toBe(42);
    });

    it('应该返回字符串字面量', () => {
      const result = resolver.resolveValue('hello', mockContext);
      expect(result).toBe('hello');
    });

    it('应该返回布尔字面量', () => {
      const result = resolver.resolveValue(true, mockContext);
      expect(result).toBe(true);
    });

    it('应该返回 null', () => {
      const result = resolver.resolveValue(null, mockContext);
      expect(result).toBeNull();
    });

    it('应该返回 undefined', () => {
      const result = resolver.resolveValue(undefined, mockContext);
      expect(result).toBeUndefined();
    });
  });

  describe('变量引用解析', () => {
    it('应该解析简单变量引用', () => {
      const result = resolver.resolveValue(
        { type: 'variable', value: '$user.name' },
        mockContext,
      );
      expect(result).toBe('Alice');
    });

    it('应该解析嵌套变量引用', () => {
      const result = resolver.resolveValue(
        { type: 'variable', value: '$data.order.amount' },
        mockContext,
      );
      expect(result).toBe(1000);
    });

    it('应该解析数组元素', () => {
      const result = resolver.resolveValue(
        { type: 'variable', value: '$data.order.items[0].name' },
        mockContext,
      );
      expect(result).toBe('商品1');
    });

    it('应该解析组件属性', () => {
      const result = resolver.resolveValue(
        { type: 'variable', value: '$component.input1.value' },
        mockContext,
      );
      expect(result).toBe('输入值');
    });

    it('应该返回 undefined 当变量不存在', () => {
      const result = resolver.resolveValue(
        { type: 'variable', value: '$user.nonexistent' },
        mockContext,
      );
      expect(result).toBeUndefined();
    });

    it('应该返回 undefined 当路径中间节点不存在', () => {
      const result = resolver.resolveValue(
        { type: 'variable', value: '$data.nonexistent.field' },
        mockContext,
      );
      expect(result).toBeUndefined();
    });
  });

  describe('表达式解析', () => {
    it('表达式绑定应返回 undefined（需异步）', () => {
      const result = resolver.resolveValue(
        { type: 'expression', value: 'return $user.name + " is " + $user.age', async: true },
        mockContext,
      );
      // 同步 resolveValue 对表达式返回 undefined
      expect(result).toBeUndefined();
    });
  });

  describe('resolveProps', () => {
    it('应该解析多个属性', () => {
      const props = {
        title: '标题',
        value: { type: 'variable', value: '$user.name' } as any,
        count: { type: 'variable', value: '$data.list.length' } as any,
      };

      const result = resolver.resolveProps(props, mockContext);

      expect(result.props.title).toBe('标题');
      expect(result.props.value).toBe('Alice');
      expect(result.asyncExpressions).toBeDefined();
    });

    it('应该混合字面量和变量引用', () => {
      const props = {
        label: '用户：',
        name: { type: 'variable', value: '$user.name' } as any,
        age: { type: 'variable', value: '$user.age' } as any,
      };

      const result = resolver.resolveProps(props, mockContext);

      expect(result.props.label).toBe('用户：');
      expect(result.props.name).toBe('Alice');
      expect(result.props.age).toBe(25);
    });

    it('应该收集异步表达式', () => {
      const props = {
        computed: { type: 'expression', value: 'return $user.name', async: true } as any,
      };

      const result = resolver.resolveProps(props, mockContext);

      expect(result.asyncExpressions).toHaveLength(1);
      expect(result.asyncExpressions[0].key).toBe('computed');
    });
  });

  describe('registerDependencies', () => {
    it('应该注册表达式依赖（变量引用不注册）', () => {
      resolver.registerDependencies('comp1', {
        title: { type: 'variable', value: '$user.name' } as any,
        computed: { type: 'expression', value: 'return $user.name + $data.order.amount' } as any,
      });

      // registerDependencies 只处理 expression 类型，不处理 variable
      const variableDeps = dependencyGraph.getDependencies('comp1.title');
      expect(variableDeps).toEqual([]);

      const exprDeps = dependencyGraph.getDependencies('comp1.computed');
      expect(exprDeps).toContain('$user.name');
    });

    it('应该注册表达式依赖', () => {
      resolver.registerDependencies('comp1', {
        computed: {
          type: 'expression',
          value: 'return $user.name + $data.order.amount',
        } as any,
      });

      const deps = dependencyGraph.getDependencies('comp1.computed');
      expect(deps).toContain('$user.name');
      expect(deps).toContain('$data.order.amount');
    });
  });

  describe('边界情况', () => {
    it('应该处理空对象', () => {
      const result = resolver.resolveProps({}, mockContext);
      expect(result.props).toEqual({});
      expect(result.asyncExpressions).toEqual([]);
    });

    it('应该处理深层嵌套变量', () => {
      const deepContext = {
        $level1: { level2: { level3: { level4: { value: 'deep' } } } },
      };

      const result = resolver.resolveValue(
        { type: 'variable', value: '$level1.level2.level3.level4.value' },
        deepContext,
      );

      expect(result).toBe('deep');
    });
  });
});
