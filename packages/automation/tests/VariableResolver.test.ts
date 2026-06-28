/**
 * 变量插值解析器测试
 */

import { describe, it, expect } from 'vitest';
import { VariableResolver } from '../src/variable/VariableResolver';
import type { VariableContext } from '../src/variable/VariableResolver';

describe('VariableResolver', () => {
  const resolver = new VariableResolver();

  const context: VariableContext = {
    event: {
      type: 'entity.updated',
      source: 'data-engine',
      data: {
        entityCode: 'order',
        recordId: 'order_001',
        record: {
          amount: 15000,
          status: 'confirmed',
          customer: {
            name: '张三',
            level: 'VIP',
          },
        },
        changes: {
          amount: { from: 8000, to: 15000 },
          status: { from: 'pending', to: 'confirmed' },
        },
        operatorId: 'user_001',
      },
      timestamp: '2024-06-04T14:30:00Z',
    },
    rule: {
      id: 'rule_001',
      name: '大额订单自动审批',
    },
    variables: {
      threshold: 10000,
    },
  };

  describe('resolve', () => {
    it('should resolve simple template', () => {
      const result = resolver.resolve('事件类型: {{event.type}}', context);
      expect(result).toBe('事件类型: entity.updated');
    });

    it('should resolve nested path', () => {
      const result = resolver.resolve('金额: {{event.data.record.amount}}', context);
      expect(result).toBe('金额: 15000');
    });

    it('should resolve deeply nested path', () => {
      const result = resolver.resolve('客户: {{event.data.record.customer.name}}', context);
      expect(result).toBe('客户: 张三');
    });

    it('should resolve rule variables', () => {
      const result = resolver.resolve('规则: {{rule.name}} ({{rule.id}})', context);
      expect(result).toBe('规则: 大额订单自动审批 (rule_001)');
    });

    it('should resolve now variable', () => {
      const result = resolver.resolve('时间: {{now}}', context);
      expect(result).toMatch(/^时间: \d{4}-\d{2}-\d{2}T/);
    });

    it('should handle missing variable', () => {
      const result = resolver.resolve('值: {{event.data.missing}}', context);
      expect(result).toBe('值: ');
    });

    it('should handle empty template', () => {
      const result = resolver.resolve('', context);
      expect(result).toBe('');
    });

    it('should handle multiple variables', () => {
      const result = resolver.resolve(
        '{{event.type}} - {{event.data.entityCode}} - {{event.data.recordId}}',
        context
      );
      expect(result).toBe('entity.updated - order - order_001');
    });

    it('should resolve changes path', () => {
      const result = resolver.resolve('变更: {{event.data.changes.amount}}', context);
      expect(result).toBe('变更: [object Object]');
    });
  });

  describe('resolveObject', () => {
    it('should resolve variables in object', () => {
      const obj = {
        title: '订单 {{event.data.recordId}} 已更新',
        body: '金额: {{event.data.record.amount}}',
        nested: {
          value: '{{rule.name}}',
        },
      };

      const result = resolver.resolveObject(obj, context);

      expect(result.title).toBe('订单 order_001 已更新');
      expect(result.body).toBe('金额: 15000');
      expect(result.nested.value).toBe('大额订单自动审批');
    });

    it('should resolve variables in array', () => {
      const arr = ['{{event.type}}', '{{rule.name}}'];
      const result = resolver.resolveObject(arr, context);
      expect(result).toEqual(['entity.updated', '大额订单自动审批']);
    });

    it('should handle null and undefined', () => {
      expect(resolver.resolveObject(null, context)).toBeNull();
      expect(resolver.resolveObject(undefined, context)).toBeUndefined();
    });

    it('should handle non-string values', () => {
      const obj = { count: 42, flag: true };
      const result = resolver.resolveObject(obj, context);
      expect(result.count).toBe(42);
      expect(result.flag).toBe(true);
    });
  });
});
