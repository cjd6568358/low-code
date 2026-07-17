/**
 * ActionRegistry 测试用例
 *
 * 验证动作注册表的核心功能：注册、查询、执行动作。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ActionRegistryImpl, createDefaultActionRegistry } from '../../core/ActionRegistry.js';

describe('ActionRegistry', () => {
  let registry: ActionRegistryImpl;

  beforeEach(() => {
    const mockExpressionEngine = {
      safeEvaluate: vi.fn(),
      safeEvaluateSync: vi.fn(),
      evaluateAsync: vi.fn(),
      resolveTemplateParams: vi.fn((params: any) => params),
    };
    registry = createDefaultActionRegistry(mockExpressionEngine as any);
  });

  describe('register / resolve', () => {
    it('应该注册动作处理器', () => {
      const executor = { execute: vi.fn() };
      registry.register('customAction', executor);

      expect(registry.has('customAction')).toBe(true);
    });

    it('应该覆盖已存在的动作', () => {
      const executor1 = { execute: vi.fn() };
      const executor2 = { execute: vi.fn() };

      registry.register('customAction', executor1);
      registry.register('customAction', executor2);

      expect(registry.resolve('customAction')).toBe(executor2);
    });

    it('应该返回存在的动作处理器', () => {
      const executor = { execute: vi.fn() };
      registry.register('customAction', executor);

      expect(registry.resolve('customAction')).toBe(executor);
    });

    it('应该返回 null 当动作不存在', () => {
      expect(registry.resolve('nonexistent')).toBeNull();
    });
  });

  describe('has', () => {
    it('应该返回 true 当动作存在', () => {
      registry.register('customAction', { execute: vi.fn() });
      expect(registry.has('customAction')).toBe(true);
    });

    it('应该返回 false 当动作不存在', () => {
      expect(registry.has('nonexistent')).toBe(false);
    });
  });

  describe('list', () => {
    it('应该返回所有注册的动作名称', () => {
      registry.register('action1', { execute: vi.fn() });
      registry.register('action2', { execute: vi.fn() });

      const list = registry.list();
      expect(list).toContain('action1');
      expect(list).toContain('action2');
    });
  });

  describe('内置动作', () => {
    it('应该包含 setValue 动作', () => {
      expect(registry.has('setValues')).toBe(true);
    });

    it('应该包含 showMessage 动作', () => {
      expect(registry.has('showMessage')).toBe(true);
    });

    it('应该包含 navigate 动作', () => {
      expect(registry.has('navigate')).toBe(true);
    });

    it('应该包含 showModal 动作', () => {
      expect(registry.has('showModal')).toBe(true);
    });

    it('应该包含 closeModal 动作', () => {
      expect(registry.has('closeModal')).toBe(true);
    });

    it('应该包含 invokeMethod 动作', () => {
      expect(registry.has('invokeMethod')).toBe(true);
    });

    it('应该包含 triggerWorkflow 动作', () => {
      expect(registry.has('triggerWorkflow')).toBe(true);
    });

    it('应该包含 refreshComponent 动作', () => {
      expect(registry.has('refreshComponent')).toBe(true);
    });

    it('应该包含 submit 动作', () => {
      expect(registry.has('submit')).toBe(true);
    });

    it('应该包含 resetForm 动作', () => {
      expect(registry.has('resetForm')).toBe(true);
    });

    it('应该包含 validate 动作', () => {
      expect(registry.has('validate')).toBe(true);
    });

    it('应该包含 executeScript 动作', () => {
      expect(registry.has('executeScript')).toBe(true);
    });
  });

  describe('setValues 动作执行', () => {
    it('应该设置组件属性值', async () => {
      const context = {
        renderContext: {},
        setComponentProp: vi.fn(),
      };

      const executor = registry.resolve('setValues');
      expect(executor).not.toBeNull();
      await executor!.execute({ values: { '$component.input1.value': '新名称' } }, context as any);

      expect(context.setComponentProp).toHaveBeenCalledWith('input1', 'value', '新名称');
    });
  });

  describe('showMessage 动作执行', () => {
    it('应该显示消息', async () => {
      const context = {
        renderContext: {},
        showMessage: vi.fn(),
      };

      const executor = registry.resolve('showMessage');
      expect(executor).not.toBeNull();
      await executor!.execute({ content: '测试消息', type: 'success' }, context as any);

      expect(context.showMessage).toHaveBeenCalled();
    });
  });

  describe('navigate 动作执行', () => {
    it('应该导航到指定 URL', async () => {
      const context = {
        renderContext: {},
        navigate: vi.fn(),
      };

      const executor = registry.resolve('navigate');
      expect(executor).not.toBeNull();
      await executor!.execute({ url: '/page/page001' }, context as any);

      expect(context.navigate).toHaveBeenCalled();
    });
  });
});
