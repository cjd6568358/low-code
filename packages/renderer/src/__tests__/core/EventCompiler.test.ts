/**
 * EventCompiler 测试用例
 *
 * 验证事件编译器的核心功能：ActionChain JSON 编译为可执行函数。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventCompiler } from '../../core/EventCompiler.js';
import type { ActionChain, ActionStep, ActionContext } from '@low-code/shared';

describe('EventCompiler', () => {
  let compiler: EventCompiler;
  let mockActionRegistry: any;
  let mockExpressionEngine: any;
  let baseContext: ActionContext;

  beforeEach(() => {
    mockActionRegistry = {
      resolve: vi.fn(),
    };

    mockExpressionEngine = {
      safeEvaluate: vi.fn(),
      resolveTemplateParams: vi.fn((params: any) => params),
    };

    compiler = new EventCompiler(mockActionRegistry, mockExpressionEngine);

    baseContext = {
      renderContext: {},
      navigate: vi.fn(),
      showMessage: vi.fn(),
      setFormValue: vi.fn(),
      setComponentProp: vi.fn(),
      showModal: vi.fn().mockResolvedValue(undefined),
    };
  });

  describe('compileChain', () => {
    it('应该编译空动作链', () => {
      const chain: ActionChain = [];
      const handler = compiler.compileChain(chain, baseContext);

      expect(typeof handler).toBe('function');
    });

    it('应该编译单个动作', () => {
      const chain: ActionChain = [
        { action: 'showMessage', params: { content: '测试消息', type: 'info' } },
      ];

      const handler = compiler.compileChain(chain, baseContext);
      expect(typeof handler).toBe('function');
    });

    it('应该编译多个动作', () => {
      const chain: ActionChain = [
        { action: 'showMessage', params: { content: '步骤1' } },
        { action: 'showMessage', params: { content: '步骤2' } },
        { action: 'showMessage', params: { content: '步骤3' } },
      ];

      const handler = compiler.compileChain(chain, baseContext);
      expect(typeof handler).toBe('function');
    });
  });

  describe('执行动作链', () => {
    it('应该执行 setValue 动作', async () => {
      const executor = { execute: vi.fn().mockResolvedValue(undefined) };
      mockActionRegistry.resolve.mockReturnValue(executor);

      const chain: ActionChain = [
        { action: 'setValue', params: { key: 'name', value: '新名称' } },
      ];

      const handler = compiler.compileChain(chain, baseContext);
      await handler({}, baseContext);

      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'name', value: '新名称' }),
        expect.any(Object),
      );
    });

    it('应该执行 showMessage 动作', async () => {
      const executor = { execute: vi.fn().mockResolvedValue(undefined) };
      mockActionRegistry.resolve.mockReturnValue(executor);

      const chain: ActionChain = [
        { action: 'showMessage', params: { content: '测试消息', type: 'info' } },
      ];

      const handler = compiler.compileChain(chain, baseContext);
      await handler({}, baseContext);

      expect(executor.execute).toHaveBeenCalled();
    });

    it('应该执行多个动作', async () => {
      const executor = { execute: vi.fn().mockResolvedValue(undefined) };
      mockActionRegistry.resolve.mockReturnValue(executor);

      const chain: ActionChain = [
        { action: 'showMessage', params: { content: '步骤1' } },
        { action: 'showMessage', params: { content: '步骤2' } },
        { action: 'showMessage', params: { content: '步骤3' } },
      ];

      const handler = compiler.compileChain(chain, baseContext);
      await handler({}, baseContext);

      expect(executor.execute).toHaveBeenCalledTimes(3);
    });

    it('应该跳过未知动作', async () => {
      mockActionRegistry.resolve.mockReturnValue(null);

      const chain: ActionChain = [
        { action: 'unknownAction', params: {} },
      ];

      const handler = compiler.compileChain(chain, baseContext);
      await expect(handler({}, baseContext)).resolves.not.toThrow();
    });
  });

  describe('$result 透传', () => {
    it('应该将上一步结果写入 $result', async () => {
      const executor = { execute: vi.fn().mockResolvedValue('step1_result') };
      mockActionRegistry.resolve.mockReturnValue(executor);

      const chain: ActionChain = [
        { action: 'action1', params: {} },
        { action: 'action2', params: {} },
      ];

      const handler = compiler.compileChain(chain, baseContext);
      await handler({}, baseContext);

      // 第二步应该收到 $result
      const secondCall = executor.execute.mock.calls[1];
      expect(secondCall[1].$result).toBe('step1_result');
    });
  });

  describe('条件分支', () => {
    it('应该在条件为真时执行 then 分支', async () => {
      const executor = { execute: vi.fn().mockResolvedValue(undefined) };
      mockActionRegistry.resolve.mockReturnValue(executor);
      mockExpressionEngine.safeEvaluate.mockResolvedValue(true);

      const chain: ActionChain = [
        {
          action: 'condition',
          params: {
            condition: 'return true',
            then: [{ action: 'showMessage', params: { content: 'then分支' } }],
            else: [{ action: 'showMessage', params: { content: 'else分支' } }],
          },
        },
      ];

      const handler = compiler.compileChain(chain, baseContext);
      await handler({}, baseContext);

      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({ content: 'then分支' }),
        expect.any(Object),
      );
    });

    it('应该在条件为假时执行 else 分支', async () => {
      const executor = { execute: vi.fn().mockResolvedValue(undefined) };
      mockActionRegistry.resolve.mockReturnValue(executor);
      mockExpressionEngine.safeEvaluate.mockResolvedValue(false);

      const chain: ActionChain = [
        {
          action: 'condition',
          params: {
            condition: 'return false',
            then: [{ action: 'showMessage', params: { content: 'then分支' } }],
            else: [{ action: 'showMessage', params: { content: 'else分支' } }],
          },
        },
      ];

      const handler = compiler.compileChain(chain, baseContext);
      await handler({}, baseContext);

      expect(executor.execute).toHaveBeenCalledWith(
        expect.objectContaining({ content: 'else分支' }),
        expect.any(Object),
      );
    });
  });

  describe('条件跳过', () => {
    it('应该跳过 disabled 的动作', async () => {
      const executor = { execute: vi.fn().mockResolvedValue(undefined) };
      mockActionRegistry.resolve.mockReturnValue(executor);

      const chain: ActionChain = [
        { action: 'showMessage', params: { content: '跳过' }, disabled: true },
      ];

      const handler = compiler.compileChain(chain, baseContext);
      await handler({}, baseContext);

      expect(executor.execute).not.toHaveBeenCalled();
    });
  });

  describe('错误处理', () => {
    it('应该在 continueOnError 时继续执行', async () => {
      const executor = {
        execute: vi.fn()
          .mockRejectedValueOnce(new Error('fail'))
          .mockResolvedValueOnce('ok'),
      };
      mockActionRegistry.resolve.mockReturnValue(executor);

      const chain: ActionChain = [
        { action: 'fail', params: {}, continueOnError: true },
        { action: 'ok', params: {} },
      ];

      const handler = compiler.compileChain(chain, baseContext);
      await handler({}, baseContext);

      expect(executor.execute).toHaveBeenCalledTimes(2);
    });

    it('应该在无 continueOnError 时停止执行', async () => {
      const executor = {
        execute: vi.fn()
          .mockRejectedValueOnce(new Error('fail'))
          .mockResolvedValueOnce('ok'),
      };
      mockActionRegistry.resolve.mockReturnValue(executor);

      const chain: ActionChain = [
        { action: 'fail', params: {} },
        { action: 'ok', params: {} },
      ];

      const handler = compiler.compileChain(chain, baseContext);
      await handler({}, baseContext);

      expect(executor.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('compileEvents', () => {
    it('应该编译事件映射', () => {
      const executor = { execute: vi.fn().mockResolvedValue(undefined) };
      mockActionRegistry.resolve.mockReturnValue(executor);

      const events = {
        onClick: [{ action: 'showMessage', params: { content: 'clicked' } }],
        onChange: [{ action: 'setValue', params: { key: 'value', value: 'new' } }],
      };

      const handlers = compiler.compileEvents(events, baseContext);

      expect(handlers.onClick).toBeDefined();
      expect(handlers.onChange).toBeDefined();
      expect(typeof handlers.onClick).toBe('function');
      expect(typeof handlers.onChange).toBe('function');
    });
  });
});
