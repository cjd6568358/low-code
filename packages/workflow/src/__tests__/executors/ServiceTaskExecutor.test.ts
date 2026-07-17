/**
 * ServiceTaskExecutor 测试用例
 *
 * 验证服务任务的表达式执行和扩展配置模式。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ServiceTaskExecutor } from '../../executors/ServiceTaskExecutor.js';
import type { ExecutionContext } from '../../types/execution.js';

// Mock fetch for API/Webhook tests
const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  json: vi.fn().mockResolvedValue({ success: true, data: {} }),
});
vi.stubGlobal('fetch', mockFetch);

describe('ServiceTaskExecutor', () => {
  let executor: ServiceTaskExecutor;
  let mockEngine: any;

  beforeEach(() => {
    mockEngine = createMockEngine();
    executor = new ServiceTaskExecutor(mockEngine);
    vi.clearAllMocks();
  });

  describe('getNodeConfig', () => {
    it('应该返回正确的节点配置', () => {
      const node = {
        id: 'service1',
        $type: 'bpmn:ServiceTask',
        name: '服务任务',
      };

      const config = executor.getNodeConfig(node as any);
      expect(config.type).toBe('bpmn:ServiceTask');
      expect(config.waitForInput).toBe(false);
    });
  });

  describe('表达式模式', () => {
    it('应该执行同步表达式', async () => {
      const context = createMockContext({
        node: {
          id: 'service1',
          $type: 'bpmn:ServiceTask',
          name: '计算折扣',
          expression: 'return 900',
        },
        variables: { amount: 1000 },
      });

      const result = await executor.execute(context);
      expect(result.success).toBe(true);
    });

    it('应该将结果写入变量', async () => {
      const context = createMockContext({
        node: {
          id: 'service1',
          $type: 'bpmn:ServiceTask',
          name: '计算',
          expression: 'return 300',
          outputVariable: 'totalAmount',
        },
        variables: { price: 100, quantity: 3 },
      });

      const result = await executor.execute(context);
      expect(result.success).toBe(true);
      // 表达式结果通过 mergeVariables 写入引擎
      expect(mockEngine.mergeVariables).toHaveBeenCalled();
    });
  });

  describe('API 调用模式', () => {
    it('应该执行 HTTP GET 请求', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ id: 'order001', name: '测试订单' }),
      });

      const context = createMockContext({
        node: {
          id: 'service1',
          $type: 'bpmn:ServiceTask',
          name: '获取数据',
          extensionElements: {
            serviceConfig: {
              serviceType: 'api',
              apiConfig: {
                method: 'GET',
                url: '/api/orders/${orderId}',
              },
            },
          },
        },
        variables: { orderId: 'order001' },
      });

      const result = await executor.execute(context);
      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/orders/order001',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('应该执行 HTTP POST 请求', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ id: 'new_001' }),
      });

      const context = createMockContext({
        node: {
          id: 'service1',
          $type: 'bpmn:ServiceTask',
          name: '创建记录',
          extensionElements: {
            serviceConfig: {
              serviceType: 'api',
              apiConfig: {
                method: 'POST',
                url: '/api/orders',
                body: {
                  name: '${orderName}',
                  amount: '${amount}',
                },
              },
            },
          },
        },
        variables: { orderName: '测试订单', amount: 1000 },
      });

      const result = await executor.execute(context);
      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/orders',
        expect.objectContaining({
          method: 'POST',
          body: expect.anything(),
        })
      );
    });
  });

  describe('Webhook 模式', () => {
    it('应该发送 Webhook 通知', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ sent: true }),
      });

      const context = createMockContext({
        node: {
          id: 'service1',
          $type: 'bpmn:ServiceTask',
          name: '发送 Webhook',
          extensionElements: {
            serviceConfig: {
              serviceType: 'webhook',
              webhookConfig: {
                url: 'https://example.com/webhook',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: { event: 'order.created' },
              },
            },
          },
        },
        variables: { order: { id: 'order001', name: '测试订单' } },
      });

      const result = await executor.execute(context);
      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/webhook',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('错误处理', () => {
    it('应该在表达式执行失败时返回错误', async () => {
      // 创建一个 evaluator 会抛异常的 executor
      const errorExecutor = new ServiceTaskExecutor(mockEngine);
      (errorExecutor as any).evaluator = {
        evaluate: vi.fn().mockImplementation(() => {
          throw new Error('表达式求值失败');
        }),
      };

      const context = createMockContext({
        node: {
          id: 'service1',
          $type: 'bpmn:ServiceTask',
          name: '失败任务',
          expression: 'invalid expression',
        },
      });

      const result = await errorExecutor.execute(context);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('表达式');
    });

    it('应该在 API 调用失败时返回错误', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const context = createMockContext({
        node: {
          id: 'service1',
          $type: 'bpmn:ServiceTask',
          name: 'API 失败',
          extensionElements: {
            serviceConfig: {
              serviceType: 'api',
              apiConfig: {
                method: 'GET',
                url: '/api/fail',
              },
            },
          },
        },
      });

      const result = await executor.execute(context);
      expect(result.error).toBeDefined();
    });
  });
});

// ─── 辅助函数 ──────────────────────────────────────────

/** 创建 mock 引擎 */
function createMockEngine() {
  return {
    updateInstance: vi.fn().mockResolvedValue(undefined),
    mergeVariables: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockContext(overrides: any = {}): ExecutionContext {
  return {
    instance: { instanceId: 'inst1', status: 'running' },
    definition: {
      id: 'def1',
      name: '测试流程',
      nodes: [
        { id: 'next1', $type: 'bpmn:EndEvent', name: '结束' },
      ],
      edges: [],
    },
    currentNode: overrides.node || { id: 'service1', $type: 'bpmn:ServiceTask' },
    snapshot: { data: {} },
    variables: overrides.variables || {},
    operator: { userId: 'user1', userName: '测试用户' },
    ...overrides,
  } as any;
}
