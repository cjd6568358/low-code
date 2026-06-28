/**
 * 限流器测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Throttler } from '../src/engine/Throttler';
import type { AutomationRule } from '../src/types/rule';
import type { LogStore } from '../src/types/engine';

describe('Throttler', () => {
  let throttler: Throttler;
  let mockLogStore: LogStore;

  beforeEach(() => {
    mockLogStore = {
      save: vi.fn(),
      getByRuleId: vi.fn().mockResolvedValue([]),
      getById: vi.fn(),
      getLastExecutionTime: vi.fn().mockResolvedValue(undefined),
      getTodayExecutionCount: vi.fn().mockResolvedValue(0),
    };
    throttler = new Throttler(mockLogStore);
  });

  /** 创建测试规则 */
  const createRule = (throttle?: Record<string, unknown>): AutomationRule => ({
    id: 'rule_001',
    tenantId: 'tenant_001',
    appId: 'app_001',
    name: '测试规则',
    status: 'enabled',
    trigger: { type: 'data_change' } as any,
    actions: [],
    throttle: throttle as any,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedBy: 'system',
    updatedAt: new Date().toISOString(),
  });

  describe('no throttle', () => {
    it('should allow when no throttle config', async () => {
      const rule = createRule();
      const result = await throttler.check(rule);
      expect(result.allowed).toBe(true);
    });
  });

  describe('cooldown', () => {
    it('should allow when cooldown passed', async () => {
      const rule = createRule({ cooldownSeconds: 60 });

      // 模拟上次执行时间在 2 分钟前
      const twoMinutesAgo = new Date(Date.now() - 120000).toISOString();
      mockLogStore.getLastExecutionTime = vi.fn().mockResolvedValue(twoMinutesAgo);

      const result = await throttler.check(rule);
      expect(result.allowed).toBe(true);
    });

    it('should deny when in cooldown', async () => {
      const rule = createRule({ cooldownSeconds: 60 });

      // 模拟上次执行时间在 30 秒前
      const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
      mockLogStore.getLastExecutionTime = vi.fn().mockResolvedValue(thirtySecondsAgo);

      const result = await throttler.check(rule);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('冷却中');
    });

    it('should use cache for cooldown', async () => {
      const rule = createRule({ cooldownSeconds: 60 });

      // 第一次触发
      mockLogStore.getLastExecutionTime = vi.fn().mockResolvedValue(undefined);
      await throttler.check(rule);
      throttler.recordTrigger(rule.id);

      // 立即再次检查
      const result = await throttler.check(rule);
      expect(result.allowed).toBe(false);
    });
  });

  describe('daily limit', () => {
    it('should allow when under daily limit', async () => {
      const rule = createRule({ cooldownSeconds: 0, maxDailyTriggers: 100 });

      mockLogStore.getTodayExecutionCount = vi.fn().mockResolvedValue(50);

      const result = await throttler.check(rule);
      expect(result.allowed).toBe(true);
    });

    it('should deny when at daily limit', async () => {
      const rule = createRule({ cooldownSeconds: 0, maxDailyTriggers: 100 });

      mockLogStore.getTodayExecutionCount = vi.fn().mockResolvedValue(100);

      const result = await throttler.check(rule);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('每日上限');
    });
  });

  describe('clearCache', () => {
    it('should clear cache', async () => {
      const rule = createRule({ cooldownSeconds: 60 });

      // 记录触发
      throttler.recordTrigger(rule.id);

      // 清除缓存
      throttler.clearCache(rule.id);

      // 应该检查数据库
      mockLogStore.getLastExecutionTime = vi.fn().mockResolvedValue(undefined);
      const result = await throttler.check(rule);
      expect(result.allowed).toBe(true);
    });
  });
});
