/**
 * ModalStack 测试用例
 *
 * 验证弹框栈管理器的核心功能：open、resolve、多层嵌套。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModalStack } from '../../core/ModalStack.js';

describe('ModalStack', () => {
  let stack: ModalStack;

  beforeEach(() => {
    stack = new ModalStack();
  });

  describe('open', () => {
    it('应该打开弹窗', () => {
      stack.open('page', 'modal001', { title: '测试弹窗' });

      expect(stack.depth).toBe(1);
      expect(stack.topModal?.resourceId).toBe('modal001');
    });

    it('应该返回 Promise', () => {
      const result = stack.open('page', 'modal001');
      expect(result).toBeInstanceOf(Promise);
    });

    it('应该支持多层嵌套', () => {
      stack.open('page', 'modal001');
      stack.open('page', 'modal002');
      stack.open('page', 'modal003');

      expect(stack.depth).toBe(3);
    });

    it('应该记录弹窗顺序', () => {
      stack.open('page', 'modal001');
      stack.open('page', 'modal002');
      stack.open('page', 'modal003');

      expect(stack.depth).toBe(3);
      expect(stack.topModal?.resourceId).toBe('modal003');
    });
  });

  describe('resolve', () => {
    it('应该关闭最顶层弹窗', () => {
      stack.open('page', 'modal001');
      stack.open('page', 'modal002');

      stack.resolve('closed');

      expect(stack.depth).toBe(1);
      expect(stack.topModal?.resourceId).toBe('modal001');
    });

    it('应该携带 result resolve Promise', async () => {
      const promise = stack.open('page', 'modal001');

      stack.resolve({ confirmed: true });

      const result = await promise;
      expect(result).toEqual({ confirmed: true });
    });

    it('应该支持关闭所有弹窗', () => {
      stack.open('page', 'modal001');
      stack.open('page', 'modal002');
      stack.open('page', 'modal003');

      stack.closeAll();

      expect(stack.depth).toBe(0);
    });

    it('应该按顺序 resolve 所有 Promise', async () => {
      const promise1 = stack.open('page', 'modal001');
      const promise2 = stack.open('page', 'modal002');
      const promise3 = stack.open('page', 'modal003');

      stack.resolve('result3');
      stack.resolve('result2');
      stack.resolve('result1');

      expect(await promise3).toBe('result3');
      expect(await promise2).toBe('result2');
      expect(await promise1).toBe('result1');
    });
  });

  describe('has', () => {
    it('应该返回 true 当弹窗存在', () => {
      stack.open('page', 'modal001');
      expect(stack.has('modal001')).toBe(true);
    });

    it('应该返回 false 当弹窗不存在', () => {
      expect(stack.has('nonexistent')).toBe(false);
    });
  });

  describe('depth', () => {
    it('应该返回 0 当无弹窗', () => {
      expect(stack.depth).toBe(0);
    });

    it('应该返回弹窗数量', () => {
      stack.open('page', 'modal001');
      expect(stack.depth).toBe(1);

      stack.open('page', 'modal002');
      expect(stack.depth).toBe(2);
    });
  });

  describe('topModal', () => {
    it('应该返回当前最顶层弹窗', () => {
      stack.open('page', 'modal001');
      stack.open('page', 'modal002');

      expect(stack.topModal?.resourceId).toBe('modal002');
    });

    it('应该返回 undefined 当无弹窗', () => {
      expect(stack.topModal).toBeUndefined();
    });
  });

  describe('onChange 回调', () => {
    it('应该在打开弹窗时触发回调', () => {
      const onChange = vi.fn();
      const stackWithCb = new ModalStack(onChange);

      stackWithCb.open('page', 'modal001');

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'open', resourceId: 'modal001' }),
      );
    });

    it('应该在关闭弹窗时触发回调', () => {
      const onChange = vi.fn();
      const stackWithCb = new ModalStack(onChange);

      stackWithCb.open('page', 'modal001');
      stackWithCb.resolve();

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'close', resourceId: 'modal001' }),
      );
    });
  });

  describe('clear', () => {
    it('应该在调用 clear 时关闭所有弹窗', () => {
      stack.open('page', 'modal001');
      stack.open('page', 'modal002');

      stack.clear();

      expect(stack.depth).toBe(0);
    });
  });
});
