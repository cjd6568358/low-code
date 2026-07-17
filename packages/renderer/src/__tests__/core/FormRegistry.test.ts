/**
 * FormRegistry 测试用例
 *
 * 验证表单注册表的核心功能：注册、注销、实例管理。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FormRegistry } from '../../core/FormRegistry.js';

describe('FormRegistry', () => {
  let registry: FormRegistry;

  beforeEach(() => {
    registry = new FormRegistry();
  });

  function createMockManager(values: Record<string, any> = {}) {
    return {
      getValues: vi.fn().mockReturnValue(values),
    } as any;
  }

  function createMockAntdForm() {
    return {
      setFieldsValue: vi.fn(),
      validateFields: vi.fn().mockResolvedValue({}),
      resetFields: vi.fn(),
      setFields: vi.fn(),
    } as any;
  }

  describe('register', () => {
    it('应该注册表单实例', () => {
      const manager = createMockManager();
      registry.register('form1', manager);

      expect(registry.get('form1')).toBe(manager);
    });

    it('应该覆盖已存在的表单', () => {
      const manager1 = createMockManager({ v: 1 });
      const manager2 = createMockManager({ v: 2 });

      registry.register('form1', manager1);
      registry.register('form1', manager2);

      expect(registry.get('form1')).toBe(manager2);
    });

    it('应该支持多个表单', () => {
      registry.register('form1', createMockManager());
      registry.register('form2', createMockManager());

      expect(registry.get('form1')).toBeDefined();
      expect(registry.get('form2')).toBeDefined();
    });
  });

  describe('unregister', () => {
    it('应该注销表单实例', () => {
      registry.register('form1', createMockManager());
      registry.unregister('form1');

      expect(registry.get('form1')).toBeUndefined();
    });

    it('应该处理注销不存在的表单', () => {
      expect(() => registry.unregister('nonexistent')).not.toThrow();
    });
  });

  describe('get', () => {
    it('应该返回表单管理器', () => {
      const manager = createMockManager();
      registry.register('form1', manager);

      expect(registry.get('form1')).toBe(manager);
    });

    it('应该返回 undefined 当表单不存在', () => {
      expect(registry.get('nonexistent')).toBeUndefined();
    });
  });

  describe('hasForms', () => {
    it('应该返回 true 当有表单注册', () => {
      registry.register('form1', createMockManager());
      expect(registry.hasForms()).toBe(true);
    });

    it('应该返回 false 当无表单注册', () => {
      expect(registry.hasForms()).toBe(false);
    });
  });

  describe('getAllForms', () => {
    it('应该返回所有已注册表单', () => {
      const manager1 = createMockManager();
      const manager2 = createMockManager();
      registry.register('form1', manager1);
      registry.register('form2', manager2);

      const all = registry.getAllForms();

      expect(all['form1']).toBe(manager1);
      expect(all['form2']).toBe(manager2);
    });
  });

  describe('getFormData', () => {
    it('应该返回表单数据', () => {
      const manager = createMockManager({ name: 'Alice', age: 25 });
      registry.register('form1', manager);

      const values = registry.getFormData('form1');

      expect(values).toEqual({ name: 'Alice', age: 25 });
    });

    it('应该返回空对象当表单不存在', () => {
      expect(registry.getFormData('nonexistent')).toEqual({});
    });
  });

  describe('setFieldValue', () => {
    it('应该设置表单字段值', () => {
      const manager = createMockManager();
      const antdForm = createMockAntdForm();

      registry.register('form1', manager);
      registry.registerAntdForm('form1', antdForm);

      registry.setFieldValue('name', 'Bob', 'form1');

      expect(antdForm.setFieldsValue).toHaveBeenCalledWith({ name: 'Bob' });
    });

    it('应该不抛错当表单不存在', () => {
      expect(() => registry.setFieldValue('name', 'test', 'nonexistent')).not.toThrow();
    });
  });

  describe('validateForm', () => {
    it('应该验证表单成功', async () => {
      const manager = createMockManager();
      const antdForm = createMockAntdForm();
      antdForm.validateFields.mockResolvedValue({ name: 'Alice' });

      registry.register('form1', manager);
      registry.registerAntdForm('form1', antdForm);

      const result = await registry.validateForm('form1');

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('应该返回错误当验证失败', async () => {
      const manager = createMockManager();
      const antdForm = createMockAntdForm();
      antdForm.validateFields.mockRejectedValue({
        errorFields: [{ name: ['name'], errors: ['请输入名称'] }],
      });

      registry.register('form1', manager);
      registry.registerAntdForm('form1', antdForm);

      const result = await registry.validateForm('form1');

      expect(result.valid).toBe(false);
      expect(result.errors['name']).toContain('请输入名称');
    });

    it('应该返回 valid:true 当表单不存在', async () => {
      const result = await registry.validateForm('nonexistent');
      expect(result.valid).toBe(true);
    });
  });

  describe('resetForm', () => {
    it('应该重置表单', () => {
      const manager = createMockManager();
      const antdForm = createMockAntdForm();

      registry.register('form1', manager);
      registry.registerAntdForm('form1', antdForm);

      registry.resetForm('form1', { name: '' });

      expect(antdForm.setFieldsValue).toHaveBeenCalledWith({ name: '' });
    });
  });

  describe('clear', () => {
    it('应该清除所有表单', () => {
      registry.register('form1', createMockManager());
      registry.register('form2', createMockManager());

      registry.clear();

      expect(registry.hasForms()).toBe(false);
    });
  });
});
