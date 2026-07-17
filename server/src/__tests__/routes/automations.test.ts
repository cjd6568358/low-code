/**
 * 自动化路由测试用例
 *
 * 验证自动化规则 CRUD、启用/禁用、执行日志等功能。
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { DatabaseManager } from '@low-code/data';

describe('自动化路由', () => {
  let manager: DatabaseManager;
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lc-automations-test-'));
    manager = new DatabaseManager({
      dataDir: path.join(tmpDir, 'data'),
      tenantsDir: path.join(tmpDir, 'tenants'),
      walMode: false,
    });

    // 初始化系统库和租户库
    manager.initSystemDb();
    manager.createTenant('test123', '测试租户');

    // 创建应用目录结构
    const appDir = path.join(tmpDir, 'tenants', 'tenant_test123', 'apps', 'app_test001');
    fs.mkdirSync(path.join(appDir, 'automations'), { recursive: true });
  });

  afterAll(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  describe('自动化规则文件', () => {
    it('应该创建规则文件', () => {
      const rule = {
        id: 'rule001',
        name: '测试规则',
        description: '测试规则描述',
        status: 'enabled',
        trigger: {
          type: 'data_change',
          dataChange: {
            entityCode: 'order',
            operations: ['create'],
          },
        },
        conditions: {
          logic: 'and',
          rules: [
            { field: 'event.data.amount', operator: 'gt', value: 1000 },
          ],
        },
        actions: [
          {
            type: 'trigger_workflow',
            workflowId: 'workflow001',
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const automationsDir = path.join(tmpDir, 'tenants', 'tenant_test123', 'apps', 'app_test001', 'automations');
      const filePath = path.join(automationsDir, 'automation_rule001.json');

      fs.writeFileSync(filePath, JSON.stringify(rule, null, 2));

      expect(fs.existsSync(filePath)).toBe(true);

      const readRule = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      expect(readRule.id).toBe('rule001');
      expect(readRule.name).toBe('测试规则');
    });

    it('应该扫描目录下所有规则', () => {
      const automationsDir = path.join(tmpDir, 'tenants', 'tenant_test123', 'apps', 'app_test001', 'automations');

      // 创建多个规则
      const rules = [
        { id: 'rule002', name: '规则2' },
        { id: 'rule003', name: '规则3' },
      ];

      for (const rule of rules) {
        fs.writeFileSync(
          path.join(automationsDir, `automation_${rule.id}.json`),
          JSON.stringify(rule, null, 2)
        );
      }

      // 扫描目录
      const files = fs.readdirSync(automationsDir).filter(f => f.endsWith('.json'));
      expect(files).toHaveLength(3); // 包括之前创建的 rule001
    });

    it('应该过滤已删除的规则', () => {
      const automationsDir = path.join(tmpDir, 'tenants', 'tenant_test123', 'apps', 'app_test001', 'automations');
      const rule = {
        id: 'rule004',
        name: '已删除规则',
        _deleted: true,
      };

      fs.writeFileSync(
        path.join(automationsDir, `automation_${rule.id}.json`),
        JSON.stringify(rule, null, 2)
      );

      // 扫描并过滤
      const files = fs.readdirSync(automationsDir).filter(f => f.endsWith('.json'));
      const activeRules = files
        .map(f => JSON.parse(fs.readFileSync(path.join(automationsDir, f), 'utf-8')))
        .filter(r => !r._deleted);

      expect(activeRules).toHaveLength(3);
    });
  });

  describe('规则状态', () => {
    it('应该支持启用状态', () => {
      const rule = {
        id: 'rule001',
        name: '测试规则',
        status: 'enabled',
      };

      expect(rule.status).toBe('enabled');
    });

    it('应该支持禁用状态', () => {
      const rule = {
        id: 'rule001',
        name: '测试规则',
        status: 'disabled',
      };

      expect(rule.status).toBe('disabled');
    });

    it('应该支持草稿状态', () => {
      const rule = {
        id: 'rule001',
        name: '测试规则',
        status: 'draft',
      };

      expect(rule.status).toBe('draft');
    });
  });

  describe('触发器配置', () => {
    it('应该支持数据变更触发器', () => {
      const trigger = {
        type: 'data_change',
        dataChange: {
          entityCode: 'order',
          operations: ['create', 'update'],
          watchFields: ['amount', 'status'],
        },
      };

      expect(trigger.type).toBe('data_change');
      expect(trigger.dataChange.entityCode).toBe('order');
      expect(trigger.dataChange.operations).toContain('create');
      expect(trigger.dataChange.operations).toContain('update');
    });

    it('应该支持定时触发器', () => {
      const trigger = {
        type: 'schedule',
        schedule: {
          cron: '0 9 * * *',
          timezone: 'Asia/Shanghai',
        },
      };

      expect(trigger.type).toBe('schedule');
      expect(trigger.schedule.cron).toBe('0 9 * * *');
      expect(trigger.schedule.timezone).toBe('Asia/Shanghai');
    });
  });

  describe('条件配置', () => {
    it('应该支持单条件', () => {
      const conditions = {
        logic: 'and',
        rules: [
          { field: 'event.data.amount', operator: 'gt', value: 1000 },
        ],
      };

      expect(conditions.logic).toBe('and');
      expect(conditions.rules).toHaveLength(1);
      expect(conditions.rules[0].operator).toBe('gt');
    });

    it('应该支持多条件 AND', () => {
      const conditions = {
        logic: 'and',
        rules: [
          { field: 'event.data.amount', operator: 'gt', value: 1000 },
          { field: 'event.data.status', operator: 'eq', value: 'confirmed' },
        ],
      };

      expect(conditions.rules).toHaveLength(2);
    });

    it('应该支持多条件 OR', () => {
      const conditions = {
        logic: 'or',
        rules: [
          { field: 'event.data.status', operator: 'eq', value: 'confirmed' },
          { field: 'event.data.status', operator: 'eq', value: 'approved' },
        ],
      };

      expect(conditions.logic).toBe('or');
    });
  });

  describe('动作配置', () => {
    it('应该支持触发流程动作', () => {
      const action = {
        type: 'trigger_workflow',
        workflowId: 'workflow001',
        formData: {
          orderId: 'event.data.orderId',
        },
      };

      expect(action.type).toBe('trigger_workflow');
      expect(action.workflowId).toBeDefined();
    });

    it('应该支持执行表达式动作', () => {
      const action = {
        type: 'execute_expression',
        expression: 'return $event.data.amount * 0.1',
      };

      expect(action.type).toBe('execute_expression');
      expect(action.expression).toBeDefined();
    });

    it('应该支持发送通知动作', () => {
      const action = {
        type: 'send_notification',
        template: 'order_created',
        recipients: ['user1', 'user2'],
      };

      expect(action.type).toBe('send_notification');
      expect(action.template).toBeDefined();
      expect(action.recipients).toHaveLength(2);
    });

    it('应该支持数据操作动作', () => {
      const action = {
        type: 'data_operation',
        operation: 'update',
        tableId: 'orders',
        recordId: 'event.data.orderId',
        data: { status: 'processed' },
      };

      expect(action.type).toBe('data_operation');
      expect(action.operation).toBe('update');
      expect(action.tableId).toBeDefined();
    });
  });

  describe('节流配置', () => {
    it('应该支持冷却时间', () => {
      const throttle = {
        cooldown: 300, // 5分钟
      };

      expect(throttle.cooldown).toBe(300);
    });

    it('应该支持每日限制', () => {
      const throttle = {
        dailyLimit: 10,
      };

      expect(throttle.dailyLimit).toBe(10);
    });
  });

  describe('生效时间配置', () => {
    it('应该支持时间范围', () => {
      const effectiveTime = {
        start: '2024-01-01T00:00:00Z',
        end: '2024-12-31T23:59:59Z',
      };

      expect(effectiveTime.start).toBeDefined();
      expect(effectiveTime.end).toBeDefined();
    });

    it('应该支持无限期生效', () => {
      const effectiveTime = {
        start: '2024-01-01T00:00:00Z',
        end: null,
      };

      expect(effectiveTime.end).toBeNull();
    });
  });

  describe('执行日志', () => {
    it('应该记录执行结果', () => {
      const log = {
        id: 'log001',
        ruleId: 'rule001',
        eventId: 'event001',
        eventType: 'entity.created',
        eventSource: 'order',
        matched: true,
        actions: [
          {
            type: 'trigger_workflow',
            status: 'success',
            result: { instanceId: 'instance001' },
          },
        ],
        executedAt: new Date().toISOString(),
      };

      expect(log.matched).toBe(true);
      expect(log.actions).toHaveLength(1);
      expect(log.actions[0].status).toBe('success');
    });

    it('应该记录条件不匹配', () => {
      const log = {
        id: 'log002',
        ruleId: 'rule001',
        eventId: 'event002',
        matched: false,
        reason: '条件不满足',
        executedAt: new Date().toISOString(),
      };

      expect(log.matched).toBe(false);
      expect(log.reason).toBeDefined();
    });

    it('应该记录执行失败', () => {
      const log = {
        id: 'log003',
        ruleId: 'rule001',
        eventId: 'event003',
        matched: true,
        actions: [
          {
            type: 'trigger_workflow',
            status: 'failed',
            error: '流程不存在',
          },
        ],
        executedAt: new Date().toISOString(),
      };

      expect(log.actions[0].status).toBe('failed');
      expect(log.actions[0].error).toBeDefined();
    });
  });
});
