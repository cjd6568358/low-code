/**
 * RunningRegistry 测试用例
 *
 * 验证运行实例注册、中止、状态查询功能。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RunningRegistry } from '../../engine/RunningRegistry.js';

describe('RunningRegistry', () => {
  let registry: RunningRegistry;

  beforeEach(() => {
    registry = new RunningRegistry();
  });

  describe('register / unregister', () => {
    it('应该注册运行中的实例', () => {
      const abort = vi.fn();
      registry.register('inst1', abort);

      expect(registry.isRunning('inst1')).toBe(true);
    });

    it('应该注销实例', () => {
      const abort = vi.fn();
      registry.register('inst1', abort);
      registry.unregister('inst1');

      expect(registry.isRunning('inst1')).toBe(false);
    });

    it('应该支持多个实例', () => {
      registry.register('inst1', vi.fn());
      registry.register('inst2', vi.fn());

      expect(registry.getRunningCount()).toBe(2);
      expect(registry.getRunningInstanceIds()).toContain('inst1');
      expect(registry.getRunningInstanceIds()).toContain('inst2');
    });
  });

  describe('isRunning', () => {
    it('应该返回 true 当实例在运行', () => {
      registry.register('inst1', vi.fn());
      expect(registry.isRunning('inst1')).toBe(true);
    });

    it('应该返回 false 当实例不在运行', () => {
      expect(registry.isRunning('nonexistent')).toBe(false);
    });
  });

  describe('abort', () => {
    it('应该中止运行中的实例', () => {
      const abort = vi.fn();
      registry.register('inst1', abort);

      const result = registry.abort('inst1', 'user_cancel');

      expect(result).toBe(true);
      expect(abort).toHaveBeenCalledWith('user_cancel');
      expect(registry.isRunning('inst1')).toBe(false);
    });

    it('应该返回 false 当实例不在运行', () => {
      const result = registry.abort('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('abortAll', () => {
    it('应该中止所有运行中的实例', () => {
      const abort1 = vi.fn();
      const abort2 = vi.fn();
      registry.register('inst1', abort1);
      registry.register('inst2', abort2);

      registry.abortAll('shutdown');

      expect(abort1).toHaveBeenCalledWith('shutdown');
      expect(abort2).toHaveBeenCalledWith('shutdown');
      expect(registry.getRunningCount()).toBe(0);
    });
  });

  describe('getRunningCount', () => {
    it('应该返回运行中实例数量', () => {
      expect(registry.getRunningCount()).toBe(0);

      registry.register('inst1', vi.fn());
      expect(registry.getRunningCount()).toBe(1);

      registry.register('inst2', vi.fn());
      expect(registry.getRunningCount()).toBe(2);
    });
  });
});
