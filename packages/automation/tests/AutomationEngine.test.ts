/**
 * 自动化引擎集成测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AutomationEngine } from '../src/engine/AutomationEngine';
import type {
  AutomationEngineConfig,
  DatabaseAdapter,
  EventBus,
  WorkflowService,
  NotifyService,
  DataService,
} from '../src/types/engine';
import type { PlatformEvent } from '../src/types/trigger';

describe('AutomationEngine', () => {
  let engine: AutomationEngine;
  let mockDb: DatabaseAdapter;
  let mockEventBus: EventBus;
  let mockWorkflowService: WorkflowService;
  let mockNotifyService: NotifyService;
  let mockDataService: DataService;

  beforeEach(() => {
    // Mock 数据库
    mockDb = {
      run: vi.fn().mockResolvedValue({ changes: 1, lastID: 1 }),
      get: vi.fn().mockResolvedValue(undefined),
      all: vi.fn().mockResolvedValue([]),
      beginTransaction: vi.fn(),
      commit: vi.fn(),
      rollback: vi.fn(),
    };

    // Mock 事件总线
    mockEventBus = {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    };

    // Mock 流程服务
    mockWorkflowService = {
      startWorkflow: vi.fn().mockResolvedValue({ instanceId: 'inst_001' }),
    };

    // Mock 通知服务
    mockNotifyService = {
      send: vi.fn().mockResolvedValue({ messageIds: ['msg_001'] }),
    };

    // Mock 数据服务
    mockDataService = {
      create: vi.fn().mockResolvedValue({ id: 'record_001' }),
      update: vi.fn().mockResolvedValue({ changes: 1 }),
      delete: vi.fn().mockResolvedValue({ changes: 1 }),
      query: vi.fn().mockResolvedValue([]),
    };

    const config: AutomationEngineConfig = {
      db: mockDb,
      eventBus: mockEventBus,
      workflowService: mockWorkflowService,
      notifyService: mockNotifyService,
      dataService: mockDataService,
    };

    engine = new AutomationEngine(config);
  });

  describe('handleEvent', () => {
    it('should emit event to event bus', async () => {
      const event: PlatformEvent = {
        type: 'entity.created',
        source: 'data-engine',
        data: { entityCode: 'order', recordId: 'order_001' },
        timestamp: new Date().toISOString(),
        tenantId: 'tenant_001',
        appId: 'app_001',
      };

      await engine.handleEvent(event);
      expect(mockEventBus.emit).toHaveBeenCalledWith(event);
    });

    it('should return empty when no matching rules', async () => {
      const event: PlatformEvent = {
        type: 'entity.created',
        source: 'data-engine',
        data: { entityCode: 'order' },
        timestamp: new Date().toISOString(),
        tenantId: 'tenant_001',
        appId: 'app_001',
      };

      const results = await engine.handleEvent(event);
      expect(results).toEqual([]);
    });

    it('should execute matching rules', async () => {
      // 模拟数据库返回匹配的规则
      mockDb.all = vi.fn().mockResolvedValue([
        {
          id: 'rule_001',
          app_id: 'app_001',
          name: '测试规则',
          status: 'enabled',
          trigger_config: JSON.stringify({
            type: 'data_change',
            dataChange: {
              entityCode: 'order',
              operations: ['create'],
            },
          }),
          actions_config: JSON.stringify([
            {
              type: 'trigger_workflow',
              name: '触发审批',
              triggerWorkflow: {
                workflowId: 'wf_001',
              },
            },
          ]),
          created_by: 'system',
          created_at: new Date().toISOString(),
          updated_by: 'system',
          updated_at: new Date().toISOString(),
        },
      ]);

      const event: PlatformEvent = {
        type: 'entity.created',
        source: 'data-engine',
        data: { entityCode: 'order', recordId: 'order_001' },
        timestamp: new Date().toISOString(),
        tenantId: 'tenant_001',
        appId: 'app_001',
      };

      const results = await engine.handleEvent(event);
      expect(results.length).toBe(1);
      expect(results[0].ruleId).toBe('rule_001');
      expect(results[0].status).toBe('success');
    });
  });

  describe('event bus subscription', () => {
    it('should allow subscribing to events', () => {
      const handler = vi.fn();
      const bus = engine.getEventBus();
      bus.on('entity.created', handler);

      expect(mockEventBus.on).toHaveBeenCalledWith('entity.created', handler);
    });

    it('should allow unsubscribing from events', () => {
      const handler = vi.fn();
      const bus = engine.getEventBus();
      bus.off('entity.created', handler);

      expect(mockEventBus.off).toHaveBeenCalledWith('entity.created', handler);
    });
  });

  describe('action executors', () => {
    it('should register custom action executor', () => {
      const executor = {
        execute: vi.fn().mockResolvedValue({ status: 'success' }),
      };

      engine.registerActionExecutor('custom_action', executor as any);
      // 无法直接测试，但可以验证不抛出错误
    });
  });

  describe('full workflow', () => {
    it('should execute complete ECA flow', async () => {
      // 1. 模拟规则
      mockDb.all = vi.fn().mockResolvedValue([
        {
          id: 'rule_001',
          app_id: 'app_001',
          name: '大额订单审批',
          status: 'enabled',
          trigger_config: JSON.stringify({
            type: 'data_change',
            dataChange: {
              entityCode: 'order',
              operations: ['create'],
            },
          }),
          condition_config: JSON.stringify({
            logic: 'and',
            rules: [
              { field: 'event.data.record.amount', operator: 'gt', value: 10000 },
            ],
          }),
          actions_config: JSON.stringify([
            {
              type: 'trigger_workflow',
              name: '触发审批流程',
              triggerWorkflow: {
                workflowId: 'approval_wf',
                variables: {
                  orderId: '{{event.data.recordId}}',
                  amount: '{{event.data.record.amount}}',
                },
              },
            },
            {
              type: 'send_notification',
              name: '发送通知',
              sendNotification: {
                channels: ['site'],
                recipients: [{ type: 'role', value: 'manager' }],
                title: '新订单待审批',
                content: '订单 {{event.data.recordId}} 需要审批',
              },
            },
          ]),
          created_by: 'system',
          created_at: new Date().toISOString(),
          updated_by: 'system',
          updated_at: new Date().toISOString(),
        },
      ]);

      // 2. 创建事件
      const event: PlatformEvent = {
        type: 'entity.created',
        source: 'data-engine',
        data: {
          entityCode: 'order',
          recordId: 'order_001',
          record: {
            amount: 15000,
            status: 'pending',
          },
        },
        timestamp: new Date().toISOString(),
        tenantId: 'tenant_001',
        appId: 'app_001',
      };

      // 3. 执行
      const results = await engine.handleEvent(event);

      // 4. 验证结果
      expect(results.length).toBe(1);
      expect(results[0].status).toBe('success');
      expect(results[0].conditionResult.matched).toBe(true);
      expect(results[0].actionResults.length).toBe(2);
      expect(results[0].actionResults[0].status).toBe('success');
      expect(results[0].actionResults[1].status).toBe('success');

      // 5. 验证流程服务被调用
      expect(mockWorkflowService.startWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: 'approval_wf',
        })
      );

      // 6. 验证通知服务被调用
      expect(mockNotifyService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          channels: ['site'],
          title: '新订单待审批',
        })
      );

      // 7. 验证日志被记录
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO automation_execution_logs'),
        expect.any(Array)
      );
    });

    it('should skip when condition not met', async () => {
      // 1. 模拟规则
      mockDb.all = vi.fn().mockResolvedValue([
        {
          id: 'rule_001',
          app_id: 'app_001',
          name: '大额订单审批',
          status: 'enabled',
          trigger_config: JSON.stringify({
            type: 'data_change',
            dataChange: {
              entityCode: 'order',
              operations: ['create'],
            },
          }),
          condition_config: JSON.stringify({
            logic: 'and',
            rules: [
              { field: 'event.data.record.amount', operator: 'gt', value: 10000 },
            ],
          }),
          actions_config: JSON.stringify([
            {
              type: 'trigger_workflow',
              name: '触发审批流程',
              triggerWorkflow: {
                workflowId: 'approval_wf',
              },
            },
          ]),
          created_by: 'system',
          created_at: new Date().toISOString(),
          updated_by: 'system',
          updated_at: new Date().toISOString(),
        },
      ]);

      // 2. 创建事件（金额不足）
      const event: PlatformEvent = {
        type: 'entity.created',
        source: 'data-engine',
        data: {
          entityCode: 'order',
          recordId: 'order_002',
          record: {
            amount: 5000, // 小于 10000
            status: 'pending',
          },
        },
        timestamp: new Date().toISOString(),
        tenantId: 'tenant_001',
        appId: 'app_001',
      };

      // 3. 执行
      const results = await engine.handleEvent(event);

      // 4. 验证结果
      expect(results.length).toBe(1);
      expect(results[0].conditionResult.matched).toBe(false);
      expect(results[0].actionResults.length).toBe(0);

      // 5. 验证流程服务未被调用
      expect(mockWorkflowService.startWorkflow).not.toHaveBeenCalled();
    });
  });
});
