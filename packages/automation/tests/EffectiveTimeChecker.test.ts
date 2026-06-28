/**
 * 生效时间检查器测试
 */

import { describe, it, expect } from 'vitest';
import { EffectiveTimeChecker } from '../src/engine/EffectiveTimeChecker';
import type { AutomationRule } from '../src/types/rule';

describe('EffectiveTimeChecker', () => {
  const checker = new EffectiveTimeChecker();

  /** 创建测试规则 */
  const createRule = (effectiveTime?: Record<string, unknown>): AutomationRule => ({
    id: 'rule_001',
    tenantId: 'tenant_001',
    appId: 'app_001',
    name: '测试规则',
    status: 'enabled',
    trigger: { type: 'data_change' } as any,
    actions: [],
    effectiveTime: effectiveTime as any,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedBy: 'system',
    updatedAt: new Date().toISOString(),
  });

  describe('no effective time', () => {
    it('should be effective when no config', () => {
      const rule = createRule();
      const result = checker.check(rule);
      expect(result.effective).toBe(true);
    });
  });

  describe('date range', () => {
    it('should be effective when in range', () => {
      const now = new Date();
      const rule = createRule({
        start: new Date(now.getTime() - 86400000).toISOString(), // 昨天
        end: new Date(now.getTime() + 86400000).toISOString(),   // 明天
      });

      const result = checker.check(rule, now);
      expect(result.effective).toBe(true);
    });

    it('should not be effective before start', () => {
      const now = new Date();
      const rule = createRule({
        start: new Date(now.getTime() + 86400000).toISOString(), // 明天
      });

      const result = checker.check(rule, now);
      expect(result.effective).toBe(false);
      expect(result.reason).toContain('尚未生效');
    });

    it('should not be effective after end', () => {
      const now = new Date();
      const rule = createRule({
        end: new Date(now.getTime() - 86400000).toISOString(), // 昨天
      });

      const result = checker.check(rule, now);
      expect(result.effective).toBe(false);
      expect(result.reason).toContain('已过期');
    });
  });

  describe('time ranges', () => {
    it('should be effective in time range', () => {
      const now = new Date();
      now.setHours(10, 0, 0, 0); // 10:00

      const rule = createRule({
        timeRanges: [
          {
            daysOfWeek: [now.getDay()],
            startTime: '09:00',
            endTime: '18:00',
          },
        ],
      });

      const result = checker.check(rule, now);
      expect(result.effective).toBe(true);
    });

    it('should not be effective outside time range', () => {
      const now = new Date();
      now.setHours(20, 0, 0, 0); // 20:00

      const rule = createRule({
        timeRanges: [
          {
            daysOfWeek: [now.getDay()],
            startTime: '09:00',
            endTime: '18:00',
          },
        ],
      });

      const result = checker.check(rule, now);
      expect(result.effective).toBe(false);
      expect(result.reason).toContain('不在生效时段');
    });

    it('should not be effective on wrong day', () => {
      const now = new Date();
      now.setHours(10, 0, 0, 0); // 10:00

      // 使用不同的星期几
      const wrongDay = (now.getDay() + 1) % 7;

      const rule = createRule({
        timeRanges: [
          {
            daysOfWeek: [wrongDay],
            startTime: '09:00',
            endTime: '18:00',
          },
        ],
      });

      const result = checker.check(rule, now);
      expect(result.effective).toBe(false);
    });

    it('should match any time range', () => {
      const now = new Date();
      now.setHours(10, 0, 0, 0); // 10:00

      const rule = createRule({
        timeRanges: [
          {
            daysOfWeek: [(now.getDay() + 1) % 7], // 不匹配
            startTime: '09:00',
            endTime: '18:00',
          },
          {
            daysOfWeek: [now.getDay()], // 匹配
            startTime: '08:00',
            endTime: '12:00',
          },
        ],
      });

      const result = checker.check(rule, now);
      expect(result.effective).toBe(true);
    });
  });

  describe('getTimeRangeLabel', () => {
    it('should format time range', () => {
      const label = checker.getTimeRangeLabel({
        daysOfWeek: [1, 2, 3, 4, 5],
        startTime: '09:00',
        endTime: '18:00',
      });

      expect(label).toContain('周一');
      expect(label).toContain('周五');
      expect(label).toContain('09:00');
      expect(label).toContain('18:00');
    });
  });
});
