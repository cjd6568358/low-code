/**
 * EnvironmentRegistry 测试用例
 *
 * 验证环境变量注册表的核心功能：注册、查询、变量树生成。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnvironmentRegistryImpl } from '../../core/EnvironmentRegistry.js';

describe('EnvironmentRegistry', () => {
  let registry: EnvironmentRegistryImpl;

  beforeEach(() => {
    registry = new EnvironmentRegistryImpl();
  });

  describe('register', () => {
    it('应该注册环境变量', () => {
      registry.register({
        name: '$custom',
        description: '自定义变量',
        modes: ['variable'],
        properties: [
          { name: 'foo', type: 'string', description: 'foo字段' },
          { name: 'bar', type: 'number', description: 'bar字段' },
        ],
      });

      const def = registry.getDefinition('$custom');
      expect(def).toBeDefined();
      expect(def!.name).toBe('$custom');
    });

    it('应该覆盖已存在的变量', () => {
      registry.register({ name: '$custom', description: 'v1', modes: ['variable'], properties: [] });
      registry.register({ name: '$custom', description: 'v2', modes: ['variable'], properties: [] });

      const def = registry.getDefinition('$custom');
      expect(def!.description).toBe('v2');
    });
  });

  describe('getDefinition', () => {
    it('应该返回变量定义', () => {
      registry.register({
        name: '$custom',
        description: '自定义变量',
        modes: ['variable'],
        properties: [{ name: 'name', type: 'string', description: '名称' }],
      });

      const def = registry.getDefinition('$custom');

      expect(def).toBeDefined();
      expect(def!.name).toBe('$custom');
      expect(def!.description).toBe('自定义变量');
    });

    it('应该返回 undefined 当变量不存在', () => {
      expect(registry.getDefinition('$nonexistent')).toBeUndefined();
    });
  });

  describe('内建变量', () => {
    it('应该包含 $user 内建变量', () => {
      const def = registry.getDefinition('$user');
      expect(def).toBeDefined();
      expect(def!.name).toBe('$user');
      expect(def!.properties.length).toBeGreaterThan(0);
    });

    it('应该包含 $platform 内建变量', () => {
      const def = registry.getDefinition('$platform');
      expect(def).toBeDefined();
    });

    it('应该包含 $route 内建变量', () => {
      const def = registry.getDefinition('$route');
      expect(def).toBeDefined();
    });
  });

  describe('generateVariableTree', () => {
    it('应该生成变量树', () => {
      registry.register({
        name: '$custom',
        description: '自定义变量',
        modes: ['variable'],
        properties: [
          { name: 'name', type: 'string', description: '姓名' },
          { name: 'age', type: 'number', description: '年龄' },
          {
            name: 'address',
            type: 'object',
            description: '地址',
            properties: [
              { name: 'city', type: 'string', description: '城市' },
              { name: 'street', type: 'string', description: '街道' },
            ],
          },
        ],
      });

      const tree = registry.generateVariableTree('variable');

      const customNode = tree.find(n => n.key === '$custom');
      expect(customNode).toBeDefined();
      expect(customNode!.children).toHaveLength(3);
    });
  });

  describe('generateMonacoCompletions', () => {
    it('应该生成 Monaco 代码提示数据', () => {
      registry.register({
        name: '$custom',
        description: '自定义变量',
        modes: ['variable'],
        properties: [
          { name: 'name', type: 'string', description: '姓名' },
        ],
      });

      const completions = registry.generateMonacoCompletions('variable');

      expect(completions.some(c => c.label === '$custom.name')).toBe(true);
    });
  });

  describe('registerPageComponents', () => {
    it('应该注册页面组件到 $component', () => {
      registry.registerPageComponents({
        input1: { type: 'Input', label: '用户名输入' },
        table1: { type: 'Table', label: '订单表格' },
      });

      const def = registry.getDefinition('$component');
      expect(def).toBeDefined();

      const inputProp = def!.properties.find(p => p.name === 'input1');
      const tableProp = def!.properties.find(p => p.name === 'table1');
      expect(inputProp).toBeDefined();
      expect(tableProp).toBeDefined();
    });
  });

  describe('registerPageDataSources', () => {
    it('应该注册页面数据源到 $data', () => {
      registry.registerPageDataSources({
        ds1: { type: 'api', description: '订单数据' },
        ds2: { type: 'api', description: '用户数据' },
      });

      const def = registry.getDefinition('$data');
      expect(def).toBeDefined();

      const ds1Prop = def!.properties.find(p => p.name === 'ds1');
      const ds2Prop = def!.properties.find(p => p.name === 'ds2');
      expect(ds1Prop).toBeDefined();
      expect(ds2Prop).toBeDefined();
    });
  });

  describe('registerAvailableTables', () => {
    it('应该注册可用数据表到 $table', () => {
      registry.registerAvailableTables({
        orders: { description: '订单表' },
        users: { description: '用户表' },
      });

      const def = registry.getDefinition('$table');
      expect(def).toBeDefined();

      const ordersProp = def!.properties.find(p => p.name === 'orders');
      const usersProp = def!.properties.find(p => p.name === 'users');
      expect(ordersProp).toBeDefined();
      expect(usersProp).toBeDefined();
    });
  });
});
