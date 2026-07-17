/**
 * StateMachine 测试用例
 *
 * 验证流程状态机的状态转换逻辑。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StateMachine } from '../../engine/StateMachine.js';
import type { InstanceRecord } from '../../types/engine.js';

function makeInstance(status: string): InstanceRecord {
  return {
    id: 'inst_001',
    workflowDefId: 'wf_001',
    workflowKey: 'wf_test',
    version: 1,
    status: status as any,
    variables: {},
    startedBy: 'user1',
    startedByName: '用户1',
    startedAt: new Date().toISOString(),
  };
}

describe('StateMachine', () => {
  let sm: StateMachine;

  beforeEach(() => {
    sm = new StateMachine();
  });

  describe('状态转换', () => {
    it('应该从 created 转换到 running（start 事件）', async () => {
      const instance = makeInstance('created');
      expect(sm.canTrigger(instance, 'start')).toBe(true);
      const newState = await sm.trigger(instance, 'start');
      expect(newState).toBe('running');
    });

    it('应该从 running 转换到 waiting（wait 事件）', async () => {
      const instance = makeInstance('running');
      expect(sm.canTrigger(instance, 'wait')).toBe(true);
      const newState = await sm.trigger(instance, 'wait');
      expect(newState).toBe('waiting');
    });

    it('应该从 waiting 转换到 running（resume 事件）', async () => {
      const instance = makeInstance('waiting');
      expect(sm.canTrigger(instance, 'resume')).toBe(true);
      const newState = await sm.trigger(instance, 'resume');
      expect(newState).toBe('running');
    });

    it('应该从 running 转换到 completed（complete 事件）', async () => {
      const instance = makeInstance('running');
      expect(sm.canTrigger(instance, 'complete')).toBe(true);
      const newState = await sm.trigger(instance, 'complete');
      expect(newState).toBe('completed');
    });

    it('应该从 running 转换到 terminated（terminate 事件）', async () => {
      const instance = makeInstance('running');
      expect(sm.canTrigger(instance, 'terminate')).toBe(true);
      const newState = await sm.trigger(instance, 'terminate');
      expect(newState).toBe('terminated');
    });

    it('应该从 running 转换到 failed（fail 事件）', async () => {
      const instance = makeInstance('running');
      expect(sm.canTrigger(instance, 'fail')).toBe(true);
      const newState = await sm.trigger(instance, 'fail');
      expect(newState).toBe('failed');
    });

    it('应该从 running 转换到 suspended（suspend 事件）', async () => {
      const instance = makeInstance('running');
      expect(sm.canTrigger(instance, 'suspend')).toBe(true);
      const newState = await sm.trigger(instance, 'suspend');
      expect(newState).toBe('suspended');
    });

    it('应该从 suspended 转换到 running（resume 事件）', async () => {
      const instance = makeInstance('suspended');
      expect(sm.canTrigger(instance, 'resume')).toBe(true);
      const newState = await sm.trigger(instance, 'resume');
      expect(newState).toBe('running');
    });

    it('应该从 waiting 转换到 terminated（terminate 事件）', async () => {
      const instance = makeInstance('waiting');
      expect(sm.canTrigger(instance, 'terminate')).toBe(true);
      const newState = await sm.trigger(instance, 'terminate');
      expect(newState).toBe('terminated');
    });
  });

  describe('非法状态转换', () => {
    it('不应该从 created 直接转换到 completed', () => {
      const instance = makeInstance('created');
      expect(sm.canTrigger(instance, 'complete')).toBe(false);
    });

    it('不应该从 completed 转换到 running', () => {
      const instance = makeInstance('completed');
      expect(sm.canTrigger(instance, 'start')).toBe(false);
    });

    it('不应该从 terminated 触发任何事件', () => {
      const instance = makeInstance('terminated');
      const events = sm.getAvailableEvents(instance);
      expect(events).toEqual([]);
    });

    it('不应该从 failed 转换到 running（需要 recover 事件）', () => {
      const instance = makeInstance('failed');
      expect(sm.canTrigger(instance, 'start')).toBe(false);
      expect(sm.canTrigger(instance, 'recover')).toBe(true);
    });

    it('不应该从 waiting 直接转换到 created', () => {
      const instance = makeInstance('waiting');
      expect(sm.canTrigger(instance, 'start')).toBe(false);
    });

    it('trigger 应该在无效转换时抛出错误', async () => {
      const instance = makeInstance('created');
      await expect(sm.trigger(instance, 'complete')).rejects.toThrow('无效的状态转换');
    });
  });

  describe('状态查询', () => {
    it('应该正确判断终态', () => {
      expect(sm.isTerminalState('completed')).toBe(true);
      expect(sm.isTerminalState('terminated')).toBe(true);
      expect(sm.isTerminalState('cancelled')).toBe(true);
      expect(sm.isTerminalState('rejected')).toBe(true);
      expect(sm.isTerminalState('running')).toBe(false);
      expect(sm.isTerminalState('waiting')).toBe(false);
    });

    it('应该正确判断活跃状态', () => {
      expect(sm.isActiveState('running')).toBe(true);
      expect(sm.isActiveState('waiting')).toBe(true);
      expect(sm.isActiveState('completed')).toBe(false);
      expect(sm.isActiveState('terminated')).toBe(false);
    });

    it('应该获取当前状态可触发的事件', () => {
      const instance = makeInstance('running');
      const events = sm.getAvailableEvents(instance);
      expect(events).toContain('wait');
      expect(events).toContain('complete');
      expect(events).toContain('terminate');
      expect(events).toContain('fail');
      expect(events).toContain('suspend');
    });

    it('终态应该没有可触发事件', () => {
      const instance = makeInstance('completed');
      const events = sm.getAvailableEvents(instance);
      expect(events).toEqual([]);
    });
  });

  describe('状态描述', () => {
    it('应该返回状态中文标签', () => {
      expect(sm.getStateLabel('running')).toBe('运行中');
      expect(sm.getStateLabel('completed')).toBe('已完成');
      expect(sm.getStateLabel('terminated')).toBe('已终止');
    });
  });
});
