/**
 * 触发器匹配器测试
 */

import { describe, it, expect } from 'vitest';
import { TriggerMatcher } from '../src/engine/TriggerMatcher';
import type { PlatformEvent } from '../src/types/trigger';
import type { AutomationRule } from '../src/types/rule';

describe('TriggerMatcher', () => {
  const matcher = new TriggerMatcher();

  /** 创建测试规则 */
  const createRule = (trigger: Record<string, unknown>, status = 'enabled'): AutomationRule => ({
    id: 'rule_001',
    tenantId: 'tenant_001',
    appId: 'app_001',
    name: '测试规则',
    status: status as 'enabled' | 'disabled' | 'draft',
    trigger: trigger as any,
    actions: [],
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedBy: 'system',
    updatedAt: new Date().toISOString(),
  });

  /** 创建测试事件 */
  const createEvent = (type: string, data: Record<string, unknown> = {}): PlatformEvent => ({
    type,
    source: 'test',
    data,
    timestamp: new Date().toISOString(),
    tenantId: 'tenant_001',
    appId: 'app_001',
  });

  describe('data_change trigger', () => {
    it('should match entity.created event', () => {
      const rule = createRule({
        type: 'data_change',
        dataChange: {
          entityCode: 'order',
          operations: ['create'],
        },
      });

      const event = createEvent('entity.created', { entityCode: 'order' });
      expect(matcher.match(event, rule)).toBe(true);
    });

    it('should match entity.updated event', () => {
      const rule = createRule({
        type: 'data_change',
        dataChange: {
          entityCode: 'order',
          operations: ['update'],
        },
      });

      const event = createEvent('entity.updated', { entityCode: 'order' });
      expect(matcher.match(event, rule)).toBe(true);
    });

    it('should not match wrong entity', () => {
      const rule = createRule({
        type: 'data_change',
        dataChange: {
          entityCode: 'order',
          operations: ['create'],
        },
      });

      const event = createEvent('entity.created', { entityCode: 'product' });
      expect(matcher.match(event, rule)).toBe(false);
    });

    it('should not match wrong operation', () => {
      const rule = createRule({
        type: 'data_change',
        dataChange: {
          entityCode: 'order',
          operations: ['create'],
        },
      });

      const event = createEvent('entity.deleted', { entityCode: 'order' });
      expect(matcher.match(event, rule)).toBe(false);
    });

    it('should check watchFields for update', () => {
      const rule = createRule({
        type: 'data_change',
        dataChange: {
          entityCode: 'order',
          operations: ['update'],
          watchFields: ['amount', 'status'],
        },
      });

      const event = createEvent('entity.updated', {
        entityCode: 'order',
        changes: { amount: { from: 100, to: 200 } },
      });
      expect(matcher.match(event, rule)).toBe(true);
    });

    it('should not match if watched field not changed', () => {
      const rule = createRule({
        type: 'data_change',
        dataChange: {
          entityCode: 'order',
          operations: ['update'],
          watchFields: ['amount'],
        },
      });

      const event = createEvent('entity.updated', {
        entityCode: 'order',
        changes: { status: { from: 'pending', to: 'confirmed' } },
      });
      expect(matcher.match(event, rule)).toBe(false);
    });
  });

  describe('schedule trigger', () => {
    it('should match schedule.tick event', () => {
      const rule = createRule({
        type: 'schedule',
        schedule: {
          cron: '0 9 * * *',
        },
      });

      const event = createEvent('schedule.tick', { cron: '0 9 * * *' });
      expect(matcher.match(event, rule)).toBe(true);
    });

    it('should not match non-schedule event', () => {
      const rule = createRule({
        type: 'schedule',
        schedule: {
          cron: '0 9 * * *',
        },
      });

      const event = createEvent('entity.created');
      expect(matcher.match(event, rule)).toBe(false);
    });
  });

  describe('rule status', () => {
    it('should not match disabled rule', () => {
      const rule = createRule(
        {
          type: 'data_change',
          dataChange: {
            entityCode: 'order',
            operations: ['create'],
          },
        },
        'disabled'
      );

      const event = createEvent('entity.created', { entityCode: 'order' });
      expect(matcher.match(event, rule)).toBe(false);
    });

    it('should not match draft rule', () => {
      const rule = createRule(
        {
          type: 'data_change',
          dataChange: {
            entityCode: 'order',
            operations: ['create'],
          },
        },
        'draft'
      );

      const event = createEvent('entity.created', { entityCode: 'order' });
      expect(matcher.match(event, rule)).toBe(false);
    });
  });

  describe('matchAll', () => {
    it('should return all matching rules', () => {
      const rules = [
        createRule({
          type: 'data_change',
          dataChange: { entityCode: 'order', operations: ['create'] },
        }),
        createRule({
          type: 'data_change',
          dataChange: { entityCode: 'order', operations: ['update'] },
        }),
        createRule({
          type: 'data_change',
          dataChange: { entityCode: 'product', operations: ['create'] },
        }),
      ];

      const event = createEvent('entity.created', { entityCode: 'order' });
      const result = matcher.matchAll(event, rules);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('rule_001');
    });
  });
});
