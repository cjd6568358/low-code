/**
 * TimeoutManager 测试用例
 *
 * 验证实例级和节点级超时调度功能。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TimeoutManager } from '../../engine/TimeoutManager.js';

describe('TimeoutManager', () => {
  let manager: TimeoutManager;
  let onTimeout: ReturnType<typeof vi.fn>;
  let onNodeTimeout: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    onTimeout = vi.fn();
    onNodeTimeout = vi.fn();
    manager = new TimeoutManager(onTimeout, onNodeTimeout);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('实例级超时', () => {
    it('应该在超时时执行回调', () => {
      manager.scheduleExecutionTimeout('inst1', 5000);

      vi.advanceTimersByTime(5000);
      expect(onTimeout).toHaveBeenCalledWith('inst1', 'execution_timeout');
    });

    it('应该在超时前不执行回调', () => {
      manager.scheduleExecutionTimeout('inst1', 5000);

      vi.advanceTimersByTime(3000);
      expect(onTimeout).not.toHaveBeenCalled();
    });

    it('应该覆盖已存在的超时', () => {
      manager.scheduleExecutionTimeout('inst1', 5000);
      manager.scheduleExecutionTimeout('inst1', 3000);

      vi.advanceTimersByTime(3000);
      expect(onTimeout).toHaveBeenCalledWith('inst1', 'execution_timeout');
    });

    it('应该在清除超时后不执行回调', () => {
      manager.scheduleExecutionTimeout('inst1', 5000);
      manager.clear('inst1');

      vi.advanceTimersByTime(5000);
      expect(onTimeout).not.toHaveBeenCalled();
    });
  });

  describe('节点级超时', () => {
    it('应该在超时时执行节点回调', () => {
      manager.scheduleNodeTimeout('inst1', 'task1', 3000);

      vi.advanceTimersByTime(3000);
      expect(onNodeTimeout).toHaveBeenCalledWith('inst1', 'task1');
    });

    it('应该在超时前不执行节点回调', () => {
      manager.scheduleNodeTimeout('inst1', 'task1', 3000);

      vi.advanceTimersByTime(1000);
      expect(onNodeTimeout).not.toHaveBeenCalled();
    });

    it('应该支持多个实例的节点超时', () => {
      manager.scheduleNodeTimeout('inst1', 'task1', 3000);
      manager.scheduleNodeTimeout('inst2', 'task2', 3000);

      vi.advanceTimersByTime(3000);
      expect(onNodeTimeout).toHaveBeenCalledWith('inst1', 'task1');
      expect(onNodeTimeout).toHaveBeenCalledWith('inst2', 'task2');
    });
  });

  describe('clear', () => {
    it('应该清除所有关联定时器', () => {
      manager.scheduleExecutionTimeout('inst1', 5000);
      manager.scheduleNodeTimeout('inst1', 'task1', 3000);

      manager.clear('inst1');

      vi.advanceTimersByTime(5000);
      expect(onTimeout).not.toHaveBeenCalled();
      expect(onNodeTimeout).not.toHaveBeenCalled();
    });
  });

  describe('clearAll', () => {
    it('应该清除所有定时器', () => {
      manager.scheduleExecutionTimeout('inst1', 5000);
      manager.scheduleExecutionTimeout('inst2', 5000);

      manager.clearAll();

      vi.advanceTimersByTime(5000);
      expect(onTimeout).not.toHaveBeenCalled();
    });
  });

  describe('边界情况', () => {
    it('应该忽略 0 或负数超时', () => {
      manager.scheduleExecutionTimeout('inst1', 0);
      manager.scheduleExecutionTimeout('inst2', -1);

      vi.advanceTimersByTime(100);
      expect(onTimeout).not.toHaveBeenCalled();
    });
  });
});
