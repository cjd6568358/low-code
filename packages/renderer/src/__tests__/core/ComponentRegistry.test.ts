/**
 * ComponentRegistry 测试用例
 *
 * 验证组件注册表的核心功能：注册、查询、分类。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentRegistryImpl } from '../../core/ComponentRegistry.js';
import type { ComponentRegistration } from '../../core/ComponentRegistry.js';

describe('ComponentRegistry', () => {
  let registry: ComponentRegistryImpl;

  beforeEach(() => {
    registry = new ComponentRegistryImpl();
  });

  describe('register', () => {
    it('应该成功注册组件', () => {
      const entry: ComponentRegistration = {
        type: 'Button',
        name: '按钮',
        category: 'basic',
        propsSchema: { type: 'object', properties: {} },
      };

      registry.register(entry);
      const resolved = registry.resolve('Button');
      expect(resolved).toBeDefined();
      expect(resolved!.name).toBe('按钮');
    });

    it('应该覆盖已存在的同类型组件', () => {
      registry.register({ type: 'Button', name: '按钮', category: 'basic', propsSchema: {} });
      registry.register({ type: 'Button', name: '按钮组件', category: 'basic', propsSchema: {} });

      const resolved = registry.resolve('Button');
      expect(resolved!.name).toBe('按钮组件');
    });
  });

  describe('registerAll', () => {
    it('应该批量注册组件', () => {
      registry.registerAll([
        { type: 'Button', name: '按钮', category: 'basic', propsSchema: {} },
        { type: 'Input', name: '输入框', category: 'basic', propsSchema: {} },
      ]);

      expect(registry.resolve('Button')).toBeDefined();
      expect(registry.resolve('Input')).toBeDefined();
    });
  });

  describe('resolve', () => {
    it('应该返回存在的组件', () => {
      registry.register({ type: 'Button', name: '按钮', category: 'basic', propsSchema: {} });

      const resolved = registry.resolve('Button');
      expect(resolved).toBeDefined();
      expect(resolved!.type).toBe('Button');
    });

    it('应该返回 null 当组件不存在', () => {
      const resolved = registry.resolve('Nonexistent');
      expect(resolved).toBeNull();
    });
  });

  describe('resolveComponent', () => {
    it('应该返回 null 当组件实现不存在', () => {
      const component = registry.resolveComponent('Nonexistent');
      expect(component).toBeNull();
    });
  });

  describe('list', () => {
    it('应该返回所有注册的组件', () => {
      registry.register({ type: 'Button', name: '按钮', category: 'basic', propsSchema: {} });
      registry.register({ type: 'Input', name: '输入框', category: 'basic', propsSchema: {} });

      const list = registry.list();
      expect(list).toHaveLength(2);
      expect(list.map(c => c.type)).toContain('Button');
      expect(list.map(c => c.type)).toContain('Input');
    });
  });

  describe('listByCategory', () => {
    it('应该按分类过滤组件', () => {
      registry.register({ type: 'Button', name: '按钮', category: 'basic', propsSchema: {} });
      registry.register({ type: 'Table', name: '表格', category: 'advanced', propsSchema: {} });

      const basicComponents = registry.listByCategory('basic');
      expect(basicComponents).toHaveLength(1);
      expect(basicComponents[0].type).toBe('Button');

      const advancedComponents = registry.listByCategory('advanced');
      expect(advancedComponents).toHaveLength(1);
      expect(advancedComponents[0].type).toBe('Table');
    });

    it('应该返回空数组当无匹配分类', () => {
      const components = registry.listByCategory('nonexistent');
      expect(components).toEqual([]);
    });
  });

  describe('getLibraries', () => {
    it('应该返回空数组当无组件库', () => {
      expect(registry.getLibraries()).toEqual([]);
    });
  });

  describe('export / import', () => {
    it('应该导出并导入组件', () => {
      registry.register({ type: 'Button', name: '按钮', category: 'basic', propsSchema: {} });

      const exported = registry.export();
      expect(exported).toHaveLength(1);

      const newRegistry = new ComponentRegistryImpl();
      newRegistry.import(exported);

      expect(newRegistry.resolve('Button')).toBeDefined();
    });
  });
});
