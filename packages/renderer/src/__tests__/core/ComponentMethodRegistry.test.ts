/**
 * ComponentMethodRegistry 测试用例
 *
 * 验证组件方法注册表的核心功能：注册、调用、列表。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentMethodRegistry } from '../../core/ComponentMethodRegistry.js';

describe('ComponentMethodRegistry', () => {
  let registry: ComponentMethodRegistry;

  beforeEach(() => {
    registry = new ComponentMethodRegistry();
  });

  describe('register', () => {
    it('应该注册方法处理器', () => {
      registry.register('table1', 'Table', {
        refresh: vi.fn().mockResolvedValue({ success: true }),
      });

      expect(registry.hasComponent('table1')).toBe(true);
    });

    it('应该支持多个组件的方法', () => {
      registry.register('table1', 'Table', { refresh: vi.fn() });
      registry.register('table2', 'Table', { refresh: vi.fn() });

      expect(registry.hasComponent('table1')).toBe(true);
      expect(registry.hasComponent('table2')).toBe(true);
    });

    it('应该支持同一组件的多个方法', () => {
      registry.register('table1', 'Table', {
        refresh: vi.fn(),
        selectRow: vi.fn(),
      });

      const methods = registry.listByComponent('table1');
      expect(methods).toHaveLength(2);
      expect(methods.map(m => m.methodName)).toContain('refresh');
      expect(methods.map(m => m.methodName)).toContain('selectRow');
    });
  });

  describe('invoke', () => {
    it('应该调用注册的方法', async () => {
      const handler = vi.fn().mockResolvedValue({ success: true });
      registry.register('table1', 'Table', { refresh: handler });

      const result = await registry.invoke('table1', 'refresh', { force: true });

      expect(handler).toHaveBeenCalledWith({ force: true });
      expect(result).toEqual({ success: true });
    });

    it('应该返回 undefined 当方法不存在', async () => {
      const result = await registry.invoke('table1', 'nonexistent');
      expect(result).toBeUndefined();
    });

    it('应该返回 undefined 当组件不存在', async () => {
      const result = await registry.invoke('nonexistent', 'refresh');
      expect(result).toBeUndefined();
    });

    it('应该支持无参数调用', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      registry.register('table1', 'Table', { clear: handler });

      const result = await registry.invoke('table1', 'clear');

      expect(handler).toHaveBeenCalledWith(undefined);
      expect(result).toBeUndefined();
    });
  });

  describe('unregister', () => {
    it('应该注销组件的所有方法', () => {
      registry.register('table1', 'Table', { refresh: vi.fn(), selectRow: vi.fn() });
      registry.register('table2', 'Table', { refresh: vi.fn() });

      registry.unregister('table1');

      expect(registry.hasComponent('table1')).toBe(false);
      expect(registry.hasComponent('table2')).toBe(true);
    });
  });

  describe('hasComponent', () => {
    it('应该返回 true 当组件有方法', () => {
      registry.register('table1', 'Table', { refresh: vi.fn() });
      expect(registry.hasComponent('table1')).toBe(true);
    });

    it('应该返回 false 当组件无方法', () => {
      expect(registry.hasComponent('nonexistent')).toBe(false);
    });
  });

  describe('listAll', () => {
    it('应该返回所有注册的方法', () => {
      registry.register('table1', 'Table', { refresh: vi.fn(), selectRow: vi.fn() });
      registry.register('form1', 'Form', { validate: vi.fn() });

      const list = registry.listAll();

      expect(list).toHaveLength(3);
      expect(list.some(m => m.componentId === 'table1' && m.methodName === 'refresh')).toBe(true);
      expect(list.some(m => m.componentId === 'table1' && m.methodName === 'selectRow')).toBe(true);
      expect(list.some(m => m.componentId === 'form1' && m.methodName === 'validate')).toBe(true);
    });

    it('应该返回空数组当无注册', () => {
      expect(registry.listAll()).toEqual([]);
    });
  });

  describe('listByComponent', () => {
    it('应该返回指定组件的方法', () => {
      registry.register('table1', 'Table', { refresh: vi.fn(), selectRow: vi.fn() });
      registry.register('form1', 'Form', { validate: vi.fn() });

      const methods = registry.listByComponent('table1');

      expect(methods).toHaveLength(2);
      expect(methods.every(m => m.componentId === 'table1')).toBe(true);
    });

    it('应该返回空数组当组件不存在', () => {
      expect(registry.listByComponent('nonexistent')).toEqual([]);
    });
  });

  describe('clear', () => {
    it('应该清除所有注册', () => {
      registry.register('table1', 'Table', { refresh: vi.fn() });
      registry.register('form1', 'Form', { validate: vi.fn() });

      registry.clear();

      expect(registry.listAll()).toEqual([]);
    });
  });

  describe('带元数据注册', () => {
    it('应该保存方法元数据', () => {
      registry.register('table1', 'Table', {
        refresh: vi.fn(),
      }, {
        refresh: { label: '刷新', description: '刷新表格数据' },
      });

      const methods = registry.listByComponent('table1');
      expect(methods[0].label).toBe('刷新');
      expect(methods[0].description).toBe('刷新表格数据');
    });
  });
});
